/**
 * ImageHelpers - Image loading, processing, and data conversion utilities
 * 
 * Core principle: Images are DATA, not files. Every image converts to an array
 * of cell objects that can be stored, edited, transmitted, and rendered.
 * 
 * @example
 * // Load image and get data
 * const frameData = await ImageHelpers.loadImage('photo.jpg', { cols: 64, rows: 48 });
 * 
 * // frameData = {
 * //   cols: 64,
 * //   rows: 48,
 * //   cells: [{ x: 0, y: 0, color: '#2A2A2A' }, ...],
 * //   metadata: { source: 'photo.jpg', timestamp: 1642..., version: '2.0.0' }
 * // }
 * 
 * // Render it
 * animator.setData(frameData);
 * 
 * // Edit it
 * frameData.cells[100].color = '#FF0000';
 * animator.setData(frameData);
 * 
 * // Export it
 * const json = JSON.stringify(frameData);
 */

class ImageHelpers {
  /**
   * PXS Version for metadata
   */
  static VERSION = '2.0.0';
  
  /**
   * Quality presets
   */
  static QUALITY_PRESETS = {
    retro: 16,
    low: 32,
    medium: 64,
    high: 128,
    hd: 200,
    ultra: 300
  };
  
  /**
   * Load an image and convert to PXSFrame data
   * @param {string|File|HTMLImageElement|Blob} source - Image source
   * @param {Object} options - Processing options
   * @param {number} [options.cols] - Target columns (width in cells)
   * @param {number} [options.rows] - Target rows (height in cells)
   * @param {string} [options.quality='medium'] - Quality preset: 'retro', 'low', 'medium', 'high', 'hd', 'ultra'
   * @param {boolean} [options.preserveAspect=true] - Maintain image aspect ratio
   * @param {boolean} [options.gammaCorrect=true] - Apply gamma correction for accurate color averaging
   * @returns {Promise<PXSFrame>} Frame data object
   */
  static async loadImage(source, options = {}) {
    const {
      cols,
      rows,
      quality = 'medium',
      preserveAspect = true,
      gammaCorrect = true
    } = options;
    
    // Load the image element
    const img = await this._loadImageElement(source);
    
    // Calculate target dimensions
    const { targetCols, targetRows } = this._calculateDimensions(
      img.width, 
      img.height, 
      cols, 
      rows, 
      quality, 
      preserveAspect
    );
    
    // Convert to cell data using block averaging
    const cells = await this._imageToData(img, targetCols, targetRows, gammaCorrect);
    
    // Build PXSFrame
    return {
      cols: targetCols,
      rows: targetRows,
      cells,
      metadata: {
        source: typeof source === 'string' ? source : source.name || 'uploaded',
        sourceWidth: img.width,
        sourceHeight: img.height,
        timestamp: Date.now(),
        version: this.VERSION,
        options: { quality, preserveAspect, gammaCorrect }
      }
    };
  }
  
  /**
   * Load image element from various sources
   * @private
   */
  static async _loadImageElement(source) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      
      if (typeof source === 'string') {
        // URL or data URL
        img.src = source;
      } else if (source instanceof HTMLImageElement) {
        // Already an image element
        if (source.complete) {
          resolve(source);
        } else {
          source.onload = () => resolve(source);
          source.onerror = reject;
        }
        return;
      } else if (source instanceof File || source instanceof Blob) {
        // File or Blob
        const reader = new FileReader();
        reader.onload = (e) => { img.src = e.target.result; };
        reader.onerror = reject;
        reader.readAsDataURL(source);
      } else {
        reject(new Error('Invalid image source type'));
      }
    });
  }
  
  /**
   * Calculate target dimensions based on options
   * @private
   */
  static _calculateDimensions(imgWidth, imgHeight, cols, rows, quality, preserveAspect) {
    const aspect = imgWidth / imgHeight;
    
    // If both cols and rows specified, use them
    if (cols && rows) {
      return { targetCols: cols, targetRows: rows };
    }
    
    // Get max size from quality preset or explicit value
    const maxSize = typeof quality === 'number' 
      ? quality 
      : (this.QUALITY_PRESETS[quality] || this.QUALITY_PRESETS.medium);
    
    let targetCols, targetRows;
    
    if (preserveAspect) {
      if (aspect >= 1) {
        // Landscape
        targetCols = maxSize;
        targetRows = Math.round(maxSize / aspect);
      } else {
        // Portrait
        targetRows = maxSize;
        targetCols = Math.round(maxSize * aspect);
      }
    } else {
      // Square output
      targetCols = cols || maxSize;
      targetRows = rows || maxSize;
    }
    
    // Enforce minimums
    targetCols = Math.max(8, targetCols);
    targetRows = Math.max(8, targetRows);
    
    return { targetCols, targetRows };
  }
  
  /**
   * Convert image to cell data using block averaging with optional gamma correction
   * @private
   */
  static async _imageToData(img, cols, rows, gammaCorrect = true) {
    // Create canvas at source resolution
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    
    const sourceData = ctx.getImageData(0, 0, img.width, img.height);
    const sourcePixels = sourceData.data;
    
    // Calculate block size
    const blockWidth = img.width / cols;
    const blockHeight = img.height / rows;
    
    // Process each cell
    const cells = [];
    
    for (let cellY = 0; cellY < rows; cellY++) {
      for (let cellX = 0; cellX < cols; cellX++) {
        // Calculate source block bounds
        const srcX1 = Math.floor(cellX * blockWidth);
        const srcY1 = Math.floor(cellY * blockHeight);
        const srcX2 = Math.min(Math.floor((cellX + 1) * blockWidth), img.width);
        const srcY2 = Math.min(Math.floor((cellY + 1) * blockHeight), img.height);
        
        // Average all pixels in this block
        let r = 0, g = 0, b = 0, count = 0;
        
        for (let y = srcY1; y < srcY2; y++) {
          for (let x = srcX1; x < srcX2; x++) {
            const idx = (y * img.width + x) * 4;
            
            if (gammaCorrect) {
              // Gamma-correct averaging (convert to linear space, average, convert back)
              // This produces more accurate color perception
              r += Math.pow(sourcePixels[idx] / 255, 2.2);
              g += Math.pow(sourcePixels[idx + 1] / 255, 2.2);
              b += Math.pow(sourcePixels[idx + 2] / 255, 2.2);
            } else {
              // Direct averaging (faster but less accurate)
              r += sourcePixels[idx];
              g += sourcePixels[idx + 1];
              b += sourcePixels[idx + 2];
            }
            count++;
          }
        }
        
        // Calculate final color
        let finalR, finalG, finalB;
        
        if (gammaCorrect && count > 0) {
          // Convert back from linear space
          finalR = Math.round(Math.pow(r / count, 1 / 2.2) * 255);
          finalG = Math.round(Math.pow(g / count, 1 / 2.2) * 255);
          finalB = Math.round(Math.pow(b / count, 1 / 2.2) * 255);
        } else if (count > 0) {
          finalR = Math.round(r / count);
          finalG = Math.round(g / count);
          finalB = Math.round(b / count);
        } else {
          finalR = finalG = finalB = 0;
        }
        
        // Clamp values
        finalR = Math.max(0, Math.min(255, finalR));
        finalG = Math.max(0, Math.min(255, finalG));
        finalB = Math.max(0, Math.min(255, finalB));
        
        cells.push({
          x: cellX,
          y: cellY,
          color: `rgb(${finalR}, ${finalG}, ${finalB})`
        });
      }
    }
    
    return cells;
  }
  
  /**
   * Convert hex color to RGB object
   * @param {string} hex - Hex color string
   * @returns {Object} RGB object { r, g, b }
   */
  static hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }
  
  /**
   * Convert RGB to hex color
   * @param {number} r - Red (0-255)
   * @param {number} g - Green (0-255)
   * @param {number} b - Blue (0-255)
   * @returns {string} Hex color string
   */
  static rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
      const hex = Math.round(x).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }
  
  /**
   * Create a blank PXSFrame
   * @param {number} cols - Number of columns
   * @param {number} rows - Number of rows
   * @param {string} [fillColor='#2A2A2A'] - Default cell color
   * @returns {PXSFrame} Blank frame data
   */
  static createBlankFrame(cols, rows, fillColor = '#2A2A2A') {
    const cells = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        cells.push({ x, y, color: fillColor });
      }
    }
    
    return {
      cols,
      rows,
      cells,
      metadata: {
        source: 'blank',
        timestamp: Date.now(),
        version: this.VERSION
      }
    };
  }
  
  /**
   * Clone a PXSFrame (deep copy)
   * @param {PXSFrame} frame - Frame to clone
   * @returns {PXSFrame} Cloned frame
   */
  static cloneFrame(frame) {
    return {
      cols: frame.cols,
      rows: frame.rows,
      cells: frame.cells.map(cell => ({ ...cell })),
      metadata: { ...frame.metadata, timestamp: Date.now() }
    };
  }
  
  /**
   * Get a specific cell from frame data
   * @param {PXSFrame} frame - Frame data
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {Object|null} Cell object or null if not found
   */
  static getCell(frame, x, y) {
    return frame.cells.find(cell => cell.x === x && cell.y === y) || null;
  }
  
  /**
   * Update a specific cell in frame data
   * @param {PXSFrame} frame - Frame data
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {string} color - New color
   * @returns {PXSFrame} Updated frame (mutates original)
   */
  static updateCell(frame, x, y, color) {
    const cell = this.getCell(frame, x, y);
    if (cell) {
      cell.color = color;
    }
    return frame;
  }
  
  /**
   * Validate a PXSFrame object
   * @param {Object} data - Data to validate
   * @returns {boolean} True if valid PXSFrame
   */
  static validateFrame(data) {
    if (!data || typeof data !== 'object') return false;
    if (typeof data.cols !== 'number' || typeof data.rows !== 'number') return false;
    if (!Array.isArray(data.cells)) return false;
    if (data.cells.length !== data.cols * data.rows) return false;
    
    // Validate cell structure
    return data.cells.every(cell => 
      typeof cell.x === 'number' && 
      typeof cell.y === 'number' && 
      typeof cell.color === 'string'
    );
  }
  
  /**
   * Compress frame data for storage/transmission
   * Uses a more compact format: [cols, rows, [colors...]]
   * @param {PXSFrame} frame - Frame data
   * @returns {Object} Compressed frame
   */
  static compressFrame(frame) {
    // Sort cells by position for consistent ordering
    const sortedCells = [...frame.cells].sort((a, b) => 
      (a.y * frame.cols + a.x) - (b.y * frame.cols + b.x)
    );
    
    return {
      c: frame.cols,
      r: frame.rows,
      d: sortedCells.map(cell => cell.color),
      m: frame.metadata
    };
  }
  
  /**
   * Decompress frame data
   * @param {Object} compressed - Compressed frame
   * @returns {PXSFrame} Full frame data
   */
  static decompressFrame(compressed) {
    const cells = [];
    let i = 0;
    
    for (let y = 0; y < compressed.r; y++) {
      for (let x = 0; x < compressed.c; x++) {
        cells.push({
          x,
          y,
          color: compressed.d[i++]
        });
      }
    }
    
    return {
      cols: compressed.c,
      rows: compressed.r,
      cells,
      metadata: compressed.m || {}
    };
  }
}

// Make available globally
if (typeof window !== 'undefined') {
  window.ImageHelpers = ImageHelpers;
}

// Module export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ImageHelpers;
}
