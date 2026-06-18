---
name: agentic-artisan
description: >-
  Apply when designing, building, debugging, or reviewing ANY AI/agentic pipeline or
  workflow — especially one that is producing low-quality output, failing to converge, or
  built as a brittle decision-tree/multi-phase pipeline. Encodes a proven thesis for getting
  craft-quality results from agentic systems and for porting brittle pipelines to autonomous
  agent workflows. Portable across projects.
---

# The Agentic Artisan

A proven method for getting craft-quality output from agentic systems. It succeeded on the
first serious attempt where months of multi-agent attempts (same model) failed elsewhere. The
difference was **method, not model** — so when a system underperforms, apply this *before*
reaching for a bigger model.

Full reasoning and evidence: see `docs/AGENTIC-ARTISAN-THESIS.md` (copy it alongside this
skill). This file is the actionable checklist.

## Core thesis

> An AI produces craft-quality work when it works like a human artisan: reason at full depth,
> produce at true fidelity, **perceive its own output**, judge it honestly, fix what it sees,
> and keep the best — with all speed/scale machinery built **around** that loop, never inside
> it.

## The atomic unit: the artisan loop

Build each quality-bearing step as an autonomous loop that owns an outcome:

```
reason (max effort) → produce (true fidelity) → RENDER to a perceivable form
→ perceive & judge with the right senses → fix what was seen → keep the BEST
↑________________________ repeat until it meets the bar ________________________↑
```

**This is iterative — never one-shot.** The thesis explicitly rejects one-shot generation in
favor of coarse-to-fine convergence over many small steps. If you ever find yourself proposing
"just do it in a single pass," you have left the method.

**The true form is OBSERVE-AS-YOU-PAINT (the unlock).** "RENDER → perceive" above is the
*minimum*. Rendering the **finished draft** back and reviewing it is only *intermittent* sight:
draw-blind → review-sighted → redraw-blind. A human paints with eyes open on **every stroke**.
The real form — and the real quality unlock, especially at higher fidelity — is a **persistent
canvas re-rendered after each stroke**, so the artist *never composes blind*. Review-the-draft is
better than blind, but it is **not** eyes-open. Build toward eyes-open; do not settle at review.

## Apply these by default (and ask before deviating)

1. **Name the real problem.** Reasoning task vs generation task vs retrieval task — solving
   the wrong kind is the #1 root cause. State it explicitly.
2. **Take the blindfold off — and keep it off.** The agent must judge its output by
   **perceiving it in the modality a human would** (render → feed back as an image/artifact),
   not by reading its own intermediate representation. The biggest single lever — and its
   strongest form is **observe-as-you-paint**: perceive after *every stroke* on a persistent
   re-rendered canvas, not just review a finished draft. Reviewing the whole draft is *better
   than blind* but is **not** eyes-open; push to per-stroke perception, don't stop at review.
3. **Max reasoning. Never throttle effort for speed.** Reasoning is the craft, not overhead.
4. **Subtract machinery — but know the soul from the scaffolding.** *Machinery* (default to
   removing): best-of-N, separate auditor/judge models, multi-phase gated cascades, recall
   state-machines, upscaling, anchors, templated examples, decision trees. The **SOUL is NOT
   machinery**: the eyes-open painter — reason → produce → perceive-its-own-render → fix → repeat
   — is the quality mechanism itself. Never delete the painter and call it "simplification."
   Subtract the scaffolding *around* the painter; keep (and strengthen) the painter.
5. **No exemplars/templates to imitate.** They make the model copy (derivative). Constrain
   with principles + a rubric so it can *invent*.
6. **Keep-best, never regress.** Keep every valid candidate; ship the best, never blindly the
   latest. A bad iteration must never become the output.
7. **Work at true fidelity, not a downscaled proxy.**
8. **Freeze the working core; orchestrate around it.** Speed/scale/persistence come from
   *outside* the loop (async, parallelism, queues, MCP) — never by editing how it reasons.
9. **Strip redundant representations.** Use the format the model already thinks in; drop
   boilerplate and empty space. Compact, lossless interfaces between agents.
10. **Verify against ground truth.** Define a concrete external test and actually run it;
    perceive the artifact yourself. Never trust self-report.
11. **Latency is a UX problem.** Keep quality maxed; solve waiting with async + visible
    progress, not by dumbing down the model.
12. **Honesty over hype.** Concede failures, surface bugs, A/B-test beliefs instead of
    asserting them, take the human's instincts seriously.

## Porting a brittle pipeline → autonomous agents

1. Find the one **quality-bearing step**; the rest is plumbing.
2. Rebuild it as an **artisan loop** (above). Delete blind critique, templated examples,
   downscaled proxies, throttled reasoning.
3. Replace **hardcoded decision-tree branches** with an agent that *reasons* about what to do.
   Keep deterministic code only where determinism is required (validation, I/O, safety, money).
4. Make each unit an **autonomous job** that owns its outcome and self-verifies; interconnect
   with compact lossless interfaces.
5. **Orchestrate around** the immutable cores (async/parallel/persisted; MCP optional).
6. Re-run the **ground-truth A/B** before keeping any new component.

## Red flags that you're regressing toward the failure mode

- **Proposing "one-shot" / "just one pass."** The method is iterative convergence; one-shot is
  a different (rejected) approach.
- **Deleting the eyes-open painter and calling it "machinery"/"simplification."** That is the
  soul, not scaffolding. (Subtract the auditor/phases/recall/best-of-N around it instead.)
- **Calling whole-draft review "eyes open."** Review-the-finished-draft is intermittent sight,
  not observe-as-you-paint. Don't overclaim it.
- Replacing observe-as-you-paint with a synthetic, after-the-fact animation and calling it the
  live/perception loop — the perception must be *real* (the model actually sees each step).
- A critique/judge step that never *sees* the rendered output.
- Effort/thinking turned down to hit a latency number.
- New "helper" stages added because output is weak (add reasoning + perception instead).
- Reference outputs fed in as examples to match.
- Shipping the last iteration without comparing to earlier ones.
- Claiming success from logs/self-report without perceiving the artifact against a real test.
