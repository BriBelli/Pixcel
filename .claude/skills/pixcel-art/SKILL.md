---
name: pixcel-art
description: Compose Pixcel gallery pixel-art by hand as PXSFrame JSON. Use whenever the user asks to create, add, design, or compose a pixel-art "example"/"piece"/"art" for the Pixcel studio gallery (e.g. "make a 16x16 cactus", "add a heart to the gallery"). Covers the data model, hand-authoring workflow, palette, validation, and registration so the piece is clickable in the Art tab.
---

# Pixcel Art Composer

Hand-compose pixel art for the Pixcel studio **Art gallery**. You are the *composer*: the
user gives a prompt, you author the pixels yourself. The result is a `PXSFrame` JSON file
that loads onto the canvas when clicked in the **Art** tab.

> Shared source of truth: [docs/PIXCEL-METHOD.md](../../../docs/PIXCEL-METHOD.md) — the
> canonical "Pixcel Method" (complexity-not-resolution; design → budget → place → validate).
> The in-app Pixcel AI generator runs the same method server-side. Keep this skill and that
> doc in sync.

## Hard rules

1. **Author every pixel by hand. NEVER write a generator/helper script** (no Node loops,
   no `for`-fill, no `frameToGridData`-style builders) to *produce* the art. The user wants
   genuine composition, not procedural output. Running a read-only **validation** script
   afterward is fine — generating the cells is not.
2. **Stay Pure** — one solid color per cell. No gradients, no multi-color cells, no
   sub-pixel blending. The output must be valid for hardware LED targets.
3. **Dense frames** — *every* cell in the grid is present exactly once, including the
   background. A 16×16 frame has exactly 256 cells; 32×32 has 1024.
4. **Row-major order** — emit cells with `y` as the outer loop and `x` inner:
   `(0,0),(1,0)…(15,0),(0,1)…`. Match the existing files.

## Data model

```
PXSFrame = { cols, rows, cells: PXSCell[], metadata? }
PXSCell  = { x, y, color, opacity }   // color is "#rrggbb" lowercase; opacity 1
```

Reference shape — see existing pieces in
[packages/pxs-studio/src/data/gallery/](packages/pxs-studio/src/data/gallery/):

```json
{
  "cols": 16,
  "rows": 16,
  "cells": [
    { "x": 0, "y": 0, "color": "#0d1117", "opacity": 1 },
    { "x": 1, "y": 0, "color": "#0d1117", "opacity": 1 }
  ],
  "metadata": {
    "title": "Toadstool",
    "prompt": "<the prompt the user gave>",
    "author": "ai-composer",
    "created": "<YYYY-MM-DD>"
  }
}
```

## Palette conventions

- Background: `#0d1117` (the studio's dark canvas). Use it for all empty cells.
- Optional grounding shadow one shade up: `#161b22`.
- Pick a small, deliberate palette (3–6 colors). Give shapes a base color + one darker
  shade for shadow/outline so they read at small sizes. Lowercase hex.

## Workflow

1. **Pick a canvas size.** Default 16×16 (256 cells — hand-authorable, reads well). Go
   larger only if the subject needs it; keep it a clean square unless asked otherwise.
2. **Sketch a character map first** — one row per `y`, one char per `x`, and show it to the
   user before writing JSON. This is the design and the review surface. Example legend:
   `.` = background, and one letter per color. Build the silhouette, then add shading.
3. **Translate the map to cells** by hand, row-major, every cell present. Map each legend
   char to its hex color. Write the file to
   `packages/pxs-studio/src/data/gallery/<name>-<size>.json` (e.g. `cactus-32.json`).
4. **Validate** (read-only check — NOT generation):

   ```bash
   node -e '
   const f=require("./packages/pxs-studio/src/data/gallery/<name>-<size>.json");
   const seen=new Set(); let bad=0;
   for(const c of f.cells){const k=c.x+","+c.y;
     if(seen.has(k)){console.log("DUP",k);bad++} seen.add(k);
     if(!/^#[0-9a-f]{6}$/.test(c.color)){console.log("BADCOLOR",k,c.color);bad++}
     if(c.opacity!==1){console.log("BADOP",k);bad++}}
   let miss=0;
   for(let y=0;y<f.rows;y++)for(let x=0;x<f.cols;x++)if(!seen.has(x+","+y)){console.log("MISSING",x,y);miss++}
   console.log("cells",f.cells.length,"expected",f.cols*f.rows,"bad",bad,"missing",miss,
     (bad===0&&miss===0&&f.cells.length===f.cols*f.rows)?"VALID":"INVALID");'
   ```

5. **Register it** in [packages/pxs-studio/src/data/gallery/index.ts](packages/pxs-studio/src/data/gallery/index.ts):
   add an `import`, then append a `GALLERY_ENTRIES` entry:

   ```ts
   {
     id: '<name>-<size>',
     title: '<Title>',
     prompt: '<the user prompt>',
     promptBy: 'human',
     composedBy: 'ai-composer',
     frame: <import> as PXSFrame,
   }
   ```

6. **It's now clickable.** [ArtGalleryTab.tsx](packages/pxs-studio/src/components/ArtGalleryTab.tsx)
   renders every `GALLERY_ENTRIES` item in the **Art** sidebar tab; clicking calls
   `applyGalleryFrame` ([lib/apply-gallery-frame.ts](packages/pxs-studio/src/lib/apply-gallery-frame.ts)),
   which loads the frame onto the canvas and pushes undo history. No other wiring needed.
   Verify with `npm run studio:dev` → **Art** tab.

## Checklist before finishing

- [ ] No generator script used to produce the cells.
- [ ] Char-map sketch shown to the user.
- [ ] `cells.length === cols * rows`, no dups, no missing, all `opacity: 1`, lowercase hex.
- [ ] One solid color per cell (Stay Pure).
- [ ] File saved under `gallery/`, registered in `index.ts`, `metadata` filled in.
