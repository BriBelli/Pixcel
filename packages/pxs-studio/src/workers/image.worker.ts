// Image Worker - Processes images with WASM acceleration off the main thread

export interface PXSCell {
  x: number;
  y: number;
  color: string;
  opacity?: number;
}

export interface ImageProcessResult {
  cols: number;
  rows: number;
  cells: PXSCell[];
  processTime: number;
  wasmUsed: boolean;
}

// WASM module state
let wasmModule: any = null;
let imageProcessor: any = null;
let wasmInitialized = false;
let wasmInitializing = false;

// Initialize WASM module
async function initWasm(): Promise<boolean> {
  if (wasmInitialized) return true;
  if (wasmInitializing) {
    // Wait for initialization to complete
    while (wasmInitializing) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    return wasmInitialized;
  }

  wasmInitializing = true;

  try {
    // In a Web Worker, we need to fetch and instantiate WASM manually
    const wasmUrl = '/wasm/pxs_compute_bg.wasm';
    const jsUrl = '/wasm/pxs_compute.js';

    // Import the JS glue code
    const wasmJs = await import(/* webpackIgnore: true */ jsUrl);
    
    // Initialize WASM with the binary
    await wasmJs.default(wasmUrl);
    
    // Create the ImageProcessor instance
    imageProcessor = new wasmJs.ImageProcessor();
    wasmModule = wasmJs;
    wasmInitialized = true;
    
    console.log('✅ WASM ImageProcessor initialized in worker');
    return true;
  } catch (error) {
    console.warn('⚠️ WASM not available, using JS fallback:', error);
    wasmInitialized = false;
    return false;
  } finally {
    wasmInitializing = false;
  }
}

// WASM-accelerated block averaging with gamma correction
function processWithWasm(
  imageData: Uint8ClampedArray,
  srcWidth: number,
  srcHeight: number,
  targetCols: number,
  targetRows: number
): PXSCell[] {
  if (!imageProcessor) {
    throw new Error('WASM not initialized');
  }

  // Convert Uint8ClampedArray to Uint8Array for WASM
  const data = new Uint8Array(imageData);
  
  // Use WASM to process image - returns array of "rgb(r,g,b)" strings
  const rgbStrings = imageProcessor.process_to_rgb_strings(
    data,
    srcWidth,
    srcHeight,
    targetCols,
    targetRows
  );

  // Convert to PXSCell array
  const cells: PXSCell[] = [];
  for (let i = 0; i < rgbStrings.length; i++) {
    const x = i % targetCols;
    const y = Math.floor(i / targetCols);
    cells.push({
      x,
      y,
      color: rgbStrings[i],
      opacity: 1,
    });
  }

  return cells;
}

// Simple block-averaging algorithm (JS fallback)
function blockAverage(
  imageData: Uint8ClampedArray,
  srcWidth: number,
  srcHeight: number,
  targetCols: number,
  targetRows: number
): PXSCell[] {
  const cells: PXSCell[] = [];
  const blockWidth = srcWidth / targetCols;
  const blockHeight = srcHeight / targetRows;

  for (let row = 0; row < targetRows; row++) {
    for (let col = 0; col < targetCols; col++) {
      let r = 0,
        g = 0,
        b = 0,
        count = 0;

      const startX = Math.floor(col * blockWidth);
      const endX = Math.floor((col + 1) * blockWidth);
      const startY = Math.floor(row * blockHeight);
      const endY = Math.floor((row + 1) * blockHeight);

      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          const idx = (y * srcWidth + x) * 4;
          r += imageData[idx];
          g += imageData[idx + 1];
          b += imageData[idx + 2];
          count++;
        }
      }

      r = Math.round(r / count);
      g = Math.round(g / count);
      b = Math.round(b / count);

      cells.push({
        x: col,
        y: row,
        color: `rgb(${r}, ${g}, ${b})`,
        opacity: 1,
      });
    }
  }

  return cells;
}

// Nearest-neighbor sampling — samples the center of each cell from the source.
// Preserves crisp edges for vector / pixel-art inputs where averaging would
// produce gray transitional cells along boundaries.
function nearestNeighbor(
  imageData: Uint8ClampedArray,
  srcWidth: number,
  srcHeight: number,
  targetCols: number,
  targetRows: number
): PXSCell[] {
  const cells: PXSCell[] = [];
  const scaleX = srcWidth / targetCols;
  const scaleY = srcHeight / targetRows;

  for (let row = 0; row < targetRows; row++) {
    const sy = Math.min(srcHeight - 1, Math.floor((row + 0.5) * scaleY));
    for (let col = 0; col < targetCols; col++) {
      const sx = Math.min(srcWidth - 1, Math.floor((col + 0.5) * scaleX));
      const idx = (sy * srcWidth + sx) * 4;
      const r = imageData[idx];
      const g = imageData[idx + 1];
      const b = imageData[idx + 2];

      cells.push({
        x: col,
        y: row,
        color: `rgb(${r}, ${g}, ${b})`,
        opacity: 1,
      });
    }
  }

  return cells;
}

// Handle messages from main thread
self.addEventListener('message', async (e: MessageEvent) => {
  const { type, file, targetCols, targetRows, useWasm, sharp } = e.data;

  if (type === 'initWasm') {
    const success = await initWasm();
    self.postMessage({
      type: 'wasmInitialized',
      success,
    });
    return;
  }

  if (type === 'processImage') {
    try {
      const startTime = performance.now();

      // Load image
      const bitmap = await createImageBitmap(file);
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (!ctx) {
        throw new Error('Failed to get 2D context');
      }

      ctx.drawImage(bitmap, 0, 0);
      const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height);

      let cells: PXSCell[];
      let wasmUsed = false;

      // Sharp mode bypasses WASM (which always averages) and uses
      // nearest-neighbor sampling for crisp vector/pixel-art edges.
      if (sharp) {
        cells = nearestNeighbor(
          imageData.data,
          bitmap.width,
          bitmap.height,
          targetCols,
          targetRows
        );
      } else {
        if (useWasm && !wasmInitialized) {
          await initWasm();
        }

        if (useWasm && wasmInitialized && imageProcessor) {
          try {
            cells = processWithWasm(
              imageData.data,
              bitmap.width,
              bitmap.height,
              targetCols,
              targetRows
            );
            wasmUsed = true;
          } catch (wasmError) {
            console.warn('WASM processing failed, falling back to JS:', wasmError);
            cells = blockAverage(
              imageData.data,
              bitmap.width,
              bitmap.height,
              targetCols,
              targetRows
            );
          }
        } else {
          cells = blockAverage(
            imageData.data,
            bitmap.width,
            bitmap.height,
            targetCols,
            targetRows
          );
        }
      }

      const endTime = performance.now();
      const processTime = endTime - startTime;

      self.postMessage({
        type: 'imageProcessed',
        cols: targetCols,
        rows: targetRows,
        cells,
        processTime,
        wasmUsed,
      });
    } catch (error) {
      self.postMessage({
        type: 'error',
        message: error instanceof Error ? error.message : 'Image processing failed',
      });
    }
  }
});

export {};
