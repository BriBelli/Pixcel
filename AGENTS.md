# AGENTS.md - AI Agent Guide for PXS (Pixcel)

**Version**: 3.0  
**Last Updated**: January 22, 2026  
**Maintained By**: Brian Bellissimo (@BriBelli)

## Purpose

This document provides AI agents and IDE assistants with comprehensive context about the PXS project. Use this as your primary reference when assisting with development, debugging, or feature implementation.

---

## Project Overview

**PXS (Pixcel)** is a revolutionary digital creation platform treating every pixel as a first-class citizen. Unlike traditional graphics libraries, PXS treats **images as data, not files**—every digital image is an array of cell objects that can be stored, edited, transmitted, versioned, and rendered.

### Core Philosophy

> **"Stay Pure"** — Each cell is one solid color. Gradients emerge from arrangement, not per-cell CSS gradients. This keeps the library hardware-compatible (LED displays, digital signs) and makes images purely code-representable.

### Key Innovation

```javascript
// Images are DATA, not files
const imageData = {
  cols: 64,
  rows: 48,
  cells: [
    { x: 0, y: 0, color: 'rgb(42, 42, 42)' },
    { x: 1, y: 0, color: 'rgb(255, 100, 50)' },
    // ... 3,072 cells total
  ],
  metadata: { source: 'photo.jpg', timestamp: 1706000000000 }
};

// Animations are arrays of frames
const animation = {
  fps: 30,
  frames: [imageData1, imageData2, imageData3], // Each frame is a PXSFrame
  metadata: { loop: true, duration: 1000 }
};
```

### Target Use Cases
- **Pixel Art Creation** — Code-based, versionable artwork
- **Motion Graphics** — Frame-by-frame animation without heavy software
- **LED Displays** — Hardware-compatible output
- **Data Visualization** — Heatmaps, animated charts
- **Games** — Grid-based game development
- **Digital Signage** — Real-time, data-driven displays
- **3D Voxel Worlds** (Future) — Extending pixels to voxels

---

## Current Version: 3.0

### What's New in 3.0

#### 🎯 Data-First Architecture
- **Images as Data**: PXSFrame structure for all images
- **Animations as Arrays**: Multi-dimensional array of frames
- **getData/setData API**: Full round-trip data access
- **Import/Export**: JSON serialization for storage

#### 🎬 Animation System
- **AnimationHelpers.js**: Complete frame management
- **Playback Controls**: play, pause, stop, goToFrame
- **Frame Editing**: Update individual cells in any frame
- **Interpolation**: Smooth transitions between frames

#### 💾 Storage Layer
- **PXSStorage.local**: LocalStorage adapter (~5MB)
- **PXSStorage.indexedDB**: IndexedDB for large data
- **PXSStorage.memory**: In-memory cache
- **PXSStorage.api**: Remote API adapter
- **PXSStorage.chunked**: Chunked loading for large animations

#### 🦀 Rust/WASM Integration
- **Image Processing**: Used for **ALL image-to-pixel conversions** when available (not resolution-specific)
- **What it does**: Gamma-correct block averaging algorithm (10x faster than JavaScript)
- **When it's used**: Automatically for any image processing if WASM is loaded and available
- **Resolution impact**: Most beneficial for high-res images (256×192 / 4K and above), but works for all resolutions
- **Auto-fallback**: Falls back to JavaScript implementation if WASM unavailable
- **Additional features**: Frame interpolation, high-performance grid creation

---

## Project Structure

```
Pixcel/
├── src/
│   ├── CellAnimator.js           # Main orchestrator (getData, setData, animation playback)
│   ├── pxs.js                    # PXS factory & presets
│   ├── renderers/
│   │   ├── BaseRenderer.js       # Abstract renderer interface
│   │   ├── HTMLRenderer.js       # DOM-based rendering (< 5K cells)
│   │   ├── CanvasRenderer.js     # Canvas 2D rendering (5K-100K cells)
│   │   └── WebGLRenderer.js      # WebGL rendering (100K+ cells)
│   ├── spatial/
│   │   ├── ViewportManager.js    # Viewport culling system
│   │   └── SpatialIndex.js       # Quadtree spatial indexing
│   ├── transforms/
│   │   └── TransformMatrix.js    # 2D/3D matrix operations
│   ├── performance/
│   │   ├── ObjectPool.js         # Memory pooling system
│   │   └── PerformanceProfiler.js # Real-time metrics
│   ├── core/
│   │   └── CellGroup.js          # Group management
│   ├── helpers/
│   │   ├── PatternHelpers.js     # Gradient generators
│   │   ├── ImageHelpers.js       # ✨ Image-to-data conversion (NEW)
│   │   └── AnimationHelpers.js   # ✨ Animation frame management (NEW)
│   ├── storage/
│   │   └── StorageAdapters.js    # ✨ Storage layer (NEW)
│   ├── wasm/
│   │   └── WASMIntegration.js    # ✨ Rust/WASM JavaScript wrapper (NEW)
│   └── types/
│       └── pxs-types.d.ts        # ✨ TypeScript interfaces (NEW)
├── wasm/                         # Rust/WASM module
│   ├── src/lib.rs                # Rust source (ImageProcessor, gradients)
│   ├── Cargo.toml                # Rust dependencies
│   └── README.md                 # WASM build instructions
├── demos/
│   ├── index.html                # PXS Studio IDE
│   ├── benchmark.html            # Multi-resolution benchmark
│   └── shared/
│       ├── pxs-loader.js         # Dynamic module loader
│       ├── pxs-theme.css         # IDE theme
│       ├── pxs-components.css    # UI components
│       └── pxs-ide-layout.css    # IDE layout
├── docs/
│   ├── Phase-2-Performance.md    # Phase 2 documentation
│   └── pxs-relfection-2.md       # Vision & reflection
├── AGENTS.md                     # This file
└── README.md                     # Project readme
```

---

## Core Data Structures

### PXSFrame (Single Image)

```typescript
interface PXSFrame {
  cols: number;           // Grid columns
  rows: number;           // Grid rows
  cells: PXSCell[];       // Array of cell data
  metadata?: {
    source?: string;      // 'photo.jpg', 'generated', etc.
    timestamp?: number;   // Creation time
    version?: string;     // PXS version
  };
}

interface PXSCell {
  x: number;              // X coordinate (column)
  y: number;              // Y coordinate (row)
  color: string;          // 'rgb(r, g, b)' or '#hex'
}
```

### PXSAnimation (Motion)

```typescript
interface PXSAnimation {
  fps: number;            // Frames per second
  frames: PXSFrame[];     // Array of frames
  metadata?: {
    name?: string;        // Animation name
    loop?: boolean;       // Loop playback
    duration?: number;    // Total duration (ms)
  };
}
```

---

## API Reference

### CellAnimator - Data Methods

```javascript
// Get current grid as PXSFrame
const frameData = animator.getData();

// Render from PXSFrame data
await animator.setData(frameData);

// Export as JSON
const json = animator.exportData({ compress: true, pretty: false });

// Import from JSON
await animator.importData(json);

// Subscribe to data changes
const unsubscribe = animator.subscribeToData((frameData) => {
  console.log('Data changed:', frameData);
});

// Load image directly
const frameData = await animator.loadImage('photo.jpg', {
  cols: 64,
  rows: 48,
  quality: 'high',
  gammaCorrect: true
});
```

### CellAnimator - Animation Playback

```javascript
// Load animation
animator.loadAnimation(animationData);

// Playback controls
animator.playAnimation({ loop: true, fps: 30 });
animator.pauseAnimation();
animator.stopAnimation();

// Frame navigation
animator.goToFrame(10);
animator.nextFrame();
animator.prevFrame();

// Get current state
const state = animator.getPlaybackState();
// { playing: true, currentFrame: 10, totalFrames: 60, fps: 30, loop: true }

// Edit animation
animator.updateAnimationCell(frameIndex, x, y, '#FF0000');
```

### ImageHelpers

```javascript
// Load and convert image to PXSFrame
const frameData = await ImageHelpers.loadImage('photo.jpg', {
  cols: 64,               // Target columns
  rows: 48,               // Target rows
  quality: 'high',        // 'retro'|'low'|'medium'|'high'|'hd'|'ultra'
  preserveAspect: true,   // Maintain aspect ratio
  gammaCorrect: true      // Better color accuracy
});

// Quality presets
ImageHelpers.QUALITY_PRESETS = {
  retro: 16,
  low: 32,
  medium: 64,
  high: 128,
  hd: 200,
  ultra: 300
};

// Utility methods
const blankFrame = ImageHelpers.createBlankFrame(64, 48, '#2A2A2A');
const cloned = ImageHelpers.cloneFrame(frameData);
ImageHelpers.updateCell(frameData, 10, 5, '#FF0000');
const isValid = ImageHelpers.validateFrame(data);

// Compression for storage
const compressed = ImageHelpers.compressFrame(frameData);
const decompressed = ImageHelpers.decompressFrame(compressed);
```

### AnimationHelpers

```javascript
// Create animation from frames
const animation = AnimationHelpers.createAnimation(frames, { fps: 30, loop: true });

// Create from image sequence
const animation = await AnimationHelpers.createFromImages(
  ['frame1.jpg', 'frame2.jpg', 'frame3.jpg'],
  { cols: 64, rows: 48, fps: 30 }
);

// Frame manipulation
const frame = AnimationHelpers.getFrame(animation, 5);
AnimationHelpers.setFrame(animation, 5, newFrame);
AnimationHelpers.addFrame(animation, newFrame, insertIndex);
AnimationHelpers.removeFrame(animation, index);
AnimationHelpers.duplicateFrame(animation, index);

// Utilities
const reversed = AnimationHelpers.reverse(animation);
const combined = AnimationHelpers.concatenate([anim1, anim2]);
const transition = AnimationHelpers.generateTransition(frameA, frameB, 10);
const interpolated = AnimationHelpers.interpolateFrames(frameA, frameB, 0.5);

// Validation
const isValid = AnimationHelpers.validateAnimation(data);
const stats = AnimationHelpers.getStats(animation);
```

### PXSStorage

```javascript
// LocalStorage (fast, ~5MB limit)
await PXSStorage.local.save('my-image', frameData);
const frame = await PXSStorage.local.load('my-image');
await PXSStorage.local.delete('my-image');
const keys = await PXSStorage.local.list();

// IndexedDB (large storage)
await PXSStorage.indexedDB.save('big-animation', animData);
const anim = await PXSStorage.indexedDB.load('big-animation');

// Memory cache (fastest, no persistence)
PXSStorage.memory.save('temp', frameData);
const temp = PXSStorage.memory.load('temp');

// API adapter (remote)
PXSStorage.api.configure({ baseUrl: 'https://api.example.com/pxs' });
await PXSStorage.api.save('cloud-image', frameData);

// Chunked storage (for large animations)
PXSStorage.chunked.use(PXSStorage.indexedDB);
await PXSStorage.chunked.save('movie', animation, { chunkSize: 10 });
const frames = await PXSStorage.chunked.loadRange('movie', 0, 5);
```

### PXSWasm

**When Rust/WASM is Used:**
- **Image Processing**: Automatically used for **ALL image-to-pixel conversions** when available (any resolution)
- **Most Beneficial**: High-resolution images (256×192 / 4K and above) see 10x performance improvement
- **What it does**: Gamma-correct block averaging algorithm for accurate color downsampling
- **Auto-fallback**: Falls back to JavaScript if WASM unavailable

```javascript
// Initialize WASM (auto-fallback to JS if unavailable)
const wasmAvailable = await PXSWasm.init('/wasm/pkg/pxs_compute_bg.wasm');

// Process image with gamma-correct block averaging
// Used automatically by ImageHelpers.loadImage() for ALL resolutions when available
const cells = PXSWasm.processImage(
  imageData,       // ImageData or Uint8ClampedArray
  sourceWidth,
  sourceHeight,
  targetCols,
  targetRows,
  useGamma = true
);

// Create high-performance grid
const grid = PXSWasm.createGrid(64, 48);
grid.setCell(10, 5, 0xFF0000FF); // RGBA packed as u32
grid.fill(0x2A2A2AFF);
const pxsFrame = grid.toPXSFrame();

// Frame interpolation
const interpolated = PXSWasm.interpolateFrames(frameA, frameB, 0.5);
```

---

## Development Phases

### ✅ Phase 1: Foundation (Complete)
Core CellAnimator class, state management, event system

### ✅ Phase 2A: Renderer Abstraction (Complete)
Pluggable renderer architecture, HTMLRenderer, auto mode

### ✅ Phase 2B: Canvas Renderer (Complete)
Canvas 2D rendering, animations, borders, gradient helpers

### ✅ Phase 2C: Advanced Performance (Complete)
Viewport culling, spatial indexing, transforms, profiling

### ✅ Phase 2D: Data-First Architecture (Complete) ⭐ NEW
- **ImageHelpers.js**: Image-to-data conversion with gamma correction
- **getData/setData**: Full round-trip data access on CellAnimator
- **TypeScript interfaces**: PXSFrame, PXSAnimation types

### ✅ Phase 3A: Animation System (Complete) ⭐ NEW
- **AnimationHelpers.js**: Frame management utilities
- **Animation playback**: play, pause, stop, goToFrame
- **Frame editing**: Update cells in any frame

### ✅ Phase 3B: Storage Layer (Complete) ⭐ NEW
- **LocalStorage adapter**: Fast, 5MB limit
- **IndexedDB adapter**: Large storage
- **Memory adapter**: In-memory cache
- **API adapter**: Remote storage
- **Chunked storage**: Large animation loading

### ✅ Phase 3C: Rust/WASM Integration (Complete) ⭐ NEW
- **Rust ImageProcessor**: High-performance block averaging (10x faster than JS)
- **Usage**: Automatically used for **ALL image-to-pixel conversions** when available (any resolution)
- **Most beneficial**: High-res images (256×192 / 4K+) see dramatic performance gains
- **Gamma correction**: Accurate color processing with proper color space conversion
- **JS wrapper**: Auto-fallback to JavaScript if WASM unavailable
- **What it does**: Converts source images to pixel grids using gamma-correct block averaging algorithm

### ✅ Phase 3D: Frame Deck UI (Complete) ⭐ NEW
- **Visual frame timeline**: Horizontal timeline below canvas
- **Drag-to-reorder**: Intuitive frame management
- **Double-click to inspect**: Frame/cell editor dialog
- **Playback controls**: Play, pause, stop, next, prev
- **Frame metadata**: Animation inspector with full data view

### 🚀 Phase 4: Production Architecture Migration (NEXT - Q1 2026)
**Status**: Planning complete, migration starting  
**Goal**: Separate library from app, unlock high-res performance, Adobe-level UX

#### 4A: Monorepo Setup (Week 1-2)
- Nx workspace with pnpm
- Extract `pxs-core` library (headless)
- Create `pxs-studio` app shell (Next.js + React)
- Setup build pipeline

#### 4B: Web Workers (Week 3-4)
- GridWorker: Cell data creation off main thread
- RenderWorker: OffscreenCanvas rendering
- ImageWorker: WASM image processing integration
- Unlock 400px+ without browser freezes

#### 4C: React Studio (Week 5-8)
- Component-based architecture
- Zustand state management
- Unified ResolutionPicker component
- Professional timeline UI
- Keyboard shortcuts, undo/redo

#### 4D: Production Features (Week 9-12)
- Performance tuning (60 FPS at 640px+)
- Accessibility audit
- Cross-browser testing
- Documentation site
- **Launch PXS Studio v1.0**

### 📋 Phase 5: Advanced Features (Future)
- WebGL renderer for 1M+ cells
- 3D voxel rendering
- Real-time collaboration
- Plugin system
- Cloud storage integration

---

## Coding Guidelines

### Key Principles

1. **Images are Data** — Always use PXSFrame/PXSAnimation structures
2. **Stay Pure** — One solid color per cell, no CSS gradients
3. **Clean API** — Simple methods, complex logic in helpers
4. **Performance First** — Use WASM for heavy computation
5. **Backward Compatible** — New features don't break existing code

### Naming Conventions

- **Classes**: PascalCase (`CellAnimator`, `ImageHelpers`)
- **Methods**: camelCase (`getData`, `loadImage`)
- **Private**: Prefix with `_` (`_animationLoop`)
- **Constants**: UPPER_SNAKE_CASE (`QUALITY_PRESETS`)
- **Interfaces**: PascalCase with prefix (`PXSFrame`, `PXSCell`)

### Error Handling

```javascript
// Validate input
if (!ImageHelpers.validateFrame(data)) {
  console.warn('CellAnimator: Invalid frame data');
  return;
}

// Try-catch for async operations
try {
  const frame = await ImageHelpers.loadImage(source, options);
} catch (e) {
  console.error('Failed to load image:', e);
}
```

---

## Quick Reference

### For AI Agents

1. **Read this file first** (AGENTS.md)
2. **Check data structures** — PXSFrame, PXSAnimation
3. **Use ImageHelpers** for any image processing
4. **Use AnimationHelpers** for animation management
5. **Use PXSStorage** for persistence
6. **Test with demos/index.html**

### Common Tasks

**Load and render an image:**
```javascript
const frame = await ImageHelpers.loadImage(file, { quality: 'high' });
await animator.setData(frame);
```

**Create animation from images:**
```javascript
const anim = await AnimationHelpers.createFromImages(files, { fps: 30 });
animator.loadAnimation(anim);
animator.playAnimation();
```

**Save and load data:**
```javascript
await PXSStorage.local.save('myArt', animator.getData());
const saved = await PXSStorage.local.load('myArt');
await animator.setData(saved);
```

**Export for external use:**
```javascript
const json = animator.exportData({ pretty: true });
// Send to API, save to file, etc.
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025 | Original grid generation |
| 2.0 | Dec 2025 | Class-based architecture, events |
| 2.5 | Jan 2026 | Phase 2C: Performance systems |
| **3.0** | **Jan 2026** | **Data-first architecture, animations, storage, WASM** |
| **3.1** | **Jan 22, 2026** | **Frame Deck UI, improved animations, Phase 3 badge** |
| **4.0** | **Q1 2026 (Planned)** | **Architecture migration: Nx + React + Web Workers** |

### Current Status (v3.1)
✅ **Complete**: All Phase 3 features (data-first, animations, storage, WASM, Frame Deck UI)  
⚠️ **Known Limitation**: Single-threaded JS limits high-res performance (320px practical max)  
🚀 **Next**: v4.0 architecture migration will unlock 640px+ with Web Workers

---

## Contact

**Project Owner**: Brian Bellissimo (@BriBelli)  
**Repository**: github.com/BriBelli/Pixcel

---

**Last Updated**: January 22, 2026  
**Next Review**: After Phase 4 (Architecture Migration) - Q1 2026
