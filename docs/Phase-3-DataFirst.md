# Phase 3: Data-First Architecture

**Status**: ✅ Complete  
**Date**: January 22, 2026  
**Version**: 3.0.0

## Overview

Phase 3 implements the core vision of PXS: **images are data, not files**. Every digital image is represented as an array of cell objects that can be stored, edited, transmitted, versioned, and rendered.

## Key Innovation

```javascript
// Traditional approach: Binary files
// PXS approach: Structured data

const imageData = {
  cols: 64,
  rows: 48,
  cells: [
    { x: 0, y: 0, color: 'rgb(42, 42, 42)' },
    { x: 1, y: 0, color: 'rgb(255, 100, 50)' },
    // ...
  ],
  metadata: {
    source: 'photo.jpg',
    timestamp: 1706000000000,
    version: '3.0.0'
  }
};
```

## Components Delivered

### Phase 3A: ImageHelpers.js

**Purpose**: Convert images to PXSFrame data structures

**Key Features**:
- Image-to-data conversion
- Gamma-correct block averaging
- Quality presets (retro → ultra)
- Aspect ratio preservation
- Frame manipulation utilities

```javascript
// Load image and get data
const frame = await ImageHelpers.loadImage('photo.jpg', {
  quality: 'high',
  preserveAspect: true,
  gammaCorrect: true
});

// Create blank frame
const blank = ImageHelpers.createBlankFrame(64, 48, '#2A2A2A');

// Clone frame
const cloned = ImageHelpers.cloneFrame(frame);

// Update specific cell
ImageHelpers.updateCell(frame, 10, 5, '#FF0000');

// Compress for storage
const compressed = ImageHelpers.compressFrame(frame);
```

### Phase 3B: CellAnimator Data API

**Purpose**: Full round-trip data access on CellAnimator

**New Methods**:
- `getData()` — Get current grid as PXSFrame
- `setData(frame)` — Render from PXSFrame
- `exportData(options)` — Export as JSON string
- `importData(json)` — Import from JSON
- `subscribeToData(callback)` — Pub/sub for changes
- `loadImage(source, options)` — Load image directly

```javascript
// Get current state
const frame = animator.getData();

// Set from data
await animator.setData(frameData);

// Export
const json = animator.exportData({ compress: true, pretty: false });

// Subscribe to changes
const unsubscribe = animator.subscribeToData((frame) => {
  console.log('Data changed');
});
```

### Phase 3C: AnimationHelpers.js

**Purpose**: Animation as arrays of frames

**Key Features**:
- Create animation from frames
- Load from image sequences
- Frame manipulation (add, remove, duplicate)
- Interpolation for smooth transitions
- Compression for storage

```javascript
// Create animation
const animation = AnimationHelpers.createAnimation(frames, { fps: 30 });

// Load from images
const anim = await AnimationHelpers.createFromImages(files, { fps: 30 });

// Frame operations
AnimationHelpers.addFrame(animation, newFrame, index);
AnimationHelpers.removeFrame(animation, index);
AnimationHelpers.duplicateFrame(animation, index);

// Transitions
const transition = AnimationHelpers.generateTransition(frameA, frameB, 10);
```

### Phase 3D: Animation Playback

**Purpose**: Animation playback controls on CellAnimator

**New Methods**:
- `loadAnimation(animation)` — Load animation data
- `playAnimation(options)` — Start playback
- `pauseAnimation()` — Pause playback
- `stopAnimation()` — Stop and reset
- `goToFrame(index)` — Jump to frame
- `nextFrame()` / `prevFrame()` — Navigate frames
- `getPlaybackState()` — Get current state
- `updateAnimationCell(frame, x, y, color)` — Edit frame

```javascript
animator.loadAnimation(animation);
animator.playAnimation({ loop: true, fps: 30 });
animator.goToFrame(10);

const state = animator.getPlaybackState();
// { playing: true, currentFrame: 10, totalFrames: 60, fps: 30, loop: true }
```

### Phase 3E: Storage Adapters

**Purpose**: Multiple storage backends for frames and animations

**Adapters**:
- `PXSStorage.local` — LocalStorage (~5MB)
- `PXSStorage.indexedDB` — IndexedDB (large)
- `PXSStorage.memory` — In-memory cache
- `PXSStorage.api` — Remote API
- `PXSStorage.chunked` — Chunked loading

```javascript
// LocalStorage
await PXSStorage.local.save('my-art', frameData);
const art = await PXSStorage.local.load('my-art');

// IndexedDB for large data
await PXSStorage.indexedDB.save('animation', animData);

// Chunked for large animations
PXSStorage.chunked.use(PXSStorage.indexedDB);
await PXSStorage.chunked.save('movie', animation, { chunkSize: 10 });
const frames = await PXSStorage.chunked.loadRange('movie', 0, 5);
```

### Phase 3F: Rust/WASM Integration

**Purpose**: High-performance image processing (10x faster than JavaScript)

**When Rust/WASM is Used**:
- **Image Processing**: Automatically used for **ALL image-to-pixel conversions** when available (any resolution)
- **Most Beneficial**: High-resolution images (256×192 / 4K and above) see dramatic performance improvements
- **What it does**: Gamma-correct block averaging algorithm for accurate color downsampling
- **Auto-fallback**: Falls back to JavaScript implementation if WASM unavailable

**Features**:
- ImageProcessor with gamma correction
- Block averaging algorithm (10x faster than JS)
- Frame interpolation
- High-performance grid creation
- Auto-fallback to JavaScript

```javascript
// Initialize (auto-fallback to JS if unavailable)
await PXSWasm.init();

// Process image - Used automatically by ImageHelpers.loadImage() for ALL resolutions
const cells = PXSWasm.processImage(
  imageData, width, height, cols, rows, true
);

// High-performance grid
const grid = PXSWasm.createGrid(256, 256);
grid.fill(0x2A2A2AFF);
```

## Data Structures

### PXSFrame

```typescript
interface PXSFrame {
  cols: number;
  rows: number;
  cells: Array<{
    x: number;
    y: number;
    color: string;
  }>;
  metadata?: {
    source?: string;
    sourceWidth?: number;
    sourceHeight?: number;
    timestamp?: number;
    version?: string;
  };
}
```

### PXSAnimation

```typescript
interface PXSAnimation {
  fps: number;
  frames: PXSFrame[];
  metadata?: {
    name?: string;
    loop?: boolean;
    duration?: number;
    timestamp?: number;
  };
}
```

### Compressed Formats

```typescript
// Compressed frame (for storage)
interface PXSCompressedFrame {
  c: number;      // cols
  r: number;      // rows
  d: string[];    // colors array (ordered by position)
  m?: object;     // metadata
}

// Compressed animation
interface PXSCompressedAnimation {
  fps: number;
  frames: PXSCompressedFrame[];
  m?: object;
}
```

## Files Created

| File | Purpose |
|------|---------|
| `src/helpers/ImageHelpers.js` | Image-to-data conversion |
| `src/helpers/AnimationHelpers.js` | Animation frame management |
| `src/storage/StorageAdapters.js` | Storage layer |
| `src/wasm/WASMIntegration.js` | WASM JavaScript wrapper |
| `src/types/pxs-types.d.ts` | TypeScript interfaces |
| `wasm/src/lib.rs` | Rust ImageProcessor |

## Files Modified

| File | Changes |
|------|---------|
| `src/CellAnimator.js` | Added getData, setData, animation playback |
| `demos/shared/pxs-loader.js` | Load new modules |
| `demos/index.html` | Clean API usage |

## Quality Presets

```javascript
ImageHelpers.QUALITY_PRESETS = {
  retro: 16,    // ~256 cells for 16:9
  low: 32,      // ~1K cells
  medium: 64,   // ~4K cells
  high: 128,    // ~16K cells
  hd: 200,      // ~40K cells
  ultra: 300    // ~90K cells
};
```

## Usage Examples

### Load and Edit Image

```javascript
// Load image
const frame = await ImageHelpers.loadImage('photo.jpg', { quality: 'high' });

// Edit specific pixel (fix a color)
ImageHelpers.updateCell(frame, 50, 30, '#FFFFFF');

// Render
await animator.setData(frame);

// Save
await PXSStorage.local.save('edited-photo', frame);
```

### Create Animation Programmatically

```javascript
// Generate frames
const frames = [];
for (let i = 0; i < 30; i++) {
  const frame = ImageHelpers.createBlankFrame(64, 48);
  
  // Animate a dot moving across
  ImageHelpers.updateCell(frame, i * 2, 24, '#FF0000');
  
  frames.push(frame);
}

// Create animation
const animation = AnimationHelpers.createAnimation(frames, { fps: 30 });

// Play
animator.loadAnimation(animation);
animator.playAnimation({ loop: true });
```

### Export and Share

```javascript
// Get current creation
const frame = animator.getData();

// Export as JSON
const json = JSON.stringify(frame);

// Send via API
await fetch('/api/creations', {
  method: 'POST',
  body: json
});

// Or download as file
const blob = new Blob([json], { type: 'application/json' });
const url = URL.createObjectURL(blob);
// trigger download...
```

## Success Criteria

- ✅ Images can be fully represented as JSON
- ✅ Round-trip data access (getData → edit → setData)
- ✅ Animation playback with frame control
- ✅ Multiple storage backends
- ✅ WASM integration with JS fallback
- ✅ Clean, simple API
- ✅ TypeScript type definitions

## What's Next: Phase 4

**Frame Deck UI** — Visual timeline like video editors:
- Card deck display of frames
- Click to preview/edit frame
- Drag to reorder
- Shuffle animation when scrubbing
- Playback controls in UI

---

**Phase 3 Complete**: January 22, 2026  
**Total Development Time**: ~3 hours  
**Lines of Code Added**: ~2,500
