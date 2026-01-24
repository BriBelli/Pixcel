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
     * @param {boolean} config.enableProfiling - Enable performance profiling (default: false)
     * @param {boolean} config.enableViewport - Enable viewport culling (default: false for small grids)
     * @param {boolean} config.enableSpatialIndex - Enable spatial indexing (default: false)
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
            borderStyle: config.borderStyle || 'solid',
            enableProfiling: config.enableProfiling || false,
            enableViewport: config.enableViewport || false,
            enableSpatialIndex: config.enableSpatialIndex || false,
            backgroundColor: config.backgroundColor || '#0d1117', // Grid container background
            defaultCellOpacity: config.defaultCellOpacity !== undefined ? config.defaultCellOpacity : 1.0 // Default cell opacity (0-1)
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

        // Phase 2C: Performance systems (initialized in init())
        this.viewportManager = null;
        this.spatialIndex = null;
        this.profiler = null;
        this.groupManager = null;
        this.cellTransforms = new Map(); // "x-y" -> TransformMatrix
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
                if (typeof WebGLRenderer === 'undefined') {
                    console.warn('WebGLRenderer not loaded, falling back to Canvas');
                    return new CanvasRenderer(this);
                }
                return new WebGLRenderer(this);
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
                
                // Auto-enable Phase 2C systems for large grids
                if (this.state.totalCells >= 10000) {
                    this.config.enableViewport = true;
                    this.config.enableSpatialIndex = true;
                }
            }

            // Phase 2C: Initialize ViewportManager
            if (this.config.enableViewport || this.state.totalCells >= 10000) {
                if (typeof ViewportManager !== 'undefined') {
                    this.viewportManager = new ViewportManager(this);
                    
                    // Set initial viewport to container size (visible area), not grid size
                    const viewportWidth = this.config.container.clientWidth;
                    const viewportHeight = this.config.container.clientHeight;
                    
                    this.viewportManager.setViewport(
                        0, 0,
                        viewportWidth,
                        viewportHeight
                    );
                    // Enable viewport culling
                    this.viewportManager.enableCulling();
                    
                    console.log('[CellAnimator] Viewport initialized:', {
                        viewport: `${viewportWidth}x${viewportHeight}`,
                        grid: `${this.state.canvasWidth}x${this.state.canvasHeight}`,
                        cells: this.state.totalCells
                    });
                }
            }

            // Phase 2C: Initialize SpatialIndex
            if (this.config.enableSpatialIndex || this.state.totalCells >= 10000) {
                if (typeof SpatialIndex !== 'undefined') {
                    this.spatialIndex = new SpatialIndex({
                        x: 0,
                        y: 0,
                        width: this.state.columns,
                        height: this.state.rows
                    });
                }
            }

            // Phase 2C: Initialize PerformanceProfiler
            if (this.config.enableProfiling) {
                if (typeof PerformanceProfiler !== 'undefined') {
                    this.profiler = new PerformanceProfiler(this);
                    this.profiler.enable();
                    
                    // PerformanceProfiler emits through animator._emit(), no need to listen
                }
            }

            // Phase 2C: Initialize CellGroupManager
            if (typeof CellGroupManager !== 'undefined') {
                this.groupManager = new CellGroupManager();
            }

            // Create renderer instance
            this.renderer = this._createRenderer();

            // Initialize renderer (generates grid)
            await this.renderer.init();

            // Phase 2C: Populate spatial index with cells
            if (this.spatialIndex) {
                for (const cell of this.cells.values()) {
                    this.spatialIndex.insert({
                        x: cell.x,
                        y: cell.y,
                        bounds: {
                            x: cell.x,
                            y: cell.y,
                            width: 1,
                            height: 1
                        },
                        data: cell
                    });
                }
            }

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
        const result = [];
        for (let i = 0, len = coordinates.length; i < len; i++) {
            const coord = coordinates[i];
            const cell = this.cells.get(`${coord.x}-${coord.y}`);
            if (cell) result.push(cell);
        }
        return result;
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

        // Phase 2C: Profile update performance
        if (this.profiler) {
            this.profiler.startMark('updateCell');
        }

        // Delegate to renderer
        this.renderer.updateCell(x, y, styles);

        if (this.profiler) {
            this.profiler.endMark('updateCell');
            this._updateProfilerMetrics();
        }

        this._emit('cellUpdate', { x, y, styles });
    }

    /**
     * Update multiple cells at once
     * @param {Array<{x: number, y: number, styles: Object}>} updates - Array of update objects
     */
    updateCells(updates) {
        for (let i = 0, len = updates.length; i < len; i++) {
            const update = updates[i];
            this.updateCell(update.x, update.y, update.styles);
        }
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
        for (let i = 0, len = animations.length; i < len; i++) {
            const anim = animations[i];
            this.animateCell(anim.x, anim.y, anim.animation);
        }
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
        
        const info = {
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

        // Phase 2C: Add performance system info
        if (this.viewportManager) {
            info.viewport = this.getViewportInfo();
        }

        if (this.spatialIndex) {
            info.spatialIndex = this.spatialIndex.getStats();
        }

        if (this.profiler) {
            info.profiling = {
                enabled: this.profiler.enabled,
                metrics: this.profiler.getMetrics()
            };
        }

        if (this.groupManager) {
            const groups = this.groupManager.getAllGroups();
            info.groups = {
                count: groups.length,
                names: groups.map(g => g.name)
            };
        }

        return info;
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
        const listeners = this.eventListeners.get(event);
        if (!listeners) return;
        
        for (let i = 0, len = listeners.length; i < len; i++) {
            try {
                listeners[i](data);
            } catch (error) {
                console.error(`CellAnimator event error (${event}):`, error);
            }
        }
    }

    // ========================================
    // Phase 2C: Viewport Management Methods
    // ========================================

    /**
     * Set viewport bounds (for virtual scrolling)
     * @param {number} x - Viewport X position in pixels
     * @param {number} y - Viewport Y position in pixels
     * @param {number} width - Viewport width in pixels
     * @param {number} height - Viewport height in pixels
     */
    setViewport(x, y, width, height) {
        if (!this.viewportManager) {
            console.warn('CellAnimator: Viewport management not enabled');
            return;
        }

        this.viewportManager.setViewport(x, y, width, height);
        this._emit('viewportChanged', { x, y, width, height });
    }

    /**
     * Pan the viewport by delta pixels
     * @param {number} deltaX - X pan delta in pixels
     * @param {number} deltaY - Y pan delta in pixels
     */
    panViewport(deltaX, deltaY) {
        if (!this.viewportManager) {
            console.warn('CellAnimator: Viewport management not enabled');
            return;
        }

        this.viewportManager.pan(deltaX, deltaY);
        const viewport = this.viewportManager.viewport;
        this._emit('viewportPanned', { deltaX, deltaY, viewport });
    }

    /**
     * Zoom the viewport
     * @param {number} scale - Zoom scale factor
     * @param {number} [centerX] - Zoom center X (defaults to viewport center)
     * @param {number} [centerY] - Zoom center Y (defaults to viewport center)
     */
    zoomViewport(scale, centerX, centerY) {
        if (!this.viewportManager) {
            console.warn('CellAnimator: Viewport management not enabled');
            return;
        }

        this.viewportManager.zoom(scale, centerX, centerY);
        const viewport = this.viewportManager.viewport;
        this._emit('viewportZoomed', { scale, viewport });
    }

    /**
     * Center viewport on a specific cell
     * @param {number} x - Cell X coordinate
     * @param {number} y - Cell Y coordinate
     */
    centerOnCell(x, y) {
        if (!this.viewportManager) {
            console.warn('CellAnimator: Viewport management not enabled');
            return;
        }

        this.viewportManager.centerOnCell(x, y);
        this._emit('viewportCentered', { x, y });
    }

    /**
     * Get currently visible cells
     * @returns {Array<Object>} Array of visible cell data
     */
    getVisibleCells() {
        if (!this.viewportManager) {
            return this.getAllCells();
        }

        const visibleCoords = this.viewportManager.getVisibleCells();
        const result = [];
        for (let i = 0, len = visibleCoords.length; i < len; i++) {
            const coord = visibleCoords[i];
            const cell = this.cells.get(`${coord.x}-${coord.y}`);
            if (cell) result.push(cell);
        }
        return result;
    }

    /**
     * Get viewport information
     * @returns {Object|null} Viewport bounds and stats
     */
    getViewportInfo() {
        if (!this.viewportManager) return null;

        return {
            viewport: { ...this.viewportManager.viewport },
            visibleBounds: { ...this.viewportManager.visibleBounds },
            stats: this.viewportManager.getStats()
        };
    }

    // ========================================
    // Phase 2C: Group Management Methods
    // ========================================

    /**
     * Create a new cell group
     * @param {string} name - Group name
     * @param {Object} [options] - Group options
     * @returns {CellGroup} Created group
     */
    createGroup(name, options = {}) {
        if (!this.groupManager) {
            console.warn('CellAnimator: Group management not available');
            return null;
        }

        const group = this.groupManager.createGroup(name, options);
        this._emit('groupCreated', { name, options });
        return group;
    }

    /**
     * Get a group by name
     * @param {string} name - Group name
     * @returns {CellGroup|undefined} Group instance
     */
    getGroup(name) {
        if (!this.groupManager) return undefined;
        return this.groupManager.getGroup(name);
    }

    /**
     * Delete a group
     * @param {string} name - Group name
     * @returns {boolean} True if deleted
     */
    deleteGroup(name) {
        if (!this.groupManager) return false;

        const deleted = this.groupManager.deleteGroup(name);
        if (deleted) {
            this._emit('groupDeleted', { name });
        }
        return deleted;
    }

    /**
     * Update all cells in a group
     * @param {string} groupName - Group name
     * @param {Object} styles - Styles to apply
     */
    updateGroup(groupName, styles) {
        const group = this.getGroup(groupName);
        if (!group) {
            console.warn(`CellAnimator: Group "${groupName}" not found`);
            return;
        }

        const cells = group.getCells();
        for (let i = 0, len = cells.length; i < len; i++) {
            const cell = cells[i];
            this.updateCell(cell.x, cell.y, styles);
        }
        
        this._emit('groupUpdated', { groupName, cellCount: cells.length });
    }

    /**
     * Animate all cells in a group
     * @param {string} groupName - Group name
     * @param {Object} animation - Animation config
     */
    animateGroup(groupName, animation) {
        const group = this.getGroup(groupName);
        if (!group) {
            console.warn(`CellAnimator: Group "${groupName}" not found`);
            return;
        }

        const cells = group.getCells();
        for (let i = 0, len = cells.length; i < len; i++) {
            const cell = cells[i];
            this.animateCell(cell.x, cell.y, animation);
        }
        
        group.setAnimation(animation);
        this._emit('groupAnimated', { groupName, cellCount: cells.length, animation });
    }

    /**
     * Add cells to a group
     * @param {string} groupName - Group name
     * @param {Array<{x: number, y: number}>} cells - Cells to add
     */
    addCellsToGroup(groupName, cells) {
        const group = this.getGroup(groupName);
        if (!group) {
            console.warn(`CellAnimator: Group "${groupName}" not found`);
            return;
        }

        for (let i = 0, len = cells.length; i < len; i++) {
            const cell = cells[i];
            const cellData = this.cells.get(`${cell.x}-${cell.y}`);
            if (cellData) {
                group.addCell(cell.x, cell.y, cellData);
            }
        }

        this._emit('cellsAddedToGroup', { groupName, count: cells.length });
    }

    // ========================================
    // Phase 2C: Transform Methods
    // ========================================

    /**
     * Set transform matrix for a cell
     * @param {number} x - Cell X coordinate
     * @param {number} y - Cell Y coordinate
     * @param {TransformMatrix} matrix - Transform matrix
     */
    setTransform(x, y, matrix) {
        const cell = this.getCell(x, y);
        if (!cell) {
            console.warn(`CellAnimator: Cell at (${x}, ${y}) not found`);
            return;
        }

        const key = `${x}-${y}`;
        this.cellTransforms.set(key, matrix);

        // Apply transform via CSS
        const cssTransform = matrix.toCSSMatrix();
        this.updateCell(x, y, { transform: cssTransform });

        this._emit('transformSet', { x, y, transform: cssTransform });
    }

    /**
     * Rotate a cell
     * @param {number} x - Cell X coordinate
     * @param {number} y - Cell Y coordinate
     * @param {number} angle - Rotation angle in radians
     */
    rotateCell(x, y, angle) {
        if (typeof TransformMatrix === 'undefined') {
            console.warn('CellAnimator: TransformMatrix not loaded');
            return;
        }

        const key = `${x}-${y}`;
        let matrix = this.cellTransforms.get(key);
        
        if (!matrix) {
            matrix = new TransformMatrix();
            this.cellTransforms.set(key, matrix);
        }

        matrix.rotate(angle);
        this.setTransform(x, y, matrix);
    }

    /**
     * Scale a cell
     * @param {number} x - Cell X coordinate
     * @param {number} y - Cell Y coordinate
     * @param {number} sx - X scale factor
     * @param {number} [sy] - Y scale factor (defaults to sx)
     */
    scaleCell(x, y, sx, sy = sx) {
        if (typeof TransformMatrix === 'undefined') {
            console.warn('CellAnimator: TransformMatrix not loaded');
            return;
        }

        const key = `${x}-${y}`;
        let matrix = this.cellTransforms.get(key);
        
        if (!matrix) {
            matrix = new TransformMatrix();
            this.cellTransforms.set(key, matrix);
        }

        matrix.scale(sx, sy);
        this.setTransform(x, y, matrix);
    }

    /**
     * Translate a cell
     * @param {number} x - Cell X coordinate
     * @param {number} y - Cell Y coordinate
     * @param {number} tx - X translation in pixels
     * @param {number} ty - Y translation in pixels
     */
    translateCell(x, y, tx, ty) {
        if (typeof TransformMatrix === 'undefined') {
            console.warn('CellAnimator: TransformMatrix not loaded');
            return;
        }

        const key = `${x}-${y}`;
        let matrix = this.cellTransforms.get(key);
        
        if (!matrix) {
            matrix = new TransformMatrix();
            this.cellTransforms.set(key, matrix);
        }

        matrix.translate(tx, ty);
        this.setTransform(x, y, matrix);
    }

    /**
     * Reset cell transform
     * @param {number} x - Cell X coordinate
     * @param {number} y - Cell Y coordinate
     */
    resetTransform(x, y) {
        const key = `${x}-${y}`;
        this.cellTransforms.delete(key);
        this.updateCell(x, y, { transform: 'none' });
        this._emit('transformReset', { x, y });
    }

    // ========================================
    // Phase 2C: Spatial Query Methods
    // ========================================

    /**
     * Find cells within a radius
     * @param {number} centerX - Center X coordinate
     * @param {number} centerY - Center Y coordinate
     * @param {number} radius - Search radius in cells
     * @returns {Array<Object>} Array of cells within radius
     */
    getCellsInRadius(centerX, centerY, radius) {
        if (!this.spatialIndex) {
            // Fallback: brute force search using squared distance (avoids sqrt)
            const result = [];
            const radiusSq = radius * radius;
            for (const cell of this.cells.values()) {
                const dx = cell.x - centerX;
                const dy = cell.y - centerY;
                if (dx * dx + dy * dy <= radiusSq) {
                    result.push(cell);
                }
            }
            return result;
        }

        const results = this.spatialIndex.queryCircle(centerX, centerY, radius);
        const output = [];
        for (let i = 0, len = results.length; i < len; i++) {
            if (results[i].data) output.push(results[i].data);
        }
        return output;
    }

    /**
     * Find nearest cell to a point
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} [maxDistance] - Maximum search distance
     * @returns {Object|null} Nearest cell or null
     */
    getNearestCell(x, y, maxDistance = Infinity) {
        if (!this.spatialIndex) {
            // Fallback: brute force
            let nearest = null;
            let minDist = maxDistance;

            this.cells.forEach(cell => {
                const dx = cell.x - x;
                const dy = cell.y - y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < minDist) {
                    minDist = dist;
                    nearest = cell;
                }
            });

            return nearest;
        }

        const result = this.spatialIndex.nearest(x, y, maxDistance);
        return result ? result.data : null;
    }

    /**
     * Find K nearest cells to a point
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} k - Number of nearest cells to find
     * @returns {Array<Object>} Array of K nearest cells
     */
    getKNearestCells(x, y, k) {
        if (!this.spatialIndex) {
            // Fallback: brute force using squared distance (avoid sqrt for comparison)
            // Use a simple array with inline distance storage to avoid object creation
            const cells = [];
            const distances = [];
            
            for (const cell of this.cells.values()) {
                const dx = cell.x - x;
                const dy = cell.y - y;
                const distSq = dx * dx + dy * dy;
                
                // Insert in sorted order (simple insertion for small k)
                let inserted = false;
                for (let i = 0; i < cells.length && i < k; i++) {
                    if (distSq < distances[i]) {
                        cells.splice(i, 0, cell);
                        distances.splice(i, 0, distSq);
                        inserted = true;
                        break;
                    }
                }
                if (!inserted && cells.length < k) {
                    cells.push(cell);
                    distances.push(distSq);
                } else if (cells.length > k) {
                    cells.pop();
                    distances.pop();
                }
            }
            
            return cells;
        }

        const results = this.spatialIndex.kNearest(x, y, k);
        const output = [];
        for (let i = 0, len = results.length; i < len; i++) {
            if (results[i].data) output.push(results[i].data);
        }
        return output;
    }

    // ========================================
    // Phase 2C: Performance Profiling Methods
    // ========================================

    /**
     * Enable performance profiling
     */
    enableProfiling() {
        if (!this.profiler) {
            if (typeof PerformanceProfiler === 'undefined') {
                console.warn('CellAnimator: PerformanceProfiler not loaded');
                return;
            }

            this.profiler = new PerformanceProfiler();
            this.profiler.on('performanceUpdate', (metrics) => {
                this._emit('performanceUpdate', metrics);
            });
        }

        this.profiler.enable();
        this._emit('profilingEnabled');
    }

    /**
     * Disable performance profiling
     */
    disableProfiling() {
        if (!this.profiler) return;

        this.profiler.disable();
        this._emit('profilingDisabled');
    }

    /**
     * Get current performance metrics
     * @returns {Object|null} Performance metrics
     */
    getPerformanceMetrics() {
        if (!this.profiler) return null;
        return this.profiler.getMetrics();
    }

    /**
     * Get performance report
     * @returns {Object|null} Comprehensive performance report
     */
    getPerformanceReport() {
        if (!this.profiler) return null;
        return this.profiler.getReport();
    }

    /**
     * Get performance history
     * @param {number} [count] - Number of historical entries (default: all)
     * @returns {Array<Object>} Performance history
     */
    getPerformanceHistory(count) {
        if (!this.profiler) return [];
        return this.profiler.getHistory(count);
    }

    /**
     * Update profiler with cell count
     * @private
     */
    _updateProfilerMetrics() {
        // Profiler auto-updates from animator.state and animator.viewportManager
        // No manual updates needed
    }

    // ========================================
    // Data API Methods (PXSFrame support)
    // ========================================

    /**
     * Get current grid state as PXSFrame data
     * @returns {PXSFrame} Frame data object
     */
    getData() {
        const cells = new Array(this.cells.size);
        let i = 0;
        
        // Use cell.x/y directly - no string parsing needed
        for (const cellData of this.cells.values()) {
            cells[i++] = {
                x: cellData.x,
                y: cellData.y,
                color: cellData.color || cellData.styles?.background || '#2A2A2A'
            };
        }
        
        return {
            cols: this.state.columns,
            rows: this.state.rows,
            cells,
            metadata: {
                source: 'animator',
                timestamp: Date.now(),
                version: '2.0.0',
                renderMode: this.renderMode
            }
        };
    }

    /**
     * Set grid state from PXSFrame data
     * @param {PXSFrame} frameData - Frame data object
     * @param {Object} [options] - Options
     * @param {boolean} [options.resize=true] - Resize grid if dimensions differ
     * @returns {Promise<void>}
     */
    async setData(frameData, options = {}) {
        const { resize = true } = options;
        
        // Validate frame data
        if (typeof ImageHelpers !== 'undefined' && !ImageHelpers.validateFrame(frameData)) {
            console.warn('CellAnimator: Invalid frame data');
            return;
        }
        
        // Resize grid if needed
        if (resize && (frameData.cols !== this.state.columns || frameData.rows !== this.state.rows)) {
            // Re-initialize with new dimensions
            await this._reinitialize(frameData.cols, frameData.rows);
        }
        
        // Apply cell updates directly - no intermediate array needed
        const cells = frameData.cells;
        const defaultOpacity = this.config.defaultCellOpacity;
        for (let i = 0, len = cells.length; i < len; i++) {
            const cell = cells[i];
            this.updateCell(cell.x, cell.y, {
                background: cell.color,
                opacity: cell.opacity !== undefined ? cell.opacity : defaultOpacity
            });
        }
        
        // Emit data change event
        this._emit('dataChange', frameData);
    }

    /**
     * Re-initialize animator with new dimensions
     * @private
     */
    async _reinitialize(cols, rows) {
        const container = this.config.container;
        const config = { ...this.config };
        
        // Calculate new cell sizes to maintain similar canvas size
        const totalWidth = this.state.canvasWidth || container.clientWidth;
        const totalHeight = this.state.canvasHeight || container.clientHeight;
        
        config.cellWidth = Math.floor(totalWidth / cols);
        config.cellHeight = Math.floor(totalHeight / rows);
        
        // Destroy current renderer
        if (this.renderer) {
            this.renderer.destroy();
        }
        
        // Clear cells
        this.cells.clear();
        
        // Update state
        this.state.columns = cols;
        this.state.rows = rows;
        this.state.totalCells = cols * rows;
        
        // Update config
        this.config.cellWidth = config.cellWidth;
        this.config.cellHeight = config.cellHeight;
        
        // Re-create renderer
        this.renderer = this._createRenderer();
        await this.renderer.init(this);
    }

    /**
     * Export current state as JSON string
     * @param {Object} [options] - Export options
     * @param {boolean} [options.compress=false] - Use compressed format
     * @param {boolean} [options.pretty=false] - Pretty print JSON
     * @returns {string} JSON string
     */
    exportData(options = {}) {
        const { compress = false, pretty = false } = options;
        
        let data = this.getData();
        
        if (compress && typeof ImageHelpers !== 'undefined') {
            data = ImageHelpers.compressFrame(data);
        }
        
        return pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
    }

    /**
     * Import data from JSON string
     * @param {string} json - JSON string
     * @param {Object} [options] - Import options
     * @returns {Promise<void>}
     */
    async importData(json, options = {}) {
        let data;
        
        try {
            data = JSON.parse(json);
        } catch (e) {
            console.error('CellAnimator: Invalid JSON');
            return;
        }
        
        // Check if compressed
        if (data.c && data.r && data.d && typeof ImageHelpers !== 'undefined') {
            data = ImageHelpers.decompressFrame(data);
        }
        
        await this.setData(data, options);
    }

    /**
     * Subscribe to data changes
     * @param {Function} callback - Callback function(frameData)
     * @returns {Function} Unsubscribe function
     */
    subscribeToData(callback) {
        this.on('dataChange', callback);
        return () => this.off('dataChange', callback);
    }

    /**
     * Load image and render to grid
     * @param {string|File|HTMLImageElement} source - Image source
     * @param {Object} [options] - Options
     * @returns {Promise<PXSFrame>} The frame data that was rendered
     */
    async loadImage(source, options = {}) {
        if (typeof ImageHelpers === 'undefined') {
            console.error('CellAnimator: ImageHelpers not loaded');
            return null;
        }
        
        // Use current grid dimensions if not specified
        const loadOptions = {
            cols: options.cols || this.state.columns,
            rows: options.rows || this.state.rows,
            ...options
        };
        
        // Load and convert image to data
        const frameData = await ImageHelpers.loadImage(source, loadOptions);
        
        // Render the data
        await this.setData(frameData);
        
        return frameData;
    }

    // ========================================
    // Animation Playback System
    // ========================================

    /**
     * Load an animation
     * @param {PXSAnimation} animation - Animation data
     */
    loadAnimation(animation) {
        if (typeof AnimationHelpers === 'undefined') {
            console.error('CellAnimator: AnimationHelpers not loaded');
            return;
        }
        
        if (!AnimationHelpers.validateAnimation(animation)) {
            console.error('CellAnimator: Invalid animation data');
            return;
        }
        
        this._animation = animation;
        this._animationState = {
            playing: false,
            currentFrame: 0,
            startTime: 0,
            frameInterval: 1000 / animation.fps
        };
        
        this._emit('animationLoaded', animation);
    }

    /**
     * Play the loaded animation
     * @param {Object} [options] - Playback options
     */
    playAnimation(options = {}) {
        if (!this._animation) {
            console.warn('CellAnimator: No animation loaded');
            return;
        }
        
        const { loop, fps } = options;
        
        if (loop !== undefined) {
            this._animation.metadata.loop = loop;
        }
        
        if (fps !== undefined) {
            this._animation.fps = fps;
            this._animationState.frameInterval = 1000 / fps;
        }
        
        this._animationState.playing = true;
        this._animationState.startTime = performance.now();
        
        this._emit('animationPlay');
        this._animationLoop();
    }

    /**
     * Pause animation playback
     */
    pauseAnimation() {
        if (!this._animationState) return;
        
        this._animationState.playing = false;
        
        if (this._animationFrameId) {
            cancelAnimationFrame(this._animationFrameId);
            this._animationFrameId = null;
        }
        
        this._emit('animationPause');
    }

    /**
     * Stop animation and reset to first frame
     */
    stopAnimation() {
        this.pauseAnimation();
        
        if (this._animationState) {
            this._animationState.currentFrame = 0;
            
            // Render first frame
            if (this._animation && this._animation.frames.length > 0) {
                this.setData(this._animation.frames[0], { resize: false });
            }
        }
        
        this._emit('animationStop');
    }

    /**
     * Go to specific frame
     * @param {number} index - Frame index
     */
    goToFrame(index) {
        if (!this._animation) return;
        
        const frameCount = this._animation.frames.length;
        index = Math.max(0, Math.min(index, frameCount - 1));
        
        this._animationState.currentFrame = index;
        this.setData(this._animation.frames[index], { resize: false });
        
        this._emit('frameChange', { index, frame: this._animation.frames[index] });
    }

    /**
     * Go to next frame
     */
    nextFrame() {
        if (!this._animation) return;
        
        const nextIndex = this._animationState.currentFrame + 1;
        if (nextIndex >= this._animation.frames.length) {
            if (this._animation.metadata.loop) {
                this.goToFrame(0);
            }
        } else {
            this.goToFrame(nextIndex);
        }
    }

    /**
     * Go to previous frame
     */
    prevFrame() {
        if (!this._animation) return;
        
        const prevIndex = this._animationState.currentFrame - 1;
        if (prevIndex < 0) {
            if (this._animation.metadata.loop) {
                this.goToFrame(this._animation.frames.length - 1);
            }
        } else {
            this.goToFrame(prevIndex);
        }
    }

    /**
     * Get current animation playback state
     * @returns {PXSPlaybackState|null}
     */
    getPlaybackState() {
        if (!this._animation || !this._animationState) return null;
        
        return {
            playing: this._animationState.playing,
            currentFrame: this._animationState.currentFrame,
            totalFrames: this._animation.frames.length,
            fps: this._animation.fps,
            loop: this._animation.metadata.loop,
            timestamp: this._animationState.currentFrame * this._animationState.frameInterval
        };
    }

    /**
     * Get current frame data
     * @returns {PXSFrame|null}
     */
    getCurrentAnimationFrame() {
        if (!this._animation) return null;
        return this._animation.frames[this._animationState.currentFrame];
    }

    /**
     * Update a cell in the current animation frame
     * @param {number} frameIndex - Frame index
     * @param {number} x - Cell X
     * @param {number} y - Cell Y
     * @param {string} color - New color
     */
    updateAnimationCell(frameIndex, x, y, color) {
        if (!this._animation) return;
        
        const frame = this._animation.frames[frameIndex];
        if (frame) {
            ImageHelpers.updateCell(frame, x, y, color);
            
            // Re-render if this is the current frame
            if (frameIndex === this._animationState.currentFrame) {
                this.setData(frame, { resize: false });
            }
            
            this._emit('animationFrameUpdated', { frameIndex, x, y, color });
        }
    }

    /**
     * Internal animation loop
     * @private
     */
    _animationLoop() {
        if (!this._animationState || !this._animationState.playing) return;
        
        const elapsed = performance.now() - this._animationState.startTime;
        const frameIndex = Math.floor(elapsed / this._animationState.frameInterval);
        const totalFrames = this._animation.frames.length;
        
        let targetFrame;
        if (this._animation.metadata.loop) {
            targetFrame = frameIndex % totalFrames;
        } else {
            targetFrame = Math.min(frameIndex, totalFrames - 1);
            if (frameIndex >= totalFrames) {
                this.pauseAnimation();
                this._emit('animationComplete');
                return;
            }
        }
        
        // Only update if frame changed
        if (targetFrame !== this._animationState.currentFrame) {
            this._animationState.currentFrame = targetFrame;
            this.setData(this._animation.frames[targetFrame], { resize: false });
            this._emit('frameChange', { index: targetFrame });
        }
        
        this._animationFrameId = requestAnimationFrame(() => this._animationLoop());
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

        // Phase 2C: Clean up performance systems
        if (this.profiler) {
            this.profiler.disable();
            this.profiler = null;
        }

        if (this.viewportManager) {
            this.viewportManager = null;
        }

        if (this.spatialIndex) {
            this.spatialIndex.clear();
            this.spatialIndex = null;
        }

        if (this.groupManager) {
            this.groupManager.clear();
            this.groupManager = null;
        }

        // Clear transforms
        this.cellTransforms.clear();

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
