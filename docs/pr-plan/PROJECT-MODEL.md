# Project & Asset Model

**Status:** locked (Brian ✔ 2026-07-29). Conceptual model first; the real DB pattern is a later phase.

## Why
"Project" vs "Asset" is ambiguous today (a chat *is* a project; saving an image adds an asset; the
relationship isn't modeled) — which reads as **fear of losing work**. This locks the model so the fog
lifts and the eventual DB is a clean translation, not a salvage.

## The model — one law
> A **Project** is the *editable workspace* (the Photoshop **PSD**). An **Asset** is a *frozen produced
> artifact* (the **PNG export**). They are **not the same thing** — they are linked by **lineage**, and
> interconvertible via three verbs. The moment you want to *change* an asset, you are resuming a Project
> that produces the asset's *next version*.

| | Project (PSD) | Asset (export) |
|---|---|---|
| Is | editable state you can resume — conversation + builder/prompt + frame + refs + results + version history | a frozen output — image / clip / audio / character-sheet / saved-prompt |
| Verb | a process | a product |
| Lives | reopenable workspace (the 360° changelog) | durable, tagged, @-mentionable, reusable across projects |

## Rules
- **Always-in-a-project.** From the first keystroke you are inside a Project (an unnamed **draft** if
  nothing else). There is always a container persisting your state → you cannot lose work.
- **Draft → Saved promotion.** A draft auto-persists but is promoted to a durable, named Project on a
  deliberate act **or** the instant it produces its first real asset. Ephemeral drafts GC; saved
  Projects are permanent (two-tier retention).
- **Versions are non-destructive.** Every Project keeps increments (the 360° changelog); nothing is
  overwritten, every prior state recoverable.
- **Saving an image ≠ making a project.** It *exports an Asset* — a separate act from the workspace.
- **Three verbs** (all produce *independent* things — a Template instantiation is a seed, **not a fork**):
  - **Duplicate** a Project = *Save As* — a full independent copy to iterate in parallel.
  - **Template** a Project/Asset = mark reusable; instantiating **seeds** a fresh independent thing.
  - **Open-as-Project** an Asset = start a workspace seeded from a frozen artifact.
- **Prompt-templates are Tools** = the Reference-Profile primitive (e.g. the Character Reference Sheet):
  a `[SLOT]` recipe → produces an Asset → becomes an @-mentionable Reference in scene Projects. A
  Template is just an Asset whose payload is a recipe.
- **Lineage.** Every Asset records the Project/turn that produced it; every reference edge is tracked
  (edit upstream → propagate is a later capability, but the edges are modeled now).

## The loop
`Tool/Template → Asset → @Reference → Project → Asset` (and any Asset can seed a new Template or Project).

## Slices (show after each)
1. **Store-level Project semantics** — make "always in a project" real: a `project` shape with
   `draft | saved` state + the auto/explicit promotion. Formalizes today's `threadId`/`threadTitle`.
2. **The three verbs** — Duplicate · Template · Open-as-Project.
3. **Asset lineage + @-reference** — provenance edges; @-mentionable reference assets (ties Reference
   Profile). Prompt-templates as saved Tools.
4. *(later phase)* the real **DB pattern** — money-grade durable persistence + provenance.

## Out of scope now
The real database schema/migration (later phase, per Brian). UI screens (Claude Design owns splash /
landing / IDE pages). The video "frames carry appearance, prompt carries motion" law lands with the
video build. No new engine — this is mostly making explicit what is already implicit.

## Verify
Fresh chat auto-persists as a draft; first asset (or naming) promotes it; Duplicate/Template/
Open-as-Project each yield an independent workspace; no action overwrites prior state.
