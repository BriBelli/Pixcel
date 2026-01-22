/**
 * ViewportManager - Virtual Scrolling & Viewport Culling
 * 
 * Handles viewport-based rendering for massive grids (1M+ cells).
 * Only renders cells visible in the current viewport, dramatically
 * improving performance for large grids.
 * 
 * Foundation for 3D frustum culling in Phase 3 (WebGL renderer).
 * 
 * @class ViewportManager
 */
class ViewportManager {
    /**
     * Create a ViewportManager
     * @param {CellAnimator} animator - The CellAnimator instance
     */
    constructor(animator) {
        this.animator = animator;
        
        // Viewport bounds (screen coordinates)
        this.viewport = {
            x: 0,
            y: 0,
            width: 0,
            height: 0
        };
        
        // Visible cell coordinates
        this.visibleCells = new Set(); // Set of "x-y" keys
        
        // Cell bounds (grid coordinates)
        this.visibleBounds = {
            startX: 0,
            endX: 0,
            startY: 0,
            endY: 0
        };
        
        // Culling enabled flag
        this.cullingEnabled = false;
        
        // Performance tracking
        this.stats = {
            totalCells: 0,
            visibleCells: 0,
            culledCells: 0,
            cullRatio: 0
        };
    }
    
    /**
     * Initialize viewport manager
     * Sets initial viewport to container dimensions
     */
    init() {
        const config = this.animator.config;
        const state = this.animator.state;
        
        // Default viewport = full container
        this.viewport.width = state.canvasWidth;
        this.viewport.height = state.canvasHeight;
        
        // Calculate initial visible bounds
        this.updateVisibleBounds();
        
        console.log('[ViewportManager] Initialized', {
            viewport: this.viewport,
            visibleBounds: this.visibleBounds
        });
    }
    
    /**
     * Enable viewport culling
     * Only renders cells within viewport
     */
    enableCulling() {
        this.cullingEnabled = true;
        this.updateVisibleBounds();
        console.log('[ViewportManager] Culling enabled');
    }
    
    /**
     * Disable viewport culling
     * Renders all cells (default behavior)
     */
    disableCulling() {
        this.cullingEnabled = false;
        this.visibleCells.clear();
        console.log('[ViewportManager] Culling disabled');
    }
    
    /**
     * Update viewport position and dimensions
     * Recalculates visible cells
     * 
     * @param {number} x - Viewport X position (pixels)
     * @param {number} y - Viewport Y position (pixels)
     * @param {number} width - Viewport width (pixels)
     * @param {number} height - Viewport height (pixels)
     */
    setViewport(x, y, width, height) {
        // Update viewport bounds
        this.viewport.x = x;
        this.viewport.y = y;
        this.viewport.width = width;
        this.viewport.height = height;
        
        // Recalculate visible cells
        this.updateVisibleBounds();
        
        // Emit viewport change event
        this.animator._emit('viewportChange', {
            viewport: {...this.viewport},
            visibleBounds: {...this.visibleBounds},
            stats: {...this.stats}
        });
    }
    
    /**
     * Update visible cell bounds based on current viewport
     * Calculates which cells are visible
     */
    updateVisibleBounds() {
        if (!this.cullingEnabled) {
            return;
        }
        
        const config = this.animator.config;
        const state = this.animator.state;
        
        // Convert viewport pixels to cell coordinates
        const startX = Math.floor(this.viewport.x / config.cellWidth);
        const endX = Math.min(
            Math.ceil((this.viewport.x + this.viewport.width) / config.cellWidth),
            state.columns - 1
        );
        
        const startY = Math.floor(this.viewport.y / config.cellHeight);
        const endY = Math.min(
            Math.ceil((this.viewport.y + this.viewport.height) / config.cellHeight),
            state.rows - 1
        );
        
        // Update bounds
        this.visibleBounds.startX = Math.max(0, startX);
        this.visibleBounds.endX = Math.max(0, endX);
        this.visibleBounds.startY = Math.max(0, startY);
        this.visibleBounds.endY = Math.max(0, endY);
        
        // Update visible cells set
        this.updateVisibleCellsSet();
        
        // Update stats
        this.updateStats();
    }
    
    /**
     * Update the set of visible cell keys
     * @private
     */
    updateVisibleCellsSet() {
        this.visibleCells.clear();
        
        const {startX, endX, startY, endY} = this.visibleBounds;
        
        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                this.visibleCells.add(`${x}-${y}`);
            }
        }
    }
    
    /**
     * Check if a cell is visible in the current viewport
     * 
     * @param {number} x - Cell X coordinate
     * @param {number} y - Cell Y coordinate
     * @returns {boolean} True if cell is visible
     */
    isCellVisible(x, y) {
        if (!this.cullingEnabled) {
            return true; // All cells visible when culling disabled
        }
        
        return this.visibleCells.has(`${x}-${y}`);
    }
    
    /**
     * Get all visible cell coordinates
     * 
     * @returns {Array<{x: number, y: number}>} Array of visible cell coords
     */
    getVisibleCells() {
        if (!this.cullingEnabled) {
            // Return all cells
            return this.animator.getAllCells().map(cell => ({x: cell.x, y: cell.y}));
        }
        
        const visible = [];
        const {startX, endX, startY, endY} = this.visibleBounds;
        
        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                const cell = this.animator.getCell(x, y);
                if (cell) {
                    visible.push({x, y});
                }
            }
        }
        
        return visible;
    }
    
    /**
     * Get visible cells in a specific region
     * 
     * @param {number} x - Region start X
     * @param {number} y - Region start Y
     * @param {number} width - Region width (cells)
     * @param {number} height - Region height (cells)
     * @returns {Array<{x: number, y: number}>} Visible cells in region
     */
    getVisibleCellsInRegion(x, y, width, height) {
        const visible = [];
        const endX = x + width - 1;
        const endY = y + height - 1;
        
        for (let cx = x; cx <= endX; cx++) {
            for (let cy = y; cy <= endY; cy++) {
                if (this.isCellVisible(cx, cy)) {
                    visible.push({x: cx, y: cy});
                }
            }
        }
        
        return visible;
    }
    
    /**
     * Update performance statistics
     * @private
     */
    updateStats() {
        const state = this.animator.state;
        
        this.stats.totalCells = state.totalCells;
        this.stats.visibleCells = this.visibleCells.size;
        this.stats.culledCells = this.stats.totalCells - this.stats.visibleCells;
        this.stats.cullRatio = this.stats.totalCells > 0
            ? (this.stats.culledCells / this.stats.totalCells) * 100
            : 0;
    }
    
    /**
     * Get viewport information
     * 
     * @returns {Object} Viewport info
     */
    getViewportInfo() {
        return {
            viewport: {...this.viewport},
            visibleBounds: {...this.visibleBounds},
            cullingEnabled: this.cullingEnabled,
            stats: {...this.stats}
        };
    }
    
    /**
     * Get performance statistics
     * 
     * @returns {Object} Performance stats
     */
    getStats() {
        return {...this.stats};
    }
    
    /**
     * Pan viewport by delta pixels
     * 
     * @param {number} deltaX - X offset in pixels
     * @param {number} deltaY - Y offset in pixels
     */
    pan(deltaX, deltaY) {
        this.setViewport(
            this.viewport.x + deltaX,
            this.viewport.y + deltaY,
            this.viewport.width,
            this.viewport.height
        );
    }
    
    /**
     * Zoom viewport (scale viewport size)
     * 
     * @param {number} scale - Zoom scale (1.0 = no change, >1 = zoom out, <1 = zoom in)
     * @param {number} centerX - Zoom center X (pixels, default: viewport center)
     * @param {number} centerY - Zoom center Y (pixels, default: viewport center)
     */
    zoom(scale, centerX = null, centerY = null) {
        // Default to viewport center
        if (centerX === null) {
            centerX = this.viewport.x + this.viewport.width / 2;
        }
        if (centerY === null) {
            centerY = this.viewport.y + this.viewport.height / 2;
        }
        
        // Calculate new dimensions
        const newWidth = this.viewport.width * scale;
        const newHeight = this.viewport.height * scale;
        
        // Calculate new position (zoom around center point)
        const newX = centerX - (centerX - this.viewport.x) * scale;
        const newY = centerY - (centerY - this.viewport.y) * scale;
        
        this.setViewport(newX, newY, newWidth, newHeight);
    }
    
    /**
     * Reset viewport to full grid
     */
    reset() {
        const state = this.animator.state;
        
        this.setViewport(
            0,
            0,
            state.canvasWidth,
            state.canvasHeight
        );
    }
    
    /**
     * Center viewport on specific cell
     * 
     * @param {number} x - Cell X coordinate
     * @param {number} y - Cell Y coordinate
     */
    centerOnCell(x, y) {
        const config = this.animator.config;
        
        // Calculate pixel position of cell center
        const cellCenterX = (x + 0.5) * config.cellWidth;
        const cellCenterY = (y + 0.5) * config.cellHeight;
        
        // Calculate viewport position to center on cell
        const viewportX = cellCenterX - this.viewport.width / 2;
        const viewportY = cellCenterY - this.viewport.height / 2;
        
        this.setViewport(
            viewportX,
            viewportY,
            this.viewport.width,
            this.viewport.height
        );
    }
    
    /**
     * Destroy viewport manager
     * Clean up resources
     */
    destroy() {
        this.visibleCells.clear();
        this.cullingEnabled = false;
        console.log('[ViewportManager] Destroyed');
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ViewportManager;
}

// Export for browser
if (typeof window !== 'undefined') {
    window.ViewportManager = ViewportManager;
}
