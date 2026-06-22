# Plan — The Pixcel Quality Engine (BUILD-READY)

*The complete quality fix: feasible VISION → hot-potato (one capable artist that judges + fixes with
fresh eyes) → best-of-N for hard subjects → forum as the final gate. "The Evaluator" was the entry
point; this is the whole engine. Start at "Build order — START HERE".*

> **Status: NOT STARTED — captured for later.** The "Tennis Player" failure (figure holding a
> **balloon** instead of a racket — **approved by every phase**) proved this. Re-validate against the
> current engine before building. The complexity-adaptive budget (docs/PLAN-ADAPTIVE-BUDGET.md) is a
> **supporting guard** — *this* is the real fix.

## Build order — START HERE (the complete picture)
The fix is **not one component** — it's a system, in leverage order:
1. **EDITOR over evaluator — and let it FIX directly, not just prescribe (the HOT-POTATO).** The
   reviewer is the **same caliber model as the drawer** (both Claude) — so the critic can *paint the
   correction itself*, collapsing the prescribe→execute gap that causes blob evolution. Alternate who
   holds the canvas → **fresh eyes every pass.** *Highest leverage.* See "The hot-potato model" below.
2. **Feasible VISION** — design fit-to-size (rubric #1) + a complexity estimate. If it's not converging
   in a few rounds, **re-VISION simpler — don't grind a blob.** (Budget ceiling = a cost seatbelt →
   docs/PLAN-ADAPTIVE-BUDGET.md.)
3. **Best-of-N drawers** for the complex/advanced tier — fresh attempts escape the local-minimum blob;
   the gate picks the best. (The interesting multi-LLM move: alternate *drawers*, not more reviewers.)
4. **Strict independent EVALUATOR as the gate** (recovered cascade rigor, on the batched-pass cadence) +
   an optional **forum** only on the FINAL gate of hard pieces. This *defines "done."*

**Always keep:** batched passes (**never per-stroke**), read-level/object-identity judging (not
sub-pixel), **keep-best**, and watchability via SSE (stream batched passes — no per-stroke calls).

**Validation — proves the whole theory for ~$2–3:** implement #1 (+#2), then re-run **two** subjects —
the **tennis player** (the racket must read as a racket, or get re-designed) and the **owl** (must still
pass first-try, ~$1, zero churn). Both hold → ship the order above. This is the next real step once the
engine code is free + spend is approved.

## The diagnosis (why budget tuning is not the fix)
The tennis player did **not** run out of passes. It **converged** — SHAPE ✓ POLISH ✓ QA ✓ — and shipped
a balloon-racket anyway. **The judge said "good" when it wasn't.** That is an **evaluation failure**, not
a scheduling one. No amount of budget/round tuning fixes a broken judge. *(We anticipated needing this —
the "another-LLM-as-the-gate / forum" idea. The tennis player makes it required, not optional.)*

## This is a RECOVERY, not an invention (the real history — Brian's correction)
**The strict independent reviewer is PROVEN — it made the cascade DRAGON and OWL.** Rigor was never
the problem; it was the *solution*. The mistake that buried it was **calling the LLM per stroke** — that
gave the ~80-iteration, ~$80 dragon. (It almost certainly came from chasing the live show — "watch
every stroke" → one call per gesture. Documented lesson: **never per-stroke calls.**)

**Granularity and rigor are SEPARABLE** — don't trade one for the other:
| granularity | review rigor | result |
|---|---|---|
| per-**stroke** | strict | perfect art, absurd cost ← the old mistake |
| per-**pass** (batched) | lenient | cheap, ships garbage ← the tennis player, now |
| **per-pass (batched)** | **strict** | **both — the target** |

**The throttle is already done.** The statue **"pass" = many gestures batched into one call** = exactly
the debounce Brian describes. We are NOT calling per-stroke. So the *only* thing that regressed between
the cascade heroes and the tennis player is **review rigor**, not call count.

→ Therefore the Evaluator is **recovering the cascade's strict reviewer and running it on the
batched-pass cadence we already have** (+ one final fresh-eyes gate). **Strict review AND few calls — we
don't choose.** Don't reinvent a system; don't go per-stroke.

**Watchability is decoupled from calls:** the Matrix reveal streams the **batched passes** over SSE
(docs/PIXCEL-LIVE-SSE.md) — you watch it paint stroke-by-stroke *visually* with zero per-stroke LLM
calls. The live-show desire never required per-stroke generation. Don't forget this again.

## But the reviewer isn't the only lever — the DRAWER (Brian's catch)
**A reviewer can only REJECT; it cannot DRAW.** Adding Gemini / an MCP forum makes the *judgment*
better — it makes the *hand* zero better. So a **weak drawer + a great forum = rounds of rejection =
"slow blob evolution" = the 80-round trap.** Brian is right: more reviewers alone can make cost *worse*,
not the art better.

Quality + cost depend on **three levers, not one:**
1. **Feasible VISION (design fit-to-size — rubric #1).** 80 rounds is a *signal the design was
   infeasible* for 32² + this drawer, not a signal to add rounds. A 32px tennis racket may need a
   **simplified, iconic** form the drawer can nail — not a realistic one it can't. Detect
   non-convergence → **re-VISION simpler**, don't grind a blob.
2. **Drawer execution.** Ceiling = model + effort (Opus 4.8 high = the drawer's ceiling; `claude-fable-5`
   to exceed). For hard subjects, **best-of-N FRESH attempts** beat iterating one canvas — fresh draws
   escape the local-minimum blob; the evaluator picks the best.
3. **EDITOR, not just evaluator.** This is the highest-leverage fix for a modest drawer. A pure
   evaluator says *pass/fail* → weak drawer flails → many rounds. An **editor gives the prescription**
   ("draw the racket as an oval frame, string grid inside, 3px handle into the hand, gray not red") →
   the drawer executes a concrete instruction → **converges in FEW rounds.** *(Brian originally said it:
   "the real editor AND evaluator.")*

**So the forum's right place:** the **final gate** (consensus catches what one judge misses) on the
**complex/advanced tier** — NOT gating every pass (that multiplies calls against a weak drawer = the
80 rounds). And the more interesting multi-LLM move is **alternate DRAWERS** (best-of-N across models
for hard subjects), not just more reviewers.

## The hot-potato model (Brian) — the cleanest version of the fix
**Key realization: the "weak drawer" was never inherently weak — it's Claude, the SAME model as the
editor.** So there is no reason to make the critic *only prescribe* and force a separate, lesser hand to
execute. **Let whoever holds the canvas FIX it directly.** Then the roles aren't fixed — they alternate,
hot-potato:

```
A draws a pass ─▶ hand canvas to B
B (fresh eyes, only {brief + render}): is it done?
   ├─ no → B makes the highest-value FIX itself ─▶ hand back to A
   └─ yes → ship
… repeat until the holder (fresh eyes) cannot find a real flaw …
```

Why this is better than "editor prescribes, drawer executes":
- **Collapses the prescribe→execute gap** — the source of blob evolution. The capable hand that *sees*
  the flaw is the one that *fixes* it. No "weak drawer fails to execute the prescription."
- **Forces fresh eyes every pass** — each turn the holder picks up a canvas it did NOT just make, so it
  re-perceives *cold* instead of rationalizing its own work. That's the tennis-player root cause
  (the coupled, self-approving judge) fixed *for free*, structurally.
- **Simplifies the architecture** — not three fixed roles (drawer / editor / evaluator), but **one
  capable artist looping: re-perceive cold → judge → fix → pass.** keep-best + feasible VISION +
  complexity ceiling keep it from churning.

This dissolves the "drawer isn't talented → 80 rounds" worry: the talent was always there (same model);
the failure was role-fixing (drawer never re-judges fresh) + coupling (it rationalized). Hot-potato
removes both. **No second LLM is required** for this — it's one model in two alternating turns. A
forum/Gemini stays optional: only the FINAL gate on hard pieces.

Guardrails (or it churns): each turn sees a **fresh-ish context** ({brief + current render}, not the
full build narrative); **keep-best**; **read-level** judging; bounded by the **complexity ceiling**;
**batched passes** (never per-stroke).

## The loop, concretely (pseudocode for the build thread)
> JS-ish; map onto the current `runStatueEngine` in `lib/live-jobs.ts`. A **"pass" = one batched call**
> (the debounce — NEVER per stroke). Each pass runs on a **fresh context** (only `{brief + render}`) —
> that freshness IS the hot-potato.

```js
const CEILINGS = {            // cost seatbelt, NOT a target (see PLAN-ADAPTIVE-BUDGET.md)
  simple:   { passes: 3 },
  moderate: { passes: 6 },
  complex:  { passes: 9,  forum: true },
  advanced: { passes: 12, forum: true },
}

async function paint(subject, opts) {
  // 1) VISION — commit a FEASIBLE, fit-to-size design + palette + complexity.
  //    (optional attached image = INTENT only; read here, never shown to the fix step — PLAN-IMAGE-INTENT.md)
  const { brief, palette, complexity } = await vision(subject, opts.imageIntent)
  emit('vision.committed', { brief, palette, complexity })
  const cap = CEILINGS[complexity]

  let canvas = blank(32, 32), best = null

  // 2) HOT-POTATO loop — one capable artist, FRESH EYES each pass, FIXES directly.
  for (let pass = 1; pass <= cap.passes; pass++) {
    const render = renderPng(canvas)                 // true-scale perception
    // fresh context: sees ONLY {brief + render}, NOT the build history → it can't rationalize.
    const turn = await freshEyes({ brief, palette, render, prompt: TURN_PROMPT })
    //   → { approved:bool, flaw:string, edits:[{x,y,c}], redesign:bool }

    if (turn.redesign) {                             // design infeasible at 32² → re-VISION simpler
      ({ brief, palette } = await vision(subject, opts.imageIntent, { simplerThan: brief }))
      canvas = blank(32, 32); best = null; continue
    }
    if (turn.approved) { best = clone(canvas); emit('stage.approved'); break }   // converged

    canvas = apply(canvas, turn.edits)               // the batched fix = the pass (the debounce)
    best = best ?? clone(canvas)
    emit('pass.done', { pass, flaw: turn.flaw, frame: canvas })   // SSE streams the batch = watchability
  }

  // 3) FINAL GATE — forum/consensus only on complex/advanced; else the in-loop approval is enough.
  if (cap.forum) { const v = await forumConsensus(brief, best ?? canvas); if (!v.pass) /* one more pass or ship best */ }
  return best ?? canvas    // keep-best: ship last APPROVED state, never a churned pass
}
```
**`TURN_PROMPT`** (one fresh-eyes call that JUDGES, then FIXES — *the editor IS the drawer*):
> "You are a master pixel artist seeing this canvas **COLD**. Brief: `<brief>`. Read the render: does it
> **instantly read as `<subject>`** (child test)? **Name each major element — does each read as the RIGHT
> object?** (a racket must read as a racket, not a balloon). Judge at **READ level, not sub-pixel.** If
> it's there → `approved:true`. Otherwise name the **single highest-value flaw** and **apply the fix
> yourself** as a batch of cell edits (don't reshape what already reads well). If the design simply can't
> work at 32² → `redesign:true`."

**Decisions baked in / to tune:** one call per pass *judges + fixes* (cheap, fresh-eyes from the fresh
context). For the **final gate** on hard pieces, optionally split into judge-then-fix or a forum vote
(stricter, more calls). `REQUIRED_CLEAN` consecutive approvals before ship if you want extra safety.

## Why today's auditor let it through
**It is coupled to the making.** The per-phase auditor watches the piece built pass by pass — it *saw*
"racket strings cross" get painted — so it **rationalizes** ("that's the racket"). Anyone who watches a
thing being made talks themselves into it. That coupling + anchoring = the leniency that rubber-stamped
a piece failing its own stated child/read test.

## What the Evaluator is
An **independent, fresh-eyes quality gate** — a critic that did NOT make the piece, sees the finished
render **cold** (only the brief + the image), and has the authority to **reject and force rework**.
A stranger looking at the tennis player says "person holding a balloon" → REJECT. Fresh eyes don't
rationalize.

Properties:
- **Independent** — fresh context; not the drawer, not the build history. No anchoring.
- **Holistic** — judges the *whole piece*:
  - **Child test:** "does this INSTANTLY read as [subject]?"
  - **Per-element object-identity:** "name each major element — does each read as the *right object*?
    A tennis racket must read as a racket (oval frame + string grid + handle in hand), NOT a
    balloon/lollipop/crosshair." Reject gross identity failures even if the piece is "clean."
- **Authoritative — it DEFINES done.** Pass → ship. Fail → rework with the *specific* flaws it named,
  bounded by the complexity ceiling.
- **Specific** — returns a verdict + concrete flaws that feed the next rework pass (not a vague score).
- **Optionally a panel (the "forum")** — 2–3 independent evaluators / different models vote; ship on
  consensus. Different models catch different failures. Place the forum on **evaluation**, not generation.

## How it changes the loop
- **`done = the evaluator passes`** (or consensus passes) — NOT a fixed counter, NOT the coupled
  per-phase approval.
- The **complexity ceiling becomes a pure cost/runaway seatbelt** (see PLAN-ADAPTIVE-BUDGET.md) — it no
  longer decides quality. This subsumes the whole "how many rounds" debate.
- The inline per-phase auditor can stay as a *cheap progress check* during SHAPE/POLISH; the
  **Evaluator is the gate that says ship or rework.**

## Preserve (do NOT regress M2)
- **Read-level / object-identity judging — not sub-pixel.** The evaluator must catch "it's a balloon,
  not a racket"; it must NOT nitpick a 5px eye to death (that reintroduces churn).
- **keep-best** — ship the last evaluator-approved state, never a churned one.
- **Cost guard** — the panel adds calls; use consensus where it pays, single fresh-eyes evaluator as
  the floor.

## Open decisions (resolve when building)
1. **Same model, fresh context** vs **different model(s)** for independence. (Different model = stronger
   independence + the forum; same model fresh-context = cheaper. Likely: single fresh-eyes Claude as the
   floor, optional multi-model panel for the complex/advanced tier.)
2. **Single evaluator vs N-of-M consensus** — and the threshold.
3. **Final-gate only** vs **also gating each phase lock.** (Leaning: the Evaluator owns the final
   ship/rework decision; phases keep a light progress check.)
4. **Cost/latency budget** for the panel, especially on the complex/advanced tier.

## Verification
1. **Re-run the tennis player** → the evaluator REJECTS the balloon-racket, rework fixes it (racket
   reads as a racket), THEN it ships.
2. **Owl (M2 hero)** → still passes first time, ~$1, zero churn (no new churn from the evaluator).
3. A deliberately bad piece → caught and reworked, not shipped.
4. `cd packages/pxs-studio && tsc --noEmit`.

## Current code + what to touch (re-validate — another thread is editing these)
- **Engine:** `packages/pxs-studio/src/lib/live-jobs.ts` → `runStatueEngine`. Refactor the per-phase
  drawer+audit into the **hot-potato loop** above.
- **Prompts:** `lib/ai-art-system-prompt.ts` (`statueVision*`, `statueDrawer*`, `statueAudit*`) → VISION
  emits a **feasible, fit-to-size** design + `complexity`; replace the audit prompt with the fresh-eyes
  **`TURN_PROMPT`** (judge + fix in one).
- **Budget:** replace the fixed `PHASES[].cap` with `CEILINGS[complexity]` (a seatbelt). See
  `docs/PLAN-ADAPTIVE-BUDGET.md`.
- **Reference (proven — don't break):** `packages/pxs-studio/art-engine/painter.mjs`. SSE contract:
  `docs/PIXCEL-LIVE-SSE.md`. Craft bar: `docs/PIXCEL-CRAFT-RUBRIC.md`. Image-intent (separate feature):
  `docs/PLAN-IMAGE-INTENT.md`.
- ⚠️ **Another thread is actively editing `live-jobs.ts` — pull + re-validate against current code first.**

## Build-thread kickoff (paste this)
```
Build the Pixcel quality engine per docs/PLAN-QUALITY-ENGINE.md. Read first: that doc (esp.
"Build order — START HERE", "The hot-potato model", and the pseudocode), docs/PLAN-ADAPTIVE-BUDGET.md,
docs/PIXCEL-LIVE-SSE.md, docs/PIXCEL-CRAFT-RUBRIC.md, packages/pxs-studio/art-engine/painter.mjs
(the proven reference), and your memory files.

Implement in leverage order, validating after EACH step:
  1. Hot-potato loop — one fresh-eyes call per pass that JUDGES then FIXES directly (the editor IS the
     drawer; fresh context = only {brief + render}). keep-best on approve.
  2. Feasible VISION + a complexity estimate → adaptive CEILING (cost seatbelt, not a target);
     REDESIGN escape when a 32² design is infeasible.
  3. Best-of-N drawers for the complex/advanced tier (alternate attempts, gate picks best).
  4. Forum/Gemini ONLY as the final gate on hard pieces.

PRESERVE (do not regress M2): batched passes (NEVER per-stroke), read-level / object-identity judging
(not sub-pixel), keep-best, NO exemplars to the generator (an image is intent/convert only).

VALIDATE for ~$2-3: re-run "tennis player" (the racket must read as a racket, or trigger REDESIGN)
and "owl" (must still pass first-try, ~$1, zero churn).

Another thread is editing lib/live-jobs.ts — pull + re-validate before starting. Flag every
API-spend step before running it.
```

## One-line truth
*The tennis player converged on garbage — which means the judge, not the schedule, is what failed. The
real fix is an independent fresh-eyes Evaluator that DEFINES "done" (and can convene a panel). Once it
exists, "how many rounds" stops mattering — the budget is just a seatbelt.*
