/**
 * ObjectPool - Memory-efficient object pooling system
 * 
 * Purpose:
 * - Reduce garbage collection pressure by reusing objects
 * - Pre-allocate objects for dynamic grids
 * - Improve performance for high-frequency object creation/destruction
 * 
 * Use Cases:
 * - Cell objects in dynamic grids
 * - Animation state objects
 * - Transform matrices
 * - Temporary calculation objects
 * 
 * Phase 3 Preparation:
 * - Foundation for 3D voxel object pooling
 * - Scales to millions of objects
 * - GPU buffer management preparation
 */

class ObjectPool {
    /**
     * Create an object pool
     * @param {Function} factory - Function that creates new objects
     * @param {Function} [reset] - Function to reset objects (optional)
     * @param {Object} [options] - Pool configuration
     * @param {number} [options.initialSize=10] - Initial pool size
     * @param {number} [options.maxSize=1000] - Maximum pool size
     * @param {boolean} [options.autoGrow=true] - Automatically grow pool when empty
     * @param {number} [options.growthFactor=1.5] - Growth multiplier when expanding
     */
    constructor(factory, reset = null, options = {}) {
        // Validation
        if (typeof factory !== 'function') {
            throw new Error('ObjectPool: factory must be a function');
        }

        // Factory and reset functions
        this.factory = factory;
        this.reset = reset;

        // Configuration
        this.config = {
            initialSize: options.initialSize || 10,
            maxSize: options.maxSize || 1000,
            autoGrow: options.autoGrow !== undefined ? options.autoGrow : true,
            growthFactor: options.growthFactor || 1.5
        };

        // Pool storage
        this.available = []; // Available objects
        this.inUse = new Set(); // Objects currently in use

        // Statistics
        this.stats = {
            created: 0,
            acquired: 0,
            released: 0,
            recycled: 0,
            grew: 0,
            maxInUse: 0,
            currentInUse: 0
        };

        // Initialize pool
        this._initialize();
    }

    /**
     * Initialize pool with initial objects
     * @private
     */
    _initialize() {
        for (let i = 0; i < this.config.initialSize; i++) {
            const obj = this.factory();
            this.available.push(obj);
            this.stats.created++;
        }
    }

    /**
     * Acquire an object from the pool
     * @returns {*} Object from pool
     */
    acquire() {
        let obj;

        // Try to get from available pool
        if (this.available.length > 0) {
            obj = this.available.pop();
            this.stats.recycled++;
        } else if (this.config.autoGrow && this.stats.created < this.config.maxSize) {
            // Grow pool if allowed
            this._grow();
            obj = this.available.pop();
            this.stats.recycled++;
        } else {
            // Create new object if pool is empty and can't grow
            obj = this.factory();
            this.stats.created++;
        }

        // Track usage
        this.inUse.add(obj);
        this.stats.acquired++;
        this.stats.currentInUse = this.inUse.size;
        this.stats.maxInUse = Math.max(this.stats.maxInUse, this.stats.currentInUse);

        return obj;
    }

    /**
     * Release an object back to the pool
     * @param {*} obj - Object to release
     */
    release(obj) {
        // Verify object is in use
        if (!this.inUse.has(obj)) {
            console.warn('ObjectPool: Attempting to release object not acquired from pool');
            return;
        }

        // Reset object if reset function provided
        if (this.reset) {
            this.reset(obj);
        }

        // Move from inUse to available
        this.inUse.delete(obj);
        this.available.push(obj);

        // Update stats
        this.stats.released++;
        this.stats.currentInUse = this.inUse.size;
    }

    /**
     * Release multiple objects at once
     * @param {Array} objects - Array of objects to release
     */
    releaseAll(objects) {
        for (const obj of objects) {
            this.release(obj);
        }
    }

    /**
     * Grow the pool by adding more objects
     * @private
     */
    _grow() {
        const currentSize = this.available.length + this.inUse.size;
        const growthAmount = Math.max(1, Math.floor(currentSize * (this.config.growthFactor - 1)));
        const newSize = Math.min(currentSize + growthAmount, this.config.maxSize);
        const toCreate = newSize - currentSize;

        for (let i = 0; i < toCreate; i++) {
            const obj = this.factory();
            this.available.push(obj);
            this.stats.created++;
        }

        this.stats.grew++;
    }

    /**
     * Drain the pool (remove all available objects)
     */
    drain() {
        const drained = this.available.length;
        this.available = [];
        return drained;
    }

    /**
     * Clear the pool completely (including in-use objects)
     * WARNING: This will break references to in-use objects
     */
    clear() {
        this.available = [];
        this.inUse.clear();
        this.stats.currentInUse = 0;
    }

    /**
     * Get pool statistics
     * @returns {Object} Pool statistics
     */
    getStats() {
        return {
            ...this.stats,
            availableCount: this.available.length,
            totalSize: this.available.length + this.inUse.size,
            utilizationRate: this.stats.currentInUse / (this.available.length + this.inUse.size) || 0,
            recycleRate: this.stats.recycled / this.stats.acquired || 0
        };
    }

    /**
     * Get pool configuration
     * @returns {Object} Pool configuration
     */
    getConfig() {
        return { ...this.config };
    }

    /**
     * Reset statistics
     */
    resetStats() {
        const currentInUse = this.stats.currentInUse;
        const maxInUse = this.stats.maxInUse;
        
        this.stats = {
            created: 0,
            acquired: 0,
            released: 0,
            recycled: 0,
            grew: 0,
            maxInUse: maxInUse,
            currentInUse: currentInUse
        };
    }
}

/**
 * Specialized pool for cell objects
 */
class CellObjectPool extends ObjectPool {
    constructor(options = {}) {
        // Cell factory
        const factory = () => ({
            x: 0,
            y: 0,
            element: null,
            index: 0,
            animated: false,
            styles: {},
            metadata: {}
        });

        // Cell reset function
        const reset = (cell) => {
            cell.x = 0;
            cell.y = 0;
            cell.element = null;
            cell.index = 0;
            cell.animated = false;
            cell.styles = {};
            cell.metadata = {};
        };

        super(factory, reset, options);
    }
}

/**
 * Specialized pool for animation objects
 */
class AnimationObjectPool extends ObjectPool {
    constructor(options = {}) {
        // Animation factory
        const factory = () => ({
            name: '',
            duration: '1s',
            timing: 'ease',
            delay: '0s',
            iteration: '1',
            direction: 'normal',
            fillMode: 'none'
        });

        // Animation reset function
        const reset = (anim) => {
            anim.name = '';
            anim.duration = '1s';
            anim.timing = 'ease';
            anim.delay = '0s';
            anim.iteration = '1';
            anim.direction = 'normal';
            anim.fillMode = 'none';
        };

        super(factory, reset, options);
    }
}

/**
 * Specialized pool for coordinate objects
 */
class CoordinateObjectPool extends ObjectPool {
    constructor(options = {}) {
        // Coordinate factory
        const factory = () => ({
            x: 0,
            y: 0,
            z: 0 // Phase 3: 3D support
        });

        // Coordinate reset function
        const reset = (coord) => {
            coord.x = 0;
            coord.y = 0;
            coord.z = 0;
        };

        super(factory, reset, options);
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ObjectPool,
        CellObjectPool,
        AnimationObjectPool,
        CoordinateObjectPool
    };
}

// Export for browser
if (typeof window !== 'undefined') {
    window.ObjectPool = ObjectPool;
    window.CellObjectPool = CellObjectPool;
    window.AnimationObjectPool = AnimationObjectPool;
    window.CoordinateObjectPool = CoordinateObjectPool;
}
