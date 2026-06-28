# Pixcel — The Unification Plan (ONE product)

> **North star.** Merge the two halves Brian built into a single product: **Pixcel**. This repo = the
> hard-won **reasoned-artisan engine** (the core IP). `photolif/` = **Pixcel v2** (a decoy name — DROP it),
> the platform: multi-model access, the surfaces, the asset substrate, A2UI. Supersedes
> `PLATFORM-MERGE-README.md`. Conceptual design = the Claude Design prototypes (a "statue shape," open for
> engineering — do NOT design literally toward them yet).

## THE NORTH STAR — the customer & the killer use case (2026-06-28, Brian)
*What the whole product is ultimately FOR. Everything below serves this; refine toward it.*

- **The problem we kill:** using today's AI models *properly* to make a film / masterful digital-motion-art
  video is **completely unstructured** — you jump across companies, models, and tools to assemble one piece.
  There IS a strong **technique** to doing it well (ref: the creator **"Toa prompts"**). **Structuring that
  chaos into one guided studio is Pixcel's ultimate focal point.**
- **The customer (our first, sufficient user) = Brian** — a **20+ year digital-media professional** (Flash →
  Adobe → WordPress → no-code → Python/AWS → all-AI). He has lived every wave; he *is* the audience.
- **The job to be done:** create **real-time films from his own lore/canon/stories.** He authors the lore,
  canon, and scenes/chapters and directs to cinematic detail. **He is ONLY the writer/director — Pixcel is
  EVERYTHING ELSE: the full studio production set + autonomous "digital AI employees" working together (and
  with him).** The finished films are the **proof** the product works.
- **The orchestrator reframe (supersedes photolif's brittle workflows):** everything interfaces with ONE
  **singular, persistent, stateful autonomous layer — the "Pixcel Assistant."** It orchestrates all tools /
  MCP / sub-agents / **workflow generation**; generated workflows hand off to **micro MCP agent workflows**
  that stay **supervised by that higher-level persistent agent.** (This is the chef/statue primitive made the
  spine of the product — see §"THE UNIFYING PRINCIPLE".)
- **Canvas vs A2UI focus split:** for **Pixel ART**, the z-0 real Pixcel grid canvas is PRIMARY; for
  **IMAGE / VIDEO**, focus shifts to the agent driving the **higher-z A2UI layer** (the canvas recedes).
- **Cadence:** fold this into Pixcel's **statue shape**, then **refine → shape → refine.** Start MICRO (the
  splash's real low-res Pixcel wall), then move outward. We are not close yet — this is the long arc.

### The end-state — living, dynamic, interactive media (movies → games → anything)
- **Bible-as-context (richer than a prompt).** Hand the system a COMPLETE story bible — canon, lore,
  blueprints, characters, scenes in intricate detail. The agent uses that rich context to **dynamically
  build continuous / extended scenes off what the author built.** Architecturally this is the chef's
  **Recipe = context-as-data** at film scale; the persistent orchestrator holds world/canon state.
- **Living + interactive.** Dynamic films = **choose-your-own-adventure** — the viewer interacts → dynamic
  endings/outcomes → nearly every film a unique piece. Build your own world + info-feed → the LLM generates
  movies that evolve on their own.
- **2D games as a real-time autonomous system.** Doom / Wolfenstein / Duck Hunt-style worlds where the AI +
  elements are **dynamically created and act/react to the provided context/theme** → a real-time living
  experience ("beyond a simulation — basically VR"). **This is where the PIXEL engine re-enters.**
- **NOT full autonomy.** Preserve **granularity + hands-on control** all the way down: images → storyboard →
  scene → film step. (The auto-default-but-honor-explicit-intent law, applied to film.)
- **PROOF DEMO — "Don't Let the Train Stop."** A flat/3D-style film from an LLM: a train rides an
  environment held **in STATE** (starts Wild West), **hosted live on a URL**; people **pay → submit a prompt
  = the next scene**, generated **behind the scenes** and **stitched into the running film via the Pixcel
  JSON substrate** (streaming/queue — "Kinesis or similar") with **transitions**. "outer space" → the train
  is in space; "underwater" → train + fish submerge; etc. **Async-generate while others play, stitch via
  JSON** = a living, breathing, collaborative film. Exercises persistent world-state + user-driven scenes +
  async generation + JSON stitching/transitions + paid multiplayer + on-chain/provenance — all at once.
- **Why JSON-as-substrate is THE unlock:** every scene is a diffable Pixcel JSON program — exactly what lets
  scenes generate async, stitch, version, and transition. The data model is the spine of the living-media
  vision, not just the editor.

## LOCKED DECISIONS (2026-06-26, Brian)
1. **Stack = all TypeScript / Node.** Node/TS backend + React/Next front-end. The **artisan stays TS and
   UNTOUCHED** (the proven crown jewel is never risked). `a2ui-core` (the protocol) is already TS → ports
   directly; the **Lit A2UI renderer is rebuilt in React.** **photolif's Python backend (FastAPI routing,
   29 image + 20 video providers, surface pipelines) gets PORTED to TS** — the biggest single lift,
   sequenced to **P3 (AFTER the first slice)** so the architecture is proven before we pay it.
2. **Front-end = React/Next** (this repo's studio + the Claude Design). Mature the React A2UI renderer
   (photolif's React lib is the prototype seed).
3. **First slice = front door → the artisan flagship** + A2UI + the asset substrate. Wrap the PROVEN engine
   in the new shell; prove the pattern + the JSON fusion on the crown jewel before porting the breadth.
4. **POSITIONING = everything-platform, creative-LED (2026-06-27, Brian).** Pixcel is a universal A2UI
   assistant *with* deep creative studios. **Chat is a first-class nav pillar** (the proven A2UI moat — best
   chat UI/UX per enterprise testers) and the default **splash**. The PRODUCT is everything; the
   GO-TO-MARKET leads with the **creative wedge** (Cursor's play) to keep a sharp identity and avoid
   Adobe-style dilution. Nav: **Chat · Art · Image · Video · Anim**. Splash = Chat ("How can I help you
   today, <name>?") + smart context chips (dynamic from recent threads; static curated fallback for
   cold-start). The per-medium **cards/carousel live in the section landings**, not the chat splash.

## Conceptual designs folded in (Brian's existing photolif screens + Claude Design)
- **The Pixcel-JSON z-index cascade** (chat-record → Pixcel-project → edits-as-JSON-records → Assets) = the
  signature IP data-spine. Preserve exactly.
- **Click-into-live-edit-studio** = the model↔artisan FUSION made concrete (any generated image → instant
  Pixcel project, JSON-versioned both ways, deep cheap history).
- **Assets hub = the Oracle** — every asset a first-class JSON citizen (ID + rich tags); the AI has central
  intelligence over all assets/projects/workflows. The whole system reads as ONE central-intelligence
  interface. The 32-image firehose was the anti-pattern (colliding workflows) the front-door agent cures.
- **Autonomy is a DIAL** (Brian's IDE journey: Copilot-micro → Cursor-plan/exec → Claude-Code-high-auto):
  the statue pattern spans the full spectrum; #3 (high autonomy + monitor/review) is the default, turnable
  down per task. The designs are a "statue shape," open for engineering — not literal.
- **DESIGN LANGUAGE = the Claude Design is CANONICAL for the UI.** The photolif screens were origin/context
  only (Brian likes the clean flat/bento feel) — don't over-index on them; Claude Design packages the UI.
- **PROVEN + SHIPPED in photolif (preserve, don't rebuild):** (a) the **live-edit studio** — semantic edits
  ("add a sniper rifle" → "make the helicopter smaller") each create a versioned **Pixcel JSON record** =
  the model↔artisan↔version-history FUSION, real + working today; (b) the **multi-model 8×8 gallery +
  Generation Console** (routing transparency: per-model PRIMARY counts, dropped pins WITH reasons);
  (c) consistent-character turnaround sheets (a real workflow).
- **CONVERGENCE:** photolif's per-edit JSON version history == this repo's NEW per-piece version chain. Both
  halves independently grew the same thing → unify to **ONE version-history system across all media** (image
  edits + pixel-art revisions + video + …).

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

**The recycling is FEATURE-deep, not just engine-deep.** Every platform feature is a *medium-agnostic agent
capability* — set the context to Pixcel Art and it serves pixel-art too: the **prompt-coach** (five-part
formula → a recipe with a per-medium cookbook: image = Subject/Action/Context/Composition/Style; pixel-art
= Subject/Angle/Density/Palette/Read), the **multi-variant "blast"** (8×8 gallery applied to "create three
owls" → fan out N artisan designs, pick best; "Redo" is the single-shot seed), routing, version-history,
the studio editor. **Pixcel Art is a first-class MEDIUM under the same feature set — NOT a vertical bolted
beside the image platform.** One feature set, every medium, agent-driven, `auto` by default. The deepest
"one product" proof: not two products sharing a substrate, but one feature set serving all media.

## The architecture (one organism)
- **Front door — the Pixcel Assistant** (autonomous orchestrator): the user talks to ONE agent. It reads the
  whole project, makes sense of the prompt, surveys available tools/paths/**workflows** (Pixcel-art, image,
  video, multi-image gallery, multi-video gallery, scenes, storyboards…), shapes the best workflow, asks/
  suggests naturally, and **delivers/routes** — responding with **A2UI** (the agent drives the UI; CRUD-style
  GUI, never prose). *This keeps photolif's agent CONCEPT (route → workflows) and drops its brittleness.*
- **PRESENTATION INTELLIGENCE — the agent has TWO selection jobs (the chef):** from the intent classifier
  it picks (a) the **RECIPE** = which workflow/specialist, AND (b) the **PLATE** = which A2UI presentation
  scaffold + AI context (photolif's "content styles" — a prepackaged UI scaffold + skill/behavior context
  per intent class: compare→radar+table, how-to→steps, dashboard→KPIs, analytical→charts, …). So the
  primitive's A2UI output = *pick-the-scaffold-then-fill-it*, NOT just emit-components. The scaffold+context
  library is **core IP** (port photolif's `content_styles/`; the name "content style" is droppable).
- **ONE LAW across the whole system: `auto` = the agent decides (the default); `custom` = user override.**
  Identical to pixel-art "Aspect: Auto." Applies to model pick, workflow pick, AND presentation pick.
  Restore `auto`-as-default everywhere (photolif regressed it to `custom`). This is the autonomy dial's
  resting position; the user can always turn it down.
- **The Pixcel Agent primitive (the CHEF)** — the recycled statue as a context-driven framework. The loop
  maps 1:1 to a chef: **VISION** (the order + the custom "no sauce" tweak, as a floor) → route a **RECIPE**
  (the swappable per-task context-as-DATA = `{ingredients: tools/assets/data, instructions: the workflow}`,
  e.g. the teriyaki JSON) → **DELEGATE** to sous-chefs (skill/specialist sub-agents via MCP) → **GATHER**
  ingredients (tools/data/components) → **COOK** (execute the passes, dynamically fold the custom request —
  the adaptation only an autonomous agent can do) → **QA** (fresh-eyes validate: correct + hot) → **POLISH**
  (garnish/clean the brim) → **PLATE** (A2UI presentation). keep-best = never serve a worse plate. **The
  recipe is RAILS (structure/context-as-data); the chef is AUTONOMY (adapts within the box) — the hybrid
  resolved.** Swap the recipe → any dish: context="pixel artist" → the artisan; "image router" → the oracle;
  "comparison" → the radar plate. "Hire a master, set the recipe."
- **EMERGENT WORKFLOWS — the agent is NOT limited to a predefined menu (CRITICAL; fixes the original
  design's core flaw).** Human-authored, predefined workflows were a *bottleneck*. The autonomous agent
  **finds an existing workflow OR synthesizes a brand-new one** from a unique prompt: it researches models/
  features, constructs the workflow plan, and **generates the A2UI on the fly**. The splash cards/carousel
  are **examples/starting-points, never the ceiling** — hand-authored recipes are just the cold-start seed.
- **WORKFLOW PERSISTENCE (future state, design the DB pattern).** Users **save** agent-created workflows;
  the agent stores them in memory. Workflows behave like **AI threads/sessions**, named by the originating
  prompt ("I want to create an owl…", "How do I do Pixar style…", "Multi-shot storyboarding"). The splash
  surfaces **recent/saved** workflows (recycle the card slot, or a new surface — TBD). Needs a DB schema.
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
- **P3 · Port photolif's breadth (Python → TS) + re-pattern as specialist agents.** The big lift, AFTER the
  first slice proves the architecture: port the 8×8 routing/ranking, 29 image + 20 video providers, video/
  scenes/storyboards pipelines from Python to TS — and recast them as specialist agents (statue pattern +
  domain context + rails), not brittle decision trees. Pixcel-art = flagship specialist, engine preserved.
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
