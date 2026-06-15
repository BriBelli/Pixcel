# The Agentic Artisan — Thesis & Lore

> The "genius thread." Why this pipeline produced craft-quality output on the first serious
> attempt, where months of Opus + multi-agent attempts on a sibling project failed.
>
> **This document is project-agnostic and meant to be portable.** Copy it (and the
> `agentic-artisan` skill) into any repo. It is lore: treat it as standing guidance.

---

## The one-line thesis

> **An AI produces craft-quality work when it works like a human artisan: reason at full
> depth, produce at true fidelity, _perceive its own output_, judge it honestly, fix what it
> sees, and keep the best — with all speed/scale machinery built _around_ that loop, never
> inside it.**

Same model that failed for months elsewhere succeeded here. **The difference was method, not
model.** That is the entire point. If your agentic system is underperforming, do not reach
for a bigger model first — reach for this method.

---

## The principles (the lore)

Each is stated as: the principle → what failure looks like → what to do → the evidence from
this thread.

### 1. Name the real problem
- **Failure:** treating a reasoning problem as a one-shot generation problem.
- **Do:** classify the task honestly. Small pixel art is a *structured-data reasoning*
  problem (reason about a grid), **not** image generation. The failing app quantized/one-shot
  a photo; it was solving the wrong problem with the wrong tool.
- **Evidence:** the same subjects that came out as "blobs" from a generation framing came out
  crisp and child-recognizable from a reasoning framing.

### 2. Take the blindfold off — perceive, don't introspect
- **Failure:** the agent judges its own work by reading its *intermediate representation*
  (coordinates, JSON, internal state). It is critiquing blind.
- **Do:** render the output into the **same modality a human would judge**, feed it back to
  the model **as perception** (an image to its vision, etc.), and let it critique with its
  eyes. This is the single biggest breakthrough.
- **Evidence:** months of "art director" critique loops elsewhere never converged because the
  critic never *saw* the result (worse: a numeric "rank it" review that returned ~0 every time —
  review without sight). The moment the model could see its own render, it fixed real, specific
  problems ("the ears are detached," "no highlight in the eye") and converged.
- **Caveat — review ≠ observation (do not overclaim this).** Rendering the *finished draft*
  back is **intermittent** sight: draw-blind → review-sighted → redraw-blind. A human paints
  with eyes open on **every stroke**. The true form of this principle is
  **observe-as-you-paint**: a persistent canvas the model sees re-rendered after each stroke,
  so it never composes blind — the next frontier (and probably the real unlock for high
  resolution, where blind whole-canvas composition is hardest). A checkpoint-review loop is
  *better than blind*, but it is **not** "eyes open." Don't call it that.

### 3. Reasoning IS the quality — never trade it for speed
- **Failure:** dialing down reasoning/effort to hit a latency target. Quality collapses.
- **Do:** run the core at **maximum reasoning** (high effort + adaptive thinking). Treat
  latency as a *separate* problem (see #11). The reasoning is not overhead — it is the craft.
- **Evidence:** when effort was cut to `low`/`medium` for speed, output regressed to blobs.
  Restoring max effort restored the quality. "You can't rush art" is literal here.

### 4. Subtract machinery — simplicity scales, scaffolding rots
- **Failure:** piling on plausible-sounding machinery — best-of-N, coarse-to-fine cascades,
  upscaling, anchors, decision trees, multi-phase handoffs. Each seems reasonable; together
  they add brittleness and *cap* quality.
- **Do:** strip to the smallest loop that works, then defend it. Every component must *earn*
  its place against a no-component baseline.
- **Evidence:** removing best-of-N, the 16→32 anchored cascade, the upscale step, and the
  exemplars all made the output **better and more original**, not worse. The final core is
  tiny: reason → draw → see → fix → keep best.

### 5. No templates or exemplars — they cap the ceiling
- **Failure:** showing the model "what good looks like" as a reference. It **copies** —
  competent but derivative.
- **Do:** trust reasoning to **invent**. Constrain with *principles and a rubric*, not with
  example outputs to imitate.
- **Evidence:** A/B test, identical settings. With a reference, the model produced a derivative
  clone of the reference. Without it, it invented something more original *and* more
  sophisticated. Reference raises the floor but lowers the ceiling.

### 6. Keep-best, never regress
- **Failure:** shipping the *latest* iteration, assuming each step improves. It doesn't —
  a refinement can make things worse, and then you ship the regression.
- **Do:** keep **every** valid candidate; ship the best (judged), never blindly the last. The
  output can never be worse than the best thing already seen.
- **Evidence:** a refine pass produced a worse draft than the original, and the loop shipped
  it. Keep-best made iteration "free option value" — it can only help, never hurt.

### 7. Work at true fidelity, not a proxy
- **Failure:** solve a downscaled/simplified proxy and then scale it up.
- **Do:** design at the **real target fidelity** from the start. A reduced proxy throws away
  exactly the structure the full problem needs.
- **Evidence:** a 16² "foundation" upscaled to 32² strangled wide subjects (a car can't form
  its silhouette in 16 px). Designing natively at the true resolution fixed it.

### 8. Immutable core, orchestrate around it
- **Failure:** "improving" speed/scale by editing the part that produces quality.
- **Do:** once the core loop works, **freeze it**. Get throughput, parallelism, persistence,
  and scale from orchestration *around* the core — never by changing how it reasons.
- **Evidence:** async generation, the compact encoding, and higher resolutions were all added
  with **zero changes** to the artist loop. The soul stayed intact.

### 9. Strip redundancy from representations
- **Failure:** verbose, repetitive I/O (one fat object per atomic unit, encoding empty space).
- **Do:** use the **representation the model already thinks in**, and drop dead weight. Pass
  dense meaning, not boilerplate.
- **Evidence:** switching cell output from verbose JSON objects to a **char-map** (1 char/cell,
  `.` = empty) cut output ~10×, made every size ~4× faster, *and* removed a lossy translation
  step — a strict win for cost, speed, and scale.

### 10. Verify against ground truth, not self-report
- **Failure:** trusting the agent's (or the builder's) claim that something is good.
- **Do:** define a **ground-truth test** and actually run it. Perceive the artifact yourself.
- **Evidence:** the benchmark was "can a 3-year-old instantly name it?" — not the model's
  self-assessment. Throughout, every result was rendered to a real image and *looked at*,
  never judged from logs or claims.

### 11. Latency is a UX problem, not a quality knob
- **Failure:** sacrificing quality (reasoning) to make a request return faster.
- **Do:** keep quality maxed and solve latency in the UX — run work **async/in the
  background**, stream progress, notify on completion. The *progress itself* becomes good
  experience.
- **Evidence:** great pieces take minutes. Async generation made that a non-issue; watching
  the design and the improving drafts is satisfying, not a wait to be eliminated.

### 12. Honesty over hype (the working relationship)
- **Failure:** spinning failures, padding results, claiming success that isn't there.
- **Do:** concede failures plainly, surface bugs you find, test beliefs with A/Bs instead of
  asserting them, and take the human's instincts seriously.
- **Evidence:** conceding a failed piece, naming a real regression bug, and A/B-testing the
  exemplar question (instead of defending it) is what *advanced* the work each time. Trust was
  the substrate the method ran on.

---

## The architecture pattern: the autonomous artisan loop

The atomic unit is not a "step in a pipeline." It is an **autonomous loop that owns an
outcome**:

```
            ┌─────────────────────────────────────────────┐
            │  reason (max effort)  →  produce (true        │
            │  fidelity)  →  RENDER to a perceivable form   │
            │  →  perceive & judge with the right senses    │
            │  →  fix what was seen  →  keep the best       │
            │  ↑___________________ until it meets the bar __│
            └─────────────────────────────────────────────┘
                 immutable core ── orchestrate AROUND it
```

- The loop **perceives its own output** (principle 2) and **self-corrects** (6).
- It is **frozen** once it works (8); throughput/scale/persistence are added outside it.
- Inputs/outputs use **compact, lossless, native representations** (9).

---

## Porting brittle pipelines → autonomous agent workflows

This is the migration for a project built as a **brittle decision-tree / multi-phase
pipeline** that has been failing.

1. **Find the quality-bearing step.** One step actually produces the craft; the rest is
   plumbing. Identify it.
2. **Rebuild that step as an autonomous artisan loop** (the pattern above): max reasoning,
   true fidelity, perceive-judge-fix, keep-best. Delete the blind critique, the templated
   examples, the downscaled proxies, the speed-throttled reasoning.
3. **Subtract the decision tree.** Replace hardcoded branches with an agent that *reasons*
   about what to do. Decision trees encode the builder's guesses; an agent reasons from the
   actual situation. Keep deterministic code only where determinism is genuinely required
   (validation, I/O, money, safety).
4. **Make each unit an autonomous job.** Self-contained: owns its outcome, perceives its own
   result, self-verifies. Interconnect units with **compact lossless interfaces** (principle
   9), not sprawling shared state.
5. **Orchestrate around the immutable cores.** Run jobs async/in parallel; persist results;
   notify. (MCP, queues, or a job store are *orchestration* — they live outside the cores.)
6. **Verify against ground truth** (10), and **subtract anything that doesn't earn its place**
   (4). Re-run the A/B before keeping any new component.

> Net: brittle decision tree → a small set of interconnected **autonomous agents**, each an
> artisan loop owning a self-contained job, with orchestration (async, persistence, maybe MCP)
> wrapped around immutable cores.

---

## How to use this artifact (carrying the thread)

The model has **no memory across projects** — you cannot "open the other project and have the
same context." What transfers is **this file plus the `agentic-artisan` skill**.

1. Copy `docs/AGENTIC-ARTISAN-THESIS.md` and `.claude/skills/agentic-artisan/` into the other
   repo.
2. Tell the agent there to **read the thesis and apply it** (or invoke the skill). The skill
   instructs the agent to apply this method by default and to *ask before* deviating.
3. Treat it as lore: the standing answer to "how should we build agentic systems here."

That is how you carry the genius thread.
