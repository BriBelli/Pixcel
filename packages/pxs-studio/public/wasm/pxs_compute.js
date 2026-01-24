/* @ts-self-types="./pxs_compute.d.ts" */

/**
 * Image Processing - High-quality block averaging with gamma correction
 * This is the core algorithm for converting photos to pixel art
 */
export class ImageProcessor {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        ImageProcessorFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_imageprocessor_free(ptr, 0);
    }
    constructor() {
        const ret = wasm.imageprocessor_new();
        this.__wbg_ptr = ret >>> 0;
        ImageProcessorFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Process image data with gamma-correct block averaging
     *
     * source_data: Raw RGBA image data (Uint8ClampedArray from canvas)
     * source_width, source_height: Source image dimensions
     * target_cols, target_rows: Target grid dimensions
     *
     * Returns: Packed color array for target grid
     * @param {Uint8Array} source_data
     * @param {number} source_width
     * @param {number} source_height
     * @param {number} target_cols
     * @param {number} target_rows
     * @param {boolean} use_gamma
     * @returns {Uint32Array}
     */
    process_image(source_data, source_width, source_height, target_cols, target_rows, use_gamma) {
        const ptr0 = passArray8ToWasm0(source_data, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.imageprocessor_process_image(this.__wbg_ptr, ptr0, len0, source_width, source_height, target_cols, target_rows, use_gamma);
        var v2 = getArrayU32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v2;
    }
    /**
     * Process image and output as PXS-compatible JSON cells
     * Returns RGB strings in "rgb(r,g,b)" format
     * @param {Uint8Array} source_data
     * @param {number} source_width
     * @param {number} source_height
     * @param {number} target_cols
     * @param {number} target_rows
     * @returns {any[]}
     */
    process_to_rgb_strings(source_data, source_width, source_height, target_cols, target_rows) {
        const ptr0 = passArray8ToWasm0(source_data, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.imageprocessor_process_to_rgb_strings(this.__wbg_ptr, ptr0, len0, source_width, source_height, target_cols, target_rows);
        var v2 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v2;
    }
    /**
     * Set gamma value for correction (default 2.2)
     * @param {number} gamma
     */
    set_gamma(gamma) {
        wasm.imageprocessor_set_gamma(this.__wbg_ptr, gamma);
    }
}
if (Symbol.dispose) ImageProcessor.prototype[Symbol.dispose] = ImageProcessor.prototype.free;

/**
 * PixelGrid - High-performance cell storage
 * Uses a flat array for cache-friendly access
 */
export class PixelGrid {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        PixelGridFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_pixelgrid_free(ptr, 0);
    }
    /**
     * Apply checkerboard pattern
     * @param {number} color1
     * @param {number} color2
     */
    apply_checkerboard(color1, color2) {
        wasm.pixelgrid_apply_checkerboard(this.__wbg_ptr, color1, color2);
    }
    /**
     * Apply a diagonal gradient
     * @param {number} start_color
     * @param {number} end_color
     */
    apply_diagonal_gradient(start_color, end_color) {
        wasm.pixelgrid_apply_diagonal_gradient(this.__wbg_ptr, start_color, end_color);
    }
    /**
     * Apply a horizontal gradient
     * @param {number} start_color
     * @param {number} end_color
     */
    apply_horizontal_gradient(start_color, end_color) {
        wasm.pixelgrid_apply_horizontal_gradient(this.__wbg_ptr, start_color, end_color);
    }
    /**
     * Apply a radial gradient
     * @param {number} center_color
     * @param {number} edge_color
     */
    apply_radial_gradient(center_color, edge_color) {
        wasm.pixelgrid_apply_radial_gradient(this.__wbg_ptr, center_color, edge_color);
    }
    /**
     * Apply spiral pulse animation frame
     * @param {number} time
     * @param {number} base_hue
     */
    apply_spiral_animation(time, base_hue) {
        wasm.pixelgrid_apply_spiral_animation(this.__wbg_ptr, time, base_hue);
    }
    /**
     * Apply a vertical gradient
     * @param {number} start_color
     * @param {number} end_color
     */
    apply_vertical_gradient(start_color, end_color) {
        wasm.pixelgrid_apply_vertical_gradient(this.__wbg_ptr, start_color, end_color);
    }
    /**
     * Apply wave animation frame
     * time: animation time in seconds
     * @param {number} time
     * @param {number} base_hue
     */
    apply_wave_animation(time, base_hue) {
        wasm.pixelgrid_apply_wave_animation(this.__wbg_ptr, time, base_hue);
    }
    /**
     * Fill the entire grid with a single color
     * @param {number} color
     */
    fill(color) {
        wasm.pixelgrid_fill(this.__wbg_ptr, color);
    }
    /**
     * Get a single cell's color
     * @param {number} x
     * @param {number} y
     * @returns {number}
     */
    get_cell(x, y) {
        const ret = wasm.pixelgrid_get_cell(this.__wbg_ptr, x, y);
        return ret >>> 0;
    }
    /**
     * Get the raw color buffer as a Uint32Array for direct WebGL use
     * @returns {Uint32Array}
     */
    get_color_buffer() {
        const ret = wasm.pixelgrid_get_color_buffer(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get height() {
        const ret = wasm.pixelgrid_height(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Create a new pixel grid
     * @param {number} width
     * @param {number} height
     */
    constructor(width, height) {
        const ret = wasm.pixelgrid_new(width, height);
        this.__wbg_ptr = ret >>> 0;
        PixelGridFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Set a single cell's color (RGBA packed as u32)
     * @param {number} x
     * @param {number} y
     * @param {number} color
     */
    set_cell(x, y, color) {
        wasm.pixelgrid_set_cell(this.__wbg_ptr, x, y, color);
    }
    /**
     * @returns {number}
     */
    get total_cells() {
        const ret = wasm.pixelgrid_total_cells(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Get grid dimensions
     * @returns {number}
     */
    get width() {
        const ret = wasm.pixelgrid_width(this.__wbg_ptr);
        return ret >>> 0;
    }
}
if (Symbol.dispose) PixelGrid.prototype[Symbol.dispose] = PixelGrid.prototype.free;

/**
 * Fast noise generation for effects
 * @param {number} width
 * @param {number} height
 * @param {number} seed
 * @returns {Uint32Array}
 */
export function generate_noise_grid(width, height, seed) {
    const ret = wasm.generate_noise_grid(width, height, seed);
    var v1 = getArrayU32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
}

export function init() {
    wasm.init();
}

/**
 * Interpolate between two frames (for smooth transitions)
 * Returns array of interpolated colors
 * @param {Uint32Array} frame_a
 * @param {Uint32Array} frame_b
 * @param {number} t
 * @returns {Uint32Array}
 */
export function interpolate_frames(frame_a, frame_b, t) {
    const ptr0 = passArray32ToWasm0(frame_a, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray32ToWasm0(frame_b, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.interpolate_frames(ptr0, len0, ptr1, len1, t);
    var v3 = getArrayU32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v3;
}

/**
 * Utility: Parse CSS hex color to u32
 * @param {string} hex
 * @returns {number}
 */
export function parse_hex_color(hex) {
    const ptr0 = passStringToWasm0(hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.parse_hex_color(ptr0, len0);
    return ret >>> 0;
}

/**
 * Utility: Create RGB color from components
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {number}
 */
export function rgb(r, g, b) {
    const ret = wasm.rgb(r, g, b);
    return ret >>> 0;
}

/**
 * Utility: Create RGBA color from components
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @param {number} a
 * @returns {number}
 */
export function rgba(r, g, b, a) {
    const ret = wasm.rgba(r, g, b, a);
    return ret >>> 0;
}

function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg___wbindgen_throw_be289d5034ed271b: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbg_error_7534b8e9a36f1ab4: function(arg0, arg1) {
            let deferred0_0;
            let deferred0_1;
            try {
                deferred0_0 = arg0;
                deferred0_1 = arg1;
                console.error(getStringFromWasm0(arg0, arg1));
            } finally {
                wasm.__wbindgen_free(deferred0_0, deferred0_1, 1);
            }
        },
        __wbg_new_8a6f238a6ece86ea: function() {
            const ret = new Error();
            return ret;
        },
        __wbg_stack_0ed75d68575b0f3c: function(arg0, arg1) {
            const ret = arg1.stack;
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbindgen_cast_0000000000000001: function(arg0, arg1) {
            // Cast intrinsic for `Ref(Slice(U32)) -> NamedExternref("Uint32Array")`.
            const ret = getArrayU32FromWasm0(arg0, arg1);
            return ret;
        },
        __wbindgen_cast_0000000000000002: function(arg0, arg1) {
            // Cast intrinsic for `Ref(String) -> Externref`.
            const ret = getStringFromWasm0(arg0, arg1);
            return ret;
        },
        __wbindgen_init_externref_table: function() {
            const table = wasm.__wbindgen_externrefs;
            const offset = table.grow(4);
            table.set(0, undefined);
            table.set(offset + 0, undefined);
            table.set(offset + 1, null);
            table.set(offset + 2, true);
            table.set(offset + 3, false);
        },
    };
    return {
        __proto__: null,
        "./pxs_compute_bg.js": import0,
    };
}

const ImageProcessorFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_imageprocessor_free(ptr >>> 0, 1));
const PixelGridFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_pixelgrid_free(ptr >>> 0, 1));

function getArrayJsValueFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    const mem = getDataViewMemory0();
    const result = [];
    for (let i = ptr; i < ptr + 4 * len; i += 4) {
        result.push(wasm.__wbindgen_externrefs.get(mem.getUint32(i, true)));
    }
    wasm.__externref_drop_slice(ptr, len);
    return result;
}

function getArrayU32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return decodeText(ptr, len);
}

let cachedUint32ArrayMemory0 = null;
function getUint32ArrayMemory0() {
    if (cachedUint32ArrayMemory0 === null || cachedUint32ArrayMemory0.byteLength === 0) {
        cachedUint32ArrayMemory0 = new Uint32Array(wasm.memory.buffer);
    }
    return cachedUint32ArrayMemory0;
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function passArray32ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 4, 4) >>> 0;
    getUint32ArrayMemory0().set(arg, ptr / 4);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    };
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasm;
function __wbg_finalize_init(instance, module) {
    wasm = instance.exports;
    wasmModule = module;
    cachedDataViewMemory0 = null;
    cachedUint32ArrayMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    wasm.__wbindgen_start();
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = module.ok && expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('pxs_compute_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
