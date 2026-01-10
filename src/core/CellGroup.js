/**
 * CellGroup - Group-based cell management system
 * 
 * Purpose:
 * - Organize cells into named groups for batch operations
 * - Simplify complex multi-cell patterns and animations
 * - Enable hierarchical cell organization
 * - Track group state and metadata
 * 
 * Use Cases:
 * - Animation sequences on cell groups
 * - UI regions (header, sidebar, content areas)
 * - Game entities (player, enemies, obstacles)
 * - Pattern generation (shapes, letters, designs)
 * - Layer management for complex scenes
 * 
 * Phase 3 Preparation:
 * - Foundation for 3D voxel grouping
 * - Hierarchical scene graphs
 * - Batch GPU operations
 */

class CellGroup {
    /**
     * Create a cell group
     * @param {string} name - Group name
     * @param {Object} [options] - Group configuration
     * @param {string} [options.description] - Group description
     * @param {Object} [options.metadata] - Custom metadata
     * @param {boolean} [options.visible=true] - Initial visibility
     */
    constructor(name, options = {}) {
        // Validation
        if (!name || typeof name !== 'string') {
            throw new Error('CellGroup: name must be a non-empty string');
        }

        // Group properties
        this.name = name;
        this.description = options.description || '';
        this.metadata = options.metadata || {};
        this.visible = options.visible !== undefined ? options.visible : true;

        // Cell storage
        this.cells = new Set(); // Cell coordinates as "x-y" strings
        this.cellObjects = new Map(); // "x-y" -> {x, y, element, ...}

        // Group state
        this.animated = false;
        this.currentAnimation = null;
        this.transform = null; // TransformMatrix reference

        // Statistics
        this.stats = {
            cellCount: 0,
            created: Date.now(),
            lastModified: Date.now()
        };

        // Event listeners
        this.eventListeners = new Map();
    }

    /**
     * Add a cell to the group
     * @param {number} x - Cell X coordinate
     * @param {number} y - Cell Y coordinate
     * @param {Object} [cellData] - Optional cell data object
     * @returns {CellGroup} This group (for chaining)
     */
    addCell(x, y, cellData = null) {
        const key = `${x}-${y}`;
        
        if (!this.cells.has(key)) {
            this.cells.add(key);
            
            if (cellData) {
                this.cellObjects.set(key, cellData);
            }
            
            this.stats.cellCount = this.cells.size;
            this.stats.lastModified = Date.now();
            
            this._emit('cellAdded', { x, y, groupName: this.name });
        }
        
        return this;
    }

    /**
     * Add multiple cells to the group
     * @param {Array<Object>} cells - Array of {x, y} or {x, y, ...cellData}
     * @returns {CellGroup} This group (for chaining)
     */
    addCells(cells) {
        for (const cell of cells) {
            this.addCell(cell.x, cell.y, cell);
        }
        return this;
    }

    /**
     * Remove a cell from the group
     * @param {number} x - Cell X coordinate
     * @param {number} y - Cell Y coordinate
     * @returns {CellGroup} This group (for chaining)
     */
    removeCell(x, y) {
        const key = `${x}-${y}`;
        
        if (this.cells.has(key)) {
            this.cells.delete(key);
            this.cellObjects.delete(key);
            
            this.stats.cellCount = this.cells.size;
            this.stats.lastModified = Date.now();
            
            this._emit('cellRemoved', { x, y, groupName: this.name });
        }
        
        return this;
    }

    /**
     * Remove multiple cells from the group
     * @param {Array<Object>} cells - Array of {x, y}
     * @returns {CellGroup} This group (for chaining)
     */
    removeCells(cells) {
        for (const cell of cells) {
            this.removeCell(cell.x, cell.y);
        }
        return this;
    }

    /**
     * Check if group contains a cell
     * @param {number} x - Cell X coordinate
     * @param {number} y - Cell Y coordinate
     * @returns {boolean} True if cell is in group
     */
    hasCell(x, y) {
        return this.cells.has(`${x}-${y}`);
    }

    /**
     * Get all cells in the group
     * @returns {Array<Object>} Array of {x, y} objects
     */
    getCells() {
        return Array.from(this.cells).map(key => {
            const [x, y] = key.split('-').map(Number);
            return { x, y };
        });
    }

    /**
     * Get cell data objects
     * @returns {Array<Object>} Array of cell data objects
     */
    getCellObjects() {
        return Array.from(this.cellObjects.values());
    }

    /**
     * Clear all cells from the group
     * @returns {CellGroup} This group (for chaining)
     */
    clear() {
        const count = this.cells.size;
        this.cells.clear();
        this.cellObjects.clear();
        
        this.stats.cellCount = 0;
        this.stats.lastModified = Date.now();
        
        this._emit('groupCleared', { groupName: this.name, removedCount: count });
        
        return this;
    }

    /**
     * Get group size (cell count)
     * @returns {number} Number of cells in group
     */
    size() {
        return this.cells.size;
    }

    /**
     * Check if group is empty
     * @returns {boolean} True if group has no cells
     */
    isEmpty() {
        return this.cells.size === 0;
    }

    /**
     * Get group bounding box
     * @returns {Object|null} {minX, minY, maxX, maxY, width, height} or null if empty
     */
    getBoundingBox() {
        if (this.isEmpty()) {
            return null;
        }

        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        for (const key of this.cells) {
            const [x, y] = key.split('-').map(Number);
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
        }

        return {
            minX,
            minY,
            maxX,
            maxY,
            width: maxX - minX + 1,
            height: maxY - minY + 1
        };
    }

    /**
     * Get group center
     * @returns {Object|null} {x, y} or null if empty
     */
    getCenter() {
        const bbox = this.getBoundingBox();
        if (!bbox) return null;

        return {
            x: bbox.minX + bbox.width / 2,
            y: bbox.minY + bbox.height / 2
        };
    }

    /**
     * Set group visibility
     * @param {boolean} visible - Visibility state
     * @returns {CellGroup} This group (for chaining)
     */
    setVisible(visible) {
        this.visible = visible;
        this._emit('visibilityChanged', { groupName: this.name, visible });
        return this;
    }

    /**
     * Toggle group visibility
     * @returns {CellGroup} This group (for chaining)
     */
    toggleVisible() {
        return this.setVisible(!this.visible);
    }

    /**
     * Set group animation state
     * @param {Object|null} animation - Animation config or null
     * @returns {CellGroup} This group (for chaining)
     */
    setAnimation(animation) {
        this.currentAnimation = animation;
        this.animated = animation !== null;
        this._emit('animationChanged', { groupName: this.name, animation });
        return this;
    }

    /**
     * Set group transform
     * @param {TransformMatrix|null} transform - Transform matrix or null
     * @returns {CellGroup} This group (for chaining)
     */
    setTransform(transform) {
        this.transform = transform;
        this._emit('transformChanged', { groupName: this.name, transform });
        return this;
    }

    /**
     * Get group statistics
     * @returns {Object} Group statistics
     */
    getStats() {
        return {
            ...this.stats,
            visible: this.visible,
            animated: this.animated,
            hasTransform: this.transform !== null
        };
    }

    /**
     * Get group info
     * @returns {Object} Group information
     */
    getInfo() {
        return {
            name: this.name,
            description: this.description,
            cellCount: this.cells.size,
            visible: this.visible,
            animated: this.animated,
            boundingBox: this.getBoundingBox(),
            center: this.getCenter(),
            metadata: { ...this.metadata }
        };
    }

    /**
     * Clone this group (cells only, not references)
     * @param {string} newName - Name for cloned group
     * @returns {CellGroup} New group with same cells
     */
    clone(newName) {
        const cloned = new CellGroup(newName, {
            description: this.description,
            metadata: { ...this.metadata },
            visible: this.visible
        });

        cloned.cells = new Set(this.cells);
        cloned.stats.cellCount = cloned.cells.size;

        return cloned;
    }

    /**
     * Register event listener
     * @param {string} event - Event name
     * @param {Function} callback - Event callback
     */
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    /**
     * Remove event listener
     * @param {string} event - Event name
     * @param {Function} callback - Event callback
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
     * Emit event
     * @param {string} event - Event name
     * @param {*} data - Event data
     * @private
     */
    _emit(event, data) {
        if (!this.eventListeners.has(event)) return;
        
        for (const callback of this.eventListeners.get(event)) {
            try {
                callback(data);
            } catch (error) {
                console.error(`CellGroup event error (${event}):`, error);
            }
        }
    }

    /**
     * Export group to JSON
     * @returns {Object} JSON representation
     */
    toJSON() {
        return {
            name: this.name,
            description: this.description,
            metadata: this.metadata,
            visible: this.visible,
            cells: this.getCells(),
            stats: this.stats
        };
    }

    /**
     * Import group from JSON
     * @param {Object} json - JSON data
     * @returns {CellGroup} New group from JSON
     */
    static fromJSON(json) {
        const group = new CellGroup(json.name, {
            description: json.description,
            metadata: json.metadata,
            visible: json.visible
        });

        group.addCells(json.cells);
        
        if (json.stats) {
            group.stats = { ...json.stats };
        }

        return group;
    }
}

/**
 * CellGroupManager - Manage multiple cell groups
 */
class CellGroupManager {
    constructor() {
        this.groups = new Map(); // name -> CellGroup
        this.cellToGroups = new Map(); // "x-y" -> Set of group names
    }

    /**
     * Create a new group
     * @param {string} name - Group name
     * @param {Object} [options] - Group options
     * @returns {CellGroup} Created group
     */
    createGroup(name, options = {}) {
        if (this.groups.has(name)) {
            console.warn(`CellGroupManager: Group "${name}" already exists`);
            return this.groups.get(name);
        }

        const group = new CellGroup(name, options);
        this.groups.set(name, group);

        // Listen to group changes
        group.on('cellAdded', (data) => this._trackCell(data.x, data.y, name));
        group.on('cellRemoved', (data) => this._untrackCell(data.x, data.y, name));
        group.on('groupCleared', () => this._untrackGroup(name));

        return group;
    }

    /**
     * Get a group by name
     * @param {string} name - Group name
     * @returns {CellGroup|undefined} Group or undefined
     */
    getGroup(name) {
        return this.groups.get(name);
    }

    /**
     * Delete a group
     * @param {string} name - Group name
     * @returns {boolean} True if deleted
     */
    deleteGroup(name) {
        if (!this.groups.has(name)) return false;

        this._untrackGroup(name);
        return this.groups.delete(name);
    }

    /**
     * Get all groups
     * @returns {Array<CellGroup>} Array of groups
     */
    getAllGroups() {
        return Array.from(this.groups.values());
    }

    /**
     * Get groups containing a cell
     * @param {number} x - Cell X coordinate
     * @param {number} y - Cell Y coordinate
     * @returns {Array<CellGroup>} Array of groups containing cell
     */
    getGroupsForCell(x, y) {
        const key = `${x}-${y}`;
        const groupNames = this.cellToGroups.get(key);
        
        if (!groupNames) return [];
        
        return Array.from(groupNames)
            .map(name => this.groups.get(name))
            .filter(g => g !== undefined);
    }

    /**
     * Track cell in group
     * @private
     */
    _trackCell(x, y, groupName) {
        const key = `${x}-${y}`;
        
        if (!this.cellToGroups.has(key)) {
            this.cellToGroups.set(key, new Set());
        }
        
        this.cellToGroups.get(key).add(groupName);
    }

    /**
     * Untrack cell from group
     * @private
     */
    _untrackCell(x, y, groupName) {
        const key = `${x}-${y}`;
        
        if (this.cellToGroups.has(key)) {
            this.cellToGroups.get(key).delete(groupName);
            
            if (this.cellToGroups.get(key).size === 0) {
                this.cellToGroups.delete(key);
            }
        }
    }

    /**
     * Untrack all cells from group
     * @private
     */
    _untrackGroup(groupName) {
        for (const [key, groupNames] of this.cellToGroups) {
            groupNames.delete(groupName);
            
            if (groupNames.size === 0) {
                this.cellToGroups.delete(key);
            }
        }
    }

    /**
     * Clear all groups
     */
    clear() {
        this.groups.clear();
        this.cellToGroups.clear();
    }
}

// Export classes
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CellGroup,
        CellGroupManager
    };
}
