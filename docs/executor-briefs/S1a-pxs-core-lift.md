# Executor Brief S1a — pxs-core lift-and-shift (clean seam)

> Paste into a **fresh Claude Code session** in the Pixcel repo. Branch off `feature/pixcel-unification`.
> You are an executor on the Pixcel unification. Small, reviewable diff. Follow the design/data rules.
> **Do not merge** — leave the branch for architect + Brian review.

## Orient (read first)
- `docs/MIGRATION-BACKLOG.md` (the big picture) and **`docs/migration-scan/03-pxs-core.md`** (your detailed spec).
- `docs/PIXCEL-UNIFICATION-PLAN.md` + `docs/UNIFICATION-LOG.md` (decisions: ONE product, ALL-TS).
- `CLAUDE.md` (root) — the "Stay Pure" rule + the build commands.

## Crown jewel — DO NOT TOUCH
The artisan engine + live show: `packages/pxs-studio/src/lib/live-jobs.ts`, the engine prompts,
`MatrixArtStage` draw loop / generation, `live-art-store` wiring, the `/api/*` routes. This task is
`packages/pxs-core` only.

## Task
photolif's `pxs-core` is a near-identical **superset** of the tracked `packages/pxs-core` (the
`pxs-types.d.ts` data model is byte-identical). **Adopt photolif's source as the canonical `@pxs/core`:**
1. Bring in photolif's advances (per scan 03): the **named-exports** refactor (was `export default {}`),
   the new **`DrawingInstructions`** module (compact LLM-friendly shape/layer → PXSFrame), and
   `ImageHelpers` gains `resampleFrame()` + more quality presets + the `max:0` native-resolution path.
2. **Reconcile the two defaults** (the log's "~2 defaults"):
   - `CellAnimator` default `cellBorders`: photolif flips `true`→`false` (a **visible** behavior change).
     **KEEP `true` for now (non-regressive)** and leave a `// TODO(brian): confirm cellBorders default`
     comment. *(Brian's call is pending — do not silently adopt `false`.)*
   - Spatial-index / viewport auto-enable threshold `10000`→`250000` cells: **adopt `250000`** (safe perf tuning).
3. Keep the package name `@pxs/core`, the Vite library build, and `src/index.js` as the re-export surface.
   Do not change the `PXSFrame`/`PXSCell`/`PXSAnimation` shapes (identical — leave them).

## Verify
- `npm run core:build` (Vite lib build) is clean.
- `cd packages/pxs-studio && npx tsc --noEmit` clean, then **`npm run studio:build`** succeeds (the studio
  drags the whole `@pxs/core` barrel + WASMIntegration into its Turbopack graph — this is the real risk check).
- `npm run studio:dev` boots and the editor still renders.

## Deliverable
Branch `s1a-pxs-core-lift`. Commit body: list exactly what was adopted, the two reconcile decisions (note
`cellBorders` kept `true`, pending Brian), and any surprise. Summarize the diff + open questions at the end
for the architect. Do not merge.

## Standing rules
Tokens/data rules per `CLAUDE.md` (Stay Pure — one solid color per cell, no gradients/multi-color). Small
diff, no unrelated refactors. If something can't be resolved cleanly, stop and flag it.
