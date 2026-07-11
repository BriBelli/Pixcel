# PR-10d — The Prompt Guide panel

> Part of the [Prompt Builder Studio](./PROMPT-BUILDER-STUDIO.md). Promotes the **Prompt Guide** to a
> prominent, co-equal product tool (right rail): the model-aware *why each part matters + how to
> strengthen it*. (Spec sharpens with reference images as we approach it.)

## Why

The score (10c) tells you *that* a part is thin; the Guide tells you *why*, for *this* model, and
*how* to strengthen it. Brian wants the Prompt Guide to stand as one of the big three tools
(Builder · Guide · Agent), not a buried tab. "Open Guide to see why" is its hook.

## Goal

A `surface:'controls'` **Guide** panel in the right rail (tab alongside the Agent) that explains the
formula and, for the selected part + chosen model, gives the model-aware rationale and concrete
"strengthen it" moves — powered by tiered knowledge (registry facts → skills → Tavily freshness).

## Steps (outline — refine with images)

1. **Guide content = tiered knowledge.** Registry/Model-agent facts (what the model rewards) → skill
   shards (craft: how to write a strong Subject/Action/…) → Tavily for freshness, verified+promoted.
   Agent-emitted as `surface:'controls'` content; code renders (slots-not-screens).
2. **In conjunction with the Builder.** Selecting a part (or its score badge) focuses the Guide on
   that part; the Guide's "strengthen" suggestions can drop chips/edits back into the Builder.
3. **Right-rail layout.** Formalize the rail into **Guide** + **Agent** tabs (or split), prominent and
   resizable; connected-feeling to the center, per the reference.

## Out of scope

The Agent's project actions (10e). Auto-applying fixes without the user (constructive: propose, the
user commits).

## Verify

- The Guide is a first-class right-rail tool; selecting a part shows model-aware why + how; a
  suggestion can be accepted into the Builder; content is agent-emitted, not code-baked. `tsc` clean.
