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
     * Initialize the HTML renderer and generate grid
     * @returns {Promise<void>}
     */
    async init() {
        return new Promise((resolve) => {
            const fragment = document.createDocumentFragment();
            const gridContainer = document.createElement('div');
            
            // Set grid container styles
            gridContainer.className = 'cell-animator-grid';
            gridContainer.style.cssText = `
                display: flex;
                flex-wrap: wrap;
                max-width: ${this.state.columns * this.config.cellWidth}px;
                max-height: ${this.state.rows * this.config.cellHeight}px;
            `;

            let xPos = 0;
            let yPos = 0;

            // Generate cells
            for (let i = 0; i < this.state.totalCells; i++) {
                const cellElement = this._createCellElement(xPos, yPos);
                gridContainer.appendChild(cellElement);

                // Store cell data in animator's cell map
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

            fragment.appendChild(gridContainer);
            this.config.container.innerHTML = '';
            this.config.container.appendChild(fragment);
            this.gridElement = gridContainer;

            resolve();
        });
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
        cell.style.cssText = `
            display: block;
            width: ${this.config.cellWidth}px;
            height: ${this.config.cellHeight}px;
            box-sizing: border-box;
        `;
        cell.dataset.x = x;
        cell.dataset.y = y;

        // Add click listener
        cell.addEventListener('click', (e) => {
            this.animator._emit('cellClick', { x, y, element: cell, event: e });
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

        Object.assign(cell.element.style, styles);
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
        this.animator.cells.forEach((cell) => {
            if (cell.element) {
                cell.element.style.animation = 'none';
                cell.animated = false;
            }
        });
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
        cell.element.style.cssText = `
            display: block;
            width: ${this.config.cellWidth}px;
            height: ${this.config.cellHeight}px;
            box-sizing: border-box;
        `;
        cell.styles = {};
    }

    /**
     * Reset all cells to default state
     */
    resetAllCells() {
        this.animator.cells.forEach((cell) => {
            this.resetCell(cell.x, cell.y);
        });
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
