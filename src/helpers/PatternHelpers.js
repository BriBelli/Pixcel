/**
 * PatternHelpers - Smart helper functions for generating cell patterns
 * 
 * Philosophy: Stay pure! These helpers generate arrays of cell updates.
 * Each cell remains solid-color. Gradients are achieved through arrangement.
 * 
 * Usage:
 *   const cells = PatternHelpers.generateGradient(...);
 *   animator.updateCells(cells);
 */

class PatternHelpers {
    /**
     * Generate a horizontal gradient effect across the entire grid
     * 
     * @param {Object} options - Gradient configuration
     * @param {number} options.gridWidth - Grid width (columns)
     * @param {number} options.gridHeight - Grid height (rows)
     * @param {string} options.colorStart - Starting color (hex) - left side
     * @param {string} options.colorEnd - Ending color (hex) - right side
     * @returns {Array<{x, y, styles}>} Array of cell updates
     */
    static generateHorizontalGradient(options) {
        const { gridWidth, gridHeight, colorStart, colorEnd } = options;
        const cells = new Array(gridWidth * gridHeight);
        
        // Pre-parse colors once
        const c1r = parseInt(colorStart.slice(1, 3), 16);
        const c1g = parseInt(colorStart.slice(3, 5), 16);
        const c1b = parseInt(colorStart.slice(5, 7), 16);
        const c2r = parseInt(colorEnd.slice(1, 3), 16);
        const c2g = parseInt(colorEnd.slice(3, 5), 16);
        const c2b = parseInt(colorEnd.slice(5, 7), 16);
        
        // Pre-compute colors for each column (same for all rows)
        const columnColors = new Array(gridWidth);
        const divisor = gridWidth > 1 ? gridWidth - 1 : 1;
        
        for (let x = 0; x < gridWidth; x++) {
            const t = x / divisor;
            const r = Math.round(c1r + (c2r - c1r) * t);
            const g = Math.round(c1g + (c2g - c1g) * t);
            const b = Math.round(c1b + (c2b - c1b) * t);
            const rHex = r.toString(16);
            const gHex = g.toString(16);
            const bHex = b.toString(16);
            columnColors[x] = '#' + 
                (rHex.length === 1 ? '0' + rHex : rHex) +
                (gHex.length === 1 ? '0' + gHex : gHex) +
                (bHex.length === 1 ? '0' + bHex : bHex);
        }
        
        let idx = 0;
        for (let y = 0; y < gridHeight; y++) {
            for (let x = 0; x < gridWidth; x++) {
                cells[idx++] = {
                    x,
                    y,
                    styles: { background: columnColors[x] }
                };
            }
        }
        
        return cells;
    }
    
    /**
     * Generate a vertical gradient effect across the entire grid
     * 
     * @param {Object} options - Gradient configuration
     * @param {number} options.gridWidth - Grid width (columns)
     * @param {number} options.gridHeight - Grid height (rows)
     * @param {string} options.colorStart - Starting color (hex) - top side
     * @param {string} options.colorEnd - Ending color (hex) - bottom side
     * @returns {Array<{x, y, styles}>} Array of cell updates
     */
    static generateVerticalGradient(options) {
        const { gridWidth, gridHeight, colorStart, colorEnd } = options;
        const cells = new Array(gridWidth * gridHeight);
        
        // Pre-parse colors once
        const c1r = parseInt(colorStart.slice(1, 3), 16);
        const c1g = parseInt(colorStart.slice(3, 5), 16);
        const c1b = parseInt(colorStart.slice(5, 7), 16);
        const c2r = parseInt(colorEnd.slice(1, 3), 16);
        const c2g = parseInt(colorEnd.slice(3, 5), 16);
        const c2b = parseInt(colorEnd.slice(5, 7), 16);
        
        // Pre-compute colors for each row (same for all columns)
        const rowColors = new Array(gridHeight);
        const divisor = gridHeight > 1 ? gridHeight - 1 : 1;
        
        for (let y = 0; y < gridHeight; y++) {
            const t = y / divisor;
            const r = Math.round(c1r + (c2r - c1r) * t);
            const g = Math.round(c1g + (c2g - c1g) * t);
            const b = Math.round(c1b + (c2b - c1b) * t);
            const rHex = r.toString(16);
            const gHex = g.toString(16);
            const bHex = b.toString(16);
            rowColors[y] = '#' + 
                (rHex.length === 1 ? '0' + rHex : rHex) +
                (gHex.length === 1 ? '0' + gHex : gHex) +
                (bHex.length === 1 ? '0' + bHex : bHex);
        }
        
        let idx = 0;
        for (let y = 0; y < gridHeight; y++) {
            const color = rowColors[y];
            for (let x = 0; x < gridWidth; x++) {
                cells[idx++] = {
                    x,
                    y,
                    styles: { background: color }
                };
            }
        }
        
        return cells;
    }
    
    /**
     * Generate a linear gradient effect across cells (legacy - line only)
     * Use generateHorizontalGradient or generateVerticalGradient for full grid
     * 
     * @param {Object} options - Gradient configuration
     * @param {number} options.gridWidth - Grid width (columns) - REQUIRED for full grid
     * @param {number} options.gridHeight - Grid height (rows) - REQUIRED for full grid
     * @param {string} options.colorStart - Starting color (hex)
     * @param {string} options.colorEnd - Ending color (hex)
     * @param {string} [options.direction='horizontal'] - 'horizontal' or 'vertical'
     * @returns {Array<{x, y, styles}>} Array of cell updates
     */
    static generateLinearGradient(options) {
        const { gridWidth, gridHeight, colorStart, colorEnd, direction = 'horizontal' } = options;
        
        // If gridWidth/gridHeight provided, use new full-grid method
        if (gridWidth && gridHeight) {
            if (direction === 'vertical') {
                return this.generateVerticalGradient(options);
            }
            return this.generateHorizontalGradient(options);
        }
        
        // Legacy support for old API
        const { startX = 0, startY = 0, endX = 0, endY = 0 } = options;
        const cells = [];
        
        const dx = endX - startX;
        const dy = endY - startY;
        const length = Math.sqrt(dx * dx + dy * dy) || 1;
        
        const minX = Math.min(startX, endX);
        const maxX = Math.max(startX, endX);
        const minY = Math.min(startY, endY);
        const maxY = Math.max(startY, endY);
        
        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                const dotProduct = (x - startX) * dx + (y - startY) * dy;
                const progress = Math.max(0, Math.min(1, dotProduct / (length * length)));
                const color = this.interpolateColor(colorStart, colorEnd, progress);
                
                cells.push({
                    x,
                    y,
                    styles: { background: color }
                });
            }
        }
        
        return cells;
    }
    
    /**
     * Generate a radial gradient effect from center point
     * 
     * @param {Object} options - Gradient configuration
     * @param {number} options.centerX - Center X coordinate
     * @param {number} options.centerY - Center Y coordinate
     * @param {number} options.radius - Radius in cells
     * @param {string} options.colorCenter - Center color (hex)
     * @param {string} options.colorEdge - Edge color (hex)
     * @param {number} options.gridWidth - Grid width (columns)
     * @param {number} options.gridHeight - Grid height (rows)
     * @returns {Array<{x, y, styles}>} Array of cell updates
     */
    static generateRadialGradient(options) {
        const { centerX, centerY, radius, colorCenter, colorEdge, gridWidth, gridHeight } = options;
        const cells = new Array(gridWidth * gridHeight);
        
        // Pre-parse colors once (avoid parsing in inner loop)
        const c1r = parseInt(colorCenter.slice(1, 3), 16);
        const c1g = parseInt(colorCenter.slice(3, 5), 16);
        const c1b = parseInt(colorCenter.slice(5, 7), 16);
        const c2r = parseInt(colorEdge.slice(1, 3), 16);
        const c2g = parseInt(colorEdge.slice(3, 5), 16);
        const c2b = parseInt(colorEdge.slice(5, 7), 16);
        
        // Pre-compute inverse radius for multiplication instead of division
        const invRadius = 1 / radius;
        let idx = 0;
        
        for (let y = 0; y < gridHeight; y++) {
            const dy = y - centerY;
            const dySq = dy * dy;
            
            for (let x = 0; x < gridWidth; x++) {
                const dx = x - centerX;
                const distance = Math.sqrt(dx * dx + dySq);
                
                // Normalize to 0-1 (0 = center, 1 = edge)
                const progress = distance * invRadius;
                const t = progress > 1 ? 1 : progress;
                
                // Inline interpolation (avoid function call overhead)
                const r = Math.round(c1r + (c2r - c1r) * t);
                const g = Math.round(c1g + (c2g - c1g) * t);
                const b = Math.round(c1b + (c2b - c1b) * t);
                
                const rHex = r.toString(16);
                const gHex = g.toString(16);
                const bHex = b.toString(16);
                
                cells[idx++] = {
                    x,
                    y,
                    styles: { 
                        background: '#' + 
                            (rHex.length === 1 ? '0' + rHex : rHex) +
                            (gHex.length === 1 ? '0' + gHex : gHex) +
                            (bHex.length === 1 ? '0' + bHex : bHex)
                    }
                };
            }
        }
        
        return cells;
    }
    
    /**
     * Generate a diagonal gradient (top-left to bottom-right)
     * 
     * @param {Object} options - Gradient configuration
     * @param {number} options.gridWidth - Grid width (columns)
     * @param {number} options.gridHeight - Grid height (rows)
     * @param {string} options.colorStart - Starting color (hex)
     * @param {string} options.colorEnd - Ending color (hex)
     * @returns {Array<{x, y, styles}>} Array of cell updates
     */
    static generateDiagonalGradient(options) {
        const { gridWidth, gridHeight, colorStart, colorEnd } = options;
        const cells = new Array(gridWidth * gridHeight);
        const maxDistance = gridWidth + gridHeight - 2;
        const invMaxDist = maxDistance > 0 ? 1 / maxDistance : 1;
        
        // Pre-parse colors once
        const c1r = parseInt(colorStart.slice(1, 3), 16);
        const c1g = parseInt(colorStart.slice(3, 5), 16);
        const c1b = parseInt(colorStart.slice(5, 7), 16);
        const c2r = parseInt(colorEnd.slice(1, 3), 16);
        const c2g = parseInt(colorEnd.slice(3, 5), 16);
        const c2b = parseInt(colorEnd.slice(5, 7), 16);
        
        let idx = 0;
        for (let y = 0; y < gridHeight; y++) {
            for (let x = 0; x < gridWidth; x++) {
                // Diagonal progress (0 at top-left, 1 at bottom-right)
                const t = (x + y) * invMaxDist;
                
                // Inline interpolation
                const r = Math.round(c1r + (c2r - c1r) * t);
                const g = Math.round(c1g + (c2g - c1g) * t);
                const b = Math.round(c1b + (c2b - c1b) * t);
                const rHex = r.toString(16);
                const gHex = g.toString(16);
                const bHex = b.toString(16);
                
                cells[idx++] = {
                    x,
                    y,
                    styles: { 
                        background: '#' + 
                            (rHex.length === 1 ? '0' + rHex : rHex) +
                            (gHex.length === 1 ? '0' + gHex : gHex) +
                            (bHex.length === 1 ? '0' + bHex : bHex)
                    }
                };
            }
        }
        
        return cells;
    }
    
    /**
     * Interpolate between two hex colors
     * @param {string} color1 - Starting color (hex)
     * @param {string} color2 - Ending color (hex)  
     * @param {number} factor - Interpolation factor (0-1)
     * @returns {string} Interpolated color (hex)
     */
    static interpolateColor(color1, color2, factor) {
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
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PatternHelpers;
}

// Export for browser
if (typeof window !== 'undefined') {
    window.PatternHelpers = PatternHelpers;
}
