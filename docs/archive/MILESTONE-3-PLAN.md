# Milestone 3 — Productize the Statue Engine (Plan)

> Status: PLAN (awaiting Brian's approval before any code). Nothing executes until greenlit. Companion
> canon: [THE-STATUE-METHOD.md](THE-STATUE-METHOD.md), [PIXCEL-ART-ENGINE.md](PIXCEL-ART-ENGINE.md),
> [OPTION-1-PAINTER-RECOVERY.md](OPTION-1-PAINTER-RECOVERY.md).

## Where we are
**M1 (shape engine) + M2 (full statue method) are PROVEN** in the scratch harness
(`packages/pxs-studio/painter-harness.mjs`): the recipe **VISION → SHAPE → POLISH → QA + keep-best**
ran fully autonomous, **~5 passes, $1.05, no churn, no human**, and produced a hero-grade owl. But it's
proven **in a harness, on one subject (owl).** This plan: **lock it → prove it generalizes → make it
real + watchable in the product.**

The locked recipe (does not change): **VISION** commits the iconic brief (the Michelangelo step) →
**SHAPE** blocks masses/form, defers detail → **POLISH** completes details *on top of the locked shape*
(auditor *accepts* the shape, judges at *read-level*, never re-opens it) → **QA** read-level whole-piece
sweep → **keep-best** ships the last approved state, never a churned one.

---

## Phase A — Lock the win  *(free, no API spend)*
Cement the milestone so we never regress to it.
- **A1 — Gospel:** mark **M2 PROVEN** in `THE-STATUE-METHOD.md` (the locked recipe + the owl proof +
  the churn → keep-best / read-level lessons).
- **A2 — Memory:** record M2-proven + the locked recipe (so future sessions inherit it).
- **A3 — Git hygiene:** add `packages/pxs-studio/painter-out/` to `.gitignore`; `git rm --cached` the
  tracked scratch run-output; **preserve the milestone-evidence owls** (curate `owl-m1-shape`,
  `owl-m2-phased`, `owl-vision`, `owl-corrected`, `owl-v1-bust`, `owl-v2-gate` → `docs/milestone-evidence/`,
  committed); commit `painter-harness.mjs` as the **reference engine**; tidy the dead `AUDITOR_SYSTEM` const.
- **Deliverable:** clean repo, milestone locked, evidence preserved. One commit.

## Phase B — Validate generalization  *(cheap ~$3–5; GATED on your go)*
Prove the recipe isn't owl-overfit *before* building product on it.
- **B1 — Cross-subject run:** the corrected engine on **3–4 diverse subjects** — `cat`, `t-rex`,
  `axolotl` (hard / draft-1-wrong → stresses redesign), and a non-creature (`sword` or `mushroom`).
  Ref-less (the committed brief anchors the auditor) + read-level.
- **B2 — Judge by eye** (me + you), read-level. **Success = clean convergence (no churn) + good art on
  every subject**, each ~$1, ~5–6 passes.
- **B3 — Harvest:** save the strong results to the gallery + their trajectories as Option-3 training data.
- **Gate:** all pass → recipe is real, proceed to C. Any churn/flop → fix the recipe first.
- **Deliverable:** 3–4 cross-subject results + a go/no-go on the recipe.

## Phase C — Productize the engine  *(the build; GATED; staged reviewed commits)*
Make it real + watchable in the Studio app.
- **C1 — Extract the engine** into a clean product module (`lib/statue-painter.ts`, or refactor
  `live-jobs.ts`): `designVision()` + the `PHASES` loop + per-phase `audit()` + keep-best — using the
  **real** `render-frame.ts`, `pxs-frame-schema` (`charMapToFrame`), and the existing `setup`/`paint`
  tools. Keep: no-exemplars, full effort, true-scale, correct pricing.
- **C2 — Wire into the detached Live job** (`live-jobs.ts` `runArtisan` → the statue engine). Keep
  pause/cancel/resume/feedback. Job state reflects the **phase** (VISION/SHAPE/POLISH/QA), the auditor
  verdicts, and live cost.
- **C3 — SSE live show:** stream each pass to the UI (existing SSE tail) — the canvas updates per pass,
  the current phase shows, the auditor feedback lands in the studio feed. *(Matrix-style reveal = roadmap.)*
- **C4 — Brief as a control point:** persist the committed brief on the job; surface it **read-only** in
  the UI (editable brief = future human-in-loop-at-design).
- **C5 — Trajectory capture:** persist each run (brief + passes + audits + final) for Option-3.
- **C6 — Verify:** `tsc` clean; **one real in-app generation** (owl in the Studio — watch it paint
  vision→shape→polish→QA, confirm hero-grade + cost).
- Each sub-step = its own reviewed commit. The C6 spend is gated.
- **Deliverable:** the statue engine **live + watchable in the Studio app.**

## Phase D — Roadmap  *(out of scope here — captured, not built)*
Matrix-style live reveal · controlled-passes UI (user picks iterations/price + a manual "upgrade/pass"
button + an optional feedback field) · brand consistency (canonical briefs per subject) · monetization
tiers (high-end collectibles, pay-for-quality, in-app purchases) · real-time low-poly vs high-fidelity
tracks.

---

## Execution model
- **Staged, reviewed commits** per sub-step — nothing big lands unchecked (no lean-rewrite mistakes twice).
- **API-spend steps (B, C6) gated** on explicit go each time.
- I (Claude Code) execute on greenlight with commits you review — or hand to the Cursor executor; your call.

## Success criteria (M3 done)
A user types a subject in the Studio, **watches it paint through vision → shape → polish → QA live**, and
gets a **hero-grade piece for ~$1–2, autonomously** — and **every run is captured as training data** for
the eventual own-model (Option 3).
