/**
 * WASM Integration - Connects Rust/WASM module to PXS system
 * 
 * Provides high-performance image processing using WebAssembly
 * when available, with automatic fallback to JavaScript.
 * 
 * @example
 * // Initialize WASM
 * await PXSWasm.init('/wasm/pxs_compute_bg.wasm');
 * 
 * // Process image with gamma-correct block averaging
 * const colors = PXSWasm.processImage(imageData, sourceWidth, sourceHeight, targetCols, targetRows);
 * 
 * // Create high-performance pixel grid
 * const grid = PXSWasm.createGrid(64, 48);
 */

const PXSWasm = {
  _module: null,
  _initialized: false,
  _initPromise: null,
  
  /**
   * Initialize WASM module
   * @param {string} [wasmPath] - Path to WASM file
   * @returns {Promise<boolean>} True if WASM loaded, false if using JS fallback
   */
  async init(wasmPath = '/wasm/pkg/pxs_compute_bg.wasm') {
    if (this._initialized) return true;
    if (this._initPromise) return this._initPromise;
    
    this._initPromise = this._loadWasm(wasmPath);
    return this._initPromise;
  },
  
  /**
   * Load WASM module
   * @private
   */
  async _loadWasm(wasmPath) {
    try {
      // Try to load the WASM module
      const response = await fetch(wasmPath);
      if (!response.ok) {
        console.warn('[PXS WASM] WASM file not found, using JS fallback');
        this._initialized = true;
        return false;
      }
      
      const wasmBuffer = await response.arrayBuffer();
      const wasmModule = await WebAssembly.instantiate(wasmBuffer);
      
      this._module = wasmModule.instance.exports;
      this._initialized = true;
      
      console.log('[PXS WASM] Loaded successfully');
      return true;
      
    } catch (e) {
      console.warn('[PXS WASM] Failed to load, using JS fallback:', e.message);
      this._initialized = true;
      return false;
    }
  },
  
  /**
   * Check if WASM is available
   * @returns {boolean}
   */
  isAvailable() {
    return this._initialized && this._module !== null;
  },
  
  /**
   * Process image with gamma-correct block averaging (WASM or JS fallback)
   * @param {ImageData|Uint8ClampedArray} imageData - Source image data
   * @param {number} sourceWidth - Source width
   * @param {number} sourceHeight - Source height
   * @param {number} targetCols - Target columns
   * @param {number} targetRows - Target rows
   * @param {boolean} [useGamma=true] - Use gamma correction
   * @returns {Array<{x, y, color}>} PXS cell array
   */
  processImage(imageData, sourceWidth, sourceHeight, targetCols, targetRows, useGamma = true) {
    const data = imageData.data || imageData;
    
    if (this.isAvailable()) {
      return this._processImageWasm(data, sourceWidth, sourceHeight, targetCols, targetRows, useGamma);
    } else {
      return this._processImageJS(data, sourceWidth, sourceHeight, targetCols, targetRows, useGamma);
    }
  },
  
  /**
   * WASM implementation of image processing
   * @private
   */
  _processImageWasm(data, sourceWidth, sourceHeight, targetCols, targetRows, useGamma) {
    // This would call the actual WASM function
    // For now, fall back to JS until WASM is compiled
    return this._processImageJS(data, sourceWidth, sourceHeight, targetCols, targetRows, useGamma);
  },
  
  /**
   * JavaScript fallback for image processing (same algorithm as Rust)
   * @private
   */
  _processImageJS(data, sourceWidth, sourceHeight, targetCols, targetRows, useGamma) {
    const gamma = 2.2;
    const blockWidth = sourceWidth / targetCols;
    const blockHeight = sourceHeight / targetRows;
    
    const cells = [];
    
    for (let cellY = 0; cellY < targetRows; cellY++) {
      for (let cellX = 0; cellX < targetCols; cellX++) {
        // Calculate source block bounds
        const srcX1 = Math.floor(cellX * blockWidth);
        const srcY1 = Math.floor(cellY * blockHeight);
        const srcX2 = Math.min(Math.floor((cellX + 1) * blockWidth), sourceWidth);
        const srcY2 = Math.min(Math.floor((cellY + 1) * blockHeight), sourceHeight);
        
        // Accumulate colors
        let rSum = 0, gSum = 0, bSum = 0, count = 0;
        
        for (let y = srcY1; y < srcY2; y++) {
          for (let x = srcX1; x < srcX2; x++) {
            const idx = (y * sourceWidth + x) * 4;
            
            const r = data[idx] / 255;
            const g = data[idx + 1] / 255;
            const b = data[idx + 2] / 255;
            
            if (useGamma) {
              // Convert to linear space
              rSum += Math.pow(r, gamma);
              gSum += Math.pow(g, gamma);
              bSum += Math.pow(b, gamma);
            } else {
              rSum += r;
              gSum += g;
              bSum += b;
            }
            count++;
          }
        }
        
        // Calculate average and convert back
        let finalR, finalG, finalB;
        
        if (count > 0) {
          if (useGamma) {
            finalR = Math.pow(rSum / count, 1 / gamma);
            finalG = Math.pow(gSum / count, 1 / gamma);
            finalB = Math.pow(bSum / count, 1 / gamma);
          } else {
            finalR = rSum / count;
            finalG = gSum / count;
            finalB = bSum / count;
          }
        } else {
          finalR = finalG = finalB = 0;
        }
        
        // Clamp and format
        const r = Math.round(Math.max(0, Math.min(1, finalR)) * 255);
        const g = Math.round(Math.max(0, Math.min(1, finalG)) * 255);
        const b = Math.round(Math.max(0, Math.min(1, finalB)) * 255);
        
        cells.push({
          x: cellX,
          y: cellY,
          color: `rgb(${r}, ${g}, ${b})`
        });
      }
    }
    
    return cells;
  },
  
  /**
   * Create a high-performance pixel grid
   * Uses WASM for large grids, JS for small ones
   * @param {number} cols - Columns
   * @param {number} rows - Rows
   * @returns {Object} Grid object with methods
   */
  createGrid(cols, rows) {
    if (this.isAvailable() && cols * rows > 10000) {
      // Use WASM for large grids
      return this._createWasmGrid(cols, rows);
    }
    return this._createJSGrid(cols, rows);
  },
  
  /**
   * Create WASM-backed grid
   * @private
   */
  _createWasmGrid(cols, rows) {
    // Placeholder - would use actual WASM PixelGrid
    return this._createJSGrid(cols, rows);
  },
  
  /**
   * Create JS grid
   * @private
   */
  _createJSGrid(cols, rows) {
    const cells = new Uint32Array(cols * rows);
    cells.fill(0x2A2A2AFF); // Default dark gray
    
    return {
      cols,
      rows,
      cells,
      
      setCell(x, y, color) {
        if (x >= 0 && x < cols && y >= 0 && y < rows) {
          cells[y * cols + x] = color;
        }
      },
      
      getCell(x, y) {
        if (x >= 0 && x < cols && y >= 0 && y < rows) {
          return cells[y * cols + x];
        }
        return 0;
      },
      
      fill(color) {
        cells.fill(color);
      },
      
      toArray() {
        return Array.from(cells);
      },
      
      toPXSFrame() {
        const frameCells = [];
        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
            const c = cells[y * cols + x];
            const r = (c >> 24) & 0xFF;
            const g = (c >> 16) & 0xFF;
            const b = (c >> 8) & 0xFF;
            frameCells.push({
              x,
              y,
              color: `rgb(${r}, ${g}, ${b})`
            });
          }
        }
        return { cols, rows, cells: frameCells };
      }
    };
  },
  
  /**
   * Interpolate between two color arrays (for transitions)
   * @param {Uint32Array} frameA - First frame colors
   * @param {Uint32Array} frameB - Second frame colors
   * @param {number} t - Interpolation factor (0-1)
   * @returns {Uint32Array} Interpolated colors
   */
  interpolateFrames(frameA, frameB, t) {
    if (frameA.length !== frameB.length) {
      return frameA;
    }
    
    const result = new Uint32Array(frameA.length);
    
    for (let i = 0; i < frameA.length; i++) {
      const a = frameA[i];
      const b = frameB[i];
      
      const ar = (a >> 24) & 0xFF;
      const ag = (a >> 16) & 0xFF;
      const ab = (a >> 8) & 0xFF;
      
      const br = (b >> 24) & 0xFF;
      const bg = (b >> 16) & 0xFF;
      const bb = (b >> 8) & 0xFF;
      
      const r = Math.round(ar + (br - ar) * t);
      const g = Math.round(ag + (bg - ag) * t);
      const blue = Math.round(ab + (bb - ab) * t);
      
      result[i] = (r << 24) | (g << 16) | (blue << 8) | 0xFF;
    }
    
    return result;
  }
};

// Make available globally
if (typeof window !== 'undefined') {
  window.PXSWasm = PXSWasm;
}

// Module export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PXSWasm;
}
