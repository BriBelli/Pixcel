# Option 1 — Re-power the Eyes-Open Painter to Hero/Bar Quality

> Status: PLAN (awaiting Brian's approval before the executor builds). Nothing is deleted beyond the
> explicit RETIRE list below. Companion: [PIXCEL-ART-ENGINE.md](PIXCEL-ART-ENGINE.md),
> [PIXCEL-CRAFT-RUBRIC.md](PIXCEL-CRAFT-RUBRIC.md).

## Why

The art Brian loves — the **owl** and **dragon** (old Live *cascade*: eyes-open + structured
many-pass) and the **t-rex** (Claude-Code-direct, 9 eyes-open drafts) — all came from a **careful,
many-pass, eyes-open process**. The later "lean" rewrite (commit `c17663a`, "Live Studio is now the
EYES-OPEN painter") subtracted *machinery* but also subtracted the **quality-bearing iteration**,
leaving a fast/cheap engine that stops short of the bar (blobby, incomplete). The Phase-2 A/B + (more
decisively) **Brian's own eye** confirmed it: lean ≠ hero. The reference owl "cannot be beaten" by
any lean output.

**Pixcel = hero/bar quality via the eyes-open process — not a draft tool.** So Option 1 *recovers*
that quality, minus the cascade's genuine waste, and uses the **human as the quality gate** — because
no LLM juror can be trusted (ours wrote confident, false 96/100 verdicts on crude pieces, and even
passed an *incomplete* canvas). Option 1's hero pieces + their eyes-open trajectories + the human's
accept/reject judgments become the **training corpus for Option 3** — a model that internalizes the
perception so the gate eventually becomes automatic. **1 before 3:** Option 1 proves the process and
makes the data; Option 3 automates the perception.

**Hard constraint (the happy medium):** single-digit dollars, **minutes not hours**, no melted Mac.
The cascade hit the bar at ~$80 / 60–240 calls / an hour — infeasible. Pricing is now **3× cheaper**
($5/$25, not the stale $15/$75), and the bar needs *enough* careful passes (≈ the t-rex's 9), **not
240**.

## Keep / Retire / Recover (we delete almost nothing)

- **KEEP (proven wins + knowledge):** the pricing fix; the **full-effort un-throttle**
  (`EFFORT = DRAW_EFFORT`); **true-scale render** (512px); the canon docs; the gallery bars (owl,
  dragon, t-rex); **no-exemplars**; the **persona-cut** decision.
- **RETIRE (proven dead):** the `ARTIST_PERSONA` paragraph (earned nothing); the **auto-juror as a
  trusted gate** (it lies); the `ab-*` dev-scratch files.
- **RECOVER (the one regression):** the cascade's **quality-bearing iteration** — eyes-open,
  coarse→fine, *enough passes to actually finish*. **Drop only the genuine waste**: the separate
  auditor model (double calls), best-of-N, the recall state-machine, the 6 rigid *gated* phases.
  Reference for the depth/structure: the engine in the commit *before* `c17663a`.

## The engine — a few coarse→fine PASSES, each a streamed multi-stroke batch (the perfect medium)

**Key correction (Brian's SSE insight):** per-stroke is **not** a free watchability win — it makes a
*separate API call per stroke* (many calls = expensive + slow). The free watchability comes from
**streaming a generation call to the UI** (SSE), not from per-stroke. So the medium that optimizes
**quality + price + the live show** at once:

- The artist works in a **handful of meaningful passes** (coarse→fine): block the whole silhouette →
  major forms + shadow/highlight → identity details → cleanup. **Each pass = ONE call that emits a
  BATCH of edits** ("multiple gestures"), never one lonely cell and never the whole image blind.
- **Each pass is STREAMED to the UI** so you watch the batch paint in live — the free show, because
  it's streaming one call, not extra calls.
- **Between passes the artist SEES the true-scale render and decides the next batch** — eyes-open at
  the *pass* level (perceive after each batch, not each pixel).
- **~5–10 calls total → single-digit $, minutes, watchable, bar-quality.** Per-stroke was the
  *expensive* way to get the show; streaming-the-passes is the *cheap* way. This is also how the
  t-rex (whole-frame redraws) and the cascade (gestures grouped in phases) actually hit the bar — the
  recovered medium, not a new gamble.

Implement by **evolving the current `lib/live-jobs.ts` painter** (keep full-effort, true-scale,
correct pricing, the SSE show) — batch the strokes into passes, stream each pass, recover the
cascade's coarse→fine *depth* — with three additions:

1. **Don't stop short** (the real fix for blobby/incomplete). The painter works coarse→fine to an
   actual finish before it may propose "done": block the whole silhouette → major forms →
   shadow+highlight → identity details → cleanup. This is its own judgment, **not** rigid gates. It
   may **not** declare done while a stage is visibly missing. Strengthen the existing coarse→fine
   guidance and add an explicit **pre-done self-check at true scale** ("is every stage actually
   present, grounded, and clean — or am I stopping on a blob?").

2. **Human approval gate** (replaces the cascade's unreliable auto-reviewer). When the painter
   believes it's at the bar, it **pauses for human review** — reusing the *existing*
   pause/feedback/resume + SSE infrastructure. The human then **approves** (→ save as a hero piece) or
   **redirects** in plain words ("not there — fix the blob belly / the floating feet / give it
   white-sclera eyes") → it resumes painting. **No auto-juror anywhere in the quality decision.**
   Iterate until the human approves.

3. **Bounded budget** (it can never run to $90 / hours). Hard ceilings: a per-piece **cost cap**
   (default ~$8) and a **stroke/pass cap**, both surfaced live (the cost display now shows true
   dollars). If it hits a cap *without* human approval, it **pauses and reports "below bar — your
   call,"** never silently ships.

Merge-in (already present — keep): full-effort, true-scale 512, no persona, no exemplars, correct
pricing.

## Training-data capture (the bridge to Option 3) — NEW

Every run captures a structured trajectory: the prompt; each stroke (the `paint` edits + the model's
short note/reasoning); the render after each stroke; and **the human's judgments** (approve /
redirect text / final accept-or-reject). Human-approved pieces are tagged **hero**. This
trajectory + label set is the Option-3 corpus — **the human gate's decisions are the supervision
signal** that teaches a future model to perceive and finish like we do. Capture *all* runs (fails are
signal too).

## Verification (human-judged, no juror)

- Run **t-rex** and **owl** (shapes the model knows) **plus one hard subject** — **axolotl**
  (draft-1 usually a generic fish/salamander → stresses redesign), judged at true scale against the
  bars.
- **Success = Brian's eye says it's at the bar**, at **single-digit $ and minutes**, with a watchable
  live show — *not* a juror score.
- Capture every run as training data regardless of outcome.

## Sequencing (staged, reviewable commits — no lean mistake twice)

1. **Retire:** cut `ARTIST_PERSONA` from the prompt; delete the `ab-*` scratch files.
2. **Re-power:** anti-early-stop + coarse→fine-to-finish + the explicit pre-done self-check.
3. **Human gate:** wire approval/redirect onto the existing pause/feedback/resume + the bounded caps.
4. **Capture:** trajectory + human-label recording.
5. **Verify:** human-judged runs (t-rex, owl, axolotl).

Each step is its own reviewed commit. Nothing is deleted beyond step 1.

## Out of scope (now)

- **Option 3** (training the model) — the next milestone, fed by this data.
- Any **auto-juror** as a quality oracle (retired; the human is the gate until Option 3).
- The whole-frame **Quick** route stays as-is (a fast *draft* path); Option 1 is about the **hero**
  Live painter, which is Pixcel's identity.
