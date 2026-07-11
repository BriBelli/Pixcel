# PR-10c — Model-aware scoring

> Part of the [Prompt Builder Studio](./PROMPT-BUILDER-STUDIO.md). Gives the Builder a **brain**: each
> part is rated and the whole prompt gets a **Quality score**, driven by what the *chosen model*
> rewards. (Spec sharpens with reference images as we approach it.)

## Why

The reference shows "Prompt quality 79 · Strong · 5/5 parts" and per-part badges (Subject STRONG,
Action GOOD, Context THIN) with "Each part maps to what Nano Banana Pro rewards." The score is the
feedback loop that turns a form into a *guided* builder — and it must be **model-aware**, not a
generic rubric, because different models reward different things.

## Goal

Per-part `score: 'thin'|'good'|'strong'` + an overall `{score, label}` on the Builder block, computed
**by the Model agent** from the chosen model's strengths/rewards (the registry + capability facts),
rendered as part badges + a quality ring. Scores update as the user shapes parts.

## Steps (outline — refine with images)

1. **Scoring source = the Model agent.** Extend the Model agent to rate a Builder's parts against the
   selected model's reward profile (registry strengths + `capability-lookup`), not a static rubric.
   Tiered: registry facts → skill heuristics → (later) learned signal.
2. **Score on the block.** Populate `part.score` + `overall`; re-score on edit (debounced; cheap path
   — heuristic first, model call only when warranted, metered).
3. **Render**: per-part badges (Strong/Good/Thin) + the overall Quality ring (the "79"). Wire "Open
   Guide to see why" to PR-10d.

## Out of scope

The Guide's prose rationale (10d) — this ships the *scores*; the *why* is 10d. No auto-rewrite.

## Verify

- Parts show model-aware badges; overall ring reflects them; scores change as parts are shaped;
  the model name in "maps to what X rewards" matches the routed model. Spend metered. `tsc` clean.
