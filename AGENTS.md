# AGENTS.md - AI Agent Guide for CellAnimator

**Version**: 2.2  
**Last Updated**: December 29, 2025  
**Maintained By**: Brian Bellissimo (@BriBelli)

## Purpose

This document provides AI agents and IDE assistants with comprehensive context about the CellAnimator project. Use this as your primary reference when assisting with development, debugging, or feature implementation.

---

## Project Overview

**CellAnimator** is a JavaScript library for creating grid-based cell animations on web pages. It generates flexible grid systems where individual cells can be styled and animated, perfect for pixel-art style animations, interactive backgrounds, generative art, and data visualizations.

### Core Concept
- Generate a grid of HTML `div` elements with coordinate-based class names
- Access and manipulate individual cells using x/y coordinates
- Apply CSS animations and styles dynamically
- Track state and provide event-driven architecture

### Target Use Cases
- Creative coding & generative art
- Game development (grid-based games)
- Data visualization (heatmaps, animated charts)
- Interactive UI effects (backgrounds, loading animations)
- Educational tools (cellular automata, algorithm visualization)
- Hardware displays (e.g., Yoto-style digital displays)

---

## Project Structure

```
CellAnimator/
├── src/
│   ├── CellAnimator.js    # Main class (refactored - Phase 2A/2B)
│   ├── renderers/         # Rendering implementations (Phase 2A/2B)
│   │   ├── BaseRenderer.js      # Abstract renderer interface
│   │   ├── HTMLRenderer.js      # DOM-based renderer
│   │   └── CanvasRenderer.js    # Canvas 2D renderer (NEW - Phase 2B)
│   ├── helpers/           # Utility helpers (NEW - Phase 2B)
│   │   └── PatternHelpers.js    # Gradient generators (pure pixel approach)
│   ├── pxs.js             # Original functions (legacy)
│   └── index.js           # Entry point (currently minimal)
├── demos/                 # All demo files (NEW - Phase 2B organized)
│   ├── demo.html                  # Original demo (legacy)
│   ├── demo-new.html              # HTML renderer demo
│   ├── demo-canvas.html           # Canvas renderer demo (11,655 cells)
│   ├── demo-borders.html          # Border toggle demo
│   ├── demo-per-cell-borders.html # Per-cell border control
│   ├── demo-border-styles.html    # CSS border styles (original)
│   ├── demo-border-styles2.html   # CSS border styles showcase
│   ├── demo-gradient-helpers.html # Smart gradient helpers
│   └── benchmark.html             # Performance comparison tool
├── docs/
│   ├── Phase-1-Foundation.md  # Phase 1 documentation
│   ├── Phase-2-Performance.md # Phase 2 documentation (2A & 2B complete)
│   └── Phase-1-Summary.md     # Phase 1 summary
├── package.json
├── webpack.config.js
├── README.md
└── AGENTS.md             # This file
```

---

## Current Architecture (Phase 2A)

### Core Class: `CellAnimator`

**Location**: `src/CellAnimator.js`

#### Key Design Principles
1. **Class-Based**: Encapsulated state, multiple instances supported
2. **Map Storage**: O(1) cell lookups using "x-y" keys
3. **Event-Driven**: Pub/sub system for reactive programming
4. **No Regeneration**: Individual cells can be updated without rebuilding grid
5. **Async Initialization**: Non-blocking grid generation
6. **Pluggable Renderers**: Support multiple rendering modes (HTML, Canvas, WebGL) ⭐ NEW

#### Rendering Architecture (Phase 2A)

CellAnimator uses the **Strategy Pattern** for rendering:

```
CellAnimator (Context)
    ↓ delegates rendering to
BaseRenderer (Interface)
    ↓ implemented by
HTMLRenderer, CanvasRenderer, WebGLRenderer (Strategies)
```

**Benefits**:
- Separation of concerns (state vs rendering)
- Easy to add new rendering modes
- Switch renderers without changing API
- Optimize for different use cases

#### State Structure
```javascript
{
  config: {
    width: string|number,      // '100%' or pixels
    height: string|number,     // '100%' or pixels
    cellWidth: number,         // Cell width in px
    cellHeight: number,        // Cell height in px
    container: HTMLElement,    // DOM container
    renderMode: string         // 'html', 'canvas', 'webgl', 'auto' ⭐ NEW
  },
  state: {
    initialized: boolean,
    canvasWidth: number,       // Calculated width
    canvasHeight: number,      // Calculated height
    columns: number,           // Grid columns
    rows: number,              // Grid rows
    totalCells: number
  },
  cells: Map<string, CellData>,           // "x-y" -> cell data
  activeAnimations: Map<string, Object>,   // "x-y" -> animation
  eventListeners: Map<string, Function[]>, // event -> callbacks
  renderer: BaseRenderer,                  // Active renderer instance ⭐ NEW
  renderMode: string                       // Active render mode ⭐ NEW
}
```

#### Cell Data Structure
```javascript
{
  element: HTMLElement,  // DOM reference
  x: number,            // X coordinate
  y: number,            // Y coordinate
  index: number,        // Linear index
  animated: boolean,    // Animation flag
  styles: Object        // Applied styles
}
```

### Public API Methods

#### Initialization
- `constructor(config)` - Create instance
- `init()` - Initialize and render grid (async)

#### Cell Access
- `getCell(x, y)` - Get single cell
- `getCellsByCoordinates([{x, y}])` - Get multiple cells
- `getCellsInRegion(x, y, width, height)` - Get rectangular region
- `getAllCells()` - Get all cells

#### Cell Updates (Dynamic!)
- `updateCell(x, y, styles)` - Update single cell
- `updateCells([{x, y, styles}])` - Batch update

#### Animation
- `animateCell(x, y, animation)` - Animate single cell
- `animateCells([{x, y, animation}])` - Batch animate
- `stopAnimation(x, y)` - Stop single cell animation
- `stopAllAnimations()` - Stop all animations

#### Reset
- `resetCell(x, y)` - Reset single cell
- `resetAllCells()` - Reset all cells

#### Events
- `on(event, callback)` - Register listener
- `off(event, callback)` - Remove listener

#### Cleanup
- `destroy()` - Complete cleanup

#### Utility
- `getGridInfo()` - Get grid metadata

### Event System

#### Available Events
- `gridReady` - Grid initialized
- `cellClick` - Cell clicked
- `cellUpdate` - Cell updated
- `animationStart` - Animation started
- `animationStop` - Animation stopped
- `allAnimationsStop` - All animations stopped
- `cellReset` - Cell reset
- `allCellsReset` - All cells reset
- `destroy` - Animator destroyed

#### Event Data Examples
```javascript
// gridReady
{width, height, columns, rows, totalCells, cellWidth, cellHeight, initialized}

// cellClick
{x, y, element, event}

// animationStart
{x, y, animation}
```

---

## Development Phases

### ✅ Phase 1: Foundation (Completed)
**Branch**: `feature/Phase-1-Foundation`
- Core CellAnimator class
- State management system
- Cell lifecycle methods
- Animation management
- Event system
- Error handling
- Demo application

**Documentation**: `docs/Phase-1-Foundation.md`

### 🚧 Phase 2: Dynamic Updates & Performance (In Progress)
**Branch**: `feature/Phase-2-Performance`

#### ✅ Phase 2A: Renderer Abstraction (Completed - Dec 29, 2025)
- Created pluggable renderer architecture
- BaseRenderer abstract interface
- HTMLRenderer implementation  
- Render mode configuration ('html', 'canvas', 'webgl', 'auto')
- Strategy pattern for rendering
- 100% backward compatible
- Comprehensive documentation

**Key Files**:
- `src/renderers/BaseRenderer.js` - Abstract renderer interface
- `src/renderers/HTMLRenderer.js` - HTML/DOM renderer
- `src/CellAnimator.js` - Refactored to use renderers

**Documentation**: `docs/Phase-2-Performance.md` (Section: Phase 2A)

#### ✅ Phase 2B: Canvas Renderer (Completed - Dec 29, 2025)
**Features Implemented**:
- Canvas 2D renderer (~500 lines)
- High-DPI/Retina display support (devicePixelRatio scaling)
- Support for 11,655 cells (tested 105×111 grid)
- RequestAnimationFrame animation loop with smooth 60fps
- 4 animation effects with color interpolation:
  - Pulse → Cyan (#00ffff)
  - Glow → Yellow (#ffff00)
  - Wave → Magenta (#ff00ff)
  - Bounce (scale effect)
- Click detection (mouse coords → cell coords)
- **Border System**: Global + per-cell border control
  - `cellBorders` boolean toggle
  - `borderColor`, `borderWidth`, `borderStyle` config
  - Per-cell border overrides
  - All 9 CSS border-style values (solid, dashed, dotted, double, groove, ridge, inset, outset, mixed)
- **Smart Gradient Helpers** (PatternHelpers.js):
  - `generateLinearGradient()` - diagonal/directional gradients
  - `generateRadialGradient()` - center-radiating gradients
  - `generateDiagonalGradient()` - corner-to-corner gradients
  - `interpolateColor()` - public hex color interpolation
  - "Stay Pure" philosophy: solid-color cells, gradients via arrangement
- Performance: 2-6x faster init, 2-12x faster updates vs HTML
- 5 new demo files showcasing features

**Key Files**:
- `src/renderers/CanvasRenderer.js` - Canvas 2D renderer
- `src/helpers/PatternHelpers.js` - Gradient utility helpers
- `demos/demo-canvas.html` - Interactive Canvas demo (11,655 cells)
- `demos/demo-borders.html` - Border toggle comparison
- `demos/demo-per-cell-borders.html` - Per-cell border control
- `demos/demo-border-styles2.html` - 9 CSS border styles showcase
- `demos/demo-gradient-helpers.html` - Smart gradient helpers demo
- `demos/benchmark.html` - HTML vs Canvas performance comparison

**Critical Fixes**:
- Animation loop initialization (started on first animation)
- Animation colors matched HTML keyframes exactly
- Delay timing fixed with loopStartTime tracking
- Cell colors properly animate with styles.background
- Horizontal gradient fills all rows

**Documentation**: `docs/Phase-2-Performance.md` (Section: Phase 2B)

#### 📋 Phase 2C: Advanced Performance (Planned)
- Virtual scrolling for massive grids
- Memory optimization techniques
- Responsive grid resizing
- Performance profiling tools
- FPS monitoring
- Error handling
- Demo application

**Documentation**: `docs/Phase-1-Foundation.md`

### � Phase 2: Dynamic Updates & Performance (In Progress)
**Branch**: `feature/Phase-2-Performance`

#### ✅ Phase 2A: Renderer Abstraction (Completed)
- Pluggable renderer architecture
- BaseRenderer abstract interface
- HTMLRenderer implementation
- Render mode configuration ('html', 'canvas', 'webgl', 'auto')
- Strategy pattern for rendering
- 100% backward compatible

#### 🚧 Phase 2B: Canvas Renderer (Next)
- Canvas 2D rendering mode
- Support for 10,000+ cells
- RequestAnimationFrame animations
- Performance benchmarks

#### 📋 Phase 2C: Performance Optimization (Planned)
- Virtual scrolling for massive grids
- Memory optimization
- Responsive grid resizing
- Performance profiling tools

### 📋 Phase 3: API & Features (Planned)
**Branch**: `feature/Phase-3-API`
- Pattern generators (spiral, checkerboard, random, etc.)
- Animation preset library
- Chainable API methods
- Advanced selectors
- Cell grouping

### 📋 Phase 4: Interactions (Planned)
**Branch**: `feature/Phase-4-Interactions`
- Mouse trail effects
- Click/drag handlers
- Drag-to-paint mode
- Touch event support
- Hover effects system

### 📋 Phase 5: Module & NPM (Planned)
**Branch**: `feature/Phase-5-Module`
- ES6 module exports
- NPM package structure
- Build system (Rollup/Webpack)
- TypeScript definitions
- Source maps

### 📋 Phase 6: Developer Experience (Planned)
**Branch**: `feature/Phase-6-DX`
- Comprehensive examples
- Documentation site
- Better error messages
- Debugging tools
- Performance profiler

### 📋 Phase 7: Advanced Features (Future)
- Audio reactivity (sync to music)
- Animation sequencing
- State save/load (JSON)
- Undo/redo system
- WebGL/Canvas rendering
- Generative AI integration (MCP)

---

## Coding Guidelines

### Style & Conventions

#### Naming
- **Classes**: PascalCase (`CellAnimator`)
- **Methods**: camelCase (`updateCell`, `getCell`)
- **Private Methods**: Prefix with `_` (`_generateGrid`, `_emit`)
- **Constants**: UPPER_SNAKE_CASE (when used)
- **Files**: camelCase for classes, kebab-case for docs

#### Documentation
- **All public methods**: JSDoc comments required
- **Include**: Description, @param with types, @returns with type
- **Example**:
```javascript
/**
 * Update a cell's styles
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {Object} styles - CSS styles to apply
 */
updateCell(x, y, styles) { ... }
```

#### Error Handling
- **Throw errors** for critical failures (config issues)
- **Console warnings** for non-critical issues (cell not found)
- **Try-catch** around event handlers
- **Helpful messages** with context

#### Code Organization
- **Public methods** at top
- **Private methods** at bottom
- **Related methods** grouped together
- **Clear separation** between concerns

### Performance Considerations

#### What to Optimize
- ✅ Use Map for O(1) lookups
- ✅ Batch operations when possible
- ✅ Avoid unnecessary DOM queries
- ✅ Cache grid dimensions
- ✅ Use DocumentFragment for bulk DOM changes

#### What to Avoid
- ❌ Querying DOM for every cell operation
- ❌ Regenerating grid for updates
- ❌ Synchronous blocking operations
- ❌ Memory leaks (remove event listeners)
- ❌ Unnecessary reflows/repaints

### Testing Approach

#### Current State
- Manual testing via demo files
- Visual verification of animations
- Console logging for debugging

#### Future Needs
- Unit tests (Jest/Vitest)
- Integration tests
- Performance benchmarks
- Cross-browser testing
- Automated visual regression tests

---

## Common Tasks for AI Agents

### 1. Adding a New Method

**Template**:
```javascript
/**
 * [Description]
 * @param {type} paramName - Description
 * @returns {type} Description
 */
methodName(paramName) {
    // Validation
    if (!paramName) {
        console.warn('CellAnimator: [helpful message]');
        return;
    }
    
    // Implementation
    
    // Emit event if significant
    this._emit('eventName', data);
}
```

**Checklist**:
- [ ] JSDoc comment with full parameter descriptions
- [ ] Input validation
- [ ] Error handling
- [ ] Event emission (if significant operation)
- [ ] Update Phase documentation
- [ ] Add demo example if public API

### 2. Adding a New Event

**Steps**:
1. Define event in `_emit()` call at appropriate location
2. Document in AGENTS.md under "Event System"
3. Add listener example in demo
4. Update Phase documentation

**Example**:
```javascript
// In CellAnimator method
this._emit('cellHover', {x, y, element});

// In demo
animator.on('cellHover', (data) => {
    console.log(`Hovered cell at (${data.x}, ${data.y})`);
});
```

### 3. Optimizing Performance

**Profiling Steps**:
1. Use Chrome DevTools Performance tab
2. Identify bottleneck (rendering, JS execution, layout)
3. Test with large grid (100x100+)
4. Measure before/after changes

**Common Optimizations**:
- Batch DOM updates using DocumentFragment
- Debounce/throttle frequent operations
- Use requestAnimationFrame for animations
- Implement virtual scrolling for large grids
- Consider Canvas rendering for 10,000+ cells

### 4. Debugging Issues

**Common Issues & Solutions**:

**Cell not updating?**
- Check if cell exists: `animator.getCell(x, y)`
- Verify coordinates are in bounds
- Check console for warnings
- Inspect cell data: `console.log(animator.cells)`

**Animation not working?**
- Verify CSS animation is defined
- Check animation object structure
- Look for typos in animation names
- Test with inline keyframes in demo

**Events not firing?**
- Check event name spelling
- Verify listener is registered before event
- Test with `console.log` in event handler
- Check if event emission is implemented

**Memory leak?**
- Call `destroy()` when done
- Remove event listeners with `off()`
- Clear intervals/timeouts
- Check browser memory profiler

### 5. Creating a Demo

**Template**:
```html
<!DOCTYPE html>
<html>
<head>
    <style>
        .cell { /* base styles */ }
        @keyframes myAnimation { /* ... */ }
    </style>
</head>
<body>
    <div id="container"></div>
    
    <script src="src/CellAnimator.js"></script>
    <script>
        async function init() {
            const animator = new CellAnimator({
                width: '100%',
                height: '100%',
                cellWidth: 30,
                cellHeight: 30,
                container: document.getElementById('container')
            });
            
            await animator.init();
            
            // Demo logic here
        }
        
        init();
    </script>
</body>
</html>
```

---

## API Usage Examples

### Basic Setup
```javascript
const animator = new CellAnimator({
    width: '800px',
    height: '600px',
    cellWidth: 25,
    cellHeight: 25,
    container: document.getElementById('grid-container')
});

await animator.init();
```

### Update Single Cell
```javascript
animator.updateCell(5, 10, {
    background: '#ff0000',
    transform: 'scale(1.5)',
    transition: 'all 0.3s'
});
```

### Animate Cell
```javascript
animator.animateCell(5, 10, {
    name: 'pulse',
    duration: '2s',
    timing: 'ease-in-out',
    delay: '0.5s',
    iteration: 'infinite'
});
```

### Batch Operations
```javascript
const updates = [];
for (let x = 0; x < 10; x++) {
    updates.push({
        x: x,
        y: x,
        styles: {background: '#00ff00'}
    });
}
animator.updateCells(updates);
```

### Event Handling
```javascript
animator.on('cellClick', (data) => {
    console.log(`Clicked: (${data.x}, ${data.y})`);
    animator.updateCell(data.x, data.y, {background: '#ffffff'});
});
```

### Get Grid Region
```javascript
// Get 5x5 region starting at (10, 10)
const cells = animator.getCellsInRegion(10, 10, 5, 5);
cells.forEach(cell => {
    animator.animateCell(cell.x, cell.y, {name: 'glow', duration: '1s'});
});
```

---

## Key Technical Decisions

### Why Map Instead of Array?
**Decision**: Use `Map<string, CellData>` with "x-y" keys

**Reasoning**:
- O(1) lookups vs O(n) array search
- Direct coordinate access: `cells.get("5-10")`
- Better for sparse grids (future feature)
- Easy to add/remove cells (Phase 2)

### Why Class-Based?
**Decision**: ES6 class with encapsulated state

**Reasoning**:
- Multiple instances supported
- Private methods (`_methodName`)
- Natural TypeScript integration
- Familiar OOP patterns
- Easy to extend/inherit

### Why Async Init?
**Decision**: `init()` returns Promise

**Reasoning**:
- Large grids don't block UI
- Enables loading states
- Future: lazy loading, progressive rendering
- Better UX for slow devices

### Why Events?
**Decision**: Built-in pub/sub system

**Reasoning**:
- Separation of concerns
- Users can hook into any operation
- Enables reactive patterns
- Future: animation queues, state sync, undo/redo

### Why Keep Legacy Code?
**Decision**: `pxs.js` remains alongside new code

**Reasoning**:
- Backward compatibility
- Gradual migration path
- Side-by-side comparison
- Reference for feature parity
- Will remove in Phase 5

---

## Future Considerations

### Generative AI Integration (MCP)
**Vision**: AI-powered animation generation from text prompts

**Potential Features**:
- "Create a wave pattern from left to right"
- "Animate cells to spell out 'HELLO'"
- "Generate a spiral pattern with rainbow colors"
- "Make a loading animation with 8 dots"

**Implementation Ideas**:
- MCP server that generates animation sequences
- Prompt → Pattern Generator → CellAnimator API calls
- Template library for common patterns
- LLM integration for creative variations

### Canvas Rendering Mode
**When**: Phase 2 - Performance optimization

**Why**: HTML mode struggles at 10,000+ cells

**Approach**:
- Render mode option in config: `renderMode: 'html' | 'canvas'`
- Canvas 2D context for massive grids
- Virtual scrolling for off-screen cells
- WebGL for extreme performance (100,000+ cells)

### Hardware Display Integration
**Use Case**: Yoto-style digital displays

**Requirements**:
- Low-res grid (e.g., 16x8, 32x16)
- High performance (60fps)
- Export animation sequences
- Hardware API integration

**Implementation**:
- Export mode: animation → JSON sequence
- Hardware driver compatibility layer
- Timing precision for sync

---

## Dependencies

### Current
- **webpack**: ^5.38.1 (build)
- **webpack-cli**: ^4.7.2 (build)
- **serve**: ^12.0.0 (dev server)
- **lodash**: ^4.17.21 (unused, will remove)

### Planned (Future Phases)
- **rollup**: ES6 module bundling
- **@rollup/plugin-node-resolve**: Dependency resolution
- **terser**: Minification
- **typescript**: Type definitions
- **jest** or **vitest**: Testing
- **eslint**: Linting
- **prettier**: Code formatting

---

## Browser Compatibility

### Current Target
- **Chrome/Edge**: Latest
- **Firefox**: Latest
- **Safari**: Latest

### Required Features
- ES6 Classes
- Promise/Async-Await
- Map/Set
- Template Literals
- CSS Animations
- Flexbox

### Fallbacks Needed (Future)
- Polyfills for older browsers (if required)
- Transpilation via Babel (if required)
- CSS autoprefixer

---

## Quick Reference

### Get Started as AI Agent
1. Read this file (AGENTS.md)
2. Read current phase doc (docs/Phase-X-*.md)
3. Check current branch name for phase context
4. Review src/CellAnimator.js for implementation
5. Check demos/demo-new.html for usage examples

### When User Asks to Add Feature
1. Determine which phase it belongs to
2. Check if it requires architecture changes
3. Propose solution with code examples
4. Update appropriate phase documentation
5. Create demo if public API changes

### When Debugging
1. Ask for error messages/console output
2. Check browser console for warnings
3. Verify grid is initialized (`animator.state.initialized`)
4. Check cell exists before operations
5. Test with simple case first

### When Optimizing
1. Profile with Chrome DevTools
2. Test with large grid (100x100)
3. Measure actual impact with numbers
4. Consider Canvas mode for huge grids
5. Document performance improvements

---

## Contact & Contribution

**Project Owner**: Brian Bellissimo (@BriBelli)  
**Repository**: github.com/BriBelli/CellAnimator

### For AI Agents
- Always refer to latest phase documentation
- Check branch name for phase context
- Follow established coding patterns
- Update documentation with changes
- Test changes with demo file

### Version History
- **v1.0** (Original): Basic grid generation, legacy functions
- **v2.0** (Phase 1): Class-based architecture, state management, events
- **v2.1** (Phase 2A): Pluggable renderer architecture, multi-mode support
- **v2.2** (Phase 2B): Canvas 2D renderer, 11k+ cell support, border system, gradient helpers, 2-12x faster updates

---

## Glossary

**Cell**: Individual grid element with x/y coordinates  
**Grid**: Complete collection of cells in rows/columns  
**Animator**: CellAnimator instance managing a grid  
**Renderer**: Strategy object that handles visual rendering (HTML, Canvas, WebGL)  
**Render Mode**: Rendering strategy ('html', 'canvas', 'webgl', 'auto')  
**Animation**: CSS animation applied to cell(s)  
**State**: Internal data tracking grid and cell status  
**Event**: Pub/sub notification of grid operations  
**Coordinate**: (x, y) position in grid, 0-indexed  
**Region**: Rectangular area of cells  
**Batch Operation**: Update/animate multiple cells at once  
**Dynamic Update**: Change cells without grid regeneration  
**Strategy Pattern**: Design pattern allowing interchangeable algorithms (renderers)

---

**Last Updated**: December 29, 2025  
**Next Review**: After Phase 2C completion
