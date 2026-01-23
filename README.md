# PXS (Pixcel) - Digital Art Through Code

A revolutionary platform where **images are data, not files**. Every pixel is a first-class citizen that can be stored, edited, transmitted, and rendered through pure code.

## 🌟 The Vision

> **"It creates digital art, graphics, motion graphics without files—but code."**

PXS treats every image as an array of cell objects. No image files needed—just data structures that can be:
- **Versioned** — Git-friendly, diff-able artwork
- **Edited** — Change individual pixels in code
- **Transmitted** — Send over APIs, WebSockets
- **Stored** — Database, cache, localStorage
- **Animated** — Arrays of arrays for motion graphics

```javascript
// An image is just data
const pixelArt = {
  cols: 64,
  rows: 48,
  cells: [
    { x: 0, y: 0, color: 'rgb(42, 42, 42)' },
    { x: 1, y: 0, color: 'rgb(255, 87, 51)' },
    // ... every pixel defined in code
  ]
};

// Render it
await animator.setData(pixelArt);

// Edit it
pixelArt.cells[100].color = '#FF0000';
await animator.setData(pixelArt);

// Save it
await PXSStorage.local.save('my-art', pixelArt);
```

## ✨ Version 3.1 — Data-First + Frame Deck UI

### New Core Concepts

| Concept | Description |
|---------|-------------|
| **PXSFrame** | Single image as data: `{ cols, rows, cells[], metadata }` |
| **PXSAnimation** | Motion as frames: `{ fps, frames[], metadata }` |
| **getData/setData** | Full round-trip data access |
| **Storage Adapters** | LocalStorage, IndexedDB, API, memory |
| **Rust/WASM** | High-performance image processing |

### The Clean API

```javascript
// Load image → get data
const frameData = await ImageHelpers.loadImage('photo.jpg', {
  quality: 'high',
  gammaCorrect: true
});

// Render from data
await animator.setData(frameData);

// Get current state as data
const currentData = animator.getData();

// Export as JSON
const json = animator.exportData({ pretty: true });

// Store anywhere
await PXSStorage.local.save('my-creation', frameData);
```

## 🚀 Quick Start

### Installation

```bash
git clone https://github.com/BriBelli/Pixcel.git
cd Pixcel
npm install
npm run start
```

### Open the Demo

```bash
open demos/index.html
```

### Basic Usage

```javascript
// Create animator
const animator = new CellAnimator({
  container: document.getElementById('canvas'),
  cellWidth: 10,
  cellHeight: 10,
  renderMode: 'auto'
});

await animator.init();

// Option 1: Load from image file
const frame = await animator.loadImage('photo.jpg', { quality: 'medium' });

// Option 2: Load from data
await animator.setData({
  cols: 32,
  rows: 32,
  cells: myPixelData
});

// Option 3: Create programmatically
const gradient = PatternHelpers.generateRadialGradient({
  gridWidth: 32,
  gridHeight: 32,
  centerX: 16,
  centerY: 16,
  colorCenter: '#FFD700',
  colorEdge: '#1a1a2e'
});
animator.updateCells(gradient);

// Get the data back anytime
const data = animator.getData();
console.log(data.cells.length); // 1024 cells for 32x32
```

## 🎬 Animation System

```javascript
// Create animation from image sequence
const animation = await AnimationHelpers.createFromImages(
  ['frame1.png', 'frame2.png', 'frame3.png'],
  { fps: 30, cols: 64, rows: 48 }
);

// Load and play
animator.loadAnimation(animation);
animator.playAnimation({ loop: true });

// Control playback
animator.pauseAnimation();
animator.goToFrame(10);
animator.nextFrame();

// Edit specific frame
animator.updateAnimationCell(frameIndex, x, y, '#FF0000');

// Get playback state
const state = animator.getPlaybackState();
// { playing: true, currentFrame: 10, totalFrames: 90, fps: 30 }
```

## 💾 Storage Layer

```javascript
// LocalStorage (quick, ~5MB)
await PXSStorage.local.save('my-art', frameData);
const art = await PXSStorage.local.load('my-art');

// IndexedDB (large storage)
await PXSStorage.indexedDB.save('animation', animData);

// Memory cache (fastest)
PXSStorage.memory.save('temp', frameData);

// API (remote)
PXSStorage.api.configure({ baseUrl: 'https://api.example.com' });
await PXSStorage.api.save('cloud-art', frameData);

// Chunked loading (large animations)
PXSStorage.chunked.use(PXSStorage.indexedDB);
await PXSStorage.chunked.save('movie', animation, { chunkSize: 10 });
const frames = await PXSStorage.chunked.loadRange('movie', 0, 5);
```

## 🦀 Rust/WASM for Performance

High-performance image processing with automatic JavaScript fallback:

```javascript
// Initialize (auto-fallback to JS if WASM unavailable)
await PXSWasm.init();

// Process images faster with gamma-correct block averaging
const cells = PXSWasm.processImage(imageData, width, height, cols, rows);

// Create high-performance grids
const grid = PXSWasm.createGrid(256, 256);
grid.fill(0x2A2A2AFF);
```

## 📊 Quality Presets

```javascript
ImageHelpers.QUALITY_PRESETS = {
  retro: 16,    // ~16px, classic 8-bit look
  low: 32,      // ~32px, visible pixels
  medium: 64,   // ~64px, balanced
  high: 128,    // ~128px, detailed
  hd: 200,      // ~200px, high definition
  ultra: 300    // ~300px, maximum detail
};

// Use presets
const frame = await ImageHelpers.loadImage(photo, { quality: 'high' });
```

## 🏗️ Architecture

```
src/
├── CellAnimator.js        # Core: getData, setData, animation playback
├── helpers/
│   ├── ImageHelpers.js    # Image-to-data conversion
│   ├── AnimationHelpers.js # Frame management
│   └── PatternHelpers.js  # Gradient generation
├── storage/
│   └── StorageAdapters.js # LocalStorage, IndexedDB, API, memory
├── renderers/
│   ├── HTMLRenderer.js    # < 5K cells
│   ├── CanvasRenderer.js  # 5K-100K cells
│   └── WebGLRenderer.js   # 100K+ cells
├── wasm/
│   └── WASMIntegration.js # Rust/WASM JavaScript wrapper
└── types/
    └── pxs-types.d.ts     # TypeScript interfaces
```

## 📈 Performance

| Renderer | Cell Count | Best For |
|----------|------------|----------|
| HTML | < 5,000 | Simple UIs, interactions |
| Canvas | 5K - 100K | Most use cases |
| WebGL | 100K+ | Massive grids |
| + WASM | Any | Image processing speed |

## 🗺️ Roadmap

- ✅ **Phase 1**: Core architecture
- ✅ **Phase 2**: Renderers, performance
- ✅ **Phase 3**: Data-first, animations, storage, WASM
- 📋 **Phase 4**: Frame deck UI (visual timeline)
- 📋 **Phase 5**: WebGL & 3D voxels
- 📋 **Phase 6**: AI-assisted creation

## 🎯 Why PXS?

| Traditional | PXS |
|-------------|-----|
| Images are binary files | Images are JSON data |
| Need Photoshop to edit | Edit in code |
| Can't version control pixels | Git-friendly |
| Heavy render software | Lightweight, real-time |
| Export/import workflows | API-native |

## 📖 Documentation

- **[AGENTS.md](AGENTS.md)** — Complete technical reference
- **[demos/index.html](demos/index.html)** — PXS Studio IDE
- **[docs/](docs/)** — Phase documentation

## 🤝 Contributing

See [AGENTS.md](AGENTS.md) for coding guidelines and architecture details.

## 📄 License

MIT

## 👤 Author

**Brian Bellissimo** ([@BriBelli](https://github.com/BriBelli))

---

## 🎯 Current Status

**Version**: 3.1.0  
**Released**: January 22, 2026  
**Status**: Production-ready for 320px resolutions

### ✅ What's Working
- Data-first architecture (images/animations as JSON)
- Rust/WASM for 10x faster image processing
- Frame Deck UI with visual timeline
- Storage adapters (local, IndexedDB, memory)
- Multi-resolution support (8x8 to 320x240)

### ⚠️ Known Limitations
- High-res (400px+) causes browser freezes (single-threaded JavaScript bottleneck)
- No virtual DOM (direct DOM manipulation)
- Library code mixed with demo app

### 🚀 Next: Version 4.0 (Q1 2026)
**Architecture Migration** — See [`docs/ARCHITECTURE-PROPOSAL.md`](docs/ARCHITECTURE-PROPOSAL.md)
- Nx monorepo (separate library from app)
- Web Workers (unlock 640px+ without freezing)
- React + Next.js (Adobe-level UX)
- OffscreenCanvas (non-blocking rendering)

**Timeline**: 10-12 weeks to v4.0 launch

---

**Philosophy**: *"Stay Pure"* — Each cell is one solid color. Gradients emerge from arrangement.
