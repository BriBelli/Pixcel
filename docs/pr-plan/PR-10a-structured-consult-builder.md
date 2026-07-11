# PR-10a — Structured consult + center Prompt Builder (skeleton)

> First carve of the [Prompt Builder Studio](./PROMPT-BUILDER-STUDIO.md). Turns the workspace
> consult from **prose** into **components**: the agent emits a structured Builder block, the center
> stage renders it, the user shapes it with suggested + free-form chips, and Render hands off.

## Why

The guided consult currently arrives as a paragraph in the chat ("lock the specifics: year, color,
trim, mood, attach references"), while the big center stage shows dead placeholder copy that only
*promises* that interaction. And we ask for specifics twice (front door + agent). Components, in the
center, asked once — that's the fix Brian confirmed.

## Goal

The image agent emits **one `builder` A2UI block** (`surface:'canvas'`); the center stage renders it
as the structured consult; shaping it + Render assembles the prompt and generates. **No scoring, no
color-coding, no Guide panel, no Agent panel yet** — this is the structure working, fast.

## Steps

1. **Surface + block contract.** Add `'canvas'` to the `surface` union. Add the `builder` block +
   `BuilderPart` shapes (see master plan) to the A2UI block types (`chat-turns-store.ts`) and the
   image-agent event type. `parts[]` each carry `{id,label,guidance,value,chips}` — all agent-emitted.
2. **Image agent emits it (replaces prose).** On a guided consult, the agent produces a `plan_render`
   that yields a `builder` block: the formula parts (subject/action/context/composition/style),
   each pre-filled from the frame + a short guidance line + 3–5 **suggested** anchor chips tailored to
   the subject. **Deterministic fallback** (same guard as the staged ask): if the model underfills a
   part, synthesize a sensible default so the builder is never broken. Keep a one-line spoken opener;
   the substance is the block, not prose.
3. **`BuilderPanel` renderer (center).** New component rendering the block in the center stage: title,
   then each part as `label + guidance + editable value field + suggested chips (tap → add anchor) +
   an "Add…" free-type input`. Chips toggle in/out; the field is editable. **Never a cage** — the
   free-type input is always present ([[feedback_constructive-not-destructive]]).
4. **References + Render.** Fold the existing reference recommendation (model label + max refs +
   supports) into the builder as a **References** section with the attach affordance, and a **Render**
   button. Render assembles `parts` (value + selected chips) into the prompt string and sends it as
   the workspace turn → the image agent generates (the existing `depth:'quick'`/commit path).
5. **Center view template by phase.** The center shows the `BuilderPanel` while shaping; once Render
   fires and tiles stream, it becomes the image gallery (existing `ImageStage`). One slot, two
   templates — no new panel.
6. **Trim the double-ask.** The front-door staged question stops demanding full specifics — it asks
   *quick-vs-guided* (+ rough subject) only; **this builder** owns detailed spec-gathering. Update the
   Operator prompt + `defaultStagedQuestion` accordingly.

## Next refinement — the accumulating canvas (agreed 2026-07-10)

The center canvas is a **chat-like y-scroll that ACCUMULATES the whole workflow**, not a single
replaced form. Interleaved in ONE stream, append-only, newest at the bottom, scroll-up = history:

- the **A2UI form components** the agent emits (the builder steps),
- the **steps the agent wants the user to complete** (dynamic, agent-owned — a mix of components + asks),
- and — the key insight — the **generated media (images/video) INLINE in the same stream**, dropping
  in right below the components that produced them. It is NOT "builder OR gallery, two templates that
  swap"; the builder components and the rendered output **coexist** in the canvas. Render a pass →
  tiles appear under those parts → the next step's components appear under that. Media-as-JSON, one scroll.

The right-rail **Agent stays always-available** so the user can talk to it inside any step (hard law).
This supersedes 10a's "center = one slot, two view templates (builder ⇄ gallery)" — the templates
become BLOCKS in the accumulating stream. (Brian: the piece he wished Photolift had.) Carve right
after the current 10a settles.

## Out of scope (later phases)

- Per-part + overall **scoring / quality ring** → PR-10c.
- **Color-coded, comma-separated** assembled-prompt preview + info-toggle → PR-10b.
- The **Prompt Guide** right panel ("why/how per part") → PR-10d.
- The **Agent panel** (Ask/Agent, act-on-project) → PR-10e; the chat pane stays as-is for now.
- **Video/pixel/anim** parts → PR-10f (10a ships the image formula, agent-defined).

## Verify

- "a photoreal Camaro" → quick-vs-guided ask → "guided" + subject → workspace opens with the
  **BuilderPanel in the center**: parts, guidance, editable fields, suggested chips + free-type,
  References section, Render. **No prose paragraph, no dead placeholder.**
- Chips are **agent-emitted** (vary by subject) and every part has a **free-type escape**; nothing is
  code-baked (grep: no `if (subject/model) chips = [...]`).
- Render assembles the shaped parts → generates → center becomes the gallery.
- Specifics are asked **once** (in the builder), not twice.
- `tsc --noEmit` clean; classify tests pass.

## Guardrail

> The moment a part's chips or a panel's presence is decided by `if` on the subject/model in code,
> stop — the agent owns content + option sets; code only renders (slots-not-screens).
