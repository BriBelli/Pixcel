# PXS (Pixcel)

**Images are data, not files.** Every pixel is a cell object that can be stored, edited, transmitted, and rendered through pure code.

> **Pixcel AI** — the Studio's right-side chat panel generates pixel art the right way:
> design a char-map → budget features → place every cell → validate. It's a structured-data
> problem, not image generation. See [docs/PIXCEL-METHOD.md](docs/PIXCEL-METHOD.md) (the
> method) and [docs/AI-GALLERY.md](docs/AI-GALLERY.md) (the in-app pipeline). Requires
> `ANTHROPIC_API_KEY` in `packages/pxs-studio/.env.local` (see `.env.local.example`).

### Built for Humans and AI

PXS is **AI-native**. Images as JSON means AI agents can generate, manipulate, and understand pixel art as naturally as developers do—no file I/O, no binary formats, just clean data structures.

### The Core Concept

Every image is an array of cells:
- **Versioned** — Git-friendly, diff-able
- **Edited** — Change pixels in code
- **Transmitted** — APIs, WebSockets, databases
- **Animated** — Arrays of frames

```javascript
// An image is just data
const pixelArt = {
  cols: 64,
  rows: 48,
  cells: [
    { x: 0, y: 0, color: '#2A2A2A' },
    { x: 1, y: 0, color: '#FF5733' },
    { x: 2, y: 0, color: 'rgba(38, 127, 51, 0.5)' },
    { x: 2, y: 0, color: 'rgba(50, 128, 255, 0.7)' },
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

## ✨ Version 4.0 — Monorepo Architecture

### New Core Concepts

| Concept              | Description                                               |
| -------------------- | --------------------------------------------------------- |
| **PXSFrame**         | Single image as data: `{ cols, rows, cells[], metadata }` |
| **PXSAnimation**     | Motion as frames: `{ fps, frames[], metadata }`           |
| **getData/setData**  | Full round-trip data access                               |
| **Storage Adapters** | LocalStorage, IndexedDB, API, memory                      |
| **Rust/WASM**        | High-performance image processing                         |

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
```

### Run PXS Studio (Next.js app)

```bash
npm run studio:dev
```

### Other Commands

```bash
npm run dev            # Run all packages in dev mode
npm run build          # Build everything
npm run core:build     # Build the core library only
npm run studio:build   # Production build of PXS Studio
npm run wasm:build     # Build the Rust/WASM module
```

### Legacy Demo

The original standalone demo is still available:

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

PXS is an **Nx monorepo** with two packages:

```
Pixcel/
├── packages/
│   ├── pxs-core/              # Headless library (Vite)
│   │   └── src/
│   │       ├── CellAnimator.js
│   │       ├── helpers/
│   │       │   ├── ImageHelpers.js
│   │       │   ├── AnimationHelpers.js
│   │       │   └── PatternHelpers.js
│   │       ├── storage/
│   │       │   └── StorageAdapters.js
│   │       ├── renderers/
│   │       │   ├── HTMLRenderer.js    # < 5K cells
│   │       │   ├── CanvasRenderer.js  # 5K-100K cells
│   │       │   └── WebGLRenderer.js   # 100K+ cells
│   │       ├── wasm/
│   │       │   └── WASMIntegration.js
│   │       └── types/
│   │           └── pxs-types.d.ts
│   └── pxs-studio/            # App (Next.js + React)
├── demos/                     # Legacy standalone demos
├── wasm/                      # Rust/WASM source
└── package.json               # Workspace root
```

## 📈 Performance

| Renderer | Cell Count | Best For                 |
| -------- | ---------- | ------------------------ |
| HTML     | < 5,000    | Simple UIs, interactions |
| Canvas   | 5K - 100K  | Most use cases           |
| WebGL    | 100K+      | Massive grids            |
| + WASM   | Any        | Image processing speed   |

## 🗺️ Roadmap

- ✅ **Phase 1**: Core architecture
- ✅ **Phase 2**: Renderers, performance
- ✅ **Phase 3**: Data-first, animations, storage, WASM, Frame Deck UI
- ✅ **Phase 4**: Monorepo migration (Nx + React + Next.js)
- 📋 **Phase 5**: Web Workers, OffscreenCanvas, 640px+ support
- 📋 **Phase 6**: WebGL & 3D voxels
- 📋 **Phase 7**: AI-assisted creation

## 🎯 Why PXS?

| Traditional                  | PXS                    |
| ---------------------------- | ---------------------- |
| Images are binary files      | Images are JSON data   |
| Need Photoshop to edit       | Edit in code           |
| Can't version control pixels | Git-friendly           |
| Heavy render software        | Lightweight, real-time |
| Export/import workflows      | API-native             |

## ✨ Pixcel AI (in-app generation)

The Studio's right-side **Pixcel AI** panel generates pixel art the way a human artisan works:
reason at full effort → draw at the true resolution → **see the render** → fix → keep the best.
Pure max reasoning + a perception loop — no templates, no upscaling, no brittle multi-phase
pipeline. Generation runs **async** (start a piece, keep working; it lands in the gallery when
done). Compact char-map I/O unlocks 16²–64².

- **[docs/AGENTIC-ARTISAN-THESIS.md](docs/AGENTIC-ARTISAN-THESIS.md)** — the portable thesis:
  *why* this succeeded where months of agentic attempts failed. Lore. Copy it into other repos.
- **[docs/AI-GALLERY.md](docs/AI-GALLERY.md)** — the pipeline architecture.
- **[docs/PIXCEL-METHOD.md](docs/PIXCEL-METHOD.md)** — the pixel-art rules the artist follows.
- **[.claude/skills/agentic-artisan/](.claude/skills/agentic-artisan/)** — the thesis as a
  portable skill any Claude agent can load and apply.

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

**Version**: 4.0.0  
**Status**: Monorepo architecture in active development

### ✅ What's Working
- Nx monorepo with `@pxs/core` library and `@pxs/studio` app
- Data-first architecture (images/animations as JSON)
- Rust/WASM for 10x faster image processing
- Frame Deck UI with visual timeline
- Storage adapters (local, IndexedDB, memory)
- Multi-resolution support (8x8 to 320x240)
- React + Next.js studio application

### ⚠️ Known Limitations
- High-res (400px+) causes browser freezes (single-threaded JavaScript bottleneck)
- Web Workers not yet integrated

### 🚀 Next Up
- Web Workers (unlock 640px+ without freezing)
- OffscreenCanvas (non-blocking rendering)
- Production performance tuning (60 FPS at 640px+)

---

**Philosophy**: *"Stay Pure"* — Each cell is one solid color. Gradients emerge from arrangement.
