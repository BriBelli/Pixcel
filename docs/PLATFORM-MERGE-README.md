# Pixcel × Sister Product — Platform Merge README

> **Purpose:** the build brief for joining **Pixcel** (this repo — the reasoned pixel-art engine) with
> Brian's **sister product** (multi-LLM + image/video → JSON, file editing) into ONE **media-as-JSON
> autonomous creative platform** — and getting it **IDE-style** for the UI. Hand this to the UI/IDE
> effort (Claude Code) as the north star.
>
> **Status:** Pixcel side is real and proven (engine, Studio app, live show, gallery). The merge + the
> IDE shell + the multi-LLM/image/video surfaces are TO BUILD. The sister product's internals must come
> from its own codebase — this README frames the join, not its implementation details.

---

## What Pixcel IS — the product, technically (read this FIRST)

**Pixcel is an autonomous artisan AGENT you talk to — not a pixel-art *tool* you operate.** You interface
with an autonomous *agent* through a **dynamic, conversational UI (A2UI — the agent drives the
interface).** The agent's job is to **work out the best workflow and guide you to a finished piece.** You
own the *what* (and the taste); the agent owns the *how*.

The autonomous-agent pattern is **recycled** — a general *"describe it → the agent figures out how to
build it → it builds it"* engine (the "do-anything, given time + money" agent). **Pixcel Art Studio is
one instance of it: an autonomous ARTISAN.** (Every other surface of the platform is the *same* idea — an
autonomous agent you interface with via A2UI. Pixcel is the proven first one.)

**The flow, from the user's seat:**
1. **Request** — ask for something as pixel art: as little as a single word (`owl`) or a detailed prompt.
2. **The artisan works autonomously** through its proven pipeline — **VISION → REFINE → … (the Statue
   Method)**: it commits a design, then sculpts it pass by pass, judging its own work with fresh eyes and
   keeping the best — a real artist's loop, no human required.
3. **Watch it create** — visualize → design → paint → edit, in **real time** (the live char-map show).
4. **Iterate + steer** — keep it, send it for **another round**, or give **optional feedback** to direct
   it. You commission and curate; the artisan executes.

**Mental model:** not "a button that spits out an image" — **"an autonomous artist you commission, watch
work, and direct."** The UI is the *conversation with the agent + the window into its work*, not a panel
of sliders.

---

## 0. The one-paragraph vision
Two projects independently converged on the same primitive — **media as structured JSON, not files.**
Pixcel reasons *pixel art* into JSON (watchable, structured, hardware-valid). The sister project turns
*images/video* into JSON via *multi-LLM* generation + editing. Merged, they become a **media-as-JSON
platform** where a **convergent autonomous agent** (Pixcel's proven "Statue Method," generalized) uses
**the right model for each role** to create/edit any media — presented as an **IDE**, with pixel art as
the proven hero surface and the platform as the growth IP. *(Full thesis: the `pixcel-vision` skill →
PLATFORM-VISION.md.)*

---

## 1. The two products

### Pixcel (this repo) — what already exists
- **Nx monorepo**, two packages: **`@pxs/core`** (headless JS lib — data model, renderers, helpers) and
  **`@pxs/studio`** (Next.js 16 / React app, client-only — Web Workers + WASM).
- **Data model (the whole point):** images are JSON. `PXSFrame = { cols, rows, cells:[{x,y,color}] }`;
  also the **char-map** (palette `char→hex` + a grid of chars). **"Stay Pure"** = one solid color per
  cell (valid for LED/e-ink/on-chain). See `AGENTS.md`, `CLAUDE.md`.
- **The Studio app** (tabs today): **ART** (gallery + the **Pixcel AI** live generation panel), **GRID**
  (the pixel editor), **IMAGE** (rasterize/convert a photo → JSON, Photo + Vector modes), **ANIM**.
- **The engine** — the **Statue Method / hot-potato** in `packages/pxs-studio/src/lib/live-jobs.ts`:
  VISION (commit a feasible, native-to-resolution design) → REFINE (one fresh-eyes call per pass that
  JUDGES then FIXES) → keep-best. Autonomous, ~$0.5/piece, converges in a few passes.
- **The live show** — the **real-time char-map**: cells plot on a grid *as the model writes them*
  (stream-parsed output), then cascade to color. Contract in `docs/PIXCEL-LIVE-SSE.md`.
- **Trajectory capture** — every run (brief + passes + audits + final) is saved → the training corpus
  for an eventual fine-tuned model (Option 3).
- **The moat:** structured-data output + the convergent *method* + the *watchable* process + the
  *trajectory data*. NOT raw image quality (the big labs win that). Authentic **low-res reasoned** pixel
  art is uniquely ours — others *rasterize/downsample* a photo to fake it.

### Sister product — what it brings (per Brian; confirm against its code)
- **Multi-LLM:** every major lab (Claude / GPT / Gemini), runnable **separately or dual/parallel**.
- **Image + video generation + EDITING → JSON** (uses models for their strength: raster/photoreal).
- **File editing → JSON storage** (media-as-JSON as a storage substrate; already shares **Pixcel's
  `ImageHelpers.loadImage` image→JSON conversion** — proven, instant, the literal integration seam).
- **The ambition:** go from *brittle* hardcoded AI workflows → an **autonomous agent that creates proper
  workflows.**

---

## 2. The shared primitive (the seam)
**Media-as-JSON.** Both products already speak it; Pixcel's image→JSON converter is already running in
the sister project. This is the platform's data substrate AND the join point — every surface serializes
to/from the same structured-JSON media model (pixel frame · image-as-JSON · video-as-JSON · edit-as-JSON).

---

## 3. The unified architecture
```
SURFACES   Pixel-art (hero) · Image gen+edit · Video gen+edit · Autonomous Studio (IP/growth)
   │            │                  │                 │                    │
ENGINE   ───────┴──────────────────┴─────────────────┴────────────────────┘
   │     The Statue Method, GENERALIZED: a convergent autonomous agent that commits a
   │     vision/workflow → shapes → polishes → QAs → keep-best (never regresses/wanders).
MODELS   Multi-LLM as ROLES: reasoning BRAINS orchestrate + judge (optional consensus "forum");
   │     generation HANDS produce raster image/video. Right model per job — NOT "all, always."
PRIMITIVE   Media-as-JSON — the shared contract every surface serializes into. The moat + the seam.
```

**The big move (sister's #1):** the Statue Method's anti-churn discipline (commit → shape → polish → QA →
keep-best + an independent judge) is exactly the cure for *brittle/wandering* agentic workflows.
Generalize it from "paint pixel art" → "**author a workflow**." That convergent agent IS the platform's
brain.

---

## 4. The UI / IDE direction (the focus of this handoff)
Make it **IDE-style** (VS Code / Cursor feel), because the product is "describe creative work → watch an
autonomous agent build it, structured, watchable, editable."

**Shell layout:**
- **Left rail** — surfaces/tools (Art · Image · Video · Grid · Anim · Autonomous Studio) + the
  **gallery/project explorer** (media-as-JSON records, hearts/favorites, history).
- **Center** — the **canvas / editor / live stage** (the current Studio center easel + the real-time
  char-map live show + per-surface editors).
- **Right rail — the AI panel** — chat + the **agent**: the multi-LLM brain that runs the convergent
  engine, streams the live show, exposes controls (size/aspect/rounds/complexity/model), and folds in
  live human feedback. This is where "describe a piece → watch it sculpt" lives, and where the
  **workflow agent** ("do this multi-step task") will live.

**Cross-cutting:**
- **Shared storage** = the media-as-JSON gallery/records (one model, all surfaces).
- **Model picker** = the multi-LLM layer surfaced (pick a brain / a generation model / a consensus
  panel per task).
- **The live show** is reusable across surfaces (any generation streams its process).
- Pixel art is the **proven hero tab**; build it as **one surface on the shared core**, not the core
  with bolt-ons.

---

## 5. Principles & guardrails (NON-NEGOTIABLE — carry these into the UI/engine)
1. **Quality is the product; the show is icing.** NEVER trade output quality for watchability, cost, or
   speed. Test any change that touches the art against the proven baseline; revert on any drop.
   *Display-only changes (the live show, labels) are exempt — they can't touch the art.*
2. **No exemplars to the generator** (A/B-proven: exemplars homogenize + cap the ceiling). An input
   image is **intent** (read by VISION) or **mechanical convert** (digitize) — NEVER a style to imitate.
3. **Image LLMs are for photorealism + style-transfer ONLY.** For stylized 2D/2.5D graphics (the whole
   game-art heritage — Doom/KI/Nintendo/Sega), reasoned pixel/vector design is the product; an image
   model's *raster shows right through.* Don't offload the stylized art to a generator.
4. **The art = optimal NATIVE design per resolution.** Each size is its own design (not an upscale);
   higher res = more detail, never more photorealism. Low-res reasoned art is the moat.
5. **Never override explicit user intent.** Auto = the artist decides; an explicit request
   (angle/size/complexity) is a directive to honor + adapt, never silently override.
6. **Per-class craft is the model, not a hack** — tailor the engine per subject-class (the way a master
   adapts per art form). It compounds into IP and bootstraps the trained model.
7. **The moat is NOT raw quality** — it's *structured-data output + the convergent method + the watchable
   process + the trajectory data + provenance.* Lead with that; multi-LLM/image/video are table stakes.
8. **Spend guard:** per-job COST cap ($3–5 normal, $30 hard max) protects the account; token *budget* is
   free headroom (you pay only for what's generated) — don't throttle it.

---

## 6. Adjacent opportunities (captured, not required)
- **Fully-on-chain art** — compact PXSFrame (<1KB) can live 100% on-chain (unlike IPFS-pointer NFTs);
  + trajectory = provenance → collectibles. See `docs/ON-CHAIN-PIXCEL.md`.
- **Vector space** — logos / fonts / icons (.ICO) / glyphs / sprites; existing logos = exact 1:1
  convert, inspired work = the artist designs. See the `project_vector-space-scope` memory.
- **Trained model (Option 3)** — fine-tune (SFT/LoRA, distilled from Opus) on the trajectory corpus for
  cents/seconds at scale. Later, when volume justifies it.

---

## 7. Pointers (read these)
- **Strategy:** the `pixcel-vision` skill → `MAX-POTENTIAL.md`, `USE-CASES.md`, **`PLATFORM-VISION.md`**.
- **Architecture / data model:** `CLAUDE.md`, `AGENTS.md`.
- **The engine:** `docs/THE-STATUE-METHOD.md`, `docs/PLAN-QUALITY-ENGINE.md`, `lib/live-jobs.ts`.
- **The live show:** `docs/PIXCEL-LIVE-SSE.md`, `docs/MATRIX-LIVE-SHOW.md`, `docs/PLAN-LIVE-SHOW-V2.md`.
- **Image-as-intent (deferred feature):** `docs/PLAN-IMAGE-INTENT.md`.
- **The captured principles:** the memory files (quality-is-the-product, no-exemplars, per-class-craft,
  low-res-moat, never-override-intent, platform-vision-merge, …).

---

## 8. The one-line truth
*You didn't build a pixel-art app and a media tool — you built (twice) a **media-as-JSON platform**, and
the Statue Method is the convergent autonomous engine that makes multi-LLM workflows produce **finished**
work instead of brittle or wandering ones. Make it an IDE: pixel art is the proven hero; the platform is
the IP that grows. And never, ever trade the quality of the output — that's the product.*
