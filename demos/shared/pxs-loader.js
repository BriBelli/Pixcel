/**
 * PXS Loader - Dynamic script loader for PXS library
 * Handles loading all required modules in correct order
 */

const PXSLoader = {
  basePath: '../src/',
  
  // Core modules in dependency order
  modules: [
    'renderers/BaseRenderer.js',
    'renderers/HTMLRenderer.js',
    'renderers/CanvasRenderer.js',
    'spatial/ViewportManager.js',
    'spatial/SpatialIndex.js',
    'performance/PerformanceProfiler.js',
    'performance/ObjectPool.js',
    'transforms/TransformMatrix.js',
    'core/CellGroup.js',
    'helpers/PatternHelpers.js',
    'CellAnimator.js'
  ],
  
  loaded: false,
  loadPromise: null,
  
  /**
   * Load all PXS modules
   * @returns {Promise<void>}
   */
  async load() {
    if (this.loaded) {
      return Promise.resolve();
    }
    
    if (this.loadPromise) {
      return this.loadPromise;
    }
    
    this.loadPromise = new Promise(async (resolve, reject) => {
      try {
        console.log('[PXS] Loading modules...');
        const startTime = performance.now();
        
        for (const module of this.modules) {
          await this.loadScript(this.basePath + module);
        }
        
        const loadTime = (performance.now() - startTime).toFixed(2);
        console.log(`[PXS] All modules loaded in ${loadTime}ms`);
        
        this.loaded = true;
        resolve();
      } catch (error) {
        console.error('[PXS] Failed to load modules:', error);
        reject(error);
      }
    });
    
    return this.loadPromise;
  },
  
  /**
   * Load a single script
   * @param {string} src - Script source path
   * @returns {Promise<void>}
   */
  loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      // Add cache-busting for development
      script.src = src + '?v=' + Date.now();
      script.onload = () => {
        console.log(`[PXS] Loaded: ${src.split('/').pop()}`);
        resolve();
      };
      script.onerror = () => reject(new Error(`Failed to load: ${src}`));
      document.head.appendChild(script);
    });
  },
  
  /**
   * Create and initialize a CellAnimator instance
   * @param {Object} config - CellAnimator configuration
   * @returns {Promise<CellAnimator>}
   */
  async create(config) {
    await this.load();
    
    if (typeof CellAnimator === 'undefined') {
      throw new Error('CellAnimator not loaded');
    }
    
    const animator = new CellAnimator(config);
    await animator.init();
    
    return animator;
  },
  
  /**
   * Check if PXS is loaded
   * @returns {boolean}
   */
  isLoaded() {
    return this.loaded && typeof CellAnimator !== 'undefined';
  },
  
  /**
   * Get version info
   * @returns {Object}
   */
  getVersion() {
    return {
      name: 'PXS',
      version: '2.0.0',
      phase: '2C - Advanced Performance & 3D Readiness',
      renderers: ['HTML', 'Canvas'],
      features: [
        'CSS Grid Layout',
        'Canvas 2D Rendering',
        'Viewport Culling',
        'Spatial Indexing (Quadtree)',
        'Transform Matrices (2D/3D)',
        'Object Pooling',
        'Performance Profiling',
        'Cell Groups',
        'Pattern Helpers'
      ]
    };
  }
};

// Auto-expose to window
if (typeof window !== 'undefined') {
  window.PXS = PXSLoader;
}
