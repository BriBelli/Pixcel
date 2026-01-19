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
            enableSpatialIndex: config.enableSpatialIndex || false
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
                this.cells.forEach((cell, key) => {
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
                });
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
        if (!this.eventListeners.has(event)) return;
        
        this.eventListeners.get(event).forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`CellAnimator event error (${event}):`, error);
            }
        });
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

        const visibleCells = this.viewportManager.getVisibleCells();
        return visibleCells.map(coord => this.getCell(coord.x, coord.y)).filter(c => c);
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
        this.updateCells(cells.map(cell => ({ ...cell, styles })));
        
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
        this.animateCells(cells.map(cell => ({ ...cell, animation })));
        
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

        cells.forEach(cell => {
            const cellData = this.getCell(cell.x, cell.y);
            if (cellData) {
                group.addCell(cell.x, cell.y, cellData);
            }
        });

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
            // Fallback: brute force search
            return this.getAllCells().filter(cell => {
                const dx = cell.x - centerX;
                const dy = cell.y - centerY;
                return Math.sqrt(dx * dx + dy * dy) <= radius;
            });
        }

        const results = this.spatialIndex.queryCircle(centerX, centerY, radius);
        return results.map(item => item.data).filter(c => c);
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
            // Fallback: brute force
            const cellsWithDist = this.getAllCells().map(cell => {
                const dx = cell.x - x;
                const dy = cell.y - y;
                return {
                    cell,
                    distance: Math.sqrt(dx * dx + dy * dy)
                };
            });

            cellsWithDist.sort((a, b) => a.distance - b.distance);
            return cellsWithDist.slice(0, k).map(item => item.cell);
        }

        const results = this.spatialIndex.kNearest(x, y, k);
        return results.map(item => item.data).filter(c => c);
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
