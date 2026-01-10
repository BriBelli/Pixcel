/**
 * CellAnimator - A powerful grid-based cell animation library
 * @class
 */
class CellAnimator {
    /**
     * Create a new CellAnimator instance
     * @param {Object} config - Configuration object
     * @param {string|number} config.width - Canvas width (pixels or '100%')
     * @param {string|number} config.height - Canvas height (pixels or '100%')
     * @param {number} config.cellWidth - Individual cell width in pixels
     * @param {number} config.cellHeight - Individual cell height in pixels
     * @param {HTMLElement} config.container - Container element to render grid into
     * @param {string} config.renderMode - Rendering mode: 'html', 'canvas', 'webgl', 'auto' (default: 'html')
     */
    constructor(config) {
        // Validate required config
        if (!config) {
            throw new Error('CellAnimator: Configuration object is required');
        }
        if (!config.container) {
            throw new Error('CellAnimator: Container element is required');
        }

        // Store configuration
        this.config = {
            width: config.width || '100%',
            height: config.height || '100%',
            cellWidth: config.cellWidth || 25,
            cellHeight: config.cellHeight || 25,
            container: config.container,
            renderMode: config.renderMode || 'html',
            cellBorders: config.cellBorders !== undefined ? config.cellBorders : true,
            borderColor: config.borderColor || 'transparent',
            borderWidth: config.borderWidth || 1,
            borderStyle: config.borderStyle || 'solid'
        };

        // Initialize state
        this.state = {
            initialized: false,
            canvasWidth: 0,
            canvasHeight: 0,
            columns: 0,
            rows: 0,
            totalCells: 0
        };

        // Cell storage: Map for O(1) lookups
        // Key format: "x-y" (e.g., "0-0", "5-10")
        this.cells = new Map();

        // Track active animations
        this.activeAnimations = new Map();

        // Event listeners
        this.eventListeners = new Map();

        // Renderer instance (will be created in init)
        this.renderer = null;
        
        // Determine and store final render mode
        this.renderMode = this._determineRenderMode(this.config.renderMode);
    }
    
    /**
     * Determine the best render mode based on configuration and cell count
     * @private
     * @param {string} requestedMode - Requested render mode
     * @returns {string} Final render mode to use
     */
    _determineRenderMode(requestedMode) {
        if (requestedMode !== 'auto') {
            return requestedMode;
        }
        
        // For auto mode, we'll decide after calculating grid size in init()
        // For now, default to HTML
        return 'html';
    }
    
    /**
     * Create appropriate renderer instance based on render mode
     * @private
     * @returns {BaseRenderer} Renderer instance
     */
    _createRenderer() {
        switch(this.renderMode) {
            case 'html':
                return new HTMLRenderer(this);
            case 'canvas':
                return new CanvasRenderer(this);
            case 'webgl':
                // Will be implemented in Phase 7
                throw new Error('WebGL renderer not yet implemented. Coming in Phase 7!');
            default:
                console.warn(`Unknown render mode: ${this.renderMode}, falling back to HTML`);
                return new HTMLRenderer(this);
        }
    }

    /**
     * Initialize the grid and render it
     * @returns {Promise<Object>} Grid information
     */
    async init() {
        if (this.state.initialized) {
            console.warn('CellAnimator: Already initialized');
            return this.getGridInfo();
        }

        try {
            // Calculate canvas dimensions
            this.state.canvasWidth = this.config.width === '100%' 
                ? this.config.container.clientWidth 
                : parseInt(this.config.width);
            
            this.state.canvasHeight = this.config.height === '100%' 
                ? this.config.container.clientHeight 
                : parseInt(this.config.height);

            // Calculate grid dimensions
            this.state.columns = Math.floor(this.state.canvasWidth / this.config.cellWidth);
            this.state.rows = Math.floor(this.state.canvasHeight / this.config.cellHeight);
            this.state.totalCells = this.state.columns * this.state.rows;

            // Auto mode: decide based on cell count
            if (this.config.renderMode === 'auto') {
                this.renderMode = this._selectAutoRenderMode();
            }

            // Create renderer instance
            this.renderer = this._createRenderer();

            // Initialize renderer (generates grid)
            await this.renderer.init();

            this.state.initialized = true;

            // Emit gridReady event
            this._emit('gridReady', this.getGridInfo());

            return this.getGridInfo();
        } catch (error) {
            throw new Error(`CellAnimator initialization failed: ${error.message}`);
        }
    }

    /**
     * Select render mode automatically based on grid size
     * @private
     * @returns {string} Selected render mode
     */
    _selectAutoRenderMode() {
        const { totalCells } = this.state;
        
        if (totalCells < 10000) {
            return 'html';  // Perfect for small grids
        } else if (totalCells < 1000000) {
            return 'canvas';  // Optimal for medium-large grids (1080p, 4K)
        } else {
            // WebGL would be needed, but not implemented yet
            console.warn(`CellAnimator: ${totalCells} cells detected. WebGL mode recommended but not yet available. Using Canvas (may be slow).`);
            return 'canvas';
        }
    }

    /**
     * Get cell by coordinates
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {Object|null} Cell data or null if not found
     */
    getCell(x, y) {
        const key = `${x}-${y}`;
        return this.cells.get(key) || null;
    }

    /**
     * Get multiple cells by coordinates
     * @param {Array<{x: number, y: number}>} coordinates - Array of coordinate objects
     * @returns {Array<Object>} Array of cell data
     */
    getCellsByCoordinates(coordinates) {
        return coordinates
            .map(coord => this.getCell(coord.x, coord.y))
            .filter(cell => cell !== null);
    }

    /**
     * Get cells in a rectangular region
     * @param {number} startX - Starting X coordinate
     * @param {number} startY - Starting Y coordinate
     * @param {number} width - Width in cells
     * @param {number} height - Height in cells
     * @returns {Array<Object>} Array of cell data
     */
    getCellsInRegion(startX, startY, width, height) {
        const cells = [];
        for (let y = startY; y < startY + height; y++) {
            for (let x = startX; x < startX + width; x++) {
                const cell = this.getCell(x, y);
                if (cell) cells.push(cell);
            }
        }
        return cells;
    }

    /**
     * Get all cells
     * @returns {Array<Object>} Array of all cell data
     */
    getAllCells() {
        return Array.from(this.cells.values());
    }

    /**
     * Update a cell's styles
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {Object} styles - CSS styles to apply
     */
    updateCell(x, y, styles) {
        const cell = this.getCell(x, y);
        if (!cell) {
            console.warn(`CellAnimator: Cell at (${x}, ${y}) not found`);
            return;
        }

        // Delegate to renderer
        this.renderer.updateCell(x, y, styles);

        this._emit('cellUpdate', { x, y, styles });
    }

    /**
     * Update multiple cells at once
     * @param {Array<{x: number, y: number, styles: Object}>} updates - Array of update objects
     */
    updateCells(updates) {
        updates.forEach(update => {
            this.updateCell(update.x, update.y, update.styles);
        });
    }

    /**
     * Animate a cell
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {Object} animation - Animation properties
     * @param {string} animation.name - Animation name (CSS animation)
     * @param {string} animation.duration - Duration (e.g., '1s')
     * @param {string} animation.timing - Timing function (e.g., 'ease-in-out')
     * @param {string} animation.delay - Delay (e.g., '0.5s')
     * @param {string} animation.iteration - Iteration count (e.g., 'infinite', '3')
     */
    animateCell(x, y, animation) {
        const cell = this.getCell(x, y);
        if (!cell) {
            console.warn(`CellAnimator: Cell at (${x}, ${y}) not found`);
            return;
        }

        // Delegate to renderer
        this.renderer.animateCell(x, y, animation);

        // Track active animation
        const key = `${x}-${y}`;
        this.activeAnimations.set(key, animation);

        this._emit('animationStart', { x, y, animation });
    }

    /**
     * Animate multiple cells
     * @param {Array<{x: number, y: number, animation: Object}>} animations - Array of animation objects
     */
    animateCells(animations) {
        animations.forEach(anim => {
            this.animateCell(anim.x, anim.y, anim.animation);
        });
    }

    /**
     * Stop animation on a cell
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
    stopAnimation(x, y) {
        const cell = this.getCell(x, y);
        if (!cell) return;

        // Delegate to renderer
        this.renderer.stopAnimation(x, y);

        const key = `${x}-${y}`;
        this.activeAnimations.delete(key);

        this._emit('animationStop', { x, y });
    }

    /**
     * Stop all animations
     */
    stopAllAnimations() {
        // Delegate to renderer
        this.renderer.stopAllAnimations();
        
        this.activeAnimations.clear();

        this._emit('allAnimationsStop');
    }

    /**
     * Reset a cell to default state
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
    resetCell(x, y) {
        const cell = this.getCell(x, y);
        if (!cell) return;

        // Delegate to renderer
        this.renderer.resetCell(x, y);

        this._emit('cellReset', { x, y });
    }

    /**
     * Reset all cells
     */
    resetAllCells() {
        // Delegate to renderer
        this.renderer.resetAllCells();

        this._emit('allCellsReset');
    }

    /**
     * Get grid information
     * @returns {Object} Grid info
     */
    getGridInfo() {
        const rendererInfo = this.renderer ? this.renderer.getRendererInfo() : { type: 'none', mode: 'none' };
        
        return {
            width: this.state.canvasWidth,
            height: this.state.canvasHeight,
            columns: this.state.columns,
            rows: this.state.rows,
            totalCells: this.state.totalCells,
            cellWidth: this.config.cellWidth,
            cellHeight: this.config.cellHeight,
            initialized: this.state.initialized,
            renderMode: this.renderMode,
            renderer: rendererInfo
        };
    }

    /**
     * Register an event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    /**
     * Remove an event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function to remove
     */
    off(event, callback) {
        if (!this.eventListeners.has(event)) return;
        
        const listeners = this.eventListeners.get(event);
        const index = listeners.indexOf(callback);
        if (index > -1) {
            listeners.splice(index, 1);
        }
    }

    /**
     * Emit an event
     * @private
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    _emit(event, data) {
        if (!this.eventListeners.has(event)) return;
        
        this.eventListeners.get(event).forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`CellAnimator event error (${event}):`, error);
            }
        });
    }

    /**
     * Destroy the animator and clean up
     */
    destroy() {
        // Stop all animations
        this.stopAllAnimations();

        // Clear event listeners
        this.eventListeners.clear();

        // Destroy renderer
        if (this.renderer) {
            this.renderer.destroy();
            this.renderer = null;
        }

        // Clear cells
        this.cells.clear();
        this.activeAnimations.clear();

        // Reset state
        this.state.initialized = false;

        this._emit('destroy');
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CellAnimator;
}

// Export for browser
if (typeof window !== 'undefined') {
    window.CellAnimator = CellAnimator;
}
