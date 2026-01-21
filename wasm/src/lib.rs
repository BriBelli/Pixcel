//! PXS Compute - High-performance WASM module for pixel grid calculations
//! 
//! This module provides GPU-like compute performance for:
//! - Cell state management (massive arrays)
//! - Gradient calculations (linear, radial, diagonal)
//! - Animation math (wave, pulse, spiral)
//! - Color interpolation (HSL/RGB)

use wasm_bindgen::prelude::*;
use js_sys::{Float32Array, Uint32Array};

// Initialize panic hook for better error messages
#[wasm_bindgen(start)]
pub fn init() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

/// PixelGrid - High-performance cell storage
/// Uses a flat array for cache-friendly access
#[wasm_bindgen]
pub struct PixelGrid {
    width: u32,
    height: u32,
    // RGBA colors packed as u32 (0xRRGGBBAA)
    colors: Vec<u32>,
}

#[wasm_bindgen]
impl PixelGrid {
    /// Create a new pixel grid
    #[wasm_bindgen(constructor)]
    pub fn new(width: u32, height: u32) -> PixelGrid {
        let size = (width * height) as usize;
        let default_color = 0x2A2A2AFF; // Dark gray with full alpha
        
        PixelGrid {
            width,
            height,
            colors: vec![default_color; size],
        }
    }
    
    /// Get grid dimensions
    #[wasm_bindgen(getter)]
    pub fn width(&self) -> u32 { self.width }
    
    #[wasm_bindgen(getter)]
    pub fn height(&self) -> u32 { self.height }
    
    #[wasm_bindgen(getter)]
    pub fn total_cells(&self) -> u32 { self.width * self.height }
    
    /// Set a single cell's color (RGBA packed as u32)
    #[wasm_bindgen]
    pub fn set_cell(&mut self, x: u32, y: u32, color: u32) {
        if x < self.width && y < self.height {
            let index = (y * self.width + x) as usize;
            self.colors[index] = color;
        }
    }
    
    /// Get a single cell's color
    #[wasm_bindgen]
    pub fn get_cell(&self, x: u32, y: u32) -> u32 {
        if x < self.width && y < self.height {
            let index = (y * self.width + x) as usize;
            self.colors[index]
        } else {
            0
        }
    }
    
    /// Get the raw color buffer as a Uint32Array for direct WebGL use
    #[wasm_bindgen]
    pub fn get_color_buffer(&self) -> Uint32Array {
        unsafe {
            Uint32Array::view(&self.colors)
        }
    }
    
    /// Fill the entire grid with a single color
    #[wasm_bindgen]
    pub fn fill(&mut self, color: u32) {
        for c in self.colors.iter_mut() {
            *c = color;
        }
    }
    
    /// Apply a horizontal gradient
    #[wasm_bindgen]
    pub fn apply_horizontal_gradient(&mut self, start_color: u32, end_color: u32) {
        let (sr, sg, sb, sa) = unpack_rgba(start_color);
        let (er, eg, eb, ea) = unpack_rgba(end_color);
        
        for y in 0..self.height {
            for x in 0..self.width {
                let t = x as f32 / (self.width - 1).max(1) as f32;
                let r = lerp(sr, er, t);
                let g = lerp(sg, eg, t);
                let b = lerp(sb, eb, t);
                let a = lerp(sa, ea, t);
                
                let index = (y * self.width + x) as usize;
                self.colors[index] = pack_rgba(r, g, b, a);
            }
        }
    }
    
    /// Apply a vertical gradient
    #[wasm_bindgen]
    pub fn apply_vertical_gradient(&mut self, start_color: u32, end_color: u32) {
        let (sr, sg, sb, sa) = unpack_rgba(start_color);
        let (er, eg, eb, ea) = unpack_rgba(end_color);
        
        for y in 0..self.height {
            let t = y as f32 / (self.height - 1).max(1) as f32;
            let r = lerp(sr, er, t);
            let g = lerp(sg, eg, t);
            let b = lerp(sb, eb, t);
            let a = lerp(sa, ea, t);
            let color = pack_rgba(r, g, b, a);
            
            for x in 0..self.width {
                let index = (y * self.width + x) as usize;
                self.colors[index] = color;
            }
        }
    }
    
    /// Apply a diagonal gradient
    #[wasm_bindgen]
    pub fn apply_diagonal_gradient(&mut self, start_color: u32, end_color: u32) {
        let (sr, sg, sb, sa) = unpack_rgba(start_color);
        let (er, eg, eb, ea) = unpack_rgba(end_color);
        let max_dist = (self.width + self.height - 2) as f32;
        
        for y in 0..self.height {
            for x in 0..self.width {
                let t = (x + y) as f32 / max_dist.max(1.0);
                let r = lerp(sr, er, t);
                let g = lerp(sg, eg, t);
                let b = lerp(sb, eb, t);
                let a = lerp(sa, ea, t);
                
                let index = (y * self.width + x) as usize;
                self.colors[index] = pack_rgba(r, g, b, a);
            }
        }
    }
    
    /// Apply a radial gradient
    #[wasm_bindgen]
    pub fn apply_radial_gradient(&mut self, center_color: u32, edge_color: u32) {
        let (cr, cg, cb, ca) = unpack_rgba(center_color);
        let (er, eg, eb, ea) = unpack_rgba(edge_color);
        
        let cx = (self.width - 1) as f32 / 2.0;
        let cy = (self.height - 1) as f32 / 2.0;
        let max_radius = ((cx * cx + cy * cy) as f32).sqrt();
        
        for y in 0..self.height {
            for x in 0..self.width {
                let dx = x as f32 - cx;
                let dy = y as f32 - cy;
                let dist = (dx * dx + dy * dy).sqrt();
                let t = (dist / max_radius).min(1.0);
                
                let r = lerp(cr, er, t);
                let g = lerp(cg, eg, t);
                let b = lerp(cb, eb, t);
                let a = lerp(ca, ea, t);
                
                let index = (y * self.width + x) as usize;
                self.colors[index] = pack_rgba(r, g, b, a);
            }
        }
    }
    
    /// Apply wave animation frame
    /// time: animation time in seconds
    #[wasm_bindgen]
    pub fn apply_wave_animation(&mut self, time: f32, base_hue: f32) {
        for y in 0..self.height {
            for x in 0..self.width {
                let phase = (time + (x + y) as f32 * 0.05) % 2.0;
                let hue = (base_hue + phase * 30.0) % 360.0;
                let lightness = 50.0 + (phase * std::f32::consts::PI).sin() * 20.0;
                
                let (r, g, b) = hsl_to_rgb(hue / 360.0, 0.7, lightness / 100.0);
                let index = (y * self.width + x) as usize;
                self.colors[index] = pack_rgba(r, g, b, 1.0);
            }
        }
    }
    
    /// Apply spiral pulse animation frame
    #[wasm_bindgen]
    pub fn apply_spiral_animation(&mut self, time: f32, base_hue: f32) {
        let cx = (self.width - 1) as f32 / 2.0;
        let cy = (self.height - 1) as f32 / 2.0;
        
        for y in 0..self.height {
            for x in 0..self.width {
                let dx = x as f32 - cx;
                let dy = y as f32 - cy;
                let dist = (dx * dx + dy * dy).sqrt();
                
                let phase = (time / 1.5 + dist * 0.08) % 2.0;
                let hue = (base_hue - dist * 3.0) % 360.0;
                let lightness = 50.0 + (phase * std::f32::consts::PI).sin() * 25.0;
                let saturation = 70.0 + (phase * std::f32::consts::PI).sin() * 20.0;
                
                let (r, g, b) = hsl_to_rgb(hue / 360.0, saturation / 100.0, lightness / 100.0);
                let index = (y * self.width + x) as usize;
                self.colors[index] = pack_rgba(r, g, b, 1.0);
            }
        }
    }
    
    /// Apply checkerboard pattern
    #[wasm_bindgen]
    pub fn apply_checkerboard(&mut self, color1: u32, color2: u32) {
        for y in 0..self.height {
            for x in 0..self.width {
                let index = (y * self.width + x) as usize;
                self.colors[index] = if (x + y) % 2 == 0 { color1 } else { color2 };
            }
        }
    }
}

// Helper functions

/// Unpack RGBA from u32 (0xRRGGBBAA) to f32 components (0.0-1.0)
fn unpack_rgba(color: u32) -> (f32, f32, f32, f32) {
    let r = ((color >> 24) & 0xFF) as f32 / 255.0;
    let g = ((color >> 16) & 0xFF) as f32 / 255.0;
    let b = ((color >> 8) & 0xFF) as f32 / 255.0;
    let a = (color & 0xFF) as f32 / 255.0;
    (r, g, b, a)
}

/// Pack RGBA f32 components (0.0-1.0) to u32 (0xRRGGBBAA)
fn pack_rgba(r: f32, g: f32, b: f32, a: f32) -> u32 {
    let r = (r.clamp(0.0, 1.0) * 255.0) as u32;
    let g = (g.clamp(0.0, 1.0) * 255.0) as u32;
    let b = (b.clamp(0.0, 1.0) * 255.0) as u32;
    let a = (a.clamp(0.0, 1.0) * 255.0) as u32;
    (r << 24) | (g << 16) | (b << 8) | a
}

/// Linear interpolation
fn lerp(a: f32, b: f32, t: f32) -> f32 {
    a + (b - a) * t
}

/// Convert HSL to RGB (all values 0.0-1.0)
fn hsl_to_rgb(h: f32, s: f32, l: f32) -> (f32, f32, f32) {
    if s == 0.0 {
        return (l, l, l);
    }
    
    let q = if l < 0.5 { l * (1.0 + s) } else { l + s - l * s };
    let p = 2.0 * l - q;
    
    let r = hue_to_rgb(p, q, h + 1.0 / 3.0);
    let g = hue_to_rgb(p, q, h);
    let b = hue_to_rgb(p, q, h - 1.0 / 3.0);
    
    (r, g, b)
}

fn hue_to_rgb(p: f32, q: f32, mut t: f32) -> f32 {
    if t < 0.0 { t += 1.0; }
    if t > 1.0 { t -= 1.0; }
    
    if t < 1.0 / 6.0 { return p + (q - p) * 6.0 * t; }
    if t < 1.0 / 2.0 { return q; }
    if t < 2.0 / 3.0 { return p + (q - p) * (2.0 / 3.0 - t) * 6.0; }
    p
}

/// Utility: Parse CSS hex color to u32
#[wasm_bindgen]
pub fn parse_hex_color(hex: &str) -> u32 {
    let hex = hex.trim_start_matches('#');
    
    let (r, g, b) = if hex.len() == 3 {
        let r = u8::from_str_radix(&hex[0..1], 16).unwrap_or(0);
        let g = u8::from_str_radix(&hex[1..2], 16).unwrap_or(0);
        let b = u8::from_str_radix(&hex[2..3], 16).unwrap_or(0);
        (r * 17, g * 17, b * 17)
    } else if hex.len() == 6 {
        let r = u8::from_str_radix(&hex[0..2], 16).unwrap_or(0);
        let g = u8::from_str_radix(&hex[2..4], 16).unwrap_or(0);
        let b = u8::from_str_radix(&hex[4..6], 16).unwrap_or(0);
        (r, g, b)
    } else {
        (0, 0, 0)
    };
    
    ((r as u32) << 24) | ((g as u32) << 16) | ((b as u32) << 8) | 0xFF
}

/// Utility: Create RGB color from components
#[wasm_bindgen]
pub fn rgb(r: u8, g: u8, b: u8) -> u32 {
    ((r as u32) << 24) | ((g as u32) << 16) | ((b as u32) << 8) | 0xFF
}

/// Utility: Create RGBA color from components  
#[wasm_bindgen]
pub fn rgba(r: u8, g: u8, b: u8, a: u8) -> u32 {
    ((r as u32) << 24) | ((g as u32) << 16) | ((b as u32) << 8) | (a as u32)
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_grid_creation() {
        let grid = PixelGrid::new(100, 100);
        assert_eq!(grid.total_cells(), 10000);
    }
    
    #[test]
    fn test_cell_access() {
        let mut grid = PixelGrid::new(10, 10);
        grid.set_cell(5, 5, 0xFF0000FF);
        assert_eq!(grid.get_cell(5, 5), 0xFF0000FF);
    }
    
    #[test]
    fn test_color_packing() {
        let color = pack_rgba(1.0, 0.0, 0.0, 1.0);
        assert_eq!(color, 0xFF0000FF);
        
        let (r, g, b, a) = unpack_rgba(0xFF0000FF);
        assert!((r - 1.0).abs() < 0.01);
        assert!((g - 0.0).abs() < 0.01);
    }
}
