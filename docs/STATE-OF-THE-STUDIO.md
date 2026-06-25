# State of the Studio — current truth (read FIRST before the UI/UX refresh)

> One source of truth for the **Pixcel Studio as it actually is today** — what's built and working, the
> open UX problems, and what's intentionally preserved. For Claude Design (the UI/UX refresh) and the
> upcoming **sister-product merge** analysis. Supersedes the archived plan docs in `docs/archive/`.

## What's built + WORKING (proven in use)
- **The autonomous engine** (`lib/live-jobs.ts` + `lib/ai-art-system-prompt.ts`): VISION (commit a
  feasible, native-to-resolution design + palette) → **hot-potato REFINE** (one fresh-eyes call per pass
  that JUDGES then FIXES, whole-render cold) → **three-stage carve→refine→POLISH gate** → **keep-best**.
  ~$0.5–0.8/piece, converges in a few passes. NO exemplars, full effort.
- **The BONUS LOOP** (the quality FLOOR): after approval it keeps attempting elevations, each kept only
  if a fresh-eyes A/B compare says it's genuinely better; loops while improving, stops on 2-dry. Strictly
  non-regressive — can't ship dirt, can't skip out. *(See `PLAN-QUALITY-ENGINE.md` → SHIPPED section.)*
- **The live show** (`MatrixArtStage`): real-time char-map — cells plot as the model writes them
  (stream-parsed), then cascade to color; crisp 1:1 render. Contract: `PIXCEL-LIVE-SSE.md`.
- **Review controls**: Save / Iterate / Redo / Cancel; chat-during-review refines the piece; Iterate runs
  another round (optional note). **Refine a SAVED/loaded piece** with feedback (the Refine card).
- **Gallery + assets** (`gallery-store`, localStorage): generated pieces saved; hearts/delete.
- **Auto-draft + leave-guard**: a resolved piece is silently kept; refresh/leave warns + recovers it.
  **Save = curation** (promote to assets), never data-safety.
- **Per-piece version history**: each refine/iterate appends a labeled version; History button by the
  canvas-size chip; click to load a version. *(In-memory/session today — DB persistence is deferred.)*
- **Controls**: Resolution (16–64), Aspect Ratio (Auto/Landscape/Portrait/Square/Custom), Max revisions,
  Model (Opus 4.8 default).
- **Tabs today**: ART (gallery + the Pixcel AI panel), GRID (pixel editor), IMAGE (photo→JSON convert),
  ANIM.

## OPEN UX problems (the refresh should solve these)
1. **Resolution / Aspect representation** still isn't right — needs a model that resonates with normal
   people (NOT cells-per-pixel, NOT abstract tiers). Decide BEFORE building controls. (`SPEC-DIMENSIONS.md`)
2. **Editor tools are under-surfaced** — the canvas IS paintable (`B` brush key + a tiny color swatch +
   Cmd+Z) but there's no visible paint-tools palette; a saved piece looks un-editable. Build a real
   brush/eraser/fill/color/select toolbar.
3. **IMAGE tab** — "Quality" is the wrong word (it's resolution/density); Photo/Vector are convert modes.
   Rename + clarify this is the *convert* path, not art generation.
4. **Live-stage ↔ editor-canvas relationship** — the live show (`MatrixArtStage`) and the editable
   `GridCanvas` are somewhat separate; clarify/unify in the IDE shell.
5. **Version-history persistence** — currently session/in-memory; the DB-backed per-piece history is the
   deferred platform sync.

## Intentionally PRESERVED (do NOT delete — the lineage / soul)
- **The eyes-open painter** — `liveArtistSystemPrompt`, `statueDrawerSystemPrompt` (the perceive-after-
  every-stroke drawer). Currently unused as standalone (the hot-potato is the live engine, with the
  painter as the drawer inside it), but **kept by design** (memory: *never delete the painter*).
- **The cascade auditor** — `statueAuditSystemPrompt` (the recovered M2 phase auditor). Unused now (the
  unified hot-potato replaced it — it caught the tennis-player), kept as proven lineage.
- *(These are 0-import but preserved. A code-analysis pass should treat them as kept, not dead.)*

## NON-NEGOTIABLE principles (carry into the refresh + the merge)
Quality is the product, the show is icing (never trade) · NO exemplars to the generator · image LLMs are
for photoreal/style-transfer only (reasoned pixel art is the moat) · native design per resolution · never
override explicit user intent · per-class craft · keep-better over forcing (forcing change → dirt). Full
list: `PLATFORM-MERGE-README.md` §5.

## The merge (next phase, not yet started)
Sister product (multi-LLM + image/video→JSON) is **not yet in this repo**. Plan: marry at the **shell
level** (platform IDE: left-rail surfaces) in this refresh — Pixcel as the proven hero surface #1 — and
bring sister surfaces in **incrementally**, on the shared media-as-JSON seam. Don't big-bang.
Brief: `PLATFORM-MERGE-README.md`. Product def: `PIXCEL-PRODUCT.md`. Workflow: `PIXCEL-WORKFLOW.md`.

## Pointers (the living docs — the rest are in `docs/archive/`)
`PIXCEL-PRODUCT` · `PIXCEL-WORKFLOW` · `PLATFORM-MERGE-README` · `SPEC-DIMENSIONS` · `THE-STATUE-METHOD`
· `PIXCEL-CRAFT-RUBRIC` · `PIXCEL-LIVE-SSE` · `PLAN-QUALITY-ENGINE` · `CLAUDE.md` · `AGENTS.md`
