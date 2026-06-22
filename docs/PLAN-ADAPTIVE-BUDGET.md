# Plan (DEFERRED) — Complexity-adaptive budget + auditor rigor

> **Status: NOT STARTED — captured for later.** Triggered by the "Tennis Player" failure (figure
> holding a red **balloon** instead of a racket — *approved by all phases*). Another thread is editing
> the engine; **re-validate against current `lib/live-jobs.ts` before building.**
>
> **⚠️ This is the SUPPORTING guard, not the real fix.** The tennis player *converged* (all phases
> approved) on garbage — an **evaluation** failure, not a scheduling one. The real fix is an independent
> Evaluator → **docs/PLAN-EVALUATOR.md**. This doc's job: once the Evaluator defines "done," the
> complexity estimate sets the **cost ceiling** (seatbelt), nothing more.

## The two problems this failure exposed
The job log read: SHAPE ✓ → POLISH ✓ → QA ✓ → Finished. **It converged — it did not run out of passes.**
So:

1. **Fixed per-phase caps are crude** (`shape:3 / polish:2 / qa:2` for *every* subject). A heart and a
   figure-with-a-prop are not the same job — fixed intervals waste passes on simple art and starve
   complex art. *(Brian's insight — correct.)*
2. **The auditor rubber-stamped a piece that fails its own bar.** QA says *"does it INSTANTLY read as
   the subject — child test?"* A child sees "person + balloon," not "tennis player." The racket also
   came from a weak VISION concept (oversized, round, solid-red ring, a "+" instead of a string grid, a
   long handle reading as balloon string). **This is the binding failure — adaptive budget alone does
   NOT fix it** (more passes never fire if the auditor is already satisfied).

## The fix: **stop on quality, bound by complexity**
Replace `done = fixed N passes` with two independent dials:

### A. Quality-driven stop (fixes the tennis player)
- Converge when the auditor *genuinely cannot find a real flaw* — the eyes-open painter's true loop,
  not a fixed count.
- **Tighten the auditor's read test:** every KEY element must read as the *right object*, not just
  "present." Add to the QA/POLISH bar: *"Name each major element out loud — does each read as what it's
  supposed to be? A tennis racket must read as a racket (oval frame + string grid + handle in hand),
  NOT a balloon/lollipop/crosshair. If any key element reads as the wrong object, REJECT with that
  exact note."*
- **Props/identity-secondary elements get explicit attention in VISION:** the brief must *design* the
  prop deliberately (a racket is core to "tennis player" identity — size, shape, how it's held), not
  leave it as an afterthought.

### B. Complexity-driven ceiling (Brian's "estimate" — replaces the fixed cap)
**Core principle: complexity is independent of resolution.** Resolution is **locked at 32² (the
ceiling — not changing).** At a fixed 32², a mushroom is *one simple idea*; a dragon is *a dozen
interacting parts*. Same 1024 cells, ~10× the design decisions. So the budget keys off the subject's
**intrinsic complexity — NEVER the grid size.** With size constant, complexity is the *only* variable
to budget for.

- The **VISION step returns a complexity estimate** alongside the brief — a structured field:
  `complexity: 'simple' | 'moderate' | 'complex' | 'advanced'` (+ an element inventory / count as the
  rationale). VISION already designs the piece, so it's the natural place — it *knows* how many parts
  it just committed.
- Map the estimate → **per-phase pass CEILINGS** (anti-runaway guard, NOT a target). Calibration
  anchors from real subjects:
  | estimate | calibration subjects | shape | polish | qa |
  |---|---|---|---|---|
  | **simple** | heart, star, **mushroom**, apple, single icon | 1–2 | 1 | 1 |
  | **moderate** | sitting cat, **owl** (M2 hero ~5 passes), banana | 2 | 2 | 1 |
  | **complex** | **dragon, unicorn, race car, tennis player** (figure+prop, multi-part, mechanical) | 4–5 | 3 | 2 |
  | **advanced** | "super advanced" future requests — dense, many interacting elements (still 32²) | 6+ | 4 | 2 |
- Simple subjects converge fast (no wasted rounds); complex/advanced get runway *without* a fixed wall.
- **The complex/advanced tiers are where the engine's known weak spot lives** (figures-with-props +
  mechanical subjects — the race car AND the tennis player both failed there). The generous ceiling +
  VISION prop-discipline + the stricter read test are all aimed at exactly this band — treat it as the
  first-class hardening target when building.

### Keep M2's anti-churn safeguards (do NOT regress these)
- **keep-best** (ship last approved, never a churned pass), **read-level** judging (a 5px eye isn't
  sub-pixel; demanding it = churn), and the **ceiling** as the runaway guard. Adaptive ≠ unbounded.
- Cost guard stays (the COST_CAP / budget) — the ceiling scales, the hard cost stop remains.

## Work items (verify paths — engine is being edited)
1. **VISION returns complexity** — `lib/ai-art-system-prompt.ts` (`statueVision*`) + the vision schema:
   add a `complexity` field (+ optional element list / rationale). `lib/live-jobs.ts` `designVision`
   captures it.
2. **Derive ceilings from complexity** — replace the hardcoded `PHASES[].cap` with a function of the
   estimate (a lookup like the table above). Keep `cap` as the *ceiling*, convergence as the stop.
3. **Auditor read-test rigor** — strengthen `statueAuditSystemPrompt` / the per-phase `bar` strings:
   per-element "reads as the right object?" check; reject gross object-identity failures even if
   "clean." (Careful: keep it read-level, not sub-pixel — don't reintroduce churn.)
4. **VISION prop discipline** — the brief must deliberately design identity-critical props.
5. (Optional) **SSE** — emit the complexity estimate (e.g. on `vision.committed`) so the live show can
   show "estimated: complex · up to N passes."

## Verification
1. **Simple** subject (heart) → finishes in ~1–2 passes total (no wasted rounds).
2. **Complex** subject (tennis player) → (a) gets more runway, AND (b) the **racket reads as a racket**
   — the auditor REJECTS the balloon and POLISH fixes it. Re-run vs the failure image.
3. Confirm no churn/regression on the proven set (owl ~$1, zero churn) — keep-best + read-level intact.
4. `cd packages/pxs-studio && tsc --noEmit`.

## The one-line truth
*The cap was never the binding constraint on the tennis player — the auditor approving its own
failed read test was. Fix both: make the **stop** quality-driven (and the auditor strict enough to
mean it), and the **ceiling** complexity-driven (VISION's estimate). `done = auditor truly satisfied;
max = f(complexity)` — not `done = fixed N`.*
