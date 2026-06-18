# The Pixcel Art Engine

> The single source of truth for **how the engine makes art and why**. Companion lore:
> [AGENTIC-ARTISAN-THESIS.md](AGENTIC-ARTISAN-THESIS.md) (portable, project-agnostic) and the
> standard each piece is judged against: [PIXCEL-CRAFT-RUBRIC.md](PIXCEL-CRAFT-RUBRIC.md).

---

## TL;DR

Images are **data**, not files — and art is made by an **artisan loop**, not a pipeline:

```
reason at full effort → draw the WHOLE piece at the true resolution → render
→ perceive it at TRUE display scale → critique it brutally → fix or REDESIGN
→ keep the best → repeat until it clears the bar
```

No templates, no exemplars, no upscaling cascade, no brittle multi-phase machinery. Quality comes
from **reasoning depth + perceiving your own output + enough honest passes** — and from one
discipline: the **96% bar** that says when to stop. That is the whole engine.

---

## The three generations (what we learned)

The arc across three real attempts converges on one conclusion: **the cost was machinery, not
craft.**

- **The dragon cascade (~$70 / 60+ calls).** Brute-forced quality through dozens of per-gesture
  calls, an independent auditor, recall, gated phases. It *did* eventually reach the bar — by
  spending. The expense was the **machinery**, not the quality itself.
- **The owl workflow.** A slower sculptor cascade (6 gated phases shape→qa, independent reviewer).
  Good output, but the **scaffolding was doing the work** — the structure, not the artist, carried
  it.
- **The cheap sub-bar loop.** Stripped the passes and the "passion" to make it fast and cheap. The
  *throttled* (medium-effort) run gave a **$4 t-rex with a garbled mouth** and a stray belly pixel;
  un-throttling to full effort made it **~$1.50 and cleaner** — but still **below the bar** on space
  and silhouette, precisely *because* the passes and rigor were still removed. (Two different runs,
  one lesson: effort fixes perception, but only enough passes + rigor reach the bar.)

**Conclusion:** quality and cost are **not** in tension here. Full effort *converges faster* (the
effort un-throttle dropped a run from $20+ to ~$1.50). The dragon was expensive because of dozens
of calls of machinery — not because the bar is inherently expensive. Add the passes and the rigor
back to the cheap loop and you get the bar for a little more, not for $70.

---

## The two engines, sequenced

There is a real tension — whole-frame review vs per-stroke painting — and the honest answer is
**two loops, one method. Choose by job, not religion.**

- **Whole-frame REDRAW loop** ([`artisan-loop.ts`](../packages/pxs-studio/src/lib/artisan-loop.ts)) —
  draw the whole piece → look at true scale → **redraw the whole thing** if the silhouette is
  wrong → keep best. This is **silhouette + fit-to-size + scrap-and-redesign**, and it is what hit
  the T-rex bar (bird → croc → big-headed full figure across 9 drafts). Its superpower is
  *escaping a wrong silhouette* — something a per-stroke painter structurally resists, because it
  locks into an early shape and nudges it forever.
- **Per-stroke eyes-open loop** ([`live-jobs.ts`](../packages/pxs-studio/src/lib/live-jobs.ts)) —
  a persistent erasable canvas re-rendered after **every stroke**, fed back to the one artist as an
  image, so it never composes blind. This is **polish + the live show + human-in-the-loop
  passion** — the watchable, real-time painting that is a core product value.

> **REDRAW ≠ best-of-N.** Whole-frame *redraw* (iterative, look each pass, willing to fully
> redesign, keep-best) is a **quality mechanism**. Best-of-N (N parallel drafts judged by a
> separate model) is **machinery** — the drafts come out near-identical and the judge picks among
> clones. Don't conflate them.

**Recommended product flow:** whole-frame REDRAW until the silhouette passes the squint test, then
*optional* per-stroke polish for the finish (and the show). Which loop is the right default for the
in-app engine is the one open question — settled by the A/B in *Status & roadmap* below, not by
preference.

---

## The Artist Persona / the 96% bar (the artist's discipline)

This is the user's own art science. The critical design requirement: these forces are ONE balanced
system that **works together** — not a list of independent rules. Each exists to check another;
remove one and the loop destabilizes.

- **Confident master (the engine).** Persona: an elite, near-visionary professional digital artist.
  Motto, never failed: *"I can create anything — the only variables are time and money."* The
  confidence is **capacity, not a self-score**: *reliably reaches the bar because it iterates with
  taste* — NOT "lands 96–100% on every piece" (a self-rating feeds the leniency bias *"I'm a 96%
  artist, so this is probably fine"* → early DONE). Confidence lives in the artist's **ability** ("I
  can fix anything I see"), **never** in blind approval of the current draft. The exit stays
  anchored to the bar, never to the self-image.
- **Brutal self-critique (the high bar).** Critique your own work mercilessly, as a stranger seeing
  it cold. Rigor is a **STANDARD, not a quota:** *try* to surface ≥3 things under 96% (the more
  honest holes the better) — but finding none on a genuine miracle draft-1 is allowed and is
  *good* (the luck/magic that makes art real). **Never invent flaws to keep editing.**
- **The right to keep an intentional choice (light permission, NOT a debate protocol).** Mostly
  already covered by the bar rule (fix what drops below 96%, leave imperfections above it). So it
  is a **single-line permission:** *you may judge a flagged item as a deliberate choice and keep it
  — the render at true scale decides.* It is **not** a formal rebuttal+follow-up exchange (that
  adds turns and risks a mini debate-loop). **Honesty:** a single model arguing with itself is
  exactly where rationalization lives — this is *permission to not over-correct*, it provides ZERO
  independent verification and is **not** "fresh-eyes critique." The real anti-rationalization
  safety is the **ground-truth anchor** (compare to the bar / reference pieces at true scale), not
  the self-debate.
- **The 96% bar (the line both voices agree on = the STOP CONDITION).** The single number that
  resolves the tension: it kills early-DONE (too low) AND kills chasing 100% (too high). *"If you
  try to make something better than perfect, you only make it worse."* At/above 96%, ship with
  confidence. 100% is welcome when it happens; the goal is **reliably landing ≥96%**, not
  perfection.
- **Top-3-of-5 / fit the medium (bounded confidence).** There are ~5 ways to build anything; aim
  for the top 3. The theoretical #1 usually costs the $70-dragon in time and money. The artist's
  intelligence is choosing the approach/medium that reliably clears the bar **within budget** —
  which is why the motto is bounded by "time and money," and ties straight to the master skill:
  **fit the design to the size.**

**How they interlock (the balance):** brutal critique pushes the bar **up**; confidence + the 96%
stop + keep-best let it **land and ship** without churn; the keep-an-intentional-choice permission
prevents **over-correcting** away the good parts; top-3-of-5 keeps it **affordable**. Confidence is
the counterweight that lets the brutal critic **stop AT the bar** instead of churning charm-lessly
forever.

**Implementation note (proven levers vs voice).** TRUST as proven (don't re-litigate): full effort,
true-scale perception, the anchored 96% bar, redesign-permission, enough passes, no exemplars.

> **A/B RESULT (2026-06-18) — the persona VOICE was retired.** The persona-isolation A/B (whole-frame
> arm WITH the persona paragraph vs WITHOUT it, t-rex + owl @ N=3, independent juror) found
> persona-**OFF** *beat* persona-**ON**: 6/6 vs 5/6 hit-rate, owl 3/3 vs 2/3, and cheaper per piece.
> The voice carried the burden of proof and earned nothing, so it is **no longer composed into the
> system prompt** (`ARTIST_PERSONA` is kept defined but unused — see `ai-art-system-prompt.ts`). The
> on-thesis win belongs to the **proven levers**, not the decoration. Caveat: both subjects are
> silhouettes the model already knows, so this under-tests *redesign escaping a wrong shape* — the
> finding is being re-checked at **N=5 on a hard subject** (one the model gets wrong on draft 1)
> before it's universal. The 96% bar / redesign / keep-best levers the persona used to bundle live on
> in METHOD + the turn prompts, untouched.

And **distill, don't paste:** this doc is the canon for *humans*; the system prompt must be a **tight
distilled set of levers + a pointer to the rubric**, never a verbatim dump of these directives
(stacking the full, partly-tensioned canon dilutes the proven levers and balloons per-turn cost —
the exact thing the method kills).

---

## Encoded passion

"Passion" is not a vibe — it decomposes into specific, encodable behaviors:

- **A high bar, stated as identity:** *"proud to sign it,"* not *"recognizable."*
- **Brutal critic framing:** judge the render as a stranger / another artist would, cold.
- **Permission to redesign the whole silhouette** — not just nudge cells, but scrap and re-fit.
- **Enough passes:** 5–9 full whole-frame passes, not 2–3. The redesign needs room to happen.
- **Perceive at TRUE display scale** — judge the piece the way it will actually be seen, never a
  flattering thumbnail.
- **Feedback is a floor, not a ceiling.** When corrected — by the rubric or by a human
  mid-creation — raise the **whole** piece and keep pushing **past** the noted flaw and **past**
  first-approval. Never a minimal patch. This is the specific "artist" behavior worth encoding:
  Claude Code took hard feedback and kept redesigning *unprompted* until the piece was genuinely
  better. That drive is the thing being captured.

> **Bounded by the bar:** "keep pushing" means past *first-approval toward the bar* — not past the
> bar toward an unaffordable 100%. The 96% bar is still the stop condition.

---

## The craft rubric

Full standard: [PIXCEL-CRAFT-RUBRIC.md](PIXCEL-CRAFT-RUBRIC.md). The headlines:

- **The most critical decision — fit the design to the size.** Made *before a single pixel*.
  Complexity is a budget set by the **grid size**, not the resolution. 16² → bold iconic crop;
  32² → full figure with form; 48²+ → finer detail or a small scene. Get the fit right and the
  rest follows; get it wrong and no polishing saves it.
- **Use the whole canvas, deliberately** — fill the frame, center/balance, but **fill ≠ distort**
  (reach the edges by framing/scale, never by warping proportions).
- **Readability (the squint test)** — silhouette-first; exaggerate the identity feature; a
  deliberate limited palette (base + one shadow + one highlight); form via solid-color shading;
  clean (no jaggies, no stray cells).
- **Forbidden (Stay Pure):** no anti-aliasing, no dithering, no hue-shift gradients — one solid
  color per cell, full opacity (it must be valid for hardware targets like LED displays). **And no
  exemplar sprites:** examples anchor the model and collapse diversity. Reason from principles and
  *invent*.

---

## Cost model

Honest, stated plainly — bar-quality costs **more than the current cheap-but-sub-bar loop** (more
passes = more tokens), but **far less than the dead $70 cascade**:

| Size | Target $/generation | Why |
|---|---|---|
| 16² | ~$0.5–2 | fewer cells, fewer passes |
| 32² | ~$1–5 | the workhorse size (t-rex / owl bar) |
| 48² | ~$3–8 | more cells, harder fit |

The ~$1.50 number from the cheap loop is a **sub-bar floor, not the bar price** — it was cheap
*because passes and passion were stripped*. Whole-frame + high effort converges **cheaper than
shallow flailing**: shallow strokes flail → more strokes → more re-sent history → more cost *and*
worse output. Full effort buys fewer, more decisive passes.

---

## Code map

| Piece | Where | Role |
|---|---|---|
| Artisan loop (whole-frame) | [`lib/artisan-loop.ts`](../packages/pxs-studio/src/lib/artisan-loop.ts) | the immutable core: reason → draw → render → perceive → fix → keep-best |
| System prompts | [`lib/ai-art-system-prompt.ts`](../packages/pxs-studio/src/lib/ai-art-system-prompt.ts) | the shared METHOD block (persona + rubric, distilled) |
| Quick / SSE route | [`app/api/generate-art/route.ts`](../packages/pxs-studio/src/app/api/generate-art/route.ts) | whole-frame generation; `DRAW_DRAFTS_SMALL`/`_LARGE` draft counts |
| Live / detached jobs | [`lib/live-jobs.ts`](../packages/pxs-studio/src/lib/live-jobs.ts) | per-stroke eyes-open painter + the live show |
| Perception | [`lib/render-frame.ts`](../packages/pxs-studio/src/lib/render-frame.ts) | renders a frame to a faithful large image (512px on the long edge) the model perceives |
| The bars (gallery) | [`data/gallery/`](../packages/pxs-studio/src/data/gallery/) | `trex-claudecode-32`, `owl-live-32`, `dragon-live-48b` |

**The bars to judge against** (rendered at true scale): the **T-rex** (32² — big-headed full
figure, teeth, eye highlight, clean two-leg silhouette; the hand-authored Claude-Code bar, 9
drafts), the **owl** (32² — front-facing, big highlighted eyes, beak, branch perch, dappled
belly), and the **dragon** (48² — side profile, spread wings, long tail). These are the quality
target the in-app engine must reliably match, no references.

---

## Status & roadmap

**Proven (don't re-litigate):**

- Full effort (high + adaptive thinking) is the quality lever; throttling it regresses to blobs
  *and* costs more.
- No exemplars — pure reasoning invents more original, more sophisticated work (decisive A/B).
- True-scale perception (a faithful large render, 512px on the long edge — fixes the
  flattering-thumbnail bug) is in place.
- Keep-best across drafts makes iteration free option value.
- Whole-frame REDRAW escapes a wrong silhouette — *demonstrated* in hand-authoring (the 9-draft
  Claude-Code t-rex). The Phase-2 A/B showed the in-app engine reaches the bar on *known* shapes
  (t-rex/owl) across all arms; whether REDRAW reliably escapes a *wrong draft-1* silhouette awaits
  the N=5 hard-subject run (see below).

**Wired (Phase 1 — DONE):**

- Draft caps raised `2/3 → 5/6` (hard caps; early DONE is the norm) so the loop can redesign, not
  just polish.
- The look-and-fix turn (Quick) and per-stroke turn (Live) rewritten around the **96% bar as the
  stop condition** + redesign-permission + the single-line keep-an-intentional-choice permission.
- Rubric **principles** folded into the shared METHOD block (no exemplars).
- **feedback-is-a-floor** encoded in the critic prompt and the live-feedback handler.
- best-of-N reframed as a keep-best **regression guard** that runs *only* on the cap path; the
  artist's at-bar DONE ships directly.
- The distilled Artist Persona was wired, then **retired by the A/B** (see below) — `ARTIST_PERSONA`
  is kept defined but no longer composed into the prompt.

**Phase 2 A/B — RUN (2026-06-18, $21.94, 24 generations).** 4 arms × {t-rex, owl} @32 × N=3, scored
by an **independent fresh-context juror** anchored to the saved bars (never the generator). Headline
results:

- **Cut the persona voice.** persona-OFF beat persona-ON (6/6 vs 5/6; owl 3/3 vs 2/3; cheaper).
  Done — see above.
- **Two loops, one method, confirmed.** Per-stroke (eyes-open) cleared the harder owl silhouette
  3/3 at ~$2.4/owl and produced the most characterful t-rexes → **Live = per-stroke**;
  **Quick = whole-frame, persona-off**.
- **"New wiring vs old" is under-tested, not settled.** t-rex and owl are both shapes the model
  already knows, so redesign-escaping-a-wrong-silhouette never got exercised; new edged old only
  marginally and cost more. Don't enshrine "marginal."
- **Open follow-up — the real exam:** an **N=5 run on a hard subject** (one the model gets wrong on
  draft 1) is what would actually separate new-vs-old and re-confirm the persona cut universally.
  The juror was also upgraded to score the full 0–100 + an explicit `vsReference` (worse/matches/
  beats) so it can rank a piece *above* the bar — the old "96 = clears" prompt had a ceiling artifact.
  (Harness is dev-scratch, gitignored.)

**Later milestone (out of scope here):** fine-tuning on these sessions — they are the trajectory
data for an eventual own-model. No changes to the pxs-core renderer selection or data model are in
scope.
