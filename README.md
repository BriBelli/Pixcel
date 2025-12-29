# CellAnimator

A powerful JavaScript library for creating grid-based cell animations on web pages. CellAnimator generates flexible grid systems where individual cells can be styled and animated, perfect for creating pixel-art style animations, interactive backgrounds, generative art, data visualizations, and retro-style visual effects.

## 🌟 Version 2.1 - Pluggable Renderer Architecture!

CellAnimator has been completely rebuilt with a modern, class-based architecture featuring:
- **Pluggable Renderers**: Support for HTML, Canvas, and WebGL rendering modes
- **Auto Mode**: Intelligent renderer selection based on grid size
- **Dynamic Cell Updates**: Update individual cells without regenerating the entire grid
- **O(1) Performance**: Lightning-fast cell lookups using Map-based storage
- **Event System**: React to grid events (clicks, animations, updates)
- **State Management**: Track animations, cell properties, and grid state
- **Multiple Instances**: Run multiple animators on the same page

## Features

### Core Capabilities
- **Dynamic Grid Generation**: Create responsive grids with customizable cell dimensions
- **Cell Animation**: Apply CSS animations to cells with precise control
- **Coordinate-based Access**: Target cells using x/y coordinates (0-indexed)
- **Flexible Sizing**: Support for fixed pixels or responsive percentage sizing
- **Batch Operations**: Update/animate multiple cells efficiently
- **Event-Driven**: Subscribe to grid events for reactive programming

### New in v2.1
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

- **`demo.html`** - Original demo (legacy API)
- **`demo-new.html`** - New architecture demo with event system

Open `demo-new.html` to see the new capabilities in action!

## Documentation

- **[Phase 1: Foundation](docs/Phase-1-Foundation.md)** - Architecture & state management
- **[Phase 2: Performance](docs/Phase-2-Performance.md)** - Renderer abstraction & optimization (Phase 2A ✅ Complete)
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

### 🚧 Phase 2B: Canvas Renderer (Next - In Progress)
- Canvas 2D rendering mode
- Support for 10,000+ cells
- Click detection system
- Performance benchmarks

### 📋 Phase 2C: Performance Optimization (Planned)
- Virtual scrolling
- Memory optimization
- Responsive grid resizing
- FPS monitoring

### 📋 Phase 3: API & Features (Planned)
- Pattern generators (spiral, wave, checkerboard)
- Animation preset library
- Chainable API
- Advanced selectors

### 📋 Phase 4: Interactions (Planned)
- Mouse trail effects
- Click/drag handlers
- Touch events
- Drag-to-paint mode

### 📋 Phase 5: Module & NPM (Planned)
- ES6 module exports
- NPM package
- TypeScript definitions
- Production build

### 📋 Future Phases
- Phase 6: Developer Experience (docs, examples, debugging tools)
- Phase 7: Advanced Features (WebGL renderer, 3D effects, 4K-8K support)
- Phase 8+: Audio reactivity, generative AI integration (MCP), hardware displays

## Technology Stack

- **ES6+** JavaScript with Classes, Promises, Map/Set
- **Webpack** for bundling
- **CSS Animations** for performant effects
- **Event System** for reactive programming

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

Requires: ES6 Classes, Promise, Map/Set, CSS Animations, Flexbox

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

**Current Version**: 2.1.0  
**Last Updated**: December 29, 2025  
**Status**: Active Development - Phase 2B (Canvas Renderer) Next
