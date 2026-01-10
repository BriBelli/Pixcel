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
     * Generate a linear gradient effect across cells
     * Each cell gets a solid color interpolated along the gradient
     * 
     * @param {Object} options - Gradient configuration
     * @param {number} options.startX - Start X coordinate
     * @param {number} options.startY - Start Y coordinate
     * @param {number} options.endX - End X coordinate
     * @param {number} options.endY - End Y coordinate
     * @param {string} options.colorStart - Starting color (hex)
     * @param {string} options.colorEnd - Ending color (hex)
     * @returns {Array<{x, y, styles}>} Array of cell updates
     */
    static generateLinearGradient(options) {
        const { startX, startY, endX, endY, colorStart, colorEnd } = options;
        const cells = [];
        
        // Calculate gradient vector
        const dx = endX - startX;
        const dy = endY - startY;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        // Generate cells along gradient
        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                // Calculate position along gradient (0 to 1)
                const dotProduct = (x - startX) * dx + (y - startY) * dy;
                const progress = Math.max(0, Math.min(1, dotProduct / (length * length)));
                
                // Interpolate color
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
        const cells = [];
        
        for (let y = 0; y < gridHeight; y++) {
            for (let x = 0; x < gridWidth; x++) {
                // Calculate distance from center
                const dx = x - centerX;
                const dy = y - centerY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Normalize to 0-1 (0 = center, 1 = edge)
                const progress = Math.min(1, distance / radius);
                
                // Interpolate color
                const color = this.interpolateColor(colorCenter, colorEdge, progress);
                
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
        const cells = [];
        const maxDistance = gridWidth + gridHeight - 2;
        
        for (let y = 0; y < gridHeight; y++) {
            for (let x = 0; x < gridWidth; x++) {
                // Diagonal progress (0 at top-left, 1 at bottom-right)
                const progress = (x + y) / maxDistance;
                
                // Interpolate color
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
