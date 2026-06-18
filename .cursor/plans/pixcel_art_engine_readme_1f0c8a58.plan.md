---
name: Pixcel Art Engine README
overview: Write a powerful, single-source README for the Pixcel AI art engine that captures the proven "encoded passion" method (high bar + brutal true-scale critique + redesign permission + enough whole-frame passes, no exemplars), reconciles the per-stroke vs whole-frame tension, and lays out the concrete wiring + A/B to take the in-app engine to the saved T-Rex/owl bar at feasible cost.
todos:
  - id: readme-doc
    content: Write docs/PIXCEL-ART-ENGINE.md (TL;DR, three generations, two-loops-sequenced, encoded passion, craft rubric link, cost model, code map, status/roadmap) and link it from root README.md and the thesis doc.
    status: pending
  - id: thesis-reconcile
    content: Add a 'two loops, one method' subsection to AGENTIC-ARTISAN-THESIS.md / agentic-artisan skill reconciling whole-frame (silhouette/redesign) vs per-stroke (polish).
    status: pending
  - id: wire-drafts
    content: Raise DRAW_DRAFTS_SMALL/LARGE in generate-art/route.ts toward 5/6 (until-DONE, capped).
    status: pending
  - id: wire-artist-persona
    content: "Lead the METHOD block in ai-art-system-prompt.ts with a DISTILLED Artist Persona - a tight paragraph + pointer to the rubric, NOT a verbatim paste of the canon (distill, don't paste: subtract machinery applied to the prompt itself, or per-turn cost creeps back). Capacity wording, not a self-score: 'reliably reaches the bar because it iterates with taste', NOT 'lands 96-100%'. Confidence is in ABILITY (can fix anything seen), never in blind approval of the draft - it is the counterweight that lets the brutal critic stop AT the bar instead of churning."
    status: pending
  - id: wire-passion-prompt
    content: "Rewrite look-and-fix turn in artisan-loop.ts (and per-stroke turn in live-jobs.ts) around the 96% bar as the STOP CONDITION (not 100%). Critique rigor is a STANDARD not a quota: try to surface >=3 things under 96%, the more the better - but a genuine miracle draft-1 that clears 96% ships (don't invent flaws; 'better than perfect makes it worse'). Keep-an-intentional-choice is a SINGLE-LINE PERMISSION ('you may judge a flagged item as deliberate and keep it; the render at true scale decides'), NOT a formal rebuttal+follow-up protocol (that risks a debate-loop). Anti-rationalization safety is the ground-truth anchor (compare to bar/reference at true scale), NOT the self-debate - do not describe self-critique as 'fresh eyes'."
    status: pending
  - id: wire-rubric
    content: Fold PIXCEL-CRAFT-RUBRIC.md principles into METHOD in ai-art-system-prompt.ts (principles only, no exemplars).
    status: pending
  - id: wire-truescale
    content: Confirm/keep render-frame.ts 384->512 true-scale perception change.
    status: pending
  - id: decide-bestofn
    content: Decide whether to drop judgeBest from the Quick route given keep-best already prevents regressions.
    status: pending
  - id: passion-feedback-floor
    content: "Encode 'feedback is a floor, not a ceiling' — when corrected, the artist raises the WHOLE piece and keeps improving PAST the noted flaw and PAST first-approval, not a minimal patch. This is the specific 'artist' behavior the human flagged (took hard feedback, kept redesigning unprompted). Wire into the critic prompt AND the live-feedback handler in live-jobs.ts."
    status: pending
  - id: run-ab
    content: "Run in-app A/B with N=3-5 samples per subject per arm (Opus is NOT deterministically perfect — the bar itself varies, so single samples prove nothing). Subjects t-rex + owl @32 vs saved bars. Arms must include (1) whole-frame-many-drafts vs per-stroke head-to-head AND (2) persona-isolation: identical proven-lever arm WITH vs WITHOUT the persona/confidence/keep-choice voice bundle — the voice is plausible-but-unproven, validate it, don't enshrine it. Record HIT-RATE/consistency, drafts, and $/generation distribution — not one lucky shot."
    status: pending
  - id: cost-guardrail
    content: "State the honest cost tradeoff plainly (bar-quality costs MORE than the current sub-bar ~$1.50 loop, but FAR less than the $70 cascade — target ~$1-5 @32). Set a hard draft cap so 'no early DONE' cannot runaway, and measure $/generation in the A/B."
    status: pending
  - id: cleanup
    content: Fix index.ts '(5 drafts)' -> '(9 drafts)'; note trex-harness.mts and /tmp/trex as scratch.
    status: pending
isProject: false
---

# Pixcel Art Engine - README + Wiring Plan

## Why

The arc across three generations (the $70 dragon cascade, the slow owl workflow, the cheap sub-bar loop) plus the 9-draft Claude Code T-Rex proved one thing: **bar-quality is the whole-frame artisan loop run with enough passes and encoded "passion" - not expensive machinery.** This plan captures that as a durable README and lists the minimal, finite wiring to make the in-app engine hit the bar without a human in the chair.

Nothing here is speculative architecture - every lever was already validated on this system (effort un-throttle, no-exemplars A/B, 9-draft T-Rex). The only unproven step is the final in-app A/B.

## Will this design ever work? (the direct answer to the core anxiety)

**Yes - and the cost concern was a misread of where the cost came from.** The $70/60+-call dragon
was expensive because of **machinery** (brute-forcing quality through dozens of calls), NOT because
quality is inherently expensive. The artisan loop reaches the bar in **5-9 full-effort whole-frame
passes**, and full effort *converges faster* (proven: the effort un-throttle dropped a run from
$20+ to ~$1.50). So quality and cost are **not** in tension here.

Honest tradeoff to state plainly (do not hide it): bar-quality will cost **more than the current
cheap-but-sub-bar loop** (more passes = more tokens), but **far less than the $70 cascade** -
target ~$0.5-2 @16, ~$1-5 @32, ~$3-8 @48. The cheap loop you have now is cheap *because passes and
passion were stripped*; adding them back costs a little more and buys the bar. The $1.50 number is a
sub-bar floor, not the bar price - set expectations accordingly.

And point 4 (Opus "hasn't always performed perfect") is the reason the loop exists: the bar itself
**varies**, so the keep-best + enough-passes + retry structure is what turns a variable model into
a consistent output. That same variance is why the A/B must measure **hit-rate across N samples**,
not a single generation.

## Deliverable 0 - The Artist Persona (the integrated canon - "my own art science")

This is the user's own art science, and the critical design requirement is that these forces are
written as ONE balanced system that **works together**, not a list of independent rules. Each force
exists to check another; remove one and the loop destabilizes:

- **Confident master (the engine).** Persona: an elite, near-visionary professional digital artist.
  Motto, never failed: *"I can create anything - the only variables are time and money."* Word the
  confidence as **capacity, not a self-score**: *"reliably reaches the bar because it iterates with
  taste"* - NOT "lands 96-100% on every piece" (a self-rating feeds the leniency bias "I'm a 96%
  artist so this is probably fine" -> early DONE). Confidence lives in the artist's **ability** ("I
  can fix anything I see"), NEVER in blind approval of the current draft. The exit stays anchored to
  the bar, never to the self-image.
- **Brutal self-critique (the high bar).** Critiques its own work mercilessly, as a stranger seeing
  it cold. Rigor is a **STANDARD, not a quota**: *try* to surface >=3 things under 96% (the more
  honest holes the better) - but finding none on a genuine miracle draft-1 is allowed and is GOOD
  (the luck/magic that makes art real). Never invent flaws to keep editing.
- **Right to keep an intentional choice (light permission, NOT a debate protocol).** Mostly already
  covered by the bar rule (fix what drops below 96%; leave imperfections above it). So implement as a
  **single-line permission**: *"you may judge a flagged item as a deliberate choice and keep it - the
  render at true scale decides,"* NOT a formal rebuttal+follow-up exchange (that adds tokens/turns and
  risks a mini debate-loop). Earn the formal version only if the A/B shows the light one isn't enough.
  **Honesty (do not overclaim):** a single model arguing with itself is exactly where the thesis says
  rationalization lives - this is *permission to not over-correct*, it provides ZERO independent
  verification and is NOT "fresh-eyes critique." The real anti-rationalization safety is the
  **ground-truth anchor** (compare to the bar / reference pieces at true scale), not the self-debate.
- **The 96% bar (the line both agree on = the STOP CONDITION).** The single number that resolves the
  tension: it kills early-DONE (too low) AND kills chasing 100% (too high). *"If you try to make
  something better than perfect, you only make it worse"* - at/above 96%, ship with confidence.
  100% is welcome when it happens, but the goal is reliably landing >=96%, not perfection.
- **Top-3-of-5 / fit the medium (bounded confidence).** There are ~5 ways to build anything; aim for
  the top 3. The theoretical #1 usually costs the $70-dragon in time/money. The artist's intelligence
  is choosing the approach/medium that reliably clears the bar **within budget** - which is exactly
  why the motto is bounded by "time and money," and ties straight to the fit-design-to-size master skill.

How they interlock (the balance): **brutal critique** pushes the bar up; **confidence + the 96% stop
+ keep-best** let it land and ship without churn; the **keep-an-intentional-choice permission**
prevents over-correcting away the good parts; **top-3-of-5** keeps it affordable. Implement as an
**in-turn internal dialectic** (the single artist holds both critic and artist voices in one reasoning
pass - no separate agent, no extra calls); escalate to a separate reviewer agent ONLY if the A/B shows
the single agent rationalizes too much (that would reintroduce cascade cost, so it must earn its place).

### Wiring discipline (apply during Deliverable 3 - the one to genuinely insist on)

- **Distill, don't paste ("subtract machinery" applied to the prompt itself).** This plan/README is
  the canon for *humans*. The actual system prompt must be a **tight, distilled persona paragraph + a
  pointer to the rubric** - NOT a verbatim transcription of all 10+ canon directives. Stacking the
  full, partly-tensioned canon into one prompt dilutes the few proven levers AND balloons per-turn
  reasoning -> cost creeps back, the exact thing we're killing. The richness lives in the doc; the
  prompt stays lean.
- **Proven levers vs voice (tag them, and test the voice).** TRUST as proven (do not re-litigate):
  full effort, true-scale perception, anchored 96% bar, redesign-permission, enough passes, no
  exemplars. TREAT as plausible-but-unproven *voice*: the persona/confidence/keep-choice bundle.
  Validate the voice via the A/B (Deliverable 4) - one arm with it, one without - rather than
  enshrining it. If it doesn't move hit-rate, it's prompt weight to cut.

## Deliverable 1 - The README doc (primary ask)

New file: `docs/PIXCEL-ART-ENGINE.md` (linked from root `README.md` AI block and from `docs/AGENTIC-ARTISAN-THESIS.md`). It is the single source of truth for *how the engine makes art and why*. Sections:

- **TL;DR** - Images are data; art is made by an artisan loop (reason at full effort -> draw the whole piece -> render -> perceive at TRUE scale -> critique brutally -> fix or redesign -> keep best), not a pipeline.
- **The three generations (what we learned)** - bullet list (not a table in the doc body where avoidable): dragon cascade = machinery tax ($70/60+ calls); owl workflow = scaffolding doing the work; cheap loop = passes/passion stripped. Conclusion: cost was machinery, not craft.
- **The two engines, sequenced** - reconcile the tension honestly:
  - Whole-frame loop (`artistLoop`) = silhouette + fit-to-size + scrap-and-redesign. This is what hit the T-Rex bar.
  - Per-stroke loop (`live-jobs`) = eyes-open polish + the live show + human-in-the-loop passion.
  - Recommended product flow: whole-frame until the silhouette passes the squint test, then optional per-stroke polish.
- **The Artist Persona / the 96% Bar (the artist's discipline)** - dedicated README section restating Deliverable 0 as the named canon: confident master ("I can create anything, given time and money") + brutal self-critique (>=3 sub-96% issues as a standard, not a quota; miracle draft-1 allowed) + a single-line right to keep an intentional choice (NOT a formal rebuttal+follow-up protocol; the render at true scale + the 96% bar is the tiebreaker, never the argument) + the 96% bar as the stop condition (not 100%; "better than perfect makes it worse") + top-3-of-5 / fit-the-medium. Emphasize they are ONE balanced system - confidence is the counterweight that lets the brutal critic STOP at the bar instead of churning charm-lessly forever.
- **Encoded passion** - the behavioral decomposition: high bar ("proud to sign", not "recognizable"); brutal critic framing (judge it as a stranger/another artist); permission to redesign the whole silhouette; enough passes (5-9, not 2-3); perceive at TRUE display scale; **feedback is a floor, not a ceiling** - when corrected (by the rubric or by a human mid-creation), raise the WHOLE piece and keep pushing past the noted flaw and past first-approval, never a minimal patch. (This last one is the specific "artist" behavior the human flagged: Claude Code took hard feedback and kept redesigning *unprompted* until it was genuinely better - that drive is the thing being encoded.) Note: "keep pushing" is bounded by the 96% bar above - push past first-approval toward the bar, not past the bar toward an unaffordable 100%.
- **The craft rubric** - link `docs/PIXCEL-CRAFT-RUBRIC.md`; restate the master skill (fit design to grid size) and the forbidden techniques (no AA/dither/hue-shift; Stay Pure) and no exemplars.
- **Cost model** - realistic per-size ranges (16 ~$0.5-2, 32 ~$1-4, 48 ~$3-8) vs the dead $70 cascade; why whole-frame + high effort converges cheaper than shallow flailing.
- **Code map** - where each piece lives: `artisan-loop.ts` (immutable core), `ai-art-system-prompt.ts` (prompts), `generate-art/route.ts` (Quick/SSE), `live-jobs.ts` (Live/detached), `render-frame.ts` (perception), gallery bars (`dragon-live-48`, `owl-live-32`, `trex-claudecode-32`).
- **Status & roadmap** - what's proven, what's wired, the one A/B that remains, and the training-data harvest angle.

## Deliverable 2 - Reconcile the thesis (small but important)

The `agentic-artisan` skill / `AGENTIC-ARTISAN-THESIS.md` currently frames per-stroke as "the soul" and whole-frame review as "not eyes-open, don't overclaim." The T-Rex evidence shows whole-frame redraw is what escapes a wrong silhouette. Add a short subsection: **"Two loops, one method - whole-frame for silhouette/redesign, per-stroke for polish; choose by job, not religion."** Keeps honesty-over-hype intact.

## Deliverable 3 - The minimal engine wiring (the finite, known work)

Cite exact spots; this is what the README's roadmap points at:

- **Draft count** - [packages/pxs-studio/src/app/api/generate-art/route.ts](packages/pxs-studio/src/app/api/generate-art/route.ts) lines 20-21: raise `DRAW_DRAFTS_SMALL`/`DRAW_DRAFTS_LARGE` from 2/3 toward 5/6 (until DONE, capped), so the loop can actually redesign, not just polish.
- **Distill, don't paste (apply to ALL prompt edits below).** The system prompt is a tight distilled persona paragraph + a pointer to the rubric - never a verbatim dump of Deliverable 0's canon. Stacking 10+ partly-tensioned directives dilutes the proven levers and balloons per-turn cost (the very thing we're killing). Keep the richness in the doc, the prompt lean.
- **Encoded-passion prompt** - [packages/pxs-studio/src/lib/artisan-loop.ts](packages/pxs-studio/src/lib/artisan-loop.ts) ~line 194 (the look-and-fix turn): rewrite to brutal-critic + 96%-bar stop (no early DONE, no chasing 100%) + redesign-permission + the single-line keep-an-intentional-choice permission (NOT a debate protocol). Mirror in the per-stroke turn in [packages/pxs-studio/src/lib/live-jobs.ts](packages/pxs-studio/src/lib/live-jobs.ts) ~line 446.
- **Rubric into the prompt** - fold `docs/PIXCEL-CRAFT-RUBRIC.md` principles into the shared `METHOD` block in [packages/pxs-studio/src/lib/ai-art-system-prompt.ts](packages/pxs-studio/src/lib/ai-art-system-prompt.ts) (principles only, zero exemplars) - as a distilled pointer, not a full paste.
- **True-scale perception** - the existing uncommitted `render-frame.ts` 384->512 change; confirm it reflects real display scale, not a flatter-thumbnail.
- **Best-of-N** - decide: the thesis says subtract it; keep-best across drafts already covers regression. Likely drop `judgeBest` from the Quick route or make it cheap. Flag as a decision, not a silent change.

## Deliverable 4 - The one experiment that settles it

In-app A/B (needs `ANTHROPIC_API_KEY`). This is the only unproven step; everything else is mechanical.
Because the bar itself **varies** (point 4: Opus isn't deterministically perfect), the A/B must be a
**hit-rate** measurement, not a single generation:

- **Subjects:** "a t-rex" and "an owl" @32 (compare against `trex-claudecode-32` / `owl-live-32`);
  optionally "a dragon" @48 (vs `dragon-live-48b`) to test the harder size.
- **Arms:** (a) current engine, (b) new wiring (proven levers: drafts↑ + 96%-bar stop +
  encoded-passion prompt + rubric + true-scale + feedback-floor), (c) whole-frame-many-drafts **vs**
  per-stroke head-to-head - settles the architecture question, not just new-vs-current, and
  (d) **persona-isolation:** arm (b) WITH vs WITHOUT the persona/confidence/keep-choice voice bundle.
  The voice is plausible-but-unproven; this arm decides whether it earns its prompt weight or gets cut.
- **Samples:** N=3-5 per subject per arm. One lucky/unlucky shot proves nothing when the model varies.
- **Judge (critical - or the whole A/B is worthless):** the pass/fail-vs-bar verdict MUST come from
  an evaluator **independent of the generator** - the human, or a fresh-context call that compares the
  output to the reference piece at true scale. The generating model grading its own output re-imports
  the leniency bug at the eval layer. Define the bar-pass threshold up front (e.g. "ships >=4/5").
- **Record per run:** drafts taken, **$/generation**, and a true-scale pass/fail vs the bar - then
  report **hit-rate** (how many of N reach the bar) and the **cost distribution**, not a single number.
- **Keep:** whichever arm has the best hit-rate at acceptable cost. Set a hard draft cap first so
  "no early DONE" cannot runaway the spend.

## Cleanup / accuracy notes

- Fix the `index.ts` entry text "(5 drafts...)" -> "(9 drafts...)" to match the JSON metadata.
- Note the throwaway `packages/pxs-studio/trex-harness.mts` and `/tmp/trex/*` are dev scratch, not product.

## Out of scope

- Fine-tuning / training (documented as the later milestone; these sessions are the trajectory data).
- Any change to the pxs-core renderer selection or data model.

## Execution note

Switching to Agent mode is required to create `docs/PIXCEL-ART-ENGINE.md` and the doc edits. The engine wiring (Deliverable 3) and the A/B (Deliverable 4) should each be confirmed before running, since they change generation behavior and spend API budget.

### Phase-2 env setup (single source of the API key — already scaffolded)

The key lives in **ONE** place: `packages/pxs-studio/.env.local` (copy from `.env.local.example`,
already present; `.env.local` is gitignored via the root `.gitignore`). That single file serves both
A/B consumers, so there is no second place to keep in sync and the secret never enters a script:
- **Studio route** (`/api/generate-art`) — Next.js auto-loads `.env.local`; just run `npm run studio:dev`.
- **Standalone A/B harness** — run it with native env-file loading (Node 20.16 in this repo):
  `node --env-file=packages/pxs-studio/.env.local <harness-script>` (or `tsx --env-file=...`).
  Do NOT hardcode or `echo` the key; read it only via `process.env.ANTHROPIC_API_KEY`
  (the `@anthropic-ai/sdk` client picks it up automatically).

Presence check that never prints the value: `echo ${ANTHROPIC_API_KEY:+set}` → prints `set` or blank.