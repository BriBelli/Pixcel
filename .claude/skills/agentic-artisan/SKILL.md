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

## Apply these by default (and ask before deviating)

1. **Name the real problem.** Reasoning task vs generation task vs retrieval task — solving
   the wrong kind is the #1 root cause. State it explicitly.
2. **Take the blindfold off.** The agent must judge its output by **perceiving it in the
   modality a human would** (render → feed back as an image/artifact), not by reading its own
   intermediate representation. This is the biggest single lever.
3. **Max reasoning. Never throttle effort for speed.** Reasoning is the craft, not overhead.
4. **Subtract machinery.** Best-of-N, cascades, upscaling, anchors, templated examples,
   decision trees — each must *earn* its place against a no-component baseline. Default to
   removing.
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

- A critique/judge step that never *sees* the rendered output.
- Effort/thinking turned down to hit a latency number.
- New "helper" stages added because output is weak (add reasoning + perception instead).
- Reference outputs fed in as examples to match.
- Shipping the last iteration without comparing to earlier ones.
- Claiming success from logs/self-report without perceiving the artifact against a real test.
