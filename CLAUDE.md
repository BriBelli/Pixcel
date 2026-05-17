# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Nx orchestrates everything from the repo root. Use `nx run <project>:<target>` (or the npm shortcuts) — don't `cd` into a package unless running a tool Nx doesn't wrap.

```bash
npm run studio:dev      # nx run pxs-studio:dev    (Next.js dev server, the main app)
npm run studio:build    # nx run pxs-studio:build
npm run core:build      # nx run pxs-core:build    (Vite library build → packages/pxs-core/dist)
npm run dev             # nx run-many --target=dev --all
npm run build           # nx run-many --target=build --all
npm run lint            # nx run-many --target=lint --all   (only pxs-studio defines lint → next lint)
npm run test            # nx run-many --target=test --all   (no test target is defined yet — this is a no-op)
npm run wasm:build      # cd wasm && ./build.sh    (requires rustup + wasm-pack)
```

Type-checking is per-package: `nx run pxs-core:type-check` or `cd packages/pxs-studio && tsc --noEmit`.

The Rust/WASM crate lives in `wasm/` and builds to `dist/wasm/` (NOT `wasm/pkg/`, despite a stale `wasm/pkg/` directory existing on disk). `WASMIntegration.js` loads from `/wasm/pkg/pxs_compute_bg.wasm` by default — confirm the load path matches the build output when touching WASM wiring.

There is no test runner configured. Don't claim "tests pass" — say so explicitly if asked.

## Architecture

**Nx monorepo, two packages:**

- `packages/pxs-core` — headless JS library (`@pxs/core`), Vite library build, no React, no DOM assumptions beyond the renderers. Source is `.js` with `pxs-types.d.ts` for types. Vite entry is `src/pxs.js` but `src/index.js` is the re-export surface.
- `packages/pxs-studio` — Next.js 16 + React 18 app (`@pxs/studio`), consumes `@pxs/core` via workspace symlink. `next.config.js` sets `transpilePackages: ['@pxs/core']` so the core's raw JS is transpiled by Next, not pre-built — you do NOT need to rebuild `pxs-core` during studio dev.

**Data model (the whole point of the project):** Images are JSON, not files. Everything flows through two shapes:

```
PXSFrame    = { cols, rows, cells: PXSCell[], metadata? }
PXSCell     = { x, y, color }                  // one solid color per cell
PXSAnimation = { fps, frames: PXSFrame[], metadata? }
```

`CellAnimator.getData()` / `setData()` is the round-trip. `ImageHelpers.loadImage()` converts source images → `PXSFrame` (uses WASM when available, JS fallback otherwise). Don't introduce per-cell gradients or multi-color cells — "Stay Pure" is a hard rule because the output must be valid for hardware targets like LED displays.

**Renderer selection in pxs-core** is by cell count: `HTMLRenderer` < 5K, `CanvasRenderer` 5K–100K, `WebGLRenderer` 100K+. `BaseRenderer` defines the interface — keep new renderers behind the same shape.

**pxs-studio runs client-only.** `app/page.tsx` dynamically imports `Studio` with `ssr: false` because the app depends on Web Workers and WebAssembly. Don't try to render the studio on the server.

**Studio state lives in Zustand** (`store/pxs-store.ts`) with three slices: `grid`, `animation`, `ui`. All mutations go through `actions.*`. History (undo/redo) and auto-save are managed by `store/history-manager.ts` and `store/auto-save.ts`, exposed via the `useHistoryManager` / `useAutoSave` hooks.

**Web Workers (`packages/pxs-studio/src/workers/`)** keep heavy work off the main thread — `grid.worker.ts` (cell data creation), `image.worker.ts` (WASM image processing), `render.worker.ts` (OffscreenCanvas). They're wrapped by `useGridWorker` / `useImageWorker` / `useRenderWorker` hooks and communicate via Comlink. This is what unlocks >320px resolutions without freezing the browser; keep main-thread CPU work minimal.

## Project context

`AGENTS.md` is the authoritative deep-dive on the data model, helpers, and storage adapters — read it when touching `pxs-core` APIs. Note its "Project Structure" section predates the monorepo (it shows the old `src/` layout); trust `packages/` over that diagram. `README.md` is user-facing; `PHASE-4-MIGRATION.md`, `V4-MIGRATION-PLAN.md`, and `WEB-WORKERS-COMPLETE.md` document the in-progress v4 architecture migration the current branch is part of.
