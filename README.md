# Pixcel (PXS) - Pixel Cell System

A revolutionary digital creation platform treating every pixel as a first-class citizen. PXS generates high-performance grid systems where individual cells can be styled, animated, and grouped, perfect for pixel art, LED displays, motion graphics, data visualizations, games, and eventually 3D voxel worlds.

## 🌟 Vision

PXS is the **2D foundation** of a broader vision: a platform where every pixel/voxel has identity, metadata, and behavior. This project is evolving from 2D grids to 3D voxel spaces, supporting everything from retro pixel art to photorealistic 3D worlds, VR experiences, and beyond.

**Philosophy**: "Stay Pure" — Each cell is one solid color. Gradients emerge from arrangement, not per-cell CSS gradients. This keeps the library hardware-compatible (LED displays, Yoto-style devices).

**Current Stage**: Phase 2C Complete — Advanced Performance & 3D Readiness  
**Next Stage**: Phase 3 — WebGL Renderer & 3D Foundation  

> *See [AGENTS.md](AGENTS.md) for the complete architectural vision and roadmap.*

## ✅ Version 2.5 — Phase 2C Complete!

Phase 2C delivers advanced performance systems and 3D-ready architecture:

### New Features
- **🚀 Viewport Culling**: Render only visible cells for massive grids (1M+ cells)
- **🔍 Spatial Indexing**: Quadtree for O(log n) spatial queries
- **📐 Transform Matrices**: 2D & 3D matrix systems (WebGL-ready)
- **♻️ Object Pooling**: Reduce GC pressure with reusable objects
- **📊 Performance Profiler**: Real-time FPS, memory, frame time monitoring
- **📦 Cell Groups**: Batch operations on named cell groups
- **🎨 Pattern Helpers**: Smart gradient generation (linear, radial, diagonal)
- **🖥️ IDE-like Demo Platform**: Modern development interface

### Performance Targets Achieved
- ✅ 60fps with 40,000+ visible cells
- ✅ Virtual scrolling for massive grids
- ✅ Spatial queries < 1ms
- ✅ Memory-efficient cell management

## Quick Start

### Installation

```bash
npm install
npm run build
npm run start
```

### Basic Usage

```javascript
// Using the PXS factory
const animator = PXS.create({
    width: 800,
    height: 600,
    cellWidth: 20,
    cellHeight: 20,
    container: document.getElementById('canvas'),
    renderMode: 'auto',          // 'html', 'canvas', or 'auto'
    enableProfiling: true,       // Phase 2C
    enableViewport: true,        // Phase 2C
    enableSpatialIndex: true,    // Phase 2C
    cellBorders: true,
    borderColor: 'rgba(88, 166, 255, 0.2)'
});

await animator.init();

// Update cells
animator.updateCell(5, 10, { background: '#ff6b6b' });

// Animate cells
animator.animateCell(5, 10, {
    name: 'pulse',
    duration: '1s',
    timing: 'ease-in-out',
    iteration: 'infinite'
});

// Use Pattern Helpers for gradients
const gradient = PatternHelpers.generateRadialGradient({
    centerX: 20,
    centerY: 15,
    radius: 25,
    colorCenter: '#ffd93d',
    colorEdge: '#6c5ce7',
    gridWidth: 40,
    gridHeight: 30
});
animator.updateCells(gradient);

// Create cell groups
const group = animator.createGroup('myRegion');
animator.addCellsToGroup('myRegion', [{x: 0, y: 0}, {x: 1, y: 0}]);
animator.animateGroup('myRegion', { name: 'wave', duration: '2s', iteration: 'infinite' });

// Performance monitoring
animator.on('performanceUpdate', (metrics) => {
    console.log(`FPS: ${metrics.fps}, Memory: ${metrics.memoryUsage}`);
});
```

### Using Presets

```javascript
// Use built-in presets for common scenarios
const ledDisplay = PXS.create({
    ...PXS.presets.led,
    container: document.getElementById('led-grid')
});

const massiveGrid = PXS.create({
    ...PXS.presets.massive,  // Optimized for 100k+ cells
    container: document.getElementById('big-canvas')
});
```

## API Reference

### Configuration Options

```javascript
const animator = new CellAnimator({
    // Grid dimensions
    width: '100%',              // Grid width (string or number)
    height: '100%',             // Grid height
    cellWidth: 20,              // Cell width in pixels
    cellHeight: 20,             // Cell height in pixels
    container: element,         // DOM container element
    
    // Rendering
    renderMode: 'auto',         // 'html', 'canvas', 'webgl', 'auto'
    
    // Borders
    cellBorders: true,          // Enable cell borders
    borderColor: '#333',        // Border color
    borderWidth: 1,             // Border width in pixels
    borderStyle: 'solid',       // CSS border-style
    
    // Phase 2C features
    enableProfiling: true,      // Performance monitoring
    enableViewport: true,       // Viewport culling
    enableSpatialIndex: true    // Quadtree indexing
});
```

### Core Methods

| Method | Description |
|--------|-------------|
| `init()` | Initialize and render grid (async) |
| `getCell(x, y)` | Get cell by coordinates |
| `getCellsInRegion(x, y, w, h)` | Get cells in rectangular area |
| `getAllCells()` | Get all cells |
| `updateCell(x, y, styles)` | Update single cell |
| `updateCells(updates)` | Batch update cells |
| `animateCell(x, y, anim)` | Animate single cell |
| `animateCells(anims)` | Batch animate cells |
| `stopAnimation(x, y)` | Stop cell animation |
| `stopAllAnimations()` | Stop all animations |
| `resetCell(x, y)` | Reset cell to default |
| `resetAllCells()` | Reset all cells |
| `destroy()` | Clean up resources |

### Phase 2C Methods

| Method | Description |
|--------|-------------|
| `setViewport(x, y, w, h)` | Set viewport bounds |
| `panViewport(dx, dy)` | Pan viewport by delta |
| `zoomViewport(scale)` | Zoom viewport |
| `centerOnCell(x, y)` | Center viewport on cell |
| `getVisibleCells()` | Get cells in viewport |
| `getCellsInRadius(x, y, r)` | Spatial query by radius |
| `getNearestCell(x, y)` | Find nearest cell |
| `createGroup(name)` | Create cell group |
| `addCellsToGroup(name, cells)` | Add cells to group |
| `animateGroup(name, anim)` | Animate entire group |
| `rotateCell(x, y, angle)` | Apply rotation transform |
| `scaleCell(x, y, sx, sy)` | Apply scale transform |
| `enableProfiling()` | Start performance monitoring |
| `getPerformanceReport()` | Get detailed performance report |

### Events

```javascript
animator.on('gridReady', (info) => { });
animator.on('cellClick', ({x, y}) => { });
animator.on('performanceUpdate', (metrics) => { });
animator.on('viewportChanged', (viewport) => { });
animator.on('groupCreated', ({name}) => { });
```

## Demos

All demos are in the `demos/` directory. **Start with the new IDE-like demo platform:**

```bash
open demos/index.html
```

### Available Demos
- **`demos/index.html`** — PXS Studio IDE (New!)
- **`demos/benchmark.html`** — Multi-resolution benchmark (32-bit to 8K)
- **`demos/demo-virtual-scroll.html`** — 40K cell viewport culling
- **`demos/demo-profiler.html`** — Real-time performance profiler
- **`demos/demo-canvas.html`** — Canvas renderer showcase
- **`demos/demo-gradient-helpers.html`** — Pattern generation

## Architecture

```
src/
├── CellAnimator.js          # Main orchestrator class
├── pxs.js                   # PXS factory & presets
├── renderers/
│   ├── BaseRenderer.js      # Abstract renderer interface
│   ├── HTMLRenderer.js      # DOM-based rendering (< 10K cells)
│   └── CanvasRenderer.js    # Canvas 2D rendering (10K-1M cells)
├── spatial/
│   ├── ViewportManager.js   # Viewport culling system
│   └── SpatialIndex.js      # Quadtree spatial indexing
├── transforms/
│   └── TransformMatrix.js   # 2D/3D matrix operations
├── performance/
│   ├── ObjectPool.js        # Memory pooling system
│   └── PerformanceProfiler.js # Real-time metrics
├── core/
│   └── CellGroup.js         # Group management
└── helpers/
    └── PatternHelpers.js    # Gradient generators
```

## Development Roadmap

### ✅ Phase 1: Foundation (Complete)
Core CellAnimator class, state management, event system

### ✅ Phase 2A: Renderer Abstraction (Complete)
Pluggable renderer architecture, HTMLRenderer, auto mode

### ✅ Phase 2B: Canvas Renderer (Complete)
Canvas 2D rendering, animations, borders, gradient helpers

### ✅ Phase 2C: Advanced Performance & 3D Readiness (Complete)
- Viewport culling for massive grids
- Quadtree spatial indexing
- Transform matrices (2D/3D)
- Object pooling
- Performance profiling
- Cell groups
- IDE-like demo platform

### 📋 Phase 3: WebGL Renderer & 3D Foundation (Next)
- WebGL renderer implementation
- 3D coordinate system (x, y, z)
- Voxel rendering
- Camera/projection system
- Frustum culling (from viewport culling)
- Octree (from Quadtree)

### 📋 Phase 4+: The PXS Vision
- Motion & physics
- VR/AR rendering
- AI-assisted creation
- Hardware display integration

## Performance

| Renderer | Cell Count | Init Time | FPS |
|----------|------------|-----------|-----|
| HTML | < 10K | < 100ms | 60 |
| Canvas | 10K-100K | < 200ms | 60 |
| Canvas + Viewport | 100K-1M | < 300ms | 60 |
| WebGL (Phase 3) | 1M+ | TBD | 60 |

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

Requires: ES6+, Canvas 2D, RequestAnimationFrame

## License

MIT

## Author

**Brian Bellissimo** ([@BriBelli](https://github.com/BriBelli))

---

**Version**: 2.5.0 (Phase 2C Complete)  
**Status**: Active Development — Preparing for Phase 3 (WebGL & 3D)
