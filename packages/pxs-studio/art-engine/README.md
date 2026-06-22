# Pixcel Art Engine — reference harness (dev)

`painter.mjs` is the **proven reference engine** for The Statue Method
([docs/THE-STATUE-METHOD.md](../../../docs/THE-STATUE-METHOD.md)):

> **VISION** (commit the design brief — the Michelangelo step) → **SHAPE** (masses/form, defer detail)
> → **POLISH** (complete details on top; auditor *accepts* the shape, judges *read-level*) → **QA**
> (whole-piece read-level sweep) → **keep-best** (ship the last approved state, never a churned one).

Autonomous, no human, **~$1/piece, ~5–6 passes, no churn.** Proven across cat, t-rex, axolotl
(hard/draft-1-wrong), mushroom, tree-frog. The product port (Milestone 3 — see
[docs/MILESTONE-3-PLAN.md](../../../docs/MILESTONE-3-PLAN.md)) lives in the app; this stays the
canonical reference + research harness.

## Run
```
node --env-file=packages/pxs-studio/.env.local packages/pxs-studio/art-engine/painter.mjs "a subject"
# override output dir:  PAINTER_OUT=/some/dir  (default → art-engine/runs/, gitignored)
```

## Layout
- `painter.mjs` — the engine (designVision + SHAPE/POLISH/QA phases + per-phase auditor + keep-best).
- `bars/` — reference images the auditor anchors owl/t-rex to (regenerable from the gallery).
- `runs/` — per-run output (`final.png`, `pass-*.png`, `final-canvas.json`, `trajectory.json`); **gitignored**.

Milestone proof images: [docs/milestone-evidence/](../../../docs/milestone-evidence/).

## Known weak spot
**Precise mechanical subjects** (e.g. a race car — low wedge + thin rear wing at 32px) churn the
SHAPE phase, cost more, and can starve polish/QA. Organic creatures + simple objects are hero-grade;
mechanical subjects are a future refinement (more SHAPE budget / appendage handling).
