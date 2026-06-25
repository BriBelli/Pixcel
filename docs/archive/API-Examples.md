# PXS v3.0 Consumer API Examples

**Complete guide to using PXS from a consumer perspective**

---

## 📋 Table of Contents

1. [The Data Contract (TypeScript Interfaces)](#the-data-contract)
2. [High-Level API (Recommended)](#high-level-api-recommended)
3. [Low-Level Helpers (Power Users)](#low-level-helpers-power-users)
4. [Real-World Examples](#real-world-examples)

---

## The Data Contract

**Location**: `src/types/pxs-types.d.ts`

These are the **interfaces** that define what data looks like:

```typescript
// A single cell
interface PXSCell {
  x: number;      // Column (0-indexed)
  y: number;      // Row (0-indexed)
  color: string;  // 'rgb(255, 0, 0)' or '#FF0000'
}

// A single image (frame)
interface PXSFrame {
  cols: number;           // Grid width
  rows: number;           // Grid height
  cells: PXSCell[];       // Array of all cells
  metadata?: {            // Optional metadata
    source?: string;
    timestamp?: number;
    version?: string;
  };
}

// An animation (multiple frames)
interface PXSAnimation {
  fps: number;            // Frames per second
  frames: PXSFrame[];     // Array of frames
  metadata?: {
    name?: string;
    loop?: boolean;
    duration?: number;
  };
}
```

**This is the contract** - all PXS data follows these structures.

---

## High-Level API (Recommended)

**This is the abstracted, easy-to-use interface** - most consumers should use this.

### Setup

```javascript
// Create animator
const animator = new CellAnimator({
  container: document.getElementById('canvas'),
  cellWidth: 10,
  cellHeight: 10,
  renderMode: 'auto'  // Auto-selects best renderer
});

await animator.init();
```

### Example 1: Load Image (Simplest)

```javascript
// ✨ ONE LINE - Load image and render
const frameData = await animator.loadImage('photo.jpg', {
  quality: 'high'  // 'retro'|'low'|'medium'|'high'|'hd'|'ultra'
});

// Frame data is now available
console.log(frameData.cells.length);  // e.g., 8,192 cells for 128×64
console.log(frameData.metadata.source);  // 'photo.jpg'
```

### Example 2: Get Current State as Data

```javascript
// Get current grid as PXSFrame
const currentData = animator.getData();

// Now you can:
// - Edit it
currentData.cells[100].color = '#FF0000';

// - Save it
await PXSStorage.local.save('my-creation', currentData);

// - Send it via API
await fetch('/api/art', {
  method: 'POST',
  body: JSON.stringify(currentData)
});

// - Render it back
await animator.setData(currentData);
```

### Example 3: Create Animation from Images

```javascript
// Load multiple images as frames
const animation = await AnimationHelpers.createFromImages(
  ['frame1.png', 'frame2.png', 'frame3.png'],
  { 
    fps: 30,
    quality: 'medium',
    cols: 64,
    rows: 48
  }
);

// Load into animator
animator.loadAnimation(animation);

// Play it
animator.playAnimation({ loop: true });

// Control playback
animator.pauseAnimation();
animator.goToFrame(10);
animator.nextFrame();
```

### Example 4: Export/Import

```javascript
// Export current state
const json = animator.exportData({ 
  compress: false,  // Use compressed format?
  pretty: true      // Pretty print?
});

// Save to file, send to API, etc.
localStorage.setItem('my-art', json);

// Import later
const savedJson = localStorage.getItem('my-art');
await animator.importData(savedJson);
```

### Example 5: Subscribe to Changes

```javascript
// Get notified when data changes
const unsubscribe = animator.subscribeToData((frameData) => {
  console.log('Grid changed:', frameData);
  
  // Auto-save on change
  PXSStorage.local.save('auto-save', frameData);
});

// Later, unsubscribe
unsubscribe();
```

---

## Low-Level Helpers (Power Users)

**For advanced users who want full control** - use helpers directly to create data, then render it.

### ImageHelpers - Image Processing

```javascript
// Convert image to PXSFrame data
const frameData = await ImageHelpers.loadImage('photo.jpg', {
  cols: 64,              // Explicit size
  rows: 48,
  quality: 'high',       // Or use preset
  preserveAspect: true,  // Maintain aspect ratio
  gammaCorrect: true     // Better color accuracy
});

// Create blank frame
const blank = ImageHelpers.createBlankFrame(32, 32, '#2A2A2A');

// Clone frame
const copy = ImageHelpers.cloneFrame(frameData);

// Update specific cell
ImageHelpers.updateCell(frameData, 10, 5, '#FF0000');

// Get specific cell
const cell = ImageHelpers.getCell(frameData, 10, 5);

// Compress for storage
const compressed = ImageHelpers.compressFrame(frameData);
const decompressed = ImageHelpers.decompressFrame(compressed);

// Validate
const isValid = ImageHelpers.validateFrame(frameData);
```

### AnimationHelpers - Frame Management

```javascript
// Create animation from frames
const animation = AnimationHelpers.createAnimation(
  [frame1, frame2, frame3],
  { fps: 30, loop: true, name: 'my-animation' }
);

// Frame operations
const frame = AnimationHelpers.getFrame(animation, 0);
AnimationHelpers.setFrame(animation, 0, newFrame);
AnimationHelpers.addFrame(animation, newFrame, 1);
AnimationHelpers.removeFrame(animation, 0);
AnimationHelpers.duplicateFrame(animation, 0);

// Interpolate between frames (smooth transition)
const interpolated = AnimationHelpers.interpolateFrames(
  frameA, 
  frameB, 
  0.5  // 50% between A and B
);

// Generate transition animation
const transition = AnimationHelpers.generateTransition(
  frameA, 
  frameB, 
  10  // 10 frames of transition
);

// Utilities
const reversed = AnimationHelpers.reverse(animation);
const combined = AnimationHelpers.concatenate([anim1, anim2]);
const stats = AnimationHelpers.getStats(animation);
```

### PatternHelpers - Gradient Generation

```javascript
// Generate gradients (returns array of cell updates)
const linearGradient = PatternHelpers.generateLinearGradient({
  startX: 0,
  startY: 0,
  endX: 40,
  endY: 30,
  colorStart: '#FF0000',
  colorEnd: '#0000FF',
  gridWidth: 40,
  gridHeight: 30
});

// Apply to animator
animator.updateCells(linearGradient);

// Radial gradient
const radialGradient = PatternHelpers.generateRadialGradient({
  centerX: 20,
  centerY: 15,
  radius: 25,
  colorCenter: '#FFD700',
  colorEdge: '#1a1a2e',
  gridWidth: 40,
  gridHeight: 30
});

animator.updateCells(radialGradient);
```

---

## Real-World Examples

### Example 1: Photo to Pixel Art Converter

```javascript
// High-level approach
async function convertPhotoToPixelArt(imageFile, quality = 'high') {
  const animator = new CellAnimator({
    container: document.getElementById('canvas'),
    cellWidth: 5,
    cellHeight: 5,
    renderMode: 'canvas'
  });
  
  await animator.init();
  
  // Load and render
  const frameData = await animator.loadImage(imageFile, { quality });
  
  // Get the data
  return frameData;
}

// Usage
const pixelArt = await convertPhotoToPixelArt(fileInput.files[0], 'medium');
console.log(`Created ${pixelArt.cells.length} pixel art cells`);
```

### Example 2: Animation Creator

```javascript
async function createAnimationFromImages(imageFiles, fps = 30) {
  // Convert all images to frames
  const frames = [];
  
  for (const file of imageFiles) {
    const frame = await ImageHelpers.loadImage(file, {
      quality: 'medium',
      cols: 64,
      rows: 48
    });
    frames.push(frame);
  }
  
  // Create animation
  const animation = AnimationHelpers.createAnimation(frames, { fps });
  
  return animation;
}

// Usage
const files = Array.from(fileInput.files);
const animation = await createAnimationFromImages(files, 30);

// Load and play
animator.loadAnimation(animation);
animator.playAnimation({ loop: true });
```

### Example 3: Edit Pixel Art

```javascript
// Load existing pixel art
const frameData = await PXSStorage.local.load('my-pixel-art');

// Edit specific pixels
ImageHelpers.updateCell(frameData, 10, 5, '#FF0000');  // Red pixel
ImageHelpers.updateCell(frameData, 11, 5, '#00FF00');  // Green pixel
ImageHelpers.updateCell(frameData, 12, 5, '#0000FF');  // Blue pixel

// Render changes
await animator.setData(frameData);

// Save edited version
await PXSStorage.local.save('my-pixel-art-edited', frameData);
```

### Example 4: Programmatic Art Generation

```javascript
// Create frame programmatically
const frame = ImageHelpers.createBlankFrame(64, 64, '#000000');

// Draw a circle
for (let y = 0; y < 64; y++) {
  for (let x = 0; x < 64; x++) {
    const dx = x - 32;
    const dy = y - 32;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist < 20) {
      ImageHelpers.updateCell(frame, x, y, '#FF0000');
    }
  }
}

// Render
await animator.setData(frame);
```

### Example 5: API Integration

```javascript
// Save to cloud
async function saveToCloud(frameData) {
  const json = JSON.stringify(frameData);
  
  const response = await fetch('https://api.example.com/art', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: json
  });
  
  return response.json();
}

// Load from cloud
async function loadFromCloud(artId) {
  const response = await fetch(`https://api.example.com/art/${artId}`);
  const frameData = await response.json();
  
  await animator.setData(frameData);
  return frameData;
}
```

### Example 6: Real-Time Collaboration

```javascript
// Subscribe to changes
animator.subscribeToData((frameData) => {
  // Send to WebSocket
  websocket.send(JSON.stringify({
    type: 'frame-update',
    data: frameData
  }));
});

// Receive updates
websocket.onmessage = async (event) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'frame-update') {
    await animator.setData(message.data);
  }
};
```

---

## API Comparison

| Task | High-Level (Recommended) | Low-Level (Power Users) |
|------|---------------------------|--------------------------|
| **Load image** | `animator.loadImage(file, {quality})` | `ImageHelpers.loadImage()` then `animator.setData()` |
| **Get data** | `animator.getData()` | `animator.getData()` (same) |
| **Create gradient** | `PatternHelpers.generate...()` then `animator.updateCells()` | Same |
| **Create animation** | `AnimationHelpers.createFromImages()` | `AnimationHelpers.createAnimation()` |
| **Play animation** | `animator.playAnimation()` | Same |
| **Edit frame** | `animator.updateAnimationCell()` | `AnimationHelpers.setFrame()` then re-render |
| **Save/load** | `PXSStorage.local.save()` | Same |

**Recommendation**: Use **High-Level API** for most tasks. Use **Low-Level Helpers** when you need:
- Custom image processing
- Advanced frame manipulation
- Programmatic art generation
- Integration with external systems

---

## Quality Presets

```javascript
ImageHelpers.QUALITY_PRESETS = {
  retro: 16,    // ~256 cells (16:9)
  low: 32,      // ~1,024 cells
  medium: 64,   // ~4,096 cells
  high: 128,    // ~16,384 cells
  hd: 200,      // ~40,000 cells
  ultra: 300    // ~90,000 cells
};
```

---

## Storage Options

```javascript
// LocalStorage (fast, ~5MB)
await PXSStorage.local.save('my-art', frameData);

// IndexedDB (large storage)
await PXSStorage.indexedDB.save('big-animation', animData);

// Memory (fastest, no persistence)
PXSStorage.memory.save('temp', frameData);

// API (remote)
PXSStorage.api.configure({ baseUrl: 'https://api.example.com' });
await PXSStorage.api.save('cloud-art', frameData);

// Chunked (large animations)
PXSStorage.chunked.use(PXSStorage.indexedDB);
await PXSStorage.chunked.save('movie', animation, { chunkSize: 10 });
```

---

## Next Steps

1. **Start with High-Level API** - It's simpler and covers 90% of use cases
2. **Use Helpers when needed** - For custom processing or advanced features
3. **Check TypeScript interfaces** - `src/types/pxs-types.d.ts` for data structures
4. **See demos** - `demos/index.html` for working examples

---

**Questions?** Check `AGENTS.md` for complete technical reference.
