/**
 * BaseRenderer - Abstract base class for all rendering modes
 * Defines the contract that all renderer implementations must follow
 * @abstract
 */
class BaseRenderer {
    /**
     * Create a renderer instance
     * @param {CellAnimator} animator - Parent CellAnimator instance
     */
    constructor(animator) {
        if (new.target === BaseRenderer) {
            throw new Error('BaseRenderer is abstract and cannot be instantiated directly');
        }
        
        this.animator = animator;
        this.config = animator.config;
        this.state = animator.state;
    }

    /**
     * Initialize the renderer and create the grid
     * @abstract
     * @returns {Promise<void>}
     */
    async init() {
        throw new Error('Method init() must be implemented by renderer');
    }

    /**
     * Create or update a single cell
     * @abstract
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {Object} cellData - Cell data object
     */
    createCell(x, y, cellData) {
        throw new Error('Method createCell() must be implemented by renderer');
    }

    /**
     * Update a cell's visual properties
     * @abstract
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {Object} styles - CSS styles or rendering properties
     */
    updateCell(x, y, styles) {
        throw new Error('Method updateCell() must be implemented by renderer');
    }

    /**
     * Apply animation to a cell
     * @abstract
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {Object} animation - Animation properties
     */
    animateCell(x, y, animation) {
        throw new Error('Method animateCell() must be implemented by renderer');
    }

    /**
     * Stop animation on a cell
     * @abstract
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
    stopAnimation(x, y) {
        throw new Error('Method stopAnimation() must be implemented by renderer');
    }

    /**
     * Stop all animations
     * @abstract
     */
    stopAllAnimations() {
        throw new Error('Method stopAllAnimations() must be implemented by renderer');
    }

    /**
     * Reset a cell to default state
     * @abstract
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
    resetCell(x, y) {
        throw new Error('Method resetCell() must be implemented by renderer');
    }

    /**
     * Reset all cells to default state
     * @abstract
     */
    resetAllCells() {
        throw new Error('Method resetAllCells() must be implemented by renderer');
    }

    /**
     * Handle click events (translate to cell coordinates)
     * @abstract
     * @param {Event} event - Click event
     * @returns {Object|null} Cell coordinates {x, y} or null
     */
    handleClick(event) {
        throw new Error('Method handleClick() must be implemented by renderer');
    }

    /**
     * Clear the entire grid
     * @abstract
     */
    clear() {
        throw new Error('Method clear() must be implemented by renderer');
    }

    /**
     * Clean up renderer resources
     * @abstract
     */
    destroy() {
        throw new Error('Method destroy() must be implemented by renderer');
    }

    /**
     * Get renderer-specific information
     * @returns {Object} Renderer info
     */
    getRendererInfo() {
        return {
            type: this.constructor.name,
            mode: this.mode || 'unknown'
        };
    }

    /**
     * Check if renderer supports a specific feature
     * @param {string} feature - Feature name
     * @returns {boolean} Whether feature is supported
     */
    supportsFeature(feature) {
        const features = this.getSupportedFeatures();
        return features.includes(feature);
    }

    /**
     * Get list of supported features
     * @abstract
     * @returns {Array<string>} Array of feature names
     */
    getSupportedFeatures() {
        return [];
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BaseRenderer;
}

// Export for browser
if (typeof window !== 'undefined') {
    window.BaseRenderer = BaseRenderer;
}
