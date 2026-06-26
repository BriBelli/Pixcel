# Pixcel — The Unification Plan (ONE product)

> **North star.** Merge the two halves Brian built into a single product: **Pixcel**. This repo = the
> hard-won **reasoned-artisan engine** (the core IP). `photolif/` = **Pixcel v2** (a decoy name — DROP it),
> the platform: multi-model access, the surfaces, the asset substrate, A2UI. Supersedes
> `PLATFORM-MERGE-README.md`. Conceptual design = the Claude Design prototypes (a "statue shape," open for
> engineering — do NOT design literally toward them yet).

## The story (why this is the shape)
Brian fought for the autonomous artisan HERE for months ($500+, Opus 4.6) — it failed. He built the entire
platform (photolif) around the gap. Then the artisan clicked (Opus 4.8). So: **the artisan pipeline is the
crown-jewel IP; the platform is the body it deserves.** Both halves now exist; unify them.

## THE UNIFYING PRINCIPLE — the Statue Method is the SYSTEM, not the pixel engine
The proven pattern is a **reusable master-professional primitive**: an autonomous agent that *commits a
VISION → works in passes → judges with fresh eyes → keeps the best → won't stop below 96% until gated/asked/
throttled*. **Change only its CONTEXT and it becomes a different 20-year professional:**
- context = pixel artist → the artisan (flagship, this repo's engine, preserved intact).
- context = image-model router → the ranking **oracle** (NOT a brittle Python decision tree).
- context = video director / scene builder / asset librarian / prompt coach → a master of each.

**Verdict 2.B > 2.A:** photolif's brittle Python workflows get **flattened into autonomous agents**, with
**code only as RAILS** where structure genuinely earns it (the "isolated focused box" hybrid: gating +
code-structure + an agent in control; blend toward more-autonomous as it proves out). One pattern, many
professionals, **one front-door agent** that shapes a workflow from the user's words and routes to the right
master (skills / MCP). Recycle the statue for everything; set context per task.

## The architecture (one organism)
- **Front door — the Pixcel Assistant** (autonomous orchestrator): the user talks to ONE agent. It reads the
  whole project, makes sense of the prompt, surveys available tools/paths/**workflows** (Pixcel-art, image,
  video, multi-image gallery, multi-video gallery, scenes, storyboards…), shapes the best workflow, asks/
  suggests naturally, and **delivers/routes** — responding with **A2UI** (the agent drives the UI; CRUD-style
  GUI, never prose). *This keeps photolif's agent CONCEPT (route → workflows) and drops its brittleness.*
- **The Pixcel Agent primitive** (the recycled statue): a context-driven framework — VISION→work→fresh-eyes
  judge→keep-best→96% gate, tool/skill/MCP-aware, A2UI-native. "Hire a master, set their domain."
- **Specialist agents** (each = the primitive + domain context + rails): **Pixcel-art = the flagship**
  (this repo's engine, untouched); image-router/8×8; video; scenes; storyboards; assets. Reached by the
  front-door agent via MCP/skills — the hybrid shift happens at these hand-offs.
- **The substrate — media-as-Pixcel-JSON**: every asset (model-generated image, video frame, reasoned
  pixel art) stored as Pixcel JSON (`PXSFrame` atom → `PixcelProject` version DAG → `.pxc` envelope; assets
  library). Addressable, diffable, programmable. *Pixcel was always the DATA mechanism; it shines there.*
- **Unified UI/UX**: the Claude-Design front door — Agent panel + workflows + surfaces — on the shared
  substrate. Seamless, single front door.

## THE FUSION (the real unlock — they interconnect HERE)
Not two paths. Because **every asset is a Pixcel JSON file**, the model layer and the artisan layer fuse at
the substrate: an image a model generates → lands as a Pixcel file → opens in the **Studio editor** → gets
inpainted/edited with real (Photoshop-grade) tools → stays a versioned, diffable program throughout. As
Pixcel grows it blends deeper into the workflow, and the accumulated JSON + provenance is the eventual
training corpus. "Image platform" and "reasoned pixel art" stop being two products and become one.

## The restaurant model (Brian's, to keep us honest)
Customer reads the menu (product) → orders (prompt) → kitchen (backend). The **chef (agent)** receives the
order, reasons the whole plate from the **cookbook (context — per-recipe = a specialist agent's context)**
using **ingredients (tools/workflows/components)** and **data (other agents' support)**, and plates the
complete dish (primary + sides + seasoning + presentation + quality) — packaged, via A2UI.

## The plan — phases (run like a FIRST PR REVIEW)
- **P0 · Consolidate + rename + seam.** One repo (this root); drop the nested git; rebrand → Pixcel. Unify
  `pxs-core` (photolif's advanced source → tracked `packages/pxs-core`; reconcile 2 defaults). Data model
  already identical = clean seam.
- **P1 · The Pixcel Agent primitive.** Extract the autonomous statue pattern into a reusable, context-driven,
  A2UI-native, tool/MCP-aware framework. The heart.
- **P2 · The front-door orchestrator (Pixcel Assistant).** The single agent: read project → shape workflow →
  route to specialists. Replaces photolif's Python routing brain (keep the concept, lose the brittleness).
- **P3 · Re-pattern the specialist domains.** Recast 8×8 image routing/ranking, video, scenes, storyboards as
  specialist agents (pattern + context + rails). Pixcel-art = flagship specialist, engine preserved.
- **P4 · The unified front door (UI/UX).** The Claude-Design shell on the shared substrate; A2UI everywhere.
- **P5 · The asset-JSON fusion.** All media → Pixcel JSON; model→Pixcel-file→Studio-edit interchange;
  provenance + training corpus.
- **Execution method:** disperse sub-agents to scan photolif part-by-part → a verdict per part
  (**port / recreate / refactor / trash**) + target location, synthesized into the lift-and-shift. The proven
  artisan is never broken.

## Naming + what's preserved
- **Drop "photolif"** — alias for Pixcel; keep only as a migration label.
- **Preserve intact (crown jewels):** the artisan engine (`lib/live-jobs.ts` + the prompts — VISION→refine→
  polish gate→bonus loop→keep-best), the live show, the recent Studio UX, the craft rubric, `pxs-core`.
- **Pointers:** `STATE-OF-THE-STUDIO.md`, `THE-STATUE-METHOD.md`, `PIXCEL-PRODUCT.md`, `PIXCEL-WORKFLOW.md`,
  `PLAN-QUALITY-ENGINE.md` (the bonus-loop floor), `PIXCEL-CRAFT-RUBRIC.md`.
