# PR-10e — The Agent panel

> Part of the [Prompt Builder Studio](./PROMPT-BUILDER-STUDIO.md). Formalizes the right-rail **Agent**
> into a co-equal tool that acts on the whole project — the third of the big three. (Spec sharpens
> with reference images as we approach it.)

## Why

The reference's right panel is an Agent scoped to the whole project ("Jonny 1 · 8 views"), answering
"which part is weakest for keeping Jonny consistent across all 8 views?" and able to **edit the
prompt, generate views, restyle the sheet**. Today our right pane is just the raw conversation. The
Agent is the actor that operates *on* the Builder + the project, not just chats.

## Steps (outline — refine with images)

1. **Ask vs Agent modes.** Ask = answer/advise (no mutation). Agent = act on the project (edit parts,
   generate views, restyle) — always **proposing** mutations the user commits (constructive, backdoor;
   never silently rewrites the artisan's work).
2. **Project scope + context chips.** Scope to the whole project/sheet; attach context ("Jonny 1 ·
   sheet", "Prompt"). The Agent reads the Builder block + assets as context.
3. **Acts through the Builder contract.** Agent edits land as Builder-block updates (same A2UI shape),
   so the center reflects them and the change is reviewable — not an opaque side-channel.

## Out of scope

Multi-view sheet generation orchestration beyond a single builder is its own later plan; this wires
the Agent tool + Ask/Agent modes against one project.

## Verify

- Right rail has a real **Agent** (Ask/Agent) scoped to the project; Agent actions propose Builder
  edits the user commits; edits show in the center Builder. Spend metered. `tsc` clean.
