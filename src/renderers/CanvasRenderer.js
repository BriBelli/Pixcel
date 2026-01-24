/**
 * CanvasRenderer - Canvas 2D rendering implementation
 * Optimized for large grids (10,000 - 1,000,000 cells)
 * Uses Canvas 2D API with requestAnimationFrame for animations
 * Phase 2C: Added viewport culling and transform matrix support
 */
class CanvasRenderer extends BaseRenderer {
    constructor(animator) {
        super(animator);
        this.mode = 'canvas';
        
        // Canvas elements
        this.canvas = null;
        this.ctx = null;
        
        // Animation state
        this.animationFrameId = null;
        this.activeAnimations = new Map(); // "x-y" -> animation state
        this.lastFrameTime = 0;
        
        // Cell drawing cache
        this.cellColors = new Map(); // "x-y" -> color
        this.cellStyles = new Map(); // "x-y" -> style object
        
        // Phase 2C: Viewport rendering state
        this.viewportEnabled = false;
        this.dirtyRegions = new Map(); // "x-y" -> {x, y} - avoids parsing in hot path
        this.fullRedrawNeeded = true;
        this._batchRedrawScheduled = false; // For batch update efficiency
        
        // Click handler binding
        this._boundHandleClick = this.handleClick.bind(this);
    }

    /**
     * Initialize canvas and draw initial grid
     * @returns {Promise<void>}
     */
    async init() {
        // Create canvas element
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'cell-animator-canvas';
        
        // Set canvas size
        const containerWidth = this.config.container.clientWidth;
        const containerHeight = this.config.container.clientHeight;
        
        // Handle high DPI displays
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = containerWidth * dpr;
        this.canvas.height = containerHeight * dpr;
        this.canvas.style.width = `${containerWidth}px`;
        this.canvas.style.height = `${containerHeight}px`;
        
        // Store logical dimensions for clearing
        this.logicalWidth = containerWidth;
        this.logicalHeight = containerHeight;
        
        // Get context and scale for DPI
        this.ctx = this.canvas.getContext('2d');
        this.ctx.scale(dpr, dpr);
        
        // Set container background (supports 'transparent' or any color)
        if (this.config.backgroundColor) {
            this.config.container.style.backgroundColor = this.config.backgroundColor;
        }
        
        // Append to container
        this.config.container.appendChild(this.canvas);
        
        // Add click listener
        this.canvas.addEventListener('click', this._boundHandleClick);
        
        // Create cell data in animator's cells Map (chunked for large grids)
        await this._createCells();
        
        // Draw initial grid
        this._drawGrid();
        
        // Listen to viewport events for redraws
        if (this.animator.viewportManager) {
            this.viewportEnabled = true;
            
            // Redraw when viewport changes
            this.animator.on('viewportPanned', () => {
                this.fullRedrawNeeded = true;
                // Restart animation loop if stopped
                if (!this.animationFrameId) {
                    this._startAnimationLoop();
                }
            });
            
            this.animator.on('viewportChanged', () => {
                this.fullRedrawNeeded = true;
                if (!this.animationFrameId) {
                    this._startAnimationLoop();
                }
            });
            
            this.animator.on('viewportCentered', () => {
                this.fullRedrawNeeded = true;
                if (!this.animationFrameId) {
                    this._startAnimationLoop();
                }
            });
        }
        
        // Start animation loop
        this._startAnimationLoop();
    }

    /**
     * Create cell data objects for all cells (chunked for performance)
     * @private
     * @returns {Promise<void>}
     */
    async _createCells() {
        const { columns, rows } = this.state;
        const totalCells = columns * rows;
        const CHUNK_SIZE = 10000; // Create 10k cells per chunk (more frequent updates)
        const CHUNK_THRESHOLD = 50000; // Chunk for grids > 50K cells
        let index = 0;
        
        // For grids under threshold, create synchronously (QVGA is ~76K - fast enough)
        if (totalCells <= CHUNK_THRESHOLD) {
            for (let y = 0; y < rows; y++) {
                for (let x = 0; x < columns; x++) {
                    const key = `${x}-${y}`;
                    this.animator.cells.set(key, {
                        element: null,
                        x,
                        y,
                        index: index++,
                        animated: false,
                        styles: {}
                    });
                    this.cellColors.set(key, '#2a2a2a');
                }
            }
            return;
        }
        
        // For large grids, use chunked async creation
        let cellsCreated = 0;
        
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < columns; x++) {
                const key = `${x}-${y}`;
                this.animator.cells.set(key, {
                    element: null,
                    x,
                    y,
                    index: index++,
                    animated: false,
                    styles: {}
                });
                this.cellColors.set(key, '#2a2a2a');
                
                cellsCreated++;
                
                // Yield to browser every CHUNK_SIZE cells
                if (cellsCreated % CHUNK_SIZE === 0) {
                    // Emit progress event
                    const progress = Math.round((cellsCreated / totalCells) * 100);
                    this.animator._emit('gridProgress', { 
                        cellsCreated, 
                        totalCells, 
                        progress,
                        phase: 'creating'
                    });
                    
                    // Yield to browser - keeps UI responsive
                    await new Promise(resolve => setTimeout(resolve, 0));
                }
            }
        }
        
        // Final progress update
        this.animator._emit('gridProgress', { 
            cellsCreated: totalCells, 
            totalCells, 
            progress: 100,
            phase: 'complete'
        });
    }

    /**
     * Draw the entire grid (or just visible portion if viewport enabled)
     * @private
     */
    _drawGrid() {
        const { cellWidth, cellHeight } = this.config;
        const { columns, rows } = this.state;
        const totalCells = columns * rows;
        
        // Emit drawing phase for progress tracking
        if (totalCells > 50000) {
            this.animator._emit('gridProgress', { 
                cellsCreated: 0, 
                totalCells, 
                progress: 0,
                phase: 'drawing'
            });
        }
        
        // Phase 2C: Check if we should use viewport rendering
        const viewportManager = this.animator.viewportManager;
        this.viewportEnabled = viewportManager && viewportManager.cullingEnabled;
        
        // Clear canvas (use logical dimensions since context is scaled by DPR)
        this.ctx.clearRect(0, 0, this.logicalWidth, this.logicalHeight);
        
        // Fill background if specified (supports 'transparent' or any color)
        if (this.config.backgroundColor && this.config.backgroundColor !== 'transparent') {
            this.ctx.fillStyle = this.config.backgroundColor;
            this.ctx.fillRect(0, 0, this.logicalWidth, this.logicalHeight);
        }
        
        if (this.viewportEnabled && !this.fullRedrawNeeded) {
            // Partial redraw - only dirty regions (coords pre-stored to avoid parsing)
            for (const coord of this.dirtyRegions.values()) {
                if (viewportManager.isCellVisible(coord.x, coord.y)) {
                    this._drawCell(coord.x, coord.y);
                }
            }
            this.dirtyRegions.clear();
        } else {
            // Full redraw
            if (this.viewportEnabled) {
                // Only draw visible cells
                const visibleCells = viewportManager.getVisibleCells();
                
                for (const coord of visibleCells) {
                    this._drawCell(coord.x, coord.y);
                }
            } else {
                // Draw all cells
                for (let y = 0; y < rows; y++) {
                    for (let x = 0; x < columns; x++) {
                        this._drawCell(x, y);
                    }
                }
            }
            this.fullRedrawNeeded = false;
        }
    }

    /**
     * Draw a single cell
     * @private
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
    _drawCell(x, y) {
        const { cellWidth, cellHeight } = this.config;
        const key = `${x}-${y}`;
        
        // Get cell properties
        const baseColor = this.cellColors.get(key) || '#2a2a2a';
        const styles = this.cellStyles.get(key) || {};
        
        // Use animated background if available, otherwise use base color
        const color = styles.background || baseColor;
        
        // Calculate pixel position in grid space
        let pixelX = x * cellWidth;
        let pixelY = y * cellHeight;
        
        // Phase 2C: Apply viewport offset for panning
        if (this.viewportEnabled && this.animator.viewportManager) {
            const viewport = this.animator.viewportManager.viewport;
            pixelX -= viewport.x;
            pixelY -= viewport.y;
        }
        
        // Apply transform if exists
        this.ctx.save();
        
        // Phase 2C: Handle TransformMatrix (matrix()) transforms
        if (styles.transform) {
            if (styles.transform.includes('matrix(')) {
                // Parse CSS matrix: matrix(a, b, c, d, tx, ty)
                const matrixMatch = styles.transform.match(/matrix\(([-\d.]+),\s*([-\d.]+),\s*([-\d.]+),\s*([-\d.]+),\s*([-\d.]+),\s*([-\d.]+)\)/);
                if (matrixMatch) {
                    const [, a, b, c, d, tx, ty] = matrixMatch.map(Number);
                    // Apply matrix transform relative to cell center
                    const centerX = pixelX + cellWidth / 2;
                    const centerY = pixelY + cellHeight / 2;
                    this.ctx.translate(centerX, centerY);
                    this.ctx.transform(a, b, c, d, tx, ty);
                    this.ctx.translate(-centerX, -centerY);
                }
            } else if (styles.transform.includes('scale')) {
                // Handle simple scale transform (for animations)
                const scaleMatch = styles.transform.match(/scale\(([\d.]+)\)/);
                if (scaleMatch) {
                    const scale = parseFloat(scaleMatch[1]);
                    const centerX = pixelX + cellWidth / 2;
                    const centerY = pixelY + cellHeight / 2;
                    this.ctx.translate(centerX, centerY);
                    this.ctx.scale(scale, scale);
                    this.ctx.translate(-centerX, -centerY);
                }
            }
        }
        
        // Handle opacity and rgba() colors
        let finalColor = color;
        let finalOpacity = styles.opacity !== undefined ? Math.max(0, Math.min(1, parseFloat(styles.opacity))) : 1;
        
        // If color is rgba(), extract alpha and combine with opacity parameter
        const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (rgbaMatch) {
            const r = rgbaMatch[1];
            const g = rgbaMatch[2];
            const b = rgbaMatch[3];
            const colorAlpha = rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1;
            // Combine color alpha with opacity parameter (multiply them)
            finalOpacity = colorAlpha * finalOpacity;
            finalColor = `rgb(${r}, ${g}, ${b})`;
        }
        
        this.ctx.globalAlpha = finalOpacity;
        
        // Draw cell background
        this.ctx.fillStyle = finalColor;
        this.ctx.fillRect(pixelX, pixelY, cellWidth, cellHeight);
        
        // Draw cell border if enabled (check cell-level override, then global config)
        const cellBorders = styles.cellBorders !== undefined ? styles.cellBorders : this.config.cellBorders;
        
        if (cellBorders) {
            const borderColor = styles.borderColor || this.config.borderColor;
            const borderWidth = styles.borderWidth || this.config.borderWidth;
            const borderStyle = styles.borderStyle || this.config.borderStyle;
            
            // Note: Canvas 2D only supports solid lines
            // borderStyle is accepted for API consistency but only 'solid' is rendered
            this.ctx.strokeStyle = borderColor;
            this.ctx.lineWidth = borderWidth;
            this.ctx.strokeRect(pixelX, pixelY, cellWidth, cellHeight);
        }
        
        this.ctx.restore();
    }

    /**
     * Create or update a single cell
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {Object} cellData - Cell data object
     */
    createCell(x, y, cellData) {
        const key = `${x}-${y}`;
        
        // Initialize default color
        if (!this.cellColors.has(key)) {
            this.cellColors.set(key, '#2a2a2a');
        }
        
        // Draw the cell
        this._drawCell(x, y);
    }

    /**
     * Update a cell's visual properties
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {Object} styles - Styles to apply
     */
    updateCell(x, y, styles) {
        const key = `${x}-${y}`;
        
        // Update color if background is set
        if (styles.background) {
            this.cellColors.set(key, styles.background);
        }
        
        // Store styles for transform/opacity
        const existingStyles = this.cellStyles.get(key) || {};
        this.cellStyles.set(key, { ...existingStyles, ...styles });
        
        // Phase 2C: Mark cell as dirty for partial/batched redraw (store coords to avoid parsing)
        this.dirtyRegions.set(key, { x, y });
        
        // Use debounced redraw for batch efficiency
        // If we're in animation loop, it will handle the redraw
        if (this.animationFrameId === null) {
            // Schedule a batched redraw
            if (!this._batchRedrawScheduled) {
                this._batchRedrawScheduled = true;
                requestAnimationFrame(() => {
                    this._batchRedrawScheduled = false;
                    this.fullRedrawNeeded = true;
                    this._drawGrid();
                });
            }
        }
    }

    /**
     * Apply animation to a cell
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {Object} animation - Animation properties
     */
    animateCell(x, y, animation) {
        const key = `${x}-${y}`;
        
        // Parse duration (convert to milliseconds)
        const durationMatch = animation.duration?.match(/([\d.]+)s/);
        const duration = durationMatch ? parseFloat(durationMatch[1]) * 1000 : 1000;
        
        // Parse iteration count
        const iteration = animation.iteration === 'infinite' ? Infinity : 
                         parseInt(animation.iteration) || 1;
        
        // Parse delay
        const delayMatch = animation.delay?.match(/([\d.]+)s/);
        const delay = delayMatch ? parseFloat(delayMatch[1]) * 1000 : 0;
        
        // Create animation state
        const animState = {
            name: animation.name,
            duration,
            delay,
            iteration,
            timing: animation.timing || 'linear',
            startTime: null,
            currentIteration: 0,
            x,
            y
        };
        
        this.activeAnimations.set(key, animState);
        
        // Start animation loop if not already running
        if (!this.animationFrameId) {
            this._startAnimationLoop();
        }
    }

    /**
     * Animation loop using requestAnimationFrame
     * @private
     */
    _startAnimationLoop() {
        const loopStartTime = performance.now();
        
        const animate = (timestamp) => {
            // Continue loop if we have animations OR need a redraw (viewport pan, etc)
            if (this.activeAnimations.size === 0 && !this.fullRedrawNeeded) {
                this.animationFrameId = null;
                return;
            }
            
            this.lastFrameTime = timestamp;
            
            // Update animation states
            for (const [key, animState] of this.activeAnimations.entries()) {
                // Initialize start time on first frame (accounting for delay)
                if (animState.startTime === null) {
                    const timeSinceLoopStart = timestamp - loopStartTime;
                    if (timeSinceLoopStart >= animState.delay) {
                        animState.startTime = timestamp;
                    } else {
                        // Still waiting for delay - skip this animation but continue loop
                        continue;
                    }
                }
                
                // Calculate progress
                const elapsed = timestamp - animState.startTime;
                const progress = Math.min(elapsed / animState.duration, 1);
                
                // Apply easing
                const easedProgress = this._applyEasing(progress, animState.timing);
                
                // Update cell styles with animation
                const cellKey = `${animState.x}-${animState.y}`;
                const baseStyles = this.cellStyles.get(cellKey) || {};
                const animStyles = this._getAnimationStyles(animState.name, easedProgress, animState.x, animState.y);
                
                // Store combined styles temporarily
                this.cellStyles.set(cellKey, { ...baseStyles, ...animStyles, _base: baseStyles });
                
                // Check if animation complete
                if (progress >= 1) {
                    animState.currentIteration++;
                    
                    if (animState.currentIteration >= animState.iteration) {
                        // Animation complete - restore base styles
                        this.activeAnimations.delete(key);
                        const base = baseStyles._base || baseStyles;
                        delete base._base;
                        this.cellStyles.set(cellKey, base);
                    } else {
                        // Reset for next iteration
                        animState.startTime = timestamp;
                    }
                }
            }
            
            // Redraw entire grid with current state
            this._drawGrid();
            
            // Continue loop
            this.animationFrameId = requestAnimationFrame(animate);
        };
        
        this.animationFrameId = requestAnimationFrame(animate);
    }
    
    /**
     * Get animation styles for a given effect and progress
     * @private
     * @param {string} name - Animation name
     * @param {number} progress - Animation progress (0-1)
     * @param {number} x - Cell x coordinate
     * @param {number} y - Cell y coordinate
     */
    _getAnimationStyles(name, progress, x, y) {
        const styles = {};
        const key = `${x}-${y}`;
        const baseColor = this.cellColors.get(key) || '#2a2a2a';
        
        switch (name) {
            case 'pulse':
                // Scale and color change (matching HTML @keyframes pulse -> cyan)
                const pulseIntensity = Math.sin(progress * Math.PI);
                styles.transform = `scale(${1 + pulseIntensity * 0.2})`;
                styles.background = this._interpolateColor(baseColor, '#00ffff', pulseIntensity);
                break;
                
            case 'fade':
                // Fade in/out
                styles.opacity = Math.sin(progress * Math.PI);
                break;
                
            case 'glow':
                // Color transition to yellow (matching HTML @keyframes glow)
                const intensity = Math.sin(progress * Math.PI); // 0 -> 1 -> 0
                
                // Interpolate between base color and yellow
                // At peak (50%), color should be #ffff00 (yellow)
                const targetColor = '#ffff00';
                styles.background = this._interpolateColor(baseColor, targetColor, intensity);
                styles.opacity = 0.5 + intensity * 0.5; // Also brighten
                break;
                
            case 'wave':
                // Color transition to magenta (matching HTML @keyframes wave)
                const waveIntensity = Math.sin(progress * Math.PI);
                styles.background = this._interpolateColor(baseColor, '#ff00ff', waveIntensity);
                break;
                
            case 'bounce':
                // Bounce effect
                const bounceProgress = Math.sin(progress * Math.PI * 2);
                styles.transform = `scale(${1 + Math.abs(bounceProgress) * 0.3})`;
                break;
                
            default:
                // Default to pulse
                const defaultScale = 1 + Math.sin(progress * Math.PI) * 0.2;
                styles.transform = `scale(${defaultScale})`;
        }
        
        return styles;
    }

    /**
     * Interpolate between two hex colors
     * @private
     * @param {string} color1 - Starting color (hex)
     * @param {string} color2 - Ending color (hex)
     * @param {number} factor - Interpolation factor (0-1)
     * @returns {string} Interpolated color (hex)
     */
    _interpolateColor(color1, color2, factor) {
        // Parse hex colors
        const c1 = {
            r: parseInt(color1.slice(1, 3), 16),
            g: parseInt(color1.slice(3, 5), 16),
            b: parseInt(color1.slice(5, 7), 16)
        };
        const c2 = {
            r: parseInt(color2.slice(1, 3), 16),
            g: parseInt(color2.slice(3, 5), 16),
            b: parseInt(color2.slice(5, 7), 16)
        };
        
        // Interpolate
        const r = Math.round(c1.r + (c2.r - c1.r) * factor);
        const g = Math.round(c1.g + (c2.g - c1.g) * factor);
        const b = Math.round(c1.b + (c2.b - c1.b) * factor);
        
        // Convert back to hex
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    /**
     * Apply easing function
     * @private
     */
    _applyEasing(t, timing) {
        switch (timing) {
            case 'ease-in':
                return t * t;
            case 'ease-out':
                return t * (2 - t);
            case 'ease-in-out':
                return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
            case 'linear':
            default:
                return t;
        }
    }

    /**
     * Stop animation on a cell
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
    stopAnimation(x, y) {
        const key = `${x}-${y}`;
        this.activeAnimations.delete(key);
        
        // Reset to base state
        const styles = this.cellStyles.get(key) || {};
        delete styles.transform;
        delete styles.opacity;
        this.cellStyles.set(key, styles);
        
        this._drawCell(x, y);
    }

    /**
     * Stop all animations
     */
    stopAllAnimations() {
        this.activeAnimations.clear();
        
        // Reset all animated styles
        for (const styles of this.cellStyles.values()) {
            delete styles.transform;
            delete styles.opacity;
        }
        
        // Redraw grid
        this._drawGrid();
    }

    /**
     * Reset a cell to default state
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
    resetCell(x, y) {
        const key = `${x}-${y}`;
        
        // Stop any animation
        this.stopAnimation(x, y);
        
        // Reset to default color
        this.cellColors.set(key, '#2a2a2a');
        this.cellStyles.delete(key);
        
        // Redraw
        this._drawCell(x, y);
    }

    /**
     * Reset all cells to default state
     */
    resetAllCells() {
        // Stop all animations
        this.stopAllAnimations();
        
        // Clear all colors and styles
        this.cellColors.clear();
        this.cellStyles.clear();
        
        // Redraw grid
        this._drawGrid();
    }

    /**
     * Handle click events - convert mouse coords to cell coords
     * @param {Event} event - Click event
     * @returns {Object|null} Cell coordinates {x, y} or null
     */
    handleClick(event) {
        const rect = this.canvas.getBoundingClientRect();
        
        // Get mouse position relative to canvas
        let mouseX = event.clientX - rect.left;
        let mouseY = event.clientY - rect.top;
        
        // Account for viewport offset if viewport is enabled
        if (this.viewportEnabled && this.animator.viewportManager) {
            const viewport = this.animator.viewportManager.viewport;
            mouseX += viewport.x;
            mouseY += viewport.y;
        }
        
        // Convert to cell coordinates
        const x = Math.floor(mouseX / this.config.cellWidth);
        const y = Math.floor(mouseY / this.config.cellHeight);
        
        // Validate bounds
        if (x >= 0 && x < this.state.columns && y >= 0 && y < this.state.rows) {
            // Emit cellClick event like HTMLRenderer does
            const cell = this.animator.getCell(x, y);
            this.animator._emit('cellClick', { x, y, element: null, event, cell });
            return { x, y };
        }
        
        return null;
    }

    /**
     * Clear the entire grid
     */
    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.cellColors.clear();
        this.cellStyles.clear();
        this.activeAnimations.clear();
        this.dirtyRegions.clear();
        this.fullRedrawNeeded = true;
    }

    // ========================================
    // Phase 2C: Viewport & Transform Methods
    // ========================================

    /**
     * Enable viewport-based rendering
     * Only draws cells visible in the viewport
     */
    enableViewportRendering() {
        if (!this.animator.viewportManager) {
            console.warn('CanvasRenderer: ViewportManager not available');
            return;
        }

        this.viewportEnabled = true;
        this.fullRedrawNeeded = true;
        this._drawGrid();
    }

    /**
     * Disable viewport-based rendering
     * Draws all cells regardless of viewport
     */
    disableViewportRendering() {
        this.viewportEnabled = false;
        this.fullRedrawNeeded = true;
        this._drawGrid();
    }

    /**
     * Request a full redraw on next frame
     * Useful after viewport changes
     */
    requestFullRedraw() {
        this.fullRedrawNeeded = true;
        if (this.animationFrameId === null) {
            this._drawGrid();
        }
    }

    /**
     * Mark specific cells as dirty for redraw
     * @param {Array<{x: number, y: number}>} cells - Cells to mark dirty
     */
    markCellsDirty(cells) {
        for (let i = 0, len = cells.length; i < len; i++) {
            const cell = cells[i];
            this.dirtyRegions.set(`${cell.x}-${cell.y}`, { x: cell.x, y: cell.y });
        }
    }

    /**
     * Apply transform matrix to a cell
     * @param {number} x - Cell X coordinate
     * @param {number} y - Cell Y coordinate
     * @param {string} cssMatrix - CSS matrix() transform string
     */
    applyTransform(x, y, cssMatrix) {
        const key = `${x}-${y}`;
        const existingStyles = this.cellStyles.get(key) || {};
        this.cellStyles.set(key, { ...existingStyles, transform: cssMatrix });
        
        // Mark as dirty for redraw
        if (this.viewportEnabled) {
            this.dirtyRegions.add(key);
        } else {
            this._drawCell(x, y);
        }
    }

    /**
     * Get viewport rendering statistics
     * @returns {Object} Viewport stats
     */
    getViewportStats() {
        if (!this.animator.viewportManager) {
            return {
                enabled: false,
                totalCells: this.state.totalCells,
                visibleCells: this.state.totalCells,
                culledCells: 0,
                cullRatio: 0
            };
        }

        return {
            enabled: this.viewportEnabled,
            ...this.animator.viewportManager.getStats()
        };
    }

    /**
     * Clean up renderer resources
     */
    destroy() {
        // Cancel animation loop
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        // Remove event listener
        if (this.canvas) {
            this.canvas.removeEventListener('click', this._boundHandleClick);
        }
        
        // Remove canvas from DOM
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
        
        // Clear references
        this.canvas = null;
        this.ctx = null;
        this.cellColors.clear();
        this.cellStyles.clear();
        this.activeAnimations.clear();
    }

    /**
     * Get list of supported features
     * @returns {Array<string>} Array of feature names
     */
    getSupportedFeatures() {
        return [
            'colors',
            'opacity',
            'scale',
            'animations',
            'click-detection',
            'high-cell-count',
            'requestAnimationFrame',
            'hardware-acceleration',
            'viewport-culling',        // Phase 2C
            'transform-matrices',      // Phase 2C
            'partial-redraws',         // Phase 2C
            'dirty-region-tracking'    // Phase 2C
        ];
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CanvasRenderer;
}

// Export for browser
if (typeof window !== 'undefined') {
    window.CanvasRenderer = CanvasRenderer;
}
