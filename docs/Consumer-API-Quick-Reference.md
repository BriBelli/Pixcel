# PXS v3.0 Consumer API - Quick Reference

**Where to find everything for using PXS in your applications**

---

## 📍 Key Files

| File | Purpose | For |
|------|---------|-----|
| `src/types/pxs-types.d.ts` | **Data contract** (TypeScript interfaces) | Understanding data structures |
| `src/CellAnimator.js` | **High-level API** | Main consumer interface |
| `src/helpers/ImageHelpers.js` | Image processing utilities | Converting images to data |
| `src/helpers/AnimationHelpers.js` | Animation utilities | Frame management |
| `src/helpers/PatternHelpers.js` | Pattern generation | Gradients, patterns |
| `src/storage/StorageAdapters.js` | Storage layer | Save/load data |
| `docs/API-Examples.md` | **Complete examples** | How to use everything |
| `examples/simple-usage.html` | **Working demo** | Interactive examples |

---

## 🎯 Two Approaches

### Approach 1: High-Level API (Recommended)

**Use CellAnimator methods directly** - Simple, abstracted, covers 90% of use cases.

```javascript
// Setup
const animator = new CellAnimator({ container, cellWidth: 10, cellHeight: 10 });
await animator.init();

// Load image (ONE LINE)
const frameData = await animator.loadImage('photo.jpg', { quality: 'high' });

// Get current state
const data = animator.getData();

// Edit and render
data.cells[100].color = '#FF0000';
await animator.setData(data);

// Export
const json = animator.exportData({ pretty: true });
```

**When to use**: Most applications, quick prototypes, simple use cases.

---

### Approach 2: Low-Level Helpers (Power Users)

**Use helper functions directly** - Full control, for advanced scenarios.

```javascript
// Use helpers to create data
const frameData = await ImageHelpers.loadImage('photo.jpg', { quality: 'high' });
const gradient = PatternHelpers.generateRadialGradient({ ... });
const animation = AnimationHelpers.createAnimation([frame1, frame2], { fps: 30 });

// Then render
await animator.setData(frameData);
animator.updateCells(gradient);
animator.loadAnimation(animation);
```

**When to use**: 
- Custom image processing
- Programmatic art generation
- Advanced frame manipulation
- Integration with external systems
- Building tools on top of PXS

---

## 📊 Data Flow

```
┌─────────────────┐
│  Image File     │
│  (photo.jpg)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ ImageHelpers    │  ← Low-level: Convert image to data
│ .loadImage()    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  PXSFrame       │  ← Data structure (see pxs-types.d.ts)
│  {              │
│    cols, rows,  │
│    cells: [...] │
│  }              │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ CellAnimator    │  ← High-level: Render data
│ .setData()      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Visual Grid    │
│  (Rendered)     │
└─────────────────┘
```

---

## 🔍 Finding Code Examples

### 1. **TypeScript Interfaces** (The Contract)
**File**: `src/types/pxs-types.d.ts`

Shows you what data structures look like:
- `PXSFrame` - Single image
- `PXSAnimation` - Multiple frames
- `PXSCell` - Single pixel

### 2. **Complete Examples**
**File**: `docs/API-Examples.md`

Shows:
- High-level API usage
- Low-level helper usage
- Real-world examples
- Storage examples

### 3. **Interactive Demo**
**File**: `examples/simple-usage.html`

Working examples you can run:
- Load images
- Get/edit data
- Export/import
- Storage
- Patterns

### 4. **Main Demo**
**File**: `demos/index.html`

Full-featured PXS Studio IDE showing all features.

### 5. **Helper Demos**
**Files**: `demos/demo-*.html`

Specific feature demonstrations:
- `demo-gradient-helpers.html` - Pattern generation
- `demo-canvas.html` - Canvas renderer
- `benchmark.html` - Performance testing

---

## 🚀 Quick Start Checklist

1. ✅ **Read the contract**: `src/types/pxs-types.d.ts`
2. ✅ **See examples**: `docs/API-Examples.md`
3. ✅ **Try interactive**: Open `examples/simple-usage.html`
4. ✅ **Check main demo**: `demos/index.html`
5. ✅ **Read full docs**: `AGENTS.md` for complete reference

---

## 💡 Common Questions

**Q: Do I need to use helpers or can I just use CellAnimator?**  
A: Start with **CellAnimator methods** (high-level). Use helpers only when you need custom processing.

**Q: Where is the data structure defined?**  
A: `src/types/pxs-types.d.ts` - TypeScript interfaces show the exact structure.

**Q: How do I see actual working code?**  
A: `examples/simple-usage.html` - Interactive examples with code you can run.

**Q: What's the difference between high-level and low-level?**  
A: 
- **High-level**: `animator.loadImage()` - Does everything for you
- **Low-level**: `ImageHelpers.loadImage()` then `animator.setData()` - You control each step

**Q: Can I edit the data directly?**  
A: Yes! Get data with `animator.getData()`, edit the `cells` array, then `animator.setData()` to render.

---

## 📚 Documentation Hierarchy

```
AGENTS.md (Complete technical reference)
  ├── API-Examples.md (Consumer usage examples)
  │     └── examples/simple-usage.html (Interactive demo)
  ├── Consumer-API-Quick-Reference.md (This file)
  └── Phase-3-DataFirst.md (Architecture details)
```

**Start here**: `docs/API-Examples.md` → `examples/simple-usage.html` → `AGENTS.md`

---

**Last Updated**: January 22, 2026  
**Version**: 3.0.0
