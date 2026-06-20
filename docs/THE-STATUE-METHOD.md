# The Statue Method — Pixcel's Autonomous Build Pattern (GOSPEL)

> **Milestone 1 — PROVEN (2026-06-19):** autonomous full perched owl, 6 passes, **$0.69**, no human;
> the recovered judge rejected its own bust and drove the fix. **This pattern is the foundation; it
> does not change.** We move at the pace the cement dries — forward only, never back to this layer.

## The meta-pattern (it generalizes beyond pixel art)

This is not just an artisan agent — it's **an autonomous problem-solving agent pattern**: one that
*"can do anything, given the expense of time and money."* A **DRAWER** that shapes + a **JUDGE** that
reviews, locks, and QAs — iterating coarse→fine like a sculptor working a block of stone. Applied
here to a single pixel-art image; the pattern is general (real-time graphics, low-poly, audio,
interactive — later).

## The phases (sculpting the statue)

1. **SHAPE** — rough out the whole block: silhouette, masses, form (base/shadow/highlight). Step
   back, refine, repeat until the BASIC SHAPE reads. **Defer the fine DETAILS** — do *not* detail the
   eye while the head is still being shaped. *(← Milestone 1 lands here.)*
2. **LOCK + PROGRESS** — isolate the approved shapes, **lock them down**, progressively shape the
   whole block, refine. Approved shapes are not re-shaped.
3. **ELEMENT REFINE** — the isolated, identity-defining elements refined more and more.
4. **POLISH = COMPLETE the intended look** (NOT merely "shine"/icing; "micro-detail" / "refinement"
   also fit). **It is strictly ON TOP of the locked shape — additive, NOT a re-evaluation of the
   form.** You LOVE the shape now; you do *not* second-guess the silhouette — you **"look INWARD"** and
   add the deliberately-deferred fine **DETAILS**: the eyes done properly, hair / feathers / clothing /
   texture, every identity-completing touch you do *not* do while the masses are being shaped.
   **NO reshaping the locked masses; the auditor ACCEPTS the shape and judges only the interior detail
   work added on top** (this is what kills the oscillation). After *every* detail-touch, run a **LOCAL
   steamroller on that exact spot** (re-look, fix that location) before moving on. The form is done;
   this is the satisfying part — you complete and finesse the details.
5. **QA — the steamroller** — final meticulous inspection, **top-to-bottom, left-to-right**, like
   inspecting a finished car. Catch every miss → fix by **MICRO refinement/polish only (NO
   reshaping).** A QA finding may trigger a small **recall** (touch-up / patch / adjustment) →
   another POLISH → another QA. **Cycle(s)** until a clean QA pass.

## The 96% gate (no spin, no churn, no hallucination)

- **96% is the GATE** — the approval bar; at/above it the piece is shippable.
- **Then** optionally push toward 100% in a *bounded* number of attempts — but **keep a result only
  if it is genuinely BETTER than the 96% gate** (keep-best). Never ship a regression; never chase
  percentage in a way that causes wasteful churn or hallucination. *"Better than perfect makes it
  worse."*
- This precision requires the reviewer to give **granular MICRO feedback** in the polish/QA phases.

## The Pixcel brand standard

**EVERY Pixcel image — even a 16² / intended-low-res piece — gets the final Pixcel POLISH + QA
round.** That closing polish + QA *is* the brand. No exceptions.

## Milestone 1 (DONE) vs the gap → Milestone 2

- **DONE (M1):** the SHAPE engine — fast multi-pass drawer + the recovered art-director auditor →
  an approved basic shape, autonomously, cheaply. (`packages/pxs-studio/painter-harness.mjs`)
- **THE GAP (Brian's diagnosis):** the current engine does SHAPE passes then **STOPS** — it is
  **missing the explicit POLISH and QA phases** the original owl/dragon cascade had. Without those
  phases the LLM has no guided context / awareness / instruction / opportunity to polish, refine, or
  QA. **We must PROGRAM the phases — the LLM will not do them spontaneously.**
- **MILESTONE 2:** recover the explicit **POLISH + QA steamroller phases/cycles** (and the
  lock-approved-shapes progression) on top of the proven shape engine — headless first.

## Roadmap (captured, NOT built yet)

- **Controlled passes (human-in-loop option):** user sets an iteration/price/token threshold; a
  "pass / upgrade / upscale" button + an optional feedback text field — the user as a more-involved
  artist.
- **Tiers/markets:** real-time low-res (gaming/VR/low-poly — speed) vs high-fidelity (a loading
  process); high-end collectibles (D&D/Pokémon/cards/coins), pay-for-quality gaming, IAP; a niche
  ultra-high-res "garage queen" (the $hundreds–thousands dragon).
- **THE LIVE SHOW — the gold:** Matrix-style — show the char-map generating **left-to-right from
  ground zero** in real time, evolving into the final art. An epic display. Future iteration.
