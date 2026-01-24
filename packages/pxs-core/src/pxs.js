/**
 * PXS - Pixel Cell Animation Library
 * 
 * A revolutionary digital creation platform treating every pixel as a first-class citizen.
 * Perfect for pixel art, LED displays, motion graphics, data visualizations, and games.
 * 
 * Philosophy: "Stay Pure" - Each cell is one solid color. Gradients emerge from arrangement.
 * 
 * @version 2.0.0
 * @phase 2C - Advanced Performance & 3D Readiness
 * 
 * Features:
 * - Pluggable renderers (HTML/Canvas/WebGL planned)
 * - Viewport culling for massive grids (1M+ cells)
 * - Spatial indexing (Quadtree) for O(log n) queries
 * - Transform matrices (2D/3D ready)
 * - Object pooling for reduced GC pressure
 * - Real-time performance profiling
 * - Cell groups for batch operations
 * - Pattern helpers for gradient generation
 */

// Version info
const PXS_VERSION = {
  name: 'PXS',
  version: '2.0.0',
  phase: '2C',
  phaseTitle: 'Advanced Performance & 3D Readiness'
};

/**
 * PXS Factory - Main entry point for creating PXS instances
 */
const PXS = {
  /**
   * Create a new CellAnimator instance
   * @param {Object} config - Configuration options
   * @returns {CellAnimator} CellAnimator instance
   */
  create(config) {
    if (typeof CellAnimator === 'undefined') {
      throw new Error('PXS: CellAnimator class not loaded. Make sure all dependencies are included.');
    }
    return new CellAnimator(config);
  },
  
  /**
   * Create and initialize a CellAnimator instance
   * @param {Object} config - Configuration options
   * @returns {Promise<CellAnimator>} Initialized CellAnimator
   */
  async createAsync(config) {
    const animator = this.create(config);
    await animator.init();
    return animator;
  },
  
  /**
   * Get version information
   * @returns {Object} Version info
   */
  getVersion() {
    return { ...PXS_VERSION };
  },
  
  /**
   * Get available renderers
   * @returns {Array<string>} List of renderer names
   */
  getRenderers() {
    return ['html', 'canvas', 'webgl'];
  },
  
  /**
   * Check if a renderer is available
   * @param {string} name - Renderer name
   * @returns {boolean} True if available
   */
  hasRenderer(name) {
    switch (name.toLowerCase()) {
      case 'html':
        return typeof HTMLRenderer !== 'undefined';
      case 'canvas':
        return typeof CanvasRenderer !== 'undefined';
      case 'webgl':
        return false; // Coming in Phase 3
      default:
        return false;
    }
  },
  
  /**
   * Get pattern helpers
   * @returns {PatternHelpers} PatternHelpers class
   */
  get patterns() {
    if (typeof PatternHelpers === 'undefined') {
      throw new Error('PXS: PatternHelpers not loaded');
    }
    return PatternHelpers;
  },
  
  /**
   * Create a new transform matrix
   * @param {string} type - '2d' or '3d'
   * @returns {TransformMatrix|TransformMatrix3D} Matrix instance
   */
  createMatrix(type = '2d') {
    if (type === '3d') {
      if (typeof TransformMatrix3D === 'undefined') {
        throw new Error('PXS: TransformMatrix3D not loaded');
      }
      return new TransformMatrix3D();
    }
    
    if (typeof TransformMatrix === 'undefined') {
      throw new Error('PXS: TransformMatrix not loaded');
    }
    return new TransformMatrix();
  },
  
  /**
   * Create an object pool
   * @param {Function} factory - Factory function
   * @param {Function} reset - Reset function
   * @param {Object} options - Pool options
   * @returns {ObjectPool} Pool instance
   */
  createPool(factory, reset, options) {
    if (typeof ObjectPool === 'undefined') {
      throw new Error('PXS: ObjectPool not loaded');
    }
    return new ObjectPool(factory, reset, options);
  },
  
  /**
   * Recommended configuration presets
   */
  presets: {
    /**
     * Small grid (< 1000 cells) - Perfect for icons, UI elements
     */
    small: {
      cellWidth: 20,
      cellHeight: 20,
      renderMode: 'html',
      enableProfiling: false,
      enableViewport: false,
      enableSpatialIndex: false,
      cellBorders: true
    },
    
    /**
     * Medium grid (1K - 10K cells) - UI regions, small visualizations
     */
    medium: {
      cellWidth: 10,
      cellHeight: 10,
      renderMode: 'auto',
      enableProfiling: true,
      enableViewport: false,
      enableSpatialIndex: true,
      cellBorders: true
    },
    
    /**
     * Large grid (10K - 100K cells) - Full-screen, complex visualizations
     */
    large: {
      cellWidth: 5,
      cellHeight: 5,
      renderMode: 'canvas',
      enableProfiling: true,
      enableViewport: true,
      enableSpatialIndex: true,
      cellBorders: false
    },
    
    /**
     * Massive grid (100K+ cells) - 4K displays, maximum performance
     */
    massive: {
      cellWidth: 2,
      cellHeight: 2,
      renderMode: 'canvas',
      enableProfiling: true,
      enableViewport: true,
      enableSpatialIndex: true,
      cellBorders: false
    },
    
    /**
     * LED display simulation
     */
    led: {
      cellWidth: 8,
      cellHeight: 8,
      renderMode: 'canvas',
      enableProfiling: false,
      enableViewport: false,
      enableSpatialIndex: false,
      cellBorders: true,
      borderColor: '#000000',
      borderWidth: 2
    },
    
    /**
     * Pixel art (retro 8-bit style)
     */
    pixelArt: {
      cellWidth: 16,
      cellHeight: 16,
      renderMode: 'html',
      enableProfiling: false,
      enableViewport: false,
      enableSpatialIndex: false,
      cellBorders: false
    }
  }
};

// Expose globally
if (typeof window !== 'undefined') {
  window.PXS = PXS;
}

// Module export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PXS;
}

// ES Module export
export default PXS;
