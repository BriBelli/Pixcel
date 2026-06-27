/**
 * SpatialIndex - Quadtree Implementation for Fast Spatial Queries
 * 
 * Provides O(log n) spatial queries vs O(n) linear search.
 * Essential for large grids with spatial operations.
 * 
 * Foundation for 3D Octree in Phase 3 (WebGL renderer).
 * 
 * @class SpatialIndex
 */
class SpatialIndex {
    /**
     * Create a SpatialIndex (Quadtree)
     * 
     * @param {Object} bounds - Spatial bounds {x, y, width, height}
     * @param {number} capacity - Max items per node before subdivision (default: 4)
     * @param {number} maxDepth - Maximum tree depth (default: 8)
     * @param {number} depth - Current depth (internal, default: 0)
     */
    constructor(bounds, capacity = 4, maxDepth = 8, depth = 0) {
        // Spatial bounds of this node
        this.bounds = {
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height
        };
        
        // Configuration
        this.capacity = capacity;
        this.maxDepth = maxDepth;
        this.depth = depth;
        
        // Items in this node
        this.items = [];
        
        // Subdivision state
        this.divided = false;
        this.children = null;
        
        // Statistics
        this.stats = {
            totalItems: 0,
            totalNodes: 1,
            maxDepth: depth
        };
    }
    
    /**
     * Insert an item into the quadtree
     * 
     * @param {Object} item - Item to insert {x, y, data}
     * @returns {boolean} True if inserted successfully
     */
    insert(item) {
        // Check if item is within bounds
        if (!this.contains(item.x, item.y)) {
            return false;
        }
        
        // If not subdivided and under capacity, add here
        if (!this.divided && this.items.length < this.capacity) {
            this.items.push(item);
            this.stats.totalItems++;
            return true;
        }
        
        // If at max depth, add here (can't subdivide further)
        if (this.depth >= this.maxDepth) {
            this.items.push(item);
            this.stats.totalItems++;
            return true;
        }
        
        // Subdivide if needed
        if (!this.divided) {
            this.subdivide();
        }
        
        // Insert into appropriate child
        for (const child of this.children) {
            if (child.insert(item)) {
                this.updateStats();
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Subdivide this node into 4 quadrants
     * @private
     */
    subdivide() {
        const x = this.bounds.x;
        const y = this.bounds.y;
        const w = this.bounds.width / 2;
        const h = this.bounds.height / 2;
        
        // Create 4 children (NW, NE, SW, SE)
        this.children = [
            // Northwest
            new SpatialIndex(
                {x: x, y: y, width: w, height: h},
                this.capacity,
                this.maxDepth,
                this.depth + 1
            ),
            // Northeast
            new SpatialIndex(
                {x: x + w, y: y, width: w, height: h},
                this.capacity,
                this.maxDepth,
                this.depth + 1
            ),
            // Southwest
            new SpatialIndex(
                {x: x, y: y + h, width: w, height: h},
                this.capacity,
                this.maxDepth,
                this.depth + 1
            ),
            // Southeast
            new SpatialIndex(
                {x: x + w, y: y + h, width: w, height: h},
                this.capacity,
                this.maxDepth,
                this.depth + 1
            )
        ];
        
        // Move items to children
        const itemsToMove = this.items;
        this.items = [];
        
        for (const item of itemsToMove) {
            for (const child of this.children) {
                if (child.insert(item)) {
                    break;
                }
            }
        }
        
        this.divided = true;
        this.updateStats();
    }
    
    /**
     * Query items within a rectangular range
     * 
     * @param {Object} range - Query range {x, y, width, height}
     * @param {Array} found - Accumulator array (optional)
     * @returns {Array} Items within range
     */
    query(range, found = []) {
        // Check if range intersects this node's bounds
        if (!this.intersects(range)) {
            return found;
        }
        
        // Add items from this node that are in range
        for (const item of this.items) {
            if (this.pointInRange(item.x, item.y, range)) {
                found.push(item);
            }
        }
        
        // Recursively query children
        if (this.divided) {
            for (const child of this.children) {
                child.query(range, found);
            }
        }
        
        return found;
    }
    
    /**
     * Query items within a circular range
     * 
     * @param {number} centerX - Circle center X
     * @param {number} centerY - Circle center Y
     * @param {number} radius - Circle radius
     * @param {Array} found - Accumulator array (optional)
     * @returns {Array} Items within circle
     */
    queryCircle(centerX, centerY, radius, found = []) {
        // Create bounding box for circle
        const range = {
            x: centerX - radius,
            y: centerY - radius,
            width: radius * 2,
            height: radius * 2
        };
        
        // Check if range intersects this node's bounds
        if (!this.intersects(range)) {
            return found;
        }
        
        // Add items from this node that are in circle
        const radiusSquared = radius * radius;
        for (const item of this.items) {
            const dx = item.x - centerX;
            const dy = item.y - centerY;
            const distSquared = dx * dx + dy * dy;
            
            if (distSquared <= radiusSquared) {
                found.push(item);
            }
        }
        
        // Recursively query children
        if (this.divided) {
            for (const child of this.children) {
                child.queryCircle(centerX, centerY, radius, found);
            }
        }
        
        return found;
    }
    
    /**
     * Find nearest neighbor to a point
     * 
     * @param {number} x - Query point X
     * @param {number} y - Query point Y
     * @param {number} maxDistance - Maximum search distance (optional)
     * @returns {Object|null} Nearest item or null
     */
    nearest(x, y, maxDistance = Infinity) {
        let nearest = null;
        let minDistSquared = maxDistance * maxDistance;
        
        this._nearestHelper(x, y, minDistSquared, (item, distSquared) => {
            if (distSquared < minDistSquared) {
                nearest = item;
                minDistSquared = distSquared;
            }
        });
        
        return nearest;
    }
    
    /**
     * Helper for nearest neighbor search
     * @private
     */
    _nearestHelper(x, y, maxDistSquared, callback) {
        // Check items in this node
        for (const item of this.items) {
            const dx = item.x - x;
            const dy = item.y - y;
            const distSquared = dx * dx + dy * dy;
            
            if (distSquared < maxDistSquared) {
                callback(item, distSquared);
                maxDistSquared = distSquared; // Narrow search
            }
        }
        
        // Recursively search children (if closer than current nearest)
        if (this.divided) {
            // Sort children by distance to query point
            const childrenWithDist = this.children.map(child => ({
                child,
                dist: this.distanceToRectangle(x, y, child.bounds)
            }));
            
            childrenWithDist.sort((a, b) => a.dist - b.dist);
            
            for (const {child, dist} of childrenWithDist) {
                // Skip if child is too far away
                if (dist * dist > maxDistSquared) {
                    break;
                }
                child._nearestHelper(x, y, maxDistSquared, callback);
            }
        }
    }
    
    /**
     * Find K nearest neighbors
     * 
     * @param {number} x - Query point X
     * @param {number} y - Query point Y
     * @param {number} k - Number of neighbors
     * @param {number} maxDistance - Maximum search distance (optional)
     * @returns {Array} K nearest items
     */
    kNearest(x, y, k, maxDistance = Infinity) {
        const neighbors = [];
        let maxDistSquared = maxDistance * maxDistance;
        
        this._nearestHelper(x, y, maxDistSquared, (item, distSquared) => {
            neighbors.push({item, distance: Math.sqrt(distSquared)});
            neighbors.sort((a, b) => a.distance - b.distance);
            
            if (neighbors.length > k) {
                neighbors.pop();
                maxDistSquared = neighbors[neighbors.length - 1].distance ** 2;
            }
        });
        
        return neighbors.map(n => n.item);
    }
    
    /**
     * Remove an item from the quadtree
     * 
     * @param {Object} item - Item to remove {x, y, data}
     * @returns {boolean} True if removed successfully
     */
    remove(item) {
        // Check if item is within bounds
        if (!this.contains(item.x, item.y)) {
            return false;
        }
        
        // Try to remove from this node
        const index = this.items.findIndex(i =>
            i.x === item.x && i.y === item.y && i.data === item.data
        );
        
        if (index !== -1) {
            this.items.splice(index, 1);
            this.stats.totalItems--;
            return true;
        }
        
        // Try to remove from children
        if (this.divided) {
            for (const child of this.children) {
                if (child.remove(item)) {
                    this.updateStats();
                    return true;
                }
            }
        }
        
        return false;
    }
    
    /**
     * Clear all items from the quadtree
     */
    clear() {
        this.items = [];
        this.divided = false;
        this.children = null;
        this.stats.totalItems = 0;
        this.stats.totalNodes = 1;
        this.stats.maxDepth = this.depth;
    }
    
    /**
     * Check if a point is contained within this node's bounds
     * @private
     */
    contains(x, y) {
        return (
            x >= this.bounds.x &&
            x < this.bounds.x + this.bounds.width &&
            y >= this.bounds.y &&
            y < this.bounds.y + this.bounds.height
        );
    }
    
    /**
     * Check if a range intersects this node's bounds
     * @private
     */
    intersects(range) {
        return !(
            range.x > this.bounds.x + this.bounds.width ||
            range.x + range.width < this.bounds.x ||
            range.y > this.bounds.y + this.bounds.height ||
            range.y + range.height < this.bounds.y
        );
    }
    
    /**
     * Check if a point is within a range
     * @private
     */
    pointInRange(x, y, range) {
        return (
            x >= range.x &&
            x < range.x + range.width &&
            y >= range.y &&
            y < range.y + range.height
        );
    }
    
    /**
     * Calculate distance from point to rectangle
     * @private
     */
    distanceToRectangle(x, y, rect) {
        const dx = Math.max(rect.x - x, 0, x - (rect.x + rect.width));
        const dy = Math.max(rect.y - y, 0, y - (rect.y + rect.height));
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    /**
     * Update statistics recursively
     * @private
     */
    updateStats() {
        if (!this.divided) {
            this.stats.totalItems = this.items.length;
            this.stats.totalNodes = 1;
            this.stats.maxDepth = this.depth;
            return;
        }
        
        let totalItems = this.items.length;
        let totalNodes = 1;
        let maxDepth = this.depth;
        
        for (const child of this.children) {
            child.updateStats();
            totalItems += child.stats.totalItems;
            totalNodes += child.stats.totalNodes;
            maxDepth = Math.max(maxDepth, child.stats.maxDepth);
        }
        
        this.stats.totalItems = totalItems;
        this.stats.totalNodes = totalNodes;
        this.stats.maxDepth = maxDepth;
    }
    
    /**
     * Get tree statistics
     * 
     * @returns {Object} Statistics
     */
    getStats() {
        this.updateStats();
        return {...this.stats};
    }
    
    /**
     * Get all items in the tree
     * 
     * @returns {Array} All items
     */
    getAllItems() {
        return this.query(this.bounds);
    }
    
    /**
     * Visualize the quadtree structure (for debugging)
     * 
     * @returns {Object} Tree structure
     */
    toJSON() {
        const node = {
            bounds: this.bounds,
            depth: this.depth,
            itemCount: this.items.length,
            divided: this.divided
        };
        
        if (this.divided) {
            node.children = this.children.map(child => child.toJSON());
        }
        
        return node;
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SpatialIndex;
}

// Export for browser
if (typeof window !== 'undefined') {
    window.SpatialIndex = SpatialIndex;
}
export { SpatialIndex };
