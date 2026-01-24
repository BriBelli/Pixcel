# @pxs/core

**PXS Core** - Headless pixel cell animation engine.

## Features

- 🎨 **Pixel-Perfect Rendering** - HTML, Canvas, and WebGL renderers
- 🎬 **Animation System** - Frame-based animations with playback controls
- 🖼️ **Image Processing** - Convert images to pixel art with WASM acceleration
- 💾 **Storage** - LocalStorage, IndexedDB, Memory, and API adapters
- ⚡ **Performance** - Spatial indexing, viewport culling, object pooling
- 🦀 **WASM Integration** - Rust-powered image processing (10x faster)

## Installation

```bash
npm install @pxs/core
```

## Quick Start

```javascript
import { CellAnimator, ImageHelpers } from '@pxs/core';

// Create a grid
const animator = new CellAnimator(document.getElementById('canvas'), {
  cols: 64,
  rows: 48,
  cellWidth: 10,
  cellHeight: 10
});

// Load and render an image
const frameData = await ImageHelpers.loadImage('photo.jpg', {
  cols: 64,
  rows: 48,
  quality: 'high'
});

await animator.setData(frameData);
```

## Documentation

See the [API Documentation](../../docs/API-Examples.md) for detailed usage examples.

## License

MIT © Brian Bellissimo
