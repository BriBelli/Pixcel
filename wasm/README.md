# PXS Compute - Rust/WASM High-Performance Module

This module provides high-performance compute functions for PXS, compiled from Rust to WebAssembly.

## Performance Benefits

| Operation | JavaScript | Rust/WASM |
|-----------|-----------|-----------|
| Grid creation (1M cells) | ~500ms | ~50ms |
| Gradient calculation | ~100ms | ~10ms |
| Animation frame | ~50ms | ~5ms |

## Prerequisites

1. Install Rust: https://rustup.rs/
2. Add WASM target:
   ```bash
   rustup target add wasm32-unknown-unknown
   ```
3. Install wasm-pack:
   ```bash
   cargo install wasm-pack
   ```

## Building

```bash
cd wasm
wasm-pack build --target web --out-dir ../dist/wasm
```

This creates:
- `../dist/wasm/pxs_compute.js` - JavaScript bindings
- `../dist/wasm/pxs_compute_bg.wasm` - WASM binary

## Usage in JavaScript

```javascript
import init, { PixelGrid, parse_hex_color, rgb } from './dist/wasm/pxs_compute.js';

async function main() {
    // Initialize WASM module
    await init();
    
    // Create a 640x480 grid (307,200 cells!)
    const grid = new PixelGrid(640, 480);
    
    // Apply a gradient (computed in WASM - super fast!)
    const startColor = parse_hex_color('#ff6b6b');
    const endColor = parse_hex_color('#4ecdc4');
    grid.apply_horizontal_gradient(startColor, endColor);
    
    // Get raw color buffer for WebGL
    const colors = grid.get_color_buffer();
    
    // Animate a wave
    const time = performance.now() / 1000;
    grid.apply_wave_animation(time, 260); // 260 = purple hue
}
```

## API Reference

### PixelGrid

```rust
// Create new grid
new PixelGrid(width: u32, height: u32) -> PixelGrid

// Properties
grid.width -> u32
grid.height -> u32  
grid.total_cells -> u32

// Cell access
grid.set_cell(x: u32, y: u32, color: u32)
grid.get_cell(x: u32, y: u32) -> u32

// Get raw buffer (for WebGL)
grid.get_color_buffer() -> Uint32Array

// Fill operations
grid.fill(color: u32)

// Gradients
grid.apply_horizontal_gradient(start_color: u32, end_color: u32)
grid.apply_vertical_gradient(start_color: u32, end_color: u32)
grid.apply_diagonal_gradient(start_color: u32, end_color: u32)
grid.apply_radial_gradient(center_color: u32, edge_color: u32)

// Animations (call each frame with time)
grid.apply_wave_animation(time: f32, base_hue: f32)
grid.apply_spiral_animation(time: f32, base_hue: f32)

// Patterns
grid.apply_checkerboard(color1: u32, color2: u32)
```

### Color Utilities

```rust
parse_hex_color(hex: &str) -> u32  // "#ff6b6b" -> 0xFF6B6BFF
rgb(r: u8, g: u8, b: u8) -> u32    // (255, 107, 107) -> 0xFF6B6BFF
rgba(r: u8, g: u8, b: u8, a: u8) -> u32
```

## Color Format

Colors are packed as u32 in RGBA format: `0xRRGGBBAA`

- Red: bits 24-31
- Green: bits 16-23
- Blue: bits 8-15
- Alpha: bits 0-7

Example: `0xFF0000FF` = pure red, full opacity
