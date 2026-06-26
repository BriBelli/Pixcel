# Executor Brief S1b — a2ui-core protocol port + PXSFrame de-dup (clean seam)

> Paste into a **fresh Claude Code session** in the Pixcel repo. **Depends on S1a** (the canonical
> `@pxs/core` must be in place first — branch off S1a's result, or off `feature/pixcel-unification` once
> S1a is merged). Small, reviewable diff. **Do not merge.**

## Orient (read first)
- `docs/MIGRATION-BACKLOG.md` and **`docs/migration-scan/02-a2ui.md`** (your detailed spec) + `05-substrate-data.md`
  (the PXSFrame-duplication risk).
- `docs/UNIFICATION-LOG.md` (FORK-1 resolved = React/Next everywhere; a2ui-core is already TS → ports directly).

## Crown jewel — DO NOT TOUCH
Same hard list as every brief (live-jobs.ts, engine prompts, MatrixArtStage draw loop, store, /api). This
task is the **protocol core only** — NOT the Lit renderer or the ~35 Lit components (that's the later P4
React rebuild). Do not bring `apps/a2ui-chat` in.

## Task
Bring photolif's **`libs/a2ui-core`** (the framework-agnostic A2UI protocol — ~1.2k LOC pure TS, generic
over the rendered output type, no DOM/framework coupling) into the unified monorepo as a tracked TS lib:
1. **Create `packages/a2ui-core`** (recommended package name `@pxs/a2ui-core` to match the `@pxs/*` scope —
   confirm against the repo's existing naming before finalizing). Move `types`, `registry`, `schema`,
   `utils`, and the 6 protocol patterns. Wire it into Nx (`project.json`, `tsconfig` paths) like
   `packages/pxs-core`.
2. **De-dup `PXSFrame`** (the top fusion risk): a2ui-core currently re-declares its own
   `PXSFrame`/`PXSCell`/`PXSCompressedFrame`. Make a2ui-core **import the canonical shapes from `@pxs/core`**
   instead of redefining them (add the workspace dep). If the compressed/on-chain form has no `@pxs/core`
   equivalent yet, keep it in a2ui-core but build it *on top of* the canonical `PXSFrame`. After this, there
   must be **one** `PXSFrame` definition that both packages share.
3. Do **not** port the renderer, the Lit components, or `a2ui-react` here — protocol only.

## Verify
- `packages/a2ui-core` type-checks and builds under Nx; the import graph resolves `@pxs/core`.
- `npm run studio:build` still succeeds (no accidental coupling introduced).

## Deliverable
Branch `s1b-a2ui-core-port`. Commit body: the package name chosen + why, the PXSFrame de-dup approach, and
what (if anything) of the compressed form stayed local. Summarize the diff + open questions for the
architect. Do not merge.

## Standing rules
Tokens/data rules per the design system + `CLAUDE.md`. Small diff, no unrelated refactors. If the de-dup
forces a shape change to `@pxs/core`, STOP and flag it (that's an architect decision, not a silent edit).
