# 🏗️ PXS Architecture Proposal - Moving to Production Quality

**Date**: January 22, 2026  
**Status**: CRITICAL - Current architecture is blocking production quality

---

## 🚨 Current Critical Issues

### 1. **Performance Bottleneck**
- **Problem**: Single-threaded JavaScript blocks the entire UI
- **Impact**: Browser crashes/freezes at high resolutions (320px+)
- **Root Cause**: No Web Workers, no async processing, everything on main thread

### 2. **WASM Integration Incomplete**
- **Current**: WASM only speeds up image processing (block averaging)
- **Still Slow**: Grid creation, rendering, DOM updates all in JavaScript
- **Reality**: 10x faster processing, but 1000x slower rendering bottleneck

### 3. **Monolithic Architecture**
- **Problem**: PXS library is mixed with demo app code
- **Impact**: Can't reuse library, can't optimize separately, hard to maintain
- **Missing**: Clean separation between headless library and UI application

### 4. **No Virtual DOM**
- **Problem**: Direct DOM manipulation for thousands of cells
- **Impact**: Slow updates, memory leaks, poor performance
- **Solution**: React, Vue, or Svelte needed

### 5. **UX Inconsistencies**
- Resolution controls scattered across tabs
- Animation metadata not visible in timeline
- Inspect Animation works but UX is disconnected
- Loader doesn't show progress accurately

---

## 🎯 Proposed Architecture

### **Phase 1: Immediate Separation (1-2 weeks)**

#### 1.1 **Separate Library from App**

```
Pixcel/
├── packages/
│   ├── pxs-core/              # 📦 Core library (headless)
│   │   ├── src/
│   │   │   ├── CellAnimator.js
│   │   │   ├── renderers/
│   │   │   ├── helpers/
│   │   │   ├── storage/
│   │   │   └── wasm/
│   │   ├── package.json
│   │   └── README.md
│   │
│   ├── pxs-studio/            # 🎨 Studio App (React + Next.js)
│   │   ├── src/
│   │   │   ├── app/           # Next.js app router
│   │   │   ├── components/    # React components
│   │   │   ├── hooks/         # React hooks
│   │   │   ├── workers/       # Web Workers
│   │   │   └── styles/
│   │   ├── public/
│   │   ├── package.json
│   │   └── next.config.js
│   │
│   └── pxs-docs/              # 📚 Documentation site
│       └── (VitePress or Docusaurus)
│
├── wasm/                      # 🦀 Rust/WASM (shared)
├── nx.json                    # Nx workspace config
└── package.json               # Root package.json
```

#### 1.2 **Tech Stack**

| Component | Technology | Reason |
|-----------|-----------|--------|
| **Monorepo** | Nx or pnpm workspaces | Manage multiple packages, shared dependencies |
| **Studio App** | Next.js 14 + React 18 | App router, Server Components, streaming |
| **UI Framework** | Tailwind CSS + shadcn/ui | Fast, accessible, production-ready components |
| **State Management** | Zustand | Simple, performant, no boilerplate |
| **Build Tool** | Vite (for library) + Next.js (for app) | Fast builds, HMR, optimized bundles |
| **Workers** | Comlink | Easy Web Worker RPC |
| **Canvas** | OffscreenCanvas + Web Workers | Non-blocking rendering |

---

### **Phase 2: Web Workers for Performance (Week 3-4)**

#### 2.1 **Worker Architecture**

```javascript
// Main Thread (UI)
import { wrap } from 'comlink';

const GridWorker = wrap(new Worker('./grid.worker.js'));
const RenderWorker = wrap(new Worker('./render.worker.js'));

// Create grid in worker
const cellData = await GridWorker.createGrid(320, 240);

// Render in worker with OffscreenCanvas
const canvas = document.getElementById('canvas');
const offscreen = canvas.transferControlToOffscreen();
await RenderWorker.render(offscreen, cellData);
```

#### 2.2 **Worker Responsibilities**

| Worker | Responsibility | Benefit |
|--------|---------------|---------|
| **GridWorker** | Create cell data structures | UI stays responsive |
| **RenderWorker** | Canvas drawing with OffscreenCanvas | GPU rendering, non-blocking |
| **ImageWorker** | Process images (WASM integration) | Already fast, keep off main thread |
| **AnimationWorker** | Frame interpolation, transitions | Smooth 60 FPS |

---

### **Phase 3: React Studio App (Week 5-8)**

#### 3.1 **Component Structure**

```tsx
// Studio App Layout
<PXSStudio>
  <Header />
  
  <Sidebar position="left">
    <ResolutionPanel />  {/* Unified across all modes */}
    <ToolPanel />        {/* Create, Effects, Patterns */}
    <AnimationPanel />   {/* When animation loaded */}
  </Sidebar>
  
  <Canvas>
    <GridRenderer />     {/* Uses Web Workers */}
    <GridControls />     {/* Zoom, pan, borders */}
  </Canvas>
  
  <Timeline>           {/* Always visible when animation */}
    <Scrubber />
    <FrameThumbnails />
    <PlaybackControls />
  </Timeline>
  
  <Sidebar position="right">
    <PerformanceMonitor />
    <PropertiesPanel />  {/* Selected cell/frame */}
    <EventLog />
  </Sidebar>
  
  <Inspector />        {/* Modal for deep inspection */}
</PXSStudio>
```

#### 3.2 **State Management (Zustand)**

```typescript
interface PXSStore {
  // Grid State
  grid: {
    cols: number;
    rows: number;
    cells: Map<string, Cell>;
    renderer: 'html' | 'canvas' | 'webgl';
  };
  
  // Animation State
  animation: {
    frames: PXSFrame[];
    currentFrame: number;
    playing: boolean;
    fps: number;
  };
  
  // UI State
  ui: {
    selectedCells: string[];
    activeTool: 'pen' | 'fill' | 'select';
    sidebarCollapsed: boolean;
  };
  
  // Actions
  actions: {
    createGrid: (cols, rows) => Promise<void>;
    updateCell: (x, y, color) => void;
    playAnimation: () => void;
    exportData: () => string;
  };
}
```

---

### **Phase 4: Production Features (Week 9-12)**

#### 4.1 **Enhanced UX**

- **Unified Resolution Picker**: Single component used across all modes
- **Inline Animation Metadata**: Show FPS, duration, frame count in timeline
- **Progressive Loading**: Show partial grid as it renders
- **Keyboard Shortcuts**: Photoshop-style hotkeys
- **Undo/Redo**: History stack for all actions
- **Auto-save**: LocalStorage + optional cloud sync

#### 4.2 **Performance Optimizations**

- **Virtualized Grids**: Only render visible cells (react-window)
- **Lazy Frame Loading**: Only load frames near current playhead
- **Streaming Exports**: Stream large animations instead of blocking
- **SharedArrayBuffer**: Share data between workers without copying

#### 4.3 **Professional Features**

- **Layers**: Multiple grid layers with blend modes
- **Filters**: Real-time filters (blur, sharpen, etc.) via WASM
- **Onion Skinning**: See previous/next frames while editing
- **Color Palette Management**: Save/load color palettes
- **Batch Processing**: Process multiple images/frames
- **Plugin System**: Allow community extensions

---

## 📊 Performance Targets

| Resolution | Current | With Workers | Target |
|-----------|---------|-------------|--------|
| **64×48** (3K cells) | Instant | Instant | Instant |
| **128×96** (12K cells) | <100ms | <50ms | <50ms |
| **256×192** (49K cells) | ~500ms | <100ms | <100ms |
| **320×240** (76K cells) | 2-5s (freezes) | <200ms | <200ms |
| **400×300** (120K cells) | Crashes | <500ms | <500ms |
| **640×480** (307K cells) | ❌ Crashes | <1s | <1s |
| **1024×768** (786K cells) | ❌ Crashes | <2s | <2s |

---

## 🗓️ Implementation Timeline

### **Sprint 1-2: Foundation (Weeks 1-2)**
- [ ] Setup Nx workspace
- [ ] Extract pxs-core library
- [ ] Create Next.js studio shell
- [ ] Setup build pipeline
- [ ] Migrate WASM integration

### **Sprint 3-4: Web Workers (Weeks 3-4)**
- [ ] Implement GridWorker
- [ ] Implement RenderWorker with OffscreenCanvas
- [ ] Integrate with existing renderers
- [ ] Progressive loading UI
- [ ] Benchmark performance

### **Sprint 5-6: React Migration (Weeks 5-6)**
- [ ] Build component library
- [ ] Implement state management
- [ ] Migrate canvas controls
- [ ] Migrate sidebar panels
- [ ] Migrate timeline

### **Sprint 7-8: Polish & Features (Weeks 7-8)**
- [ ] Unified resolution picker
- [ ] Enhanced animation timeline
- [ ] Keyboard shortcuts
- [ ] Undo/Redo
- [ ] Auto-save

### **Sprint 9-10: Production Ready (Weeks 9-10)**
- [ ] Performance tuning
- [ ] Accessibility audit
- [ ] Cross-browser testing
- [ ] Documentation
- [ ] Launch PXS Studio v1.0

---

## 🤔 Decision: Nx vs. pnpm Workspaces?

### **Option A: Nx (Recommended)**
✅ Best-in-class monorepo tooling  
✅ Built-in caching, affected commands  
✅ Integrated with Next.js, Vite, React  
✅ Scales to multiple teams  
❌ Slightly heavier setup  

### **Option B: pnpm Workspaces**
✅ Lightweight, fast installs  
✅ Simple for small teams  
❌ Manual build orchestration  
❌ No built-in caching  

**Recommendation**: **Use Nx**. The performance benefits and scalability justify the setup cost.

---

## 💡 Quick Wins (This Week)

While planning the migration, we can make immediate improvements:

### 1. **Fix Loading Indicator**
- Use CSS animations that continue during JS block
- Add indeterminate mode when progress unknown
- ✅ Already implemented in latest commit

### 2. **Improve Gradient Animation**
- Use smoother color interpolation (HSL instead of RGB)
- Add easing functions (ease-in-out)
- Increase frame count to 30 for smoother transitions

### 3. **Enhance Timeline UX**
- Show FPS, duration directly in timeline header
- Make "Inspect Animation" icon-based (🔍) next to metadata
- Add right-click context menu on frames

### 4. **Unify Resolution Controls**
- Create ResolutionPicker component
- Use same component in Resolution, Image, and Animation tabs
- Add "Apply to Current" vs "Create New Grid" options

---

## 🚀 Next Steps

1. **Review & Approve Architecture** (Today)
2. **Create Nx Workspace** (Tomorrow)
3. **Extract pxs-core Library** (Day 2-3)
4. **Setup Next.js Studio Shell** (Day 4-5)
5. **Implement GridWorker** (Week 2)

---

## 📝 Questions to Answer

- [ ] Do we want server-side rendering for the studio app?
- [ ] Should we support multi-user collaboration (real-time)?
- [ ] What's the cloud storage strategy (S3, Cloudflare R2)?
- [ ] Do we need a backend API (Next.js API routes, Supabase, Prisma)?
- [ ] What's the deployment target (Vercel, Netlify, self-hosted)?

---

**Bottom Line**: The current single-file demo app has outgrown its architecture. Moving to a proper monorepo with React, Next.js, Web Workers, and separated concerns will unlock Adobe-level quality and performance.

**Let's build PXS Studio the right way.**
