# CellAnimator

A powerful JavaScript library for creating grid-based cell animations on web pages. CellAnimator generates flexible grid systems where individual cells can be styled and animated, perfect for creating pixel-art style animations, interactive backgrounds, generative art, data visualizations, and retro-style visual effects.

## � Vision: The Foundation of PXS

CellAnimator is the **2D foundation** of a broader vision: **PXS (Pixel Cell System)** — a revolutionary platform for digital creation where every pixel is a first-class citizen with identity, metadata, and behavior. This project will evolve from 2D grids to 3D voxel spaces, supporting everything from retro pixel art to photorealistic 3D worlds, VR experiences, and beyond. Each cell is addressable, animatable, and intelligent — enabling AI-assisted creation, procedural generation, and interactive experiences that span from LED matrices to holographic displays.

**Current Stage**: Building high-performance 2D foundations (HTML/Canvas rendering)  
**Next Stage**: 3D WebGL renderer, voxel spaces, and physics simulation  
**Ultimate Goal**: A universal substrate for digital reality creation

> *See [AGENTS.md](AGENTS.md) for the complete architectural vision and roadmap.*

## �🌟 Version 2.2 - Canvas Renderer Released!

CellAnimator now includes high-performance Canvas rendering for massive grids:
- **Canvas 2D Renderer**: Optimized for 10,000+ cells (tested up to 11,655)
- **2-12x Faster Updates**: Canvas significantly outperforms HTML for large grids
- **RequestAnimationFrame**: Smooth 60fps animations with color interpolation
- **High-DPI Support**: Perfect rendering on Retina displays
- **Border System**: Global and per-cell border control with 9 CSS border styles
- **Smart Gradient Helpers**: Generate gradient patterns using pure pixel approach
- **Pluggable Architecture**: HTML, Canvas, and WebGL (future) rendering modes
- **Auto Mode**: Intelligent renderer selection based on grid size
- **100% Backward Compatible**: Existing code works without changes

## Features

### Core Capabilities
- **Dynamic Grid Generation**: Create responsive grids with customizable cell dimensions
- **Cell Animation**: Apply CSS animations to cells with precise control
- **Coordinate-based Access**: Target cells using x/y coordinates (0-indexed)
- **Flexible Sizing**: Support for fixed pixels or responsive percentage sizing
- **Batch Operations**: Update/animate multiple cells efficiently
- **Event-Driven**: Subscribe to grid events for reactive programming

### New in v2.2 (Phase 2B)
- **Canvas Renderer**: High-performance rendering for 11,655+ cells
- **2-12x Faster**: Canvas updates dramatically faster than HTML for large grids
- **RequestAnimationFrame**: Smooth animations via RAF loop with color interpolation
- **4 Animation Effects**: Pulse→cyan, glow→yellow, wave→magenta, bounce (scale)
- **Click Detection**: Accurate mouse-to-cell coordinate conversion
- **Border System**: Global defaults + per-cell overrides
  - `cellBorders` (boolean), `borderColor`, `borderWidth`, `borderStyle`
  - All 9 CSS border styles (solid, dashed, dotted, double, groove, ridge, inset, outset, mixed)
- **Smart Gradient Helpers**: PatternHelpers.js utility class
  - `generateLinearGradient()` - diagonal/directional gradients
  - `generateRadialGradient()` - center-radiating gradients
  - `generateDiagonalGradient()` - corner-to-corner gradients
  - `interpolateColor()` - public hex color interpolation
  - "Stay Pure" philosophy: solid-color cells, gradients via arrangement
- **5 New Demos**: Canvas, borders, per-cell borders, border styles, gradient helpers
- **Benchmark Tool**: Compare HTML vs Canvas performance across grid sizes

### New in v2.1 (Phase 2A)
- **Pluggable Renderers**: Choose HTML, Canvas, or WebGL rendering modes
- **Auto Mode**: Intelligent selection (<10k=HTML, 10k-1M=Canvas, >1M=WebGL)
- **Strategy Pattern**: Clean separation between state management and rendering
- **Performance Scaling**: From small grids to 8K+ resolutions

### New in v2.0
- **No Grid Regeneration**: Update individual cells without rebuilding the grid
- **Animation Tracking**: Know which cells are animated at any time
- **Event System**: `gridReady`, `cellClick`, `animationStart`, `cellUpdate`, etc.
- **Clean API**: Intuitive methods with full JSDoc documentation
- **Memory Efficient**: Proper cleanup with `destroy()` method

## Quick Start

### Installation

```bash
npm install
npm run build
npm run start
```

### Basic Usage (v2.1)

```javascript
// Create animator instance with render mode
const animator = new CellAnimator({
    width: '100%',
    height: '100%',
    cellWidth: 30,
    cellHeight: 30,
    container: document.getElementById('container'),
    renderMode: 'auto'  // 'html', 'canvas', 'webgl', or 'auto'
});

// Initialize grid
await animator.init();

// Update a cell
animator.updateCell(5, 10, {
    background: '#ff0000',
    transform: 'scale(1.5)'
});

// Animate a cell
animator.animateCell(5, 10, {
    name: 'pulse',
    duration: '2s',
    timing: 'ease-in-out',
    iteration: 'infinite'
});

// Listen to events
animator.on('cellClick', (data) => {
    console.log(`Clicked cell at (${data.x}, ${data.y})`);
});
```

## API Reference

### Configuration Options

```javascript
const animator = new CellAnimator({
    width: '100%',              // Grid width (string or number)
    height: '100%',             // Grid height (string or number)
    cellWidth: 30,              // Cell width in pixels
    cellHeight: 30,             // Cell height in pixels
    container: element,         // DOM container element
    renderMode: 'auto',         // 'html', 'canvas', 'webgl', 'auto'
    cellBorders: false,         // Enable cell borders (default: false)
    borderColor: 'transparent', // Border color (default: transparent)
    borderWidth: 1,             // Border width in pixels (default: 1)
    borderStyle: 'solid'        // CSS border-style (default: 'solid')
});
```

#### Border Styles
Supports all CSS `border-style` values:
- `'solid'`, `'dashed'`, `'dotted'`, `'double'`
- `'groove'`, `'ridge'`, `'inset'`, `'outset'`
- Mixed: `'solid dashed dotted double'`

### Initialization
- `constructor(config)` - Create animator with configuration
- `init()` - Initialize and render grid (async)

### Cell Access
- `getCell(x, y)` - Get single cell by coordinates
- `getCellsByCoordinates([{x, y}])` - Get multiple cells
- `getCellsInRegion(x, y, width, height)` - Get rectangular region
- `getAllCells()` - Get all cells

### Cell Updates
- `updateCell(x, y, styles)` - Update single cell styles
- `updateCells([{x, y, styles}])` - Batch update cells

#### Per-Cell Border Override
```javascript
// Override border for specific cell
animator.updateCell(5, 10, {
    background: '#ff0000',
    borderColor: '#00ff00',
    borderWidth: 3,
    borderStyle: 'dashed'
});
```

### Animation
- `animateCell(x, y, animation)` - Animate single cell
- `animateCells([{x, y, animation}])` - Batch animate cells
- `stopAnimation(x, y)` - Stop cell animation
- `stopAllAnimations()` - Stop all animations

### Reset
- `resetCell(x, y)` - Reset cell to default state
- `resetAllCells()` - Reset all cells

### Events
- `on(event, callback)` - Register event listener
- `off(event, callback)` - Remove event listener

### Utility
- `getGridInfo()` - Get grid metadata
- `destroy()` - Clean up and remove grid

### Pattern Helpers (NEW - v2.2)

```javascript
import PatternHelpers from './src/helpers/PatternHelpers.js';

// Linear gradient (diagonal, horizontal, or vertical)
const linearUpdates = PatternHelpers.generateLinearGradient(
    animator,
    '#ff0000',   // Start color
    '#0000ff',   // End color
    'diagonal'   // Direction: 'diagonal', 'horizontal', 'vertical'
);
animator.updateCells(linearUpdates);

// Radial gradient (center-radiating)
const radialUpdates = PatternHelpers.generateRadialGradient(
    animator,
    '#ffff00',   // Center color
    '#ff0000'    // Edge color
);
animator.updateCells(radialUpdates);

// Diagonal gradient (corner-to-corner)
const diagonalUpdates = PatternHelpers.generateDiagonalGradient(
    animator,
    '#00ff00',   // Start corner color
    '#0000ff'    // Opposite corner color
);
animator.updateCells(diagonalUpdates);

// Color interpolation utility
const midColor = PatternHelpers.interpolateColor('#ff0000', '#0000ff', 0.5);
// Returns: '#7f007f' (50% between red and blue)
```

**Philosophy**: PatternHelpers maintains CellAnimator's "pure pixel" approach. Each cell is a single solid color - gradients are achieved through intelligent arrangement of cells, not per-cell gradients. This keeps the library hardware-compatible (works with low-res LED displays) while enabling creative high-resolution effects.

### Available Events
- `gridReady` - Grid initialized
- `cellClick` - Cell clicked
- `cellUpdate` - Cell updated
- `animationStart` - Animation started
- `animationStop` - Animation stopped
- `allAnimationsStop` - All animations stopped
- `cellReset` - Cell reset
- `allCellsReset` - All cells reset
- `destroy` - Animator destroyed

## Demos

All demo files are located in the **`demos/`** directory.

### Core Demos
- **`demos/demo.html`** - Original demo (legacy API)
- **`demos/demo-new.html`** - HTML renderer demo with event system

### Canvas Renderer Demos (NEW - v2.2)
- **`demos/demo-canvas.html`** - Canvas renderer with 11,655 cells (105×111 grid)
  - 6 animation patterns: diagonal, spiral, wave, border, checkerboard, random
  - Performance stats and FPS counter
  - Interactive event logging
- **`demos/benchmark.html`** - HTML vs Canvas performance comparison
  - Tests 6 grid sizes (20×20 to 150×150)
  - Measures init time and update speed
  - Shows 2-12x Canvas speedup

### Border System Demos (NEW - v2.2)
- **`demos/demo-borders.html`** - Side-by-side border toggle comparison
- **`demos/demo-per-cell-borders.html`** - Interactive per-cell border control
- **`demos/demo-border-styles2.html`** - Showcase of 9 CSS border styles

### Pattern Helpers Demo (NEW - v2.2)
- **`demos/demo-gradient-helpers.html`** - Smart gradient generation
  - 4 gradient types: linear, radial, diagonal, horizontal
  - Live regeneration with buttons
  - Hardware compatibility notes

**Try the Canvas demo** to see 11,655 cells animated smoothly at 60fps!

```bash
# Open demos in your browser
open demos/demo-canvas.html
open demos/demo-gradient-helpers.html
open demos/benchmark.html
```

## Documentation

- **[Phase 1: Foundation](docs/Phase-1-Foundation.md)** - Architecture & state management
- **[Phase 2: Performance](docs/Phase-2-Performance.md)** - Multi-mode rendering (Phase 2A ✅ 2B ✅ Complete)
- **[AGENTS.md](AGENTS.md)** - Comprehensive guide for AI agents and developers

## Development Roadmap

### ✅ Phase 1: Foundation (Completed - Dec 28, 2025)
- Core CellAnimator class
- State management system
- Event-driven architecture
- Dynamic cell updates

### ✅ Phase 2A: Renderer Abstraction (Completed - Dec 29, 2025)
- Pluggable renderer architecture
- BaseRenderer abstract interface
- HTMLRenderer implementation
- Auto render mode selection

### ✅ Phase 2B: Canvas Renderer (Completed - Dec 29, 2025)
- Canvas 2D rendering mode
- Support for 11,655+ cells (tested 105×111 grid)
- RequestAnimationFrame animation loop with 60fps performance
- 4 built-in animation effects with color interpolation
  - Pulse → Cyan (#00ffff)
  - Glow → Yellow (#ffff00)
  - Wave → Magenta (#ff00ff)
  - Bounce (scale effect)
- Click detection system (mouse → cell coords)
- High-DPI/Retina display support (devicePixelRatio scaling)
- **Border System**: Global + per-cell control
  - `cellBorders`, `borderColor`, `borderWidth`, `borderStyle`
  - All 9 CSS border-style values
  - Per-cell border overrides
- **Smart Gradient Helpers**: PatternHelpers.js utility class
  - `generateLinearGradient()`, `generateRadialGradient()`, `generateDiagonalGradient()`
  - `interpolateColor()` - public color interpolation
  - "Stay Pure" philosophy: solid-color cells, gradients via arrangement
- Performance benchmarks: 2-6x faster init, 2-12x faster updates
- 5 new demo files showcasing features
- Critical bug fixes:
  - Animation loop initialization
  - Color matching HTML keyframes
  - Delay timing with loopStartTime
  - Cell color animation with styles.background
  - Horizontal gradient filling all rows

### � Phase 2C: Advanced Performance & 3D Readiness (Next)
**Goal**: Optimize for massive grids and prepare for 3D transition

**Performance Targets**:
- Support 1M+ cells with virtual scrolling
- 60fps with 100k visible cells
- Memory usage < 100MB for 1M cells
- Spatial queries < 1ms

**Key Features**:
- **Virtual Scrolling**: Viewport culling for massive grids (foundation for 3D frustum culling)
- **Spatial Indexing**: Quadtree for O(log n) queries (Octree prep for Phase 3)
- **Memory Optimization**: Object pooling, lazy initialization
- **Performance Profiling**: Real-time FPS, memory tracking, frame time analysis
- **Transform System**: Matrix-based rotate/translate (WebGL preparation)
- **Cell Grouping**: Multi-cell batch operations
- **3D Readiness**: Coordinate system z-axis hooks, WebGL capability detection

**3D Preparation**: Every optimization in Phase 2C is designed to scale to 3D voxel spaces in Phase 3.

### 📋 Phase 3: WebGL Renderer & 3D Foundation (Planned)
**Goal**: Transition from 2D grids to 3D voxel spaces

- WebGL renderer implementation
- 3D coordinate system (x, y, z)
- Voxel rendering
- Camera/projection system
- Basic 3D transforms
- Lighting fundamentals
- Frustum culling (from Phase 2C viewport culling)
- Octree spatial indexing (from Phase 2C Quadtree)

### 📋 Phase 4: Motion & Physics (Planned)
- Timeline/keyframe engine
- Physics simulation
- Collision detection
- Particle systems

### 📋 Phase 5: Creative Tools (Planned)
- PxBrush (dynamic painting)
- PxCreator (AI generation hooks)
- Import/export formats
- Editor interface

### 📋 Phase 6+: The PXS Vision
- VR/AR rendering
- Multi-world management
- Database-backed cells with metadata
- AI-assisted creation (natural language prompts)
- Procedural generation
- Hardware display integration (LED matrices to holographic)

## Technology Stack

- **ES6+** JavaScript with Classes, Promises, Map/Set
- **Canvas 2D API** for high-performance 2D rendering
- **WebGL** (Phase 3+) for 3D voxel rendering and GPU acceleration
- **RequestAnimationFrame** for smooth animations
- **Webpack** for bundling
- **CSS Animations** for HTML mode effects
- **Event System** for reactive programming

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

Requires: ES6 Classes, Promise, Map/Set, Canvas 2D, RequestAnimationFrame

## Performance

### HTML Renderer (Current)
- **Small grids** (20x20 = 400 cells): < 50ms initialization
- **Medium grids** (40x40 = 1,600 cells): < 200ms initialization
- **Large grids** (60x60 = 3,600 cells): < 500ms initialization
- **Maximum**: ~10,000 cells before performance degrades

### Canvas Renderer (Phase 2B - Coming Soon)
- **Target**: 10,000 - 1,000,000 cells (1080p to 4K)
- **Expected**: < 100ms initialization for 1080p grids
- **Performance**: 60fps animations via requestAnimationFrame

### WebGL Renderer (Phase 7 - Future)
- **Target**: 1,000,000+ cells (4K, 8K, and beyond)
- **Expected**: < 200ms initialization for 4K grids
- **Performance**: Hardware-accelerated GPU rendering

## Use Cases

- Creative coding & generative art
- Grid-based games (chess, tetris, life)
- Data visualization (heatmaps, charts)
- Interactive UI effects (backgrounds, loaders)
- Educational tools (cellular automata)
- Hardware displays (LED grids, Yoto-style)
- Music visualizers
- Pixel art editors

## Migration from v1.0

### Old API (v1.0)
```javascript
const graphic = await generateGraphic('100%', '100%', 30, 30);
container.innerHTML = graphic.html;
canvasAnimation([{dimension: '.x-5.y-10', styles: {...}}]);
```

### New API (v2.1)
```javascript
const animator = new CellAnimator({
    width: '100%', height: '100%',
    cellWidth: 30, cellHeight: 30,
    container: containerElement,
    renderMode: 'auto'  // New in v2.1!
});
await animator.init();
animator.updateCell(5, 10, {...styles});
```

Both APIs are currently supported. Legacy functions remain in `src/pxs.js`.

### v2.0 to v2.1 Migration
No breaking changes! All v2.0 code works in v2.1. The `renderMode` config is optional and defaults to `'auto'`.

## Contributing

This project is under active development. Each phase is developed in a separate feature branch:
- `feature/Phase-1-Foundation` - ✅ Complete (Dec 28, 2025)
- `feature/Phase-2-Performance` - 🚧 Current (Phase 2A complete Dec 29, 2025)
- `feature/Phase-3-API` - 📋 Planned

See [AGENTS.md](AGENTS.md) for comprehensive development guidelines.

## License

MIT

## Author

**Brian Bellissimo** ([@BriBelli](https://github.com/BriBelli))

---

**Current Version**: 2.2.0  
**Last Updated**: December 29, 2025  
**Status**: Active Development - Phase 2B Complete, Phase 2C Next
