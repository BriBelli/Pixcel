/**
 * TransformMatrix - 2D/3D transformation matrix system
 * 
 * Purpose:
 * - Efficient 2D transforms for cells (translate, rotate, scale, skew)
 * - Matrix math for composable transformations
 * - GPU-friendly format for WebGL rendering
 * 
 * Use Cases:
 * - Cell rotations and scaling
 * - Complex composite transforms
 * - Animation transforms
 * - Camera transforms (Phase 3)
 * 
 * Phase 3 Preparation:
 * - 2D: 3x3 matrices (current)
 * - 3D: 4x4 matrices (Phase 3 WebGL)
 * - Direct compatibility with WebGL uniform matrices
 */

class TransformMatrix {
    /**
     * Create a 3x3 transformation matrix (2D)
     * Default: Identity matrix
     * 
     * Matrix format (column-major for WebGL compatibility):
     * [a, c, tx]   [scaleX, skewY,  translateX]
     * [b, d, ty] = [skewX,  scaleY, translateY]
     * [0, 0, 1 ]   [0,      0,      1         ]
     */
    constructor() {
        // Matrix data (3x3 as flat array)
        this.matrix = [
            1, 0, 0,  // Column 1: scaleX, skewX, 0
            0, 1, 0,  // Column 2: skewY, scaleY, 0
            0, 0, 1   // Column 3: translateX, translateY, 1
        ];

        // Cache for performance
        this._dirty = false;
        this._cssCache = null;
    }

    /**
     * Create identity matrix
     * @returns {TransformMatrix} New identity matrix
     */
    static identity() {
        return new TransformMatrix();
    }

    /**
     * Create translation matrix
     * @param {number} x - X translation
     * @param {number} y - Y translation
     * @returns {TransformMatrix} Translation matrix
     */
    static translation(x, y) {
        const matrix = new TransformMatrix();
        matrix.translate(x, y);
        return matrix;
    }

    /**
     * Create rotation matrix
     * @param {number} angle - Rotation angle in radians
     * @returns {TransformMatrix} Rotation matrix
     */
    static rotation(angle) {
        const matrix = new TransformMatrix();
        matrix.rotate(angle);
        return matrix;
    }

    /**
     * Create scale matrix
     * @param {number} sx - X scale factor
     * @param {number} sy - Y scale factor
     * @returns {TransformMatrix} Scale matrix
     */
    static scale(sx, sy) {
        const matrix = new TransformMatrix();
        matrix.scale(sx, sy);
        return matrix;
    }

    /**
     * Translate the matrix
     * @param {number} x - X translation
     * @param {number} y - Y translation
     * @returns {TransformMatrix} This matrix (for chaining)
     */
    translate(x, y) {
        this.matrix[6] += this.matrix[0] * x + this.matrix[3] * y;
        this.matrix[7] += this.matrix[1] * x + this.matrix[4] * y;
        this._dirty = true;
        return this;
    }

    /**
     * Rotate the matrix
     * @param {number} angle - Rotation angle in radians
     * @returns {TransformMatrix} This matrix (for chaining)
     */
    rotate(angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        const a = this.matrix[0];
        const b = this.matrix[1];
        const c = this.matrix[3];
        const d = this.matrix[4];

        this.matrix[0] = a * cos + c * sin;
        this.matrix[1] = b * cos + d * sin;
        this.matrix[3] = c * cos - a * sin;
        this.matrix[4] = d * cos - b * sin;

        this._dirty = true;
        return this;
    }

    /**
     * Scale the matrix
     * @param {number} sx - X scale factor
     * @param {number} sy - Y scale factor (defaults to sx)
     * @returns {TransformMatrix} This matrix (for chaining)
     */
    scale(sx, sy = sx) {
        this.matrix[0] *= sx;
        this.matrix[1] *= sx;
        this.matrix[3] *= sy;
        this.matrix[4] *= sy;
        this._dirty = true;
        return this;
    }

    /**
     * Skew the matrix
     * @param {number} ax - X skew angle in radians
     * @param {number} ay - Y skew angle in radians
     * @returns {TransformMatrix} This matrix (for chaining)
     */
    skew(ax, ay) {
        const tanX = Math.tan(ax);
        const tanY = Math.tan(ay);

        const a = this.matrix[0];
        const b = this.matrix[1];
        const c = this.matrix[3];
        const d = this.matrix[4];

        this.matrix[0] = a + c * tanY;
        this.matrix[1] = b + d * tanY;
        this.matrix[3] = c + a * tanX;
        this.matrix[4] = d + b * tanX;

        this._dirty = true;
        return this;
    }

    /**
     * Multiply this matrix by another matrix
     * @param {TransformMatrix} other - Matrix to multiply by
     * @returns {TransformMatrix} This matrix (for chaining)
     */
    multiply(other) {
        const a = this.matrix[0];
        const b = this.matrix[1];
        const c = this.matrix[3];
        const d = this.matrix[4];
        const tx = this.matrix[6];
        const ty = this.matrix[7];

        const oa = other.matrix[0];
        const ob = other.matrix[1];
        const oc = other.matrix[3];
        const od = other.matrix[4];
        const otx = other.matrix[6];
        const oty = other.matrix[7];

        this.matrix[0] = a * oa + c * ob;
        this.matrix[1] = b * oa + d * ob;
        this.matrix[3] = a * oc + c * od;
        this.matrix[4] = b * oc + d * od;
        this.matrix[6] = a * otx + c * oty + tx;
        this.matrix[7] = b * otx + d * oty + ty;

        this._dirty = true;
        return this;
    }

    /**
     * Transform a point by this matrix
     * @param {number} x - Point X coordinate
     * @param {number} y - Point Y coordinate
     * @returns {Object} Transformed point {x, y}
     */
    transformPoint(x, y) {
        return {
            x: this.matrix[0] * x + this.matrix[3] * y + this.matrix[6],
            y: this.matrix[1] * x + this.matrix[4] * y + this.matrix[7]
        };
    }

    /**
     * Invert the matrix
     * @returns {TransformMatrix} This matrix (for chaining)
     */
    invert() {
        const a = this.matrix[0];
        const b = this.matrix[1];
        const c = this.matrix[3];
        const d = this.matrix[4];
        const tx = this.matrix[6];
        const ty = this.matrix[7];

        const det = a * d - b * c;

        if (det === 0) {
            console.warn('TransformMatrix: Cannot invert singular matrix');
            return this;
        }

        const invDet = 1 / det;

        this.matrix[0] = d * invDet;
        this.matrix[1] = -b * invDet;
        this.matrix[3] = -c * invDet;
        this.matrix[4] = a * invDet;
        this.matrix[6] = (c * ty - d * tx) * invDet;
        this.matrix[7] = (b * tx - a * ty) * invDet;

        this._dirty = true;
        return this;
    }

    /**
     * Reset to identity matrix
     * @returns {TransformMatrix} This matrix (for chaining)
     */
    identity() {
        this.matrix = [1, 0, 0, 0, 1, 0, 0, 0, 1];
        this._dirty = true;
        return this;
    }

    /**
     * Clone this matrix
     * @returns {TransformMatrix} New matrix with same values
     */
    clone() {
        const matrix = new TransformMatrix();
        matrix.matrix = [...this.matrix];
        return matrix;
    }

    /**
     * Copy values from another matrix
     * @param {TransformMatrix} other - Matrix to copy from
     * @returns {TransformMatrix} This matrix (for chaining)
     */
    copy(other) {
        this.matrix = [...other.matrix];
        this._dirty = true;
        return this;
    }

    /**
     * Get CSS transform string
     * @returns {string} CSS matrix() transform
     */
    toCSSMatrix() {
        if (!this._dirty && this._cssCache) {
            return this._cssCache;
        }

        // CSS matrix(a, b, c, d, tx, ty)
        const css = `matrix(${this.matrix[0]}, ${this.matrix[1]}, ${this.matrix[3]}, ${this.matrix[4]}, ${this.matrix[6]}, ${this.matrix[7]})`;
        
        this._cssCache = css;
        this._dirty = false;
        
        return css;
    }

    /**
     * Get matrix as flat array (for WebGL)
     * @returns {Array<number>} Matrix as flat array
     */
    toArray() {
        return [...this.matrix];
    }

    /**
     * Get decomposed transform values
     * @returns {Object} {translateX, translateY, scaleX, scaleY, rotation, skewX, skewY}
     */
    decompose() {
        const a = this.matrix[0];
        const b = this.matrix[1];
        const c = this.matrix[3];
        const d = this.matrix[4];
        const tx = this.matrix[6];
        const ty = this.matrix[7];

        const scaleX = Math.sqrt(a * a + b * b);
        const scaleY = Math.sqrt(c * c + d * d);
        const rotation = Math.atan2(b, a);
        const skewX = Math.atan2(c, d) - rotation;
        const skewY = 0; // Simplified

        return {
            translateX: tx,
            translateY: ty,
            scaleX: scaleX,
            scaleY: scaleY,
            rotation: rotation,
            skewX: skewX,
            skewY: skewY
        };
    }

    /**
     * Check if matrix is identity
     * @returns {boolean} True if identity matrix
     */
    isIdentity() {
        return (
            this.matrix[0] === 1 && this.matrix[1] === 0 && this.matrix[2] === 0 &&
            this.matrix[3] === 0 && this.matrix[4] === 1 && this.matrix[5] === 0 &&
            this.matrix[6] === 0 && this.matrix[7] === 0 && this.matrix[8] === 1
        );
    }

    /**
     * Convert to string (for debugging)
     * @returns {string} Matrix as string
     */
    toString() {
        const m = this.matrix;
        return `[${m[0].toFixed(2)}, ${m[3].toFixed(2)}, ${m[6].toFixed(2)}]\n` +
               `[${m[1].toFixed(2)}, ${m[4].toFixed(2)}, ${m[7].toFixed(2)}]\n` +
               `[${m[2].toFixed(2)}, ${m[5].toFixed(2)}, ${m[8].toFixed(2)}]`;
    }
}

/**
 * TransformMatrix3D - 4x4 transformation matrix (3D)
 * Phase 3: WebGL renderer preparation
 * 
 * Matrix format (column-major for WebGL):
 * [m0,  m1,  m2,  m3 ]   [scaleX, 0,      0,      0     ]
 * [m4,  m5,  m6,  m7 ] = [0,      scaleY, 0,      0     ]
 * [m8,  m9,  m10, m11]   [0,      0,      scaleZ, 0     ]
 * [m12, m13, m14, m15]   [transX, transY, transZ, 1     ]
 */
class TransformMatrix3D {
    /**
     * Create a 4x4 transformation matrix (3D)
     * Default: Identity matrix
     */
    constructor() {
        // Matrix data (4x4 as flat array, column-major)
        this.matrix = [
            1, 0, 0, 0,  // Column 1
            0, 1, 0, 0,  // Column 2
            0, 0, 1, 0,  // Column 3
            0, 0, 0, 1   // Column 4
        ];

        this._dirty = false;
        this._cssCache = null;
    }

    /**
     * Create identity matrix
     * @returns {TransformMatrix3D} New identity matrix
     */
    static identity() {
        return new TransformMatrix3D();
    }

    /**
     * Create translation matrix
     * @param {number} x - X translation
     * @param {number} y - Y translation
     * @param {number} z - Z translation
     * @returns {TransformMatrix3D} Translation matrix
     */
    static translation(x, y, z = 0) {
        const matrix = new TransformMatrix3D();
        matrix.translate(x, y, z);
        return matrix;
    }

    /**
     * Translate the matrix
     * @param {number} x - X translation
     * @param {number} y - Y translation
     * @param {number} z - Z translation (default: 0)
     * @returns {TransformMatrix3D} This matrix (for chaining)
     */
    translate(x, y, z = 0) {
        this.matrix[12] += x;
        this.matrix[13] += y;
        this.matrix[14] += z;
        this._dirty = true;
        return this;
    }

    /**
     * Scale the matrix
     * @param {number} sx - X scale factor
     * @param {number} sy - Y scale factor (defaults to sx)
     * @param {number} sz - Z scale factor (defaults to sx)
     * @returns {TransformMatrix3D} This matrix (for chaining)
     */
    scale(sx, sy = sx, sz = sx) {
        this.matrix[0] *= sx;
        this.matrix[5] *= sy;
        this.matrix[10] *= sz;
        this._dirty = true;
        return this;
    }

    /**
     * Rotate around X axis
     * @param {number} angle - Rotation angle in radians
     * @returns {TransformMatrix3D} This matrix (for chaining)
     */
    rotateX(angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        
        const m5 = this.matrix[5];
        const m6 = this.matrix[6];
        const m9 = this.matrix[9];
        const m10 = this.matrix[10];
        
        this.matrix[5] = m5 * cos + m9 * sin;
        this.matrix[6] = m6 * cos + m10 * sin;
        this.matrix[9] = m9 * cos - m5 * sin;
        this.matrix[10] = m10 * cos - m6 * sin;
        
        this._dirty = true;
        return this;
    }

    /**
     * Rotate around Y axis
     * @param {number} angle - Rotation angle in radians
     * @returns {TransformMatrix3D} This matrix (for chaining)
     */
    rotateY(angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        
        const m0 = this.matrix[0];
        const m2 = this.matrix[2];
        const m8 = this.matrix[8];
        const m10 = this.matrix[10];
        
        this.matrix[0] = m0 * cos - m8 * sin;
        this.matrix[2] = m2 * cos - m10 * sin;
        this.matrix[8] = m8 * cos + m0 * sin;
        this.matrix[10] = m10 * cos + m2 * sin;
        
        this._dirty = true;
        return this;
    }

    /**
     * Rotate around Z axis
     * @param {number} angle - Rotation angle in radians
     * @returns {TransformMatrix3D} This matrix (for chaining)
     */
    rotateZ(angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        
        const m0 = this.matrix[0];
        const m1 = this.matrix[1];
        const m4 = this.matrix[4];
        const m5 = this.matrix[5];
        
        this.matrix[0] = m0 * cos + m4 * sin;
        this.matrix[1] = m1 * cos + m5 * sin;
        this.matrix[4] = m4 * cos - m0 * sin;
        this.matrix[5] = m5 * cos - m1 * sin;
        
        this._dirty = true;
        return this;
    }

    /**
     * Get CSS transform string (CSS3D)
     * @returns {string} CSS matrix3d() transform
     */
    toCSSMatrix3d() {
        if (!this._dirty && this._cssCache) {
            return this._cssCache;
        }

        const m = this.matrix;
        const css = `matrix3d(${m.join(', ')})`;
        
        this._cssCache = css;
        this._dirty = false;
        
        return css;
    }

    /**
     * Get matrix as flat array (for WebGL uniforms)
     * @returns {Float32Array} Matrix as typed array
     */
    toArray() {
        return new Float32Array(this.matrix);
    }

    /**
     * Reset to identity matrix
     * @returns {TransformMatrix3D} This matrix (for chaining)
     */
    identity() {
        this.matrix = [
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ];
        this._dirty = true;
        return this;
    }

    /**
     * Clone this matrix
     * @returns {TransformMatrix3D} New matrix with same values
     */
    clone() {
        const matrix = new TransformMatrix3D();
        matrix.matrix = [...this.matrix];
        return matrix;
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        TransformMatrix,
        TransformMatrix3D
    };
}

// Export for browser
if (typeof window !== 'undefined') {
    window.TransformMatrix = TransformMatrix;
    window.TransformMatrix3D = TransformMatrix3D;
}
export default {};
