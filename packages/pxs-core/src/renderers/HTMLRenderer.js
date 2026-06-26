/**
 * HTMLRenderer - DOM-based rendering using HTML elements
 * Perfect for small to medium grids (< 10,000 cells)
 * Provides full CSS animation support and DOM interactivity
 */
class HTMLRenderer extends BaseRenderer {
    /**
     * Create an HTML renderer instance
     * @param {CellAnimator} animator - Parent CellAnimator instance
     */
    constructor(animator) {
        super(animator);
        this.mode = 'html';
        this.gridElement = null;
    }

    /**
     * Initialize the HTML renderer and generate grid (chunked for large grids)
     * @returns {Promise<void>}
     */
    async init() {
        const gridContainer = document.createElement('div');
        
        // Use CSS Grid for pixel-perfect cell placement (NO GAPS)
        gridContainer.className = 'cell-animator-grid';
        gridContainer.style.display = 'grid';
        gridContainer.style.gridTemplateColumns = `repeat(${this.state.columns}, ${this.config.cellWidth}px)`;
        gridContainer.style.gridTemplateRows = `repeat(${this.state.rows}, ${this.config.cellHeight}px)`;
        gridContainer.style.gap = '0';
        gridContainer.style.width = `${this.state.columns * this.config.cellWidth}px`;
        gridContainer.style.height = `${this.state.rows * this.config.cellHeight}px`;
        gridContainer.style.margin = '0';
        gridContainer.style.padding = '0';
        gridContainer.style.overflow = 'hidden';
        gridContainer.style.lineHeight = '0';
        gridContainer.style.fontSize = '0';

        const totalCells = this.state.totalCells;
        const CHUNK_SIZE = 2000; // DOM elements are heavier, use smaller chunks
        
        // For small grids, create synchronously (faster)
        if (totalCells <= CHUNK_SIZE) {
            const fragment = document.createDocumentFragment();
            let xPos = 0;
            let yPos = 0;
            
            for (let i = 0; i < totalCells; i++) {
                const cellElement = this._createCellElement(xPos, yPos);
                fragment.appendChild(cellElement);

                const key = `${xPos}-${yPos}`;
                this.animator.cells.set(key, {
                    element: cellElement,
                    x: xPos,
                    y: yPos,
                    index: i,
                    animated: false,
                    styles: {}
                });

                xPos++;
                if (xPos === this.state.columns) {
                    xPos = 0;
                    yPos++;
                }
            }
            
            gridContainer.appendChild(fragment);
        } else {
            // For large grids, use chunked async creation
            let xPos = 0;
            let yPos = 0;
            let cellsCreated = 0;
            let fragment = document.createDocumentFragment();
            
            for (let i = 0; i < totalCells; i++) {
                const cellElement = this._createCellElement(xPos, yPos);
                fragment.appendChild(cellElement);

                const key = `${xPos}-${yPos}`;
                this.animator.cells.set(key, {
                    element: cellElement,
                    x: xPos,
                    y: yPos,
                    index: i,
                    animated: false,
                    styles: {}
                });

                xPos++;
                if (xPos === this.state.columns) {
                    xPos = 0;
                    yPos++;
                }
                
                cellsCreated++;
                
                // Every CHUNK_SIZE cells, append fragment and yield to browser
                if (cellsCreated % CHUNK_SIZE === 0) {
                    gridContainer.appendChild(fragment);
                    fragment = document.createDocumentFragment();
                    
                    // Emit progress event
                    const progress = Math.round((cellsCreated / totalCells) * 100);
                    this.animator._emit('gridProgress', { 
                        cellsCreated, 
                        totalCells, 
                        progress,
                        phase: 'creating'
                    });
                    
                    // Yield to browser
                    await new Promise(resolve => setTimeout(resolve, 0));
                }
            }
            
            // Append remaining cells
            if (fragment.childNodes.length > 0) {
                gridContainer.appendChild(fragment);
            }
            
            // Final progress update
            this.animator._emit('gridProgress', { 
                cellsCreated: totalCells, 
                totalCells, 
                progress: 100,
                phase: 'complete'
            });
        }

        // Set container background (supports 'transparent' or any color)
        if (this.config.backgroundColor) {
            this.config.container.style.backgroundColor = this.config.backgroundColor;
        }
        
        this.config.container.innerHTML = '';
        this.config.container.appendChild(gridContainer);
        this.gridElement = gridContainer;
    }

    /**
     * Create a single cell HTML element
     * @private
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {HTMLElement} Cell element
     */
    _createCellElement(x, y) {
        const cell = document.createElement('div');
        cell.className = `cell x-${x} y-${y}`;
        
        // Grid cell - no inline-block needed, CSS Grid handles layout
        cell.style.width = `${this.config.cellWidth}px`;
        cell.style.height = `${this.config.cellHeight}px`;
        cell.style.boxSizing = 'border-box';
        cell.style.margin = '0';
        cell.style.padding = '0';
        cell.style.overflow = 'hidden';
        
        // Add border if enabled - use outline to avoid affecting cell size
        // Or use box-sizing: border-box which includes border in dimensions
        if (this.config.cellBorders) {
            cell.style.border = `${this.config.borderWidth}px ${this.config.borderStyle} ${this.config.borderColor}`;
        }
        cell.dataset.x = x;
        cell.dataset.y = y;

        // Add click listener
        cell.addEventListener('click', (e) => {
            this.animator._emit('cellClick', { x, y, element: cell, event: e });
        });
        
        // Add double-click listener for editor mode
        cell.addEventListener('dblclick', (e) => {
            this.animator._emit('cellDblClick', { x, y, element: cell, event: e });
        });
        
        // Add hover listeners for tooltips
        cell.addEventListener('mouseenter', (e) => {
            this.animator._emit('cellHover', { x, y, element: cell, event: e });
        });
        
        cell.addEventListener('mouseleave', (e) => {
            this.animator._emit('cellLeave', { x, y, element: cell, event: e });
        });

        return cell;
    }

    /**
     * Create or update a single cell
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {Object} cellData - Cell data object
     */
    createCell(x, y, cellData) {
        // HTML mode creates all cells upfront in init()
        // This method is for future dynamic cell addition
        const cellElement = this._createCellElement(x, y);
        this.gridElement.appendChild(cellElement);
        
        cellData.element = cellElement;
    }

    /**
     * Update a cell's visual properties
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {Object} styles - CSS styles to apply
     */
    updateCell(x, y, styles) {
        const cell = this.animator.getCell(x, y);
        if (!cell || !cell.element) {
            console.warn(`HTMLRenderer: Cell at (${x}, ${y}) not found`);
            return;
        }

        // Handle border properties specially
        const cellStyles = { ...styles };
        
        // Handle opacity: if opacity is provided, apply it
        // If background is rgba() with alpha, opacity parameter overrides the alpha
        if (cellStyles.opacity !== undefined) {
            const opacity = Math.max(0, Math.min(1, parseFloat(cellStyles.opacity)));
            cellStyles.opacity = opacity;
            
            // If background color is provided and has alpha, we need to combine them
            if (cellStyles.background) {
                const bgColor = cellStyles.background;
                // If it's rgba(), extract RGB and apply opacity
                const rgbaMatch = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
                if (rgbaMatch) {
                    const r = rgbaMatch[1];
                    const g = rgbaMatch[2];
                    const b = rgbaMatch[3];
                    // Use opacity parameter if provided, otherwise use alpha from rgba()
                    const finalAlpha = opacity !== undefined ? opacity : (parseFloat(rgbaMatch[4]) || 1);
                    cellStyles.background = `rgba(${r}, ${g}, ${b}, ${finalAlpha})`;
                } else {
                    // For non-rgba colors, apply opacity via CSS opacity property
                    // Keep background as-is, opacity will be applied separately
                }
            }
        }
        
        // If cellBorders is set (true/false), apply border style
        if (cellStyles.cellBorders !== undefined) {
            if (cellStyles.cellBorders === false) {
                cellStyles.border = 'none';
            } else {
                const borderColor = cellStyles.borderColor || this.config.borderColor;
                const borderWidth = cellStyles.borderWidth || this.config.borderWidth;
                const borderStyle = cellStyles.borderStyle || this.config.borderStyle;
                cellStyles.border = `${borderWidth}px ${borderStyle} ${borderColor}`;
            }
            // Remove custom properties so they don't get applied as CSS
            delete cellStyles.cellBorders;
            delete cellStyles.borderColor;
            delete cellStyles.borderWidth;
            delete cellStyles.borderStyle;
        }

        Object.assign(cell.element.style, cellStyles);
        Object.assign(cell.styles, styles);
    }

    /**
     * Apply animation to a cell
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {Object} animation - Animation properties
     */
    animateCell(x, y, animation) {
        const cell = this.animator.getCell(x, y);
        if (!cell || !cell.element) {
            console.warn(`HTMLRenderer: Cell at (${x}, ${y}) not found`);
            return;
        }

        // Reset existing animation
        this._resetCellAnimation(cell.element);

        // Build animation string
        const animationString = `${animation.name} ${animation.duration || '1s'} ${animation.timing || 'ease'} ${animation.delay || '0s'} ${animation.iteration || '1'}`;
        
        cell.element.style.animation = animationString;
        cell.animated = true;
    }

    /**
     * Reset a cell animation (force reflow)
     * @private
     * @param {HTMLElement} element - Cell element
     */
    _resetCellAnimation(element) {
        element.style.animation = 'none';
        element.offsetHeight; // Force reflow
        element.style.animation = null;
    }

    /**
     * Stop animation on a cell
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
    stopAnimation(x, y) {
        const cell = this.animator.getCell(x, y);
        if (!cell || !cell.element) return;

        cell.element.style.animation = 'none';
        cell.animated = false;
    }

    /**
     * Stop all animations
     */
    stopAllAnimations() {
        for (const cell of this.animator.cells.values()) {
            if (cell.element) {
                cell.element.style.animation = 'none';
                cell.animated = false;
            }
        }
    }

    /**
     * Reset a cell to default state
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
    resetCell(x, y) {
        const cell = this.animator.getCell(x, y);
        if (!cell || !cell.element) return;

        this.stopAnimation(x, y);
        
        // Reset to grid cell defaults (CSS Grid handles layout)
        cell.element.style.cssText = `
            width: ${this.config.cellWidth}px;
            height: ${this.config.cellHeight}px;
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            overflow: hidden;
        `;
        
        // Re-apply border if enabled
        if (this.config.cellBorders) {
            cell.element.style.border = `${this.config.borderWidth}px ${this.config.borderStyle} ${this.config.borderColor}`;
        }
        
        cell.styles = {};
    }

    /**
     * Reset all cells to default state
     */
    resetAllCells() {
        for (const cell of this.animator.cells.values()) {
            this.resetCell(cell.x, cell.y);
        }
    }

    /**
     * Handle click events (translate to cell coordinates)
     * @param {Event} event - Click event
     * @returns {Object|null} Cell coordinates {x, y} or null
     */
    handleClick(event) {
        // HTML mode handles clicks through individual cell event listeners
        // This method is for Canvas/WebGL mode compatibility
        if (event.target && event.target.dataset) {
            const x = parseInt(event.target.dataset.x);
            const y = parseInt(event.target.dataset.y);
            if (!isNaN(x) && !isNaN(y)) {
                return { x, y };
            }
        }
        return null;
    }

    /**
     * Clear the entire grid
     */
    clear() {
        if (this.gridElement && this.gridElement.parentNode) {
            this.gridElement.innerHTML = '';
        }
    }

    /**
     * Clean up renderer resources
     */
    destroy() {
        // Remove grid from DOM
        if (this.gridElement && this.gridElement.parentNode) {
            this.gridElement.parentNode.removeChild(this.gridElement);
        }
        this.gridElement = null;
    }

    /**
     * Get list of supported features
     * @returns {Array<string>} Array of feature names
     */
    getSupportedFeatures() {
        return [
            'css-animations',
            'dom-events',
            'full-interactivity',
            'css-transitions',
            'pseudo-elements',
            'hover-effects',
            'focus-states',
            'accessibility'
        ];
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HTMLRenderer;
}

// Export for browser
if (typeof window !== 'undefined') {
    window.HTMLRenderer = HTMLRenderer;
}
export { HTMLRenderer };
