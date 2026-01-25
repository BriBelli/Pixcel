# V4.0 Feature Migration - Old to New

## Features from demos/index.html to Migrate:

### ✅ Already Have:
- [x] GridWorker - non-blocking grid creation
- [x] RenderWorker - OffscreenCanvas rendering
- [x] ImageWorker - WASM image processing
- [x] Resolution presets (basic)
- [x] Gradient controls (basic)

### 🔄 Need to Migrate:

#### **Resolution Tab** (from old lines 810-935):
- [x] Resolution Presets (8×8 to 320×240 with quality labels)
- [ ] Grid Stats Display
- [ ] Animations:
  - [ ] Diagonal Pulse
  - [ ] Wave Effect
  - [ ] Spiral Glow
  - [ ] Random Burst
- [ ] Patterns:
  - [ ] Linear Gradient
  - [ ] Radial Gradient
  - [ ] Diagonal Gradient
  - [ ] Checkerboard
- [ ] Actions:
  - [ ] Stop Animations
  - [ ] Reset Grid

#### **Image Tab** (from old lines 942-1020):
- [ ] Image Upload (drag & drop)
- [ ] Image Preview
- [ ] Quality Presets (Retro, Low, Medium, High, HD, Ultra)
- [ ] Render Buttons:
  - [ ] Render (Preserves Aspect)
  - [ ] Render at Quality
- [ ] Integration with ImageWorker

#### **Animation Tab** (from old lines 1025-1100):
- [ ] Frame Deck UI (horizontal timeline)
- [ ] Playback Controls (play, pause, stop, next, prev)
- [ ] Create Animation Options:
  - [ ] Random Animation
  - [ ] Gradient Animation (30 frames)
  - [ ] Add Current Grid as Frame
- [ ] Upload Animation
- [ ] Animation Editor/Inspector

#### **UI Components**:
- [ ] Border Toggle Button (L-shape SVG)
- [ ] Cell Hover Tooltip
- [ ] Editor Modal (frame/cell inspector)
- [ ] Loading States
- [ ] Performance Metrics Display

#### **Advanced Features**:
- [ ] Cell Click → Editor
- [ ] Frame Double-Click → Editor
- [ ] Drag & Drop Frame Reordering
- [ ] Export/Import Animation Data
- [ ] CSS Keyframe Animations

## Implementation Order:

1. **Phase 1**: Fix Worker Loading ✅
2. **Phase 2**: Basic Tab Structure (NOW)
3. **Phase 3**: Resolution Tab Features
4. **Phase 4**: Image Tab with ImageWorker
5. **Phase 5**: Animation Tab + Frame Deck
6. **Phase 6**: Polish & Advanced Features
