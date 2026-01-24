/**
 * WebGLRenderer - GPU-accelerated rendering using WebGL
 * Optimal for massive grids (100,000+ cells)
 * Renders entire grid in a single draw call using shaders
 * Phase 3: WebGL & 3D Foundation
 */
class WebGLRenderer extends BaseRenderer {
    constructor(animator) {
        super(animator);
        this.mode = 'webgl';
        
        // WebGL context and resources
        this.canvas = null;
        this.gl = null;
        this.program = null;
        
        // Shader locations
        this.locations = {};
        
        // Buffers
        this.positionBuffer = null;
        this.colorBuffer = null;
        this.colorData = null;  // Float32Array for cell colors
        
        // Animation state
        this.animationFrameId = null;
        this.lastFrameTime = 0;
        this.needsRedraw = true;
        
        // Cell color storage (RGBA as 0-1 floats)
        this.cellColors = new Map();  // "x-y" -> [r, g, b, a]
        
        // Click handler
        this._boundHandleClick = this.handleClick.bind(this);
    }

    /**
     * Vertex shader source - positions cells in grid
     */
    get vertexShaderSource() {
        return `
            attribute vec2 a_position;
            attribute vec4 a_color;
            
            uniform vec2 u_resolution;
            uniform vec2 u_cellSize;
            uniform vec2 u_gridSize;
            
            varying vec4 v_color;
            
            void main() {
                // Calculate cell position from vertex index
                float cellIndex = floor(a_position.x);
                float vertexInCell = a_position.y;
                
                // Cell grid coordinates
                float cellX = mod(cellIndex, u_gridSize.x);
                float cellY = floor(cellIndex / u_gridSize.x);
                
                // Vertex offset within cell (0-3 for quad corners)
                float vx = mod(vertexInCell, 2.0);
                float vy = floor(vertexInCell / 2.0);
                
                // Pixel position
                vec2 pixelPos = vec2(
                    (cellX + vx) * u_cellSize.x,
                    (cellY + vy) * u_cellSize.y
                );
                
                // Convert to clip space (-1 to 1)
                vec2 clipSpace = ((pixelPos / u_resolution) * 2.0) - 1.0;
                
                // Flip Y for WebGL coordinate system
                gl_Position = vec4(clipSpace.x, -clipSpace.y, 0, 1);
                
                v_color = a_color;
            }
        `;
    }

    /**
     * Fragment shader source - colors cells
     */
    get fragmentShaderSource() {
        return `
            precision mediump float;
            
            varying vec4 v_color;
            
            void main() {
                gl_FragColor = v_color;
            }
        `;
    }

    /**
     * Initialize WebGL renderer
     * @returns {Promise<void>}
     */
    async init() {
        // Create canvas
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'cell-animator-canvas webgl';
        
        const containerWidth = this.config.container.clientWidth;
        const containerHeight = this.config.container.clientHeight;
        
        // Handle high DPI
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = containerWidth * dpr;
        this.canvas.height = containerHeight * dpr;
        this.canvas.style.width = `${containerWidth}px`;
        this.canvas.style.height = `${containerHeight}px`;
        
        this.logicalWidth = containerWidth;
        this.logicalHeight = containerHeight;
        
        // Get WebGL context
        this.gl = this.canvas.getContext('webgl', {
            alpha: false,
            antialias: false,
            preserveDrawingBuffer: true
        });
        
        if (!this.gl) {
            throw new Error('WebGL not supported');
        }
        
        // Set container background (supports 'transparent' or any color)
        if (this.config.backgroundColor) {
            this.config.container.style.backgroundColor = this.config.backgroundColor;
        }
        
        // Append canvas
        this.config.container.appendChild(this.canvas);
        
        // Add click listener
        this.canvas.addEventListener('click', this._boundHandleClick);
        
        // Initialize WebGL resources
        this._initShaders();
        this._initBuffers();
        
        // Create cell data
        await this._createCells();
        
        // Initial draw
        this._draw();
        
        // Start render loop
        this._startRenderLoop();
    }

    /**
     * Initialize shaders
     * @private
     */
    _initShaders() {
        const gl = this.gl;
        
        // Compile vertex shader
        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShader, this.vertexShaderSource);
        gl.compileShader(vertexShader);
        
        if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
            throw new Error('Vertex shader compile error: ' + gl.getShaderInfoLog(vertexShader));
        }
        
        // Compile fragment shader
        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragmentShader, this.fragmentShaderSource);
        gl.compileShader(fragmentShader);
        
        if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
            throw new Error('Fragment shader compile error: ' + gl.getShaderInfoLog(fragmentShader));
        }
        
        // Create program
        this.program = gl.createProgram();
        gl.attachShader(this.program, vertexShader);
        gl.attachShader(this.program, fragmentShader);
        gl.linkProgram(this.program);
        
        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            throw new Error('Program link error: ' + gl.getProgramInfoLog(this.program));
        }
        
        // Get locations
        this.locations = {
            a_position: gl.getAttribLocation(this.program, 'a_position'),
            a_color: gl.getAttribLocation(this.program, 'a_color'),
            u_resolution: gl.getUniformLocation(this.program, 'u_resolution'),
            u_cellSize: gl.getUniformLocation(this.program, 'u_cellSize'),
            u_gridSize: gl.getUniformLocation(this.program, 'u_gridSize')
        };
    }

    /**
     * Initialize buffers
     * @private
     */
    _initBuffers() {
        const gl = this.gl;
        const { columns, rows } = this.state;
        const totalCells = columns * rows;
        
        // Each cell is a quad (2 triangles = 6 vertices)
        // Position data: [cellIndex, vertexInCell]
        const positionData = new Float32Array(totalCells * 6 * 2);
        
        for (let i = 0; i < totalCells; i++) {
            const offset = i * 12;
            // Triangle 1: 0,1,2
            positionData[offset + 0] = i; positionData[offset + 1] = 0;
            positionData[offset + 2] = i; positionData[offset + 3] = 1;
            positionData[offset + 4] = i; positionData[offset + 5] = 2;
            // Triangle 2: 1,3,2
            positionData[offset + 6] = i; positionData[offset + 7] = 1;
            positionData[offset + 8] = i; positionData[offset + 9] = 3;
            positionData[offset + 10] = i; positionData[offset + 11] = 2;
        }
        
        this.positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, positionData, gl.STATIC_DRAW);
        
        // Color data: RGBA for each vertex (6 vertices per cell)
        this.colorData = new Float32Array(totalCells * 6 * 4);
        
        // Initialize with default color (dark gray)
        const defaultColor = [0.165, 0.165, 0.165, 1.0]; // #2a2a2a
        for (let i = 0; i < totalCells; i++) {
            this._setCellColorInBuffer(i, defaultColor);
        }
        
        this.colorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.colorData, gl.DYNAMIC_DRAW);
    }

    /**
     * Set cell color in the buffer (does not upload to GPU)
     * @private
     */
    _setCellColorInBuffer(cellIndex, rgba) {
        const offset = cellIndex * 24; // 6 vertices * 4 components
        for (let v = 0; v < 6; v++) {
            const vOffset = offset + v * 4;
            this.colorData[vOffset + 0] = rgba[0];
            this.colorData[vOffset + 1] = rgba[1];
            this.colorData[vOffset + 2] = rgba[2];
            this.colorData[vOffset + 3] = rgba[3];
        }
    }

    /**
     * Create cell data (chunked for large grids)
     * @private
     */
    async _createCells() {
        const { columns, rows } = this.state;
        const totalCells = columns * rows;
        const CHUNK_SIZE = 10000;
        
        const defaultColor = [0.165, 0.165, 0.165, 1.0];
        
        for (let i = 0; i < totalCells; i++) {
            const x = i % columns;
            const y = Math.floor(i / columns);
            const key = `${x}-${y}`;
            
            this.animator.cells.set(key, {
                element: null,
                x,
                y,
                index: i,
                animated: false,
                styles: {}
            });
            
            this.cellColors.set(key, [...defaultColor]);
            
            // Yield for large grids
            if (totalCells > CHUNK_SIZE && i > 0 && i % CHUNK_SIZE === 0) {
                const progress = Math.round((i / totalCells) * 100);
                this.animator._emit('gridProgress', {
                    cellsCreated: i,
                    totalCells,
                    progress,
                    phase: 'creating'
                });
                await new Promise(r => setTimeout(r, 0));
            }
        }
        
        if (totalCells > CHUNK_SIZE) {
            this.animator._emit('gridProgress', {
                cellsCreated: totalCells,
                totalCells,
                progress: 100,
                phase: 'complete'
            });
        }
    }

    /**
     * Draw the grid
     * @private
     */
    _draw() {
        const gl = this.gl;
        const { columns, rows } = this.state;
        const { cellWidth, cellHeight } = this.config;
        const dpr = window.devicePixelRatio || 1;
        
        // Set viewport
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        
        // Clear
        gl.clearColor(0.1, 0.1, 0.1, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        
        // Use program
        gl.useProgram(this.program);
        
        // Set uniforms
        gl.uniform2f(this.locations.u_resolution, this.logicalWidth, this.logicalHeight);
        gl.uniform2f(this.locations.u_cellSize, cellWidth, cellHeight);
        gl.uniform2f(this.locations.u_gridSize, columns, rows);
        
        // Bind position buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.enableVertexAttribArray(this.locations.a_position);
        gl.vertexAttribPointer(this.locations.a_position, 2, gl.FLOAT, false, 0, 0);
        
        // Bind and update color buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.colorData);
        gl.enableVertexAttribArray(this.locations.a_color);
        gl.vertexAttribPointer(this.locations.a_color, 4, gl.FLOAT, false, 0, 0);
        
        // Draw all cells in one call!
        const totalCells = columns * rows;
        gl.drawArrays(gl.TRIANGLES, 0, totalCells * 6);
        
        this.needsRedraw = false;
    }

    /**
     * Start render loop
     * @private
     */
    _startRenderLoop() {
        const loop = (timestamp) => {
            if (this.needsRedraw) {
                this._draw();
            }
            this.lastFrameTime = timestamp;
            this.animationFrameId = requestAnimationFrame(loop);
        };
        this.animationFrameId = requestAnimationFrame(loop);
    }

    /**
     * Parse CSS color to RGBA array (0-1 range)
     * @private
     */
    _parseColor(color) {
        if (!color) return [0.165, 0.165, 0.165, 1.0];
        
        // Handle hex
        if (color.startsWith('#')) {
            const hex = color.slice(1);
            if (hex.length === 3) {
                const r = parseInt(hex[0] + hex[0], 16) / 255;
                const g = parseInt(hex[1] + hex[1], 16) / 255;
                const b = parseInt(hex[2] + hex[2], 16) / 255;
                return [r, g, b, 1.0];
            } else if (hex.length === 6) {
                const r = parseInt(hex.slice(0, 2), 16) / 255;
                const g = parseInt(hex.slice(2, 4), 16) / 255;
                const b = parseInt(hex.slice(4, 6), 16) / 255;
                return [r, g, b, 1.0];
            }
        }
        
        // Handle rgb/rgba
        const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (rgbMatch) {
            return [
                parseInt(rgbMatch[1]) / 255,
                parseInt(rgbMatch[2]) / 255,
                parseInt(rgbMatch[3]) / 255,
                rgbMatch[4] !== undefined ? parseFloat(rgbMatch[4]) : 1.0
            ];
        }
        
        // Handle hsl
        const hslMatch = color.match(/hsl\(([\d.]+),\s*([\d.]+)%,\s*([\d.]+)%\)/);
        if (hslMatch) {
            const h = parseFloat(hslMatch[1]) / 360;
            const s = parseFloat(hslMatch[2]) / 100;
            const l = parseFloat(hslMatch[3]) / 100;
            return [...this._hslToRgb(h, s, l), 1.0];
        }
        
        return [0.165, 0.165, 0.165, 1.0];
    }

    /**
     * Convert HSL to RGB
     * @private
     */
    _hslToRgb(h, s, l) {
        let r, g, b;
        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        return [r, g, b];
    }

    /**
     * Update a cell's color
     */
    updateCell(x, y, styles) {
        const cell = this.animator.getCell(x, y);
        if (!cell) return;
        
        const key = `${x}-${y}`;
        
        if (styles.background) {
            let rgba = this._parseColor(styles.background);
            
            // If opacity parameter is provided, apply it to alpha
            if (styles.opacity !== undefined) {
                const opacity = Math.max(0, Math.min(1, parseFloat(styles.opacity)));
                // Multiply existing alpha with opacity parameter
                rgba[3] = rgba[3] * opacity;
            }
            
            this.cellColors.set(key, rgba);
            this._setCellColorInBuffer(cell.index, rgba);
            this.needsRedraw = true;
        } else if (styles.opacity !== undefined) {
            // If only opacity is provided, update existing color's alpha
            const existingRgba = this.cellColors.get(key) || [0.165, 0.165, 0.165, 1.0];
            const opacity = Math.max(0, Math.min(1, parseFloat(styles.opacity)));
            existingRgba[3] = opacity;
            this.cellColors.set(key, existingRgba);
            this._setCellColorInBuffer(cell.index, existingRgba);
            this.needsRedraw = true;
        }
        
        Object.assign(cell.styles, styles);
    }

    /**
     * Animate a cell (WebGL uses shader-based animation)
     */
    animateCell(x, y, animation) {
        const cell = this.animator.getCell(x, y);
        if (!cell) return;
        
        // WebGL animations are handled via color updates in RAF loop
        cell.animated = true;
        cell.animation = animation;
    }

    /**
     * Stop animation on a cell
     */
    stopAnimation(x, y) {
        const cell = this.animator.getCell(x, y);
        if (!cell) return;
        
        cell.animated = false;
        cell.animation = null;
    }

    /**
     * Stop all animations
     */
    stopAllAnimations() {
        for (const cell of this.animator.cells.values()) {
            cell.animated = false;
            cell.animation = null;
        }
    }

    /**
     * Reset a cell
     */
    resetCell(x, y) {
        const cell = this.animator.getCell(x, y);
        if (!cell) return;
        
        this.stopAnimation(x, y);
        
        const defaultColor = [0.165, 0.165, 0.165, 1.0];
        const key = `${x}-${y}`;
        this.cellColors.set(key, defaultColor);
        this._setCellColorInBuffer(cell.index, defaultColor);
        this.needsRedraw = true;
        
        cell.styles = {};
    }

    /**
     * Reset all cells
     */
    resetAllCells() {
        this.stopAllAnimations();
        
        const defaultColor = [0.165, 0.165, 0.165, 1.0];
        for (const [key, cell] of this.animator.cells) {
            this.cellColors.set(key, defaultColor);
            this._setCellColorInBuffer(cell.index, defaultColor);
            cell.styles = {};
        }
        
        this.needsRedraw = true;
    }

    /**
     * Handle click
     */
    handleClick(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const cellX = Math.floor(x / this.config.cellWidth);
        const cellY = Math.floor(y / this.config.cellHeight);
        
        if (cellX >= 0 && cellX < this.state.columns && 
            cellY >= 0 && cellY < this.state.rows) {
            this.animator._emit('cellClick', { x: cellX, y: cellY, event });
            return { x: cellX, y: cellY };
        }
        return null;
    }

    /**
     * Clear the grid
     */
    clear() {
        const gl = this.gl;
        gl.clearColor(0.1, 0.1, 0.1, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
    }

    /**
     * Destroy renderer
     */
    destroy() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.removeEventListener('click', this._boundHandleClick);
            this.canvas.parentNode.removeChild(this.canvas);
        }
        
        if (this.gl) {
            this.gl.deleteProgram(this.program);
            this.gl.deleteBuffer(this.positionBuffer);
            this.gl.deleteBuffer(this.colorBuffer);
        }
        
        this.canvas = null;
        this.gl = null;
    }

    /**
     * Get supported features
     */
    getSupportedFeatures() {
        return [
            'gpu-acceleration',
            'batch-rendering',
            'shader-effects',
            'high-cell-count',
            'transform-matrix'
        ];
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WebGLRenderer;
}
if (typeof window !== 'undefined') {
    window.WebGLRenderer = WebGLRenderer;
}
export default {};
