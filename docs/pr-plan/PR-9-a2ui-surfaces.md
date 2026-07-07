# PR-9 — A2UI surfaces (slots-not-screens) + the Prompt Guide panel

## Why

Heavy, model-specific A2UI is currently **squatting in the chat** — the "References for a precise
pass" card (supports + typed reference recommendations + capability facts) takes up a large column
of the conversation. That's the **Prompt Guide / controls panel's** job. Every time we enrich that
card inline, we compete with the envisioned dashboard design and force a rework later. This is the
slots-not-screens discipline: the chat holds *conversation*; a dedicated panel holds *controls*.

## Goal

Named **surfaces** (dumb, styled regions the code owns) + a **`surface` tag** on every A2UI block
(the agent decides placement). The renderer routes; code never conditionally shows a component.

```
canvas (center)      → generated media + view templates (gallery/grid) + personalized empty state
conversation (right) → the agent chat + light inline affordances (chips, reference upload)
controls (panel)     → the Prompt Guide: reference recommendation, typed reference slots, spec
                       fields, toggles/dropdowns — everything the agent emits with surface:'controls'
```

- The panel is **resizable** (your 50/50–60/40 instinct) and **toggleable** (a gear/tab bar; the
  agent can open it when it has controls to show).
- Light stuff stays in the chat (`surface:'conversation'`); heavy form/model UI goes to the panel
  (`surface:'controls'`). The agent chooses via the tag — no hardcoded panels, no conditionals.

## Steps

1. **Surface contract** — add `surface?: 'conversation' | 'canvas' | 'controls'` to the A2UI block /
   agent-event shape (default `'conversation'`). Route in the renderer; no `if (model) show X`.
2. **Workspace layout** — add a `controls` column beside canvas + conversation (resizable divider,
   collapsible). A gear/tab bar toggles it; the agent can request it open.
3. **Move the reference card** — retag the Image agent's references recommendation `surface:'controls'`
   so it renders in the panel, not the chat. The chat keeps only the consultative opener + light bits.
4. **Prompt Guide v1** — the panel hosts: the reference recommendation + a minimal **5-part spec
   scaffold** (subject/action/scene/composition/style), agent-emitted and pre-filled from the frame.
   The **consult-first** consultation lands HERE (in the panel), not in the chat scroll.
5. **Naming** — product name for the panel (candidates: **Build** / **Controls** / **The Bench**).

## Out of scope (later)

- Full Tao 5-level prompt *scoring* / quality ring — Prompt Guide v2.
- View templates beyond gallery↔grid (compare, filmstrip, storyboard).
- Typed per-model reference limits as data — that's **PR-C** (registry enrichment); this PR renders
  whatever the agent emits, and gets richer for free once the data lands.
- Studio integration of the shared shell.

## Verify

- The references card renders in the **controls panel**, not the chat column.
- The panel is resizable + toggleable; the agent can open it on a heavy path.
- Consult-first: the consultation (specs + supports + attach-next) appears in the panel; the canvas
  shows the personalized empty state; nothing generates until commit.
- `tsc --noEmit` clean.

## Guardrail (the tripwire from the Photolif post-mortem)

> Code owns **slots + deterministic view templates**. The agent owns **every component**, tagged with
> a `surface`. The moment anyone writes `if (model/feature) show <SpecificPanel>`, stop — we've relapsed.

Sits on the **PR-8 persistent shell** (the outer slot container). Best done after A; can precede
PR-C (registry) since it renders agent output regardless of data richness.
