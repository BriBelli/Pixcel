# Plan (DEFERRED) — The Evaluator (the real fix)

> **Status: NOT STARTED — captured for later.** The "Tennis Player" failure (figure holding a
> **balloon** instead of a racket — **approved by every phase**) proved this. Re-validate against the
> current engine before building. The complexity-adaptive budget (docs/PLAN-ADAPTIVE-BUDGET.md) is a
> **supporting guard** — *this* is the real fix.

## The diagnosis (why budget tuning is not the fix)
The tennis player did **not** run out of passes. It **converged** — SHAPE ✓ POLISH ✓ QA ✓ — and shipped
a balloon-racket anyway. **The judge said "good" when it wasn't.** That is an **evaluation failure**, not
a scheduling one. No amount of budget/round tuning fixes a broken judge. *(We anticipated needing this —
the "another-LLM-as-the-gate / forum" idea. The tennis player makes it required, not optional.)*

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

## One-line truth
*The tennis player converged on garbage — which means the judge, not the schedule, is what failed. The
real fix is an independent fresh-eyes Evaluator that DEFINES "done" (and can convene a panel). Once it
exists, "how many rounds" stops mattering — the budget is just a seatbelt.*
