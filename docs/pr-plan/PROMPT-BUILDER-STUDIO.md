# The Prompt Builder Studio — master plan (PR-10 epic)

> The workspace a `transfer` lands on, realized. Three co-equal, media-agnostic product tools that
> work in conjunction. This is the crown surface; it is carved in **staged, comfortable phases**
> (sub-plans below), each additive and reviewable on its own.

## Why

Today the specialist workspace is placeholder copy + prose consult + a routing button. The center —
the largest region — only *promises* an interactive consult and delivers nothing; the real asking
happens as a paragraph in the chat, and we ask for specifics twice (front door, then the agent).
The statue's frame is up; the face isn't carved.

The target (Brian's reference design) is a **Prompt Builder Studio**: the prompt is composed as a
**scored, structured formula** the user shapes with **agent-suggested chips + free-form**, explained
by a prominent **Prompt Guide**, and acted on by an **Agent**. It is **media-agnostic** — the same
structure serves image, video, pixel, anim; only the parts change. This is the Tao/5-level surface
from `docs/PIXCEL-PRODUCT-SPEC.md`, driven by our autonomous agents (not prompt-pipelines).

## The three co-equal tools

```
┌ left ─┐┌──────── center: PROMPT BUILDER ────────┐┌──── right rail ─────┐
│ nav + ││  the STRUCTURED CONSULT (A2UI comps)    ││  Prompt Guide (tab) │
│ tools ││  formula parts, each: guidance +        ││   — why each part    │
│       ││  editable field + suggested chips +     ││     matters, model-  │
│       ││  free-type; rolls up to a quality score ││     aware "how to     │
│       ││  → color-coded assembled prompt         ││     strengthen"      │
│       ││  → references/upload → Render            ││  Agent (tab)         │
│       ││                                         ││   — acts on the whole│
│       ││  (media-agnostic: parts change,         ││     project (edit /  │
│       ││   structure holds)                      ││     generate/restyle)│
└───────┘└─────────────────────────────────────────┘└─────────────────────┘
```

1. **Structured consult / Prompt Builder** (center, `surface:'canvas'`) — the A2UI workflow
   components: the formula broken into parts, shaped with suggested + free-form chips. It is a
   **chat-like y-scroll that accumulates the whole workflow** — components + agent-requested steps
   **and the generated media (images/video) INLINE in the same stream**, newest at the bottom,
   scroll-up = history. Not "builder OR gallery" — they coexist in one scroll. (See PR-10a → the
   accumulating canvas.)
2. **Prompt Guide** (right, `surface:'controls'`) — a prominent product feature: the model-aware
   *why + how* for each part, powered by the Model agent + tiered knowledge.
3. **Agent** (right) — Ask/Agent modes; edits the prompt, generates views, restyles the whole project.

## The load-bearing contract (agent → UI, slots-not-screens)

The agent emits a **Builder block**; the code is a **dumb renderer**. **Nothing is code-baked** —
parts, guidance, suggested chips, values, and scores are ALL agent-emitted, per subject/class/media.

```ts
BuilderBlock (surface: 'canvas') = {
  kind: 'builder',
  title: string,                 // "Shaping · Third-gen Camaro on a rural backroad"
  media: 'image' | 'video' | 'pixel' | 'anim',
  parts: BuilderPart[],
  overall?: { score: number; label: 'thin'|'good'|'strong' },   // PR-10c
}
BuilderPart = {
  id: string,                    // 'subject'|'action'|'context'|'composition'|'style' | agent-defined
  label: string,
  guidance: string,              // "Identify the main focal point — be specific about materials…"
  value: string,                 // free-text field, agent pre-fills from the frame
  chips: string[],               // agent-SUGGESTED anchors (tap to add) — NEVER a code table
  score?: 'thin' | 'good' | 'strong',                            // PR-10c
}
```

Every part = label + guidance + editable field + suggested chips **+ a free-type "Add…" escape**.
**Never a cage** (constructive, always a backdoor — see [[feedback_constructive-not-destructive]]):
suggested by default, free-form always available. Submit assembles the parts → the color-coded
prompt → Render.

## Design principles (from the Photolift reference — the hardcoded version we're inverting)

Brian's accidental Cursor-agent build in Photolift produced the RIGHT shape but 100% hardcoded —
the exact failure we're inverting. What to keep, made dynamic:

- **Accordion stepper.** Each part is a collapsible step (active/done state), not a flat form —
  scannable, sequential, the agent's steps to complete.
- **The Guide BUILDS UP.** The quality score climbs and the coaching changes as parts fill
  ("Add a Subject — it carries the most weight" → strengthens). Guide + scoring in motion (10c/10d).
- **Blend, but don't merge.** Photolift fused the guide INTO the components; we keep the Guide its
  own tool (right rail) while the score/coaching surfaces inline as you shape — connected, not merged
  (avoids the confusion Brian flagged).
- **Fully dynamic — the agent owns the steps.** The agent decides which A2UI components AND which
  steps the user completes; a mix of form components + agent-requested steps. Nothing hardcoded.
- **The agent is ALWAYS available (hard law).** The right-rail Agent stays present in the workspace so
  the user can talk to it — ask, clarify, get unstuck — INSIDE any step. The consult is never a
  dead-end form; the human can always reach the agent.

## The guardrail (Photolif tripwire — do not relapse)

> Code owns **slots + deterministic view templates**. The agent owns **every component**, tagged with
> a `surface`, and **every option set**. The moment anyone writes `if (subject === 'car') chips = [...]`
> or `if (model) show <SpecificPanel>`, stop — we've caged the artisan and relapsed.

## Phases (sub-plans — carve in order, each mergeable alone)

| Phase | Title | Carves | Plan |
| --- | --- | --- | --- |
| **10a** | Structured consult + center Prompt Builder (skeleton) | the Builder block + center renderer + agent emits it (replaces prose) + suggested/free-form chips + assemble → Render | [PR-10a](./PR-10a-structured-consult-builder.md) |
| **10b** | Color-coded assembled prompt | the prompt preview: color-coded by part, comma-separated, info-toggle, click-to-edit ↔ chips-in-builder | [PR-10b](./PR-10b-color-coded-prompt.md) |
| **10c** | Model-aware scoring | per-part rating + overall Quality ring, driven by the Model agent (what the target model rewards) | [PR-10c](./PR-10c-model-aware-scoring.md) |
| **10d** | The Prompt Guide panel | the prominent right-rail Guide: model-aware why/how per part, tiered knowledge, in conjunction with the builder | [PR-10d](./PR-10d-prompt-guide-panel.md) |
| **10e** | The Agent panel | Ask/Agent modes; acts on the whole project (edit prompt, generate views, restyle) | [PR-10e](./PR-10e-agent-panel.md) |
| **10f** | Media-agnostic generalization | prove the same structure for video (+ pixel/anim); agent defines parts per media | [PR-10f](./PR-10f-media-agnostic.md) |

**Recommended order:** 10a → 10b → 10c → 10d → 10e → 10f. 10a is the visible skeleton (structure
working fast); 10b makes it read like the reference; 10c/10d give it a brain; 10e formalizes the
agent; 10f proves the thesis.

## Spec maturity (honest note)

10a is spec-complete and ready to build. **10b–10f are outlined at plan grain** and will be
sharpened with more reference images + talk-through as we approach each phase — per Brian, the exact
specs need images + examples + conversation to nail. Don't over-freeze them now.

## Sits on

The [[PR-8]] persistent shell (outer slot container) + [PR-9](./PR-9-a2ui-surfaces.md) surface
routing (the `surface` tag + Prompt Guide slot). 10a extends the surface union with `'canvas'`.
