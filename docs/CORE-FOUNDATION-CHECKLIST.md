# Pixcel — Core Foundation Checklist (the shapes the statue must account for NOW)

> **Purpose.** Before we carve deeper, account for **all (or almost all) core shapes** at the core level.
> If a shape isn't named here, the statue's broad form is incomplete and detail work will crack it.
> This is a *completeness* checklist, not a build order. Pair with the memories it cites.

**The pipeline:** `[[DB → LLM(s) → Backend] → [Frontend → UI]] → User` — the **PRODUCT** is the DB→LLM→Backend
spine; the **CONDUIT** is Frontend→UI. Design them as one unit. Don't polish a conduit over a hollow product.

**Legend:** ✅ decided/locked · 🟡 decided-in-principle, needs depth · ⬜ OPEN / pending input (esp. Brian's DB handoff).

---

## v1 SCOPE — the agreed boundary (2026-07-01, reduce the sprawl)
**Success test:** Brian (the end user) creates a **Netflix-quality ~15-minute film SEQUENCE from one of his written chapters** (Project Echelon / Johnny Blackbones) — through Pixcel.

**Deliver:** the **photolif concept FUSED with the Pixcel autonomous-agent** — the complete agent experience (assistant · chauffeur · real-time dynamic **workflow-creator**), the full **MCP advisor/executor** role pattern, the **artisan statue autonomous pattern** (the solver), the **DB/data patterns**, and **performance**. Get the **Pixcel Agent + related agents + the main bones** working, geared to truly generating something amazing.

**v1 surfaces (the shell):**
- **Splash** (the expressive wall) · **Chat** page (front door).
- **Left Primary Nav** (56px rail) → expands into a **panel of per-category records** (chat threads for Chat; projects for Art/Image/Video; correlated assets per category).
- **Right Settings panel** · **Right Agent panel** (**Ask** vs **Agent** modes — reads the whole project, acts on it: edit the prompt, generate views, restyle the sheet).
- The **Image workflow** with the **Prompt Guide bar** — the 8-part structured prompt builder (Subject/Action/Context/Composition/Style… quality-scored, chips/anchors) that writes into the **asset 8-part schema** (same structure; the consistency loop).

**Build requirements:**
- **DB + Auth** (Auth0 id on ALL records) — the substrate.
- A **powerful UI component library** unified in brand/style with the **A2UI React library**; **A2UI at the LATEST version/packages/patterns (v10+)**.
- Implement the **EXACT Claude designs** from the handoff — to a T.

**Deferred to Phase 2:** the **Pixcel Artisan Studio** (pixel-art live-paint / artboard) and the wall's **X→Y modes** (fullscreen video / retro game / VR film). Keep the **Pixcel JSON storage** pattern throughout.

---

## A. Meta / the lens (how we build)
- ✅ Product → Conduit → User; never lipstick on a pig — the DB+agent must be real before polish.
- ✅ Best UX = complex made to *feel* simple; engineered; don't rush; think more.
- ✅ Statue Method = the system primitive (VISION → shape → polish → QA, 96% gate, keep-best, bonus loop).
- ✅ Quality is the product — never trade for cost/speed; test vs the proven baseline + revert on regression.
- ✅ Grow with **self-imposed (agent-reasoned) limits**, not brittle code; hard-code only for guarantees.
- ✅ All **TypeScript/Node** (port photolif's Python, don't carry it).
- ✅ **Crown jewel** (the artisan engine) stays untouched — only re-skin/re-position its containers.

## B. DATABASE — the substrate  *(product half — ⬜ mostly pending Brian's DB-chat design handoff)*
- ⬜ **DB-driven design end-to-end** — Brian's improved DB-chat design (the resource he's sending). Study first.
- 🟡 **Centralized ASSETS store** (DynamoDB) = the LLM's "central nervous system"; queryable **as a tool**; rich metadata (Title/Alt/Caption/Description/Role/Tags/File; flat GitHub-style tags; namespaces `start_frame`/`character_sheet`/`style`/`pose`).
- 🟡 **Primary categories Chat · Art · Image · Video → SEPARATE tables** (per-category records/history).
- ⬜ **Chat sessions/turns persistence** (per-category history — the left "Chat History" list).
- ⬜ **Agent / session / workflow STATE persistence** (the persistent intelligence layer, resumable).
- 🟡 **Auth0 user id tied to ALL records** (every row is user-scoped).
- ✅/⬜ **Media-as-JSON**: every asset a diffable JSON program (PXSFrame etc.) + **version history / provenance / trajectory** (concept ✅, DB shape ⬜; ties to on-chain provenance).
- 🟡 **Metadata schema** (the 8-part media metadata).
- ⬜ **LLM access/query interface** over the store ("Ask" = query, "Agentic" = act).

## C. LLM(s) — the intelligence  *(product half)*
- ✅ **Global Pixcel Agent** = advisor / orchestrator / conductor / overseer ("octopus"); **Opus 4.8 default**. **REVISED: the SYSTEM models (advisor + executors) are CONFIGURABLE in Settings** (not just media models) — best-default, but changeable; Brian dislikes **Sonnet** (reckless), wants to test a middle option (Gemini / Haiku). Change = power-user/builder setting; best stays the default.
- ✅ **Job = establish workflows** by CROSS-VALIDATING intent; classify + route + clarify + construct folded into **ONE router** (2-step, not a separate v3 classifier).
- ✅ **96% confidence gate** (ask vs go); distinguish **goal-expression** (→ inform + offer) from **generate-now** command; assumption-forward, never a cold menu.
- ✅ **TWO workflows on send** — (1) immediate async response, (2) parallel **autonomous statue/solver** workflow.
- ✅ **Executor / tentacle pattern** — advisor (Opus) dispatches hyper-focused executors (Sonnet), which refer back; executors/sub-agents **not selectable**.
- ✅ **The statue/artisan engine = the "solver agent"** (the crown jewel).
- ✅ **Multi-LLM as roles** (the chef + swappable context per role: image-oracle, video-master, prompt-coach…).
- ✅ **Tunable determinism — the "fence knob" (the Canva-and-beyond differentiator).** Any workflow/stage can be pinned to ANY % deterministic: from ~99% (a tight, Canva-like *templated* workflow — the AI gets a tiny window) through fully autonomous. Same engine spans templated → autonomous; Canva can only do templated. Shape/fence at deterministic points; the LLM is powerful *within* the window.
- 🟡 **The agent's TOOLSET** (its ingredients): **assets query**, **web search**, **location/context**, the **generation pipelines** (image/video/pixel/vector), **MCP** tools — with free will to reach past them.
- ✅ **Continuous / interruptible interaction** — steer mid-flight; side-question vs steering interjection.
- 🟡 **Content policy** — TV-MA / mature cinematic, non-pornographic; permissive APIs + moderation toggles.
- ✅ **Guardrails** — hard-code ONLY for: safety, the Stay-Pure/PXSFrame invariant, spend gates, crown-jewel untouchability, deterministic contracts.
- ✅ **Fan-out / "Both"** — multi-pipeline in parallel, capability-aware; returns A2UI thumbnails.
- 🟡 **Bible-as-context** — Recipe = context-as-data at film scale (feed a story bible → continuous scenes).

## D. BACKEND  *(product half)*
- ✅ **SSE streaming contract** (loading → text → a2ui → suggestions → done); async pipelines.
- 🟡 **API routes** (Node/TS): `chat-turn` (built, stub), `generate-art`, `live-art`, + workflow routes.
- 🟡 **Multi-model providers** (image: FLUX/Ideogram/Recraft/Stability/Gemini/GPT/Grok/Nano-Banana; video: Veo 3/fal/Replicate) + **routing as a reasoning ORACLE** (not a brittle tree) + fallbacks.
- 🟡 **Async workflow execution + executor management** (detached jobs, refer-back, resume).
- 🟡 **Fan-out execution + user-controlled spend** (routing balanced ↔ MAX, model count, Loading Detail/Style).
- 🟡 **Media-as-JSON substrate + async stitch/transition** (the film pipeline — generate scenes async, stitch, transition; "Kinesis-like").
- ⬜ **FFmpeg / lossless frame extraction**.
- 🟡 **Spend / billing gates + monetization** (usage-based; best-model = aligned incentive).
- ✅ **Auth** — Auth0 SPA (`@auth0/auth0-react`) + custom ROPG login modal.
- ⬜ **A2UI protocol server contract** — **v10+** modern pattern + data design (don't carry photolif's v8).

## E. FRONTEND  *(conduit half)*
- ✅ **All React/Next** (FORK-1 resolved).
- 🟡 **Design system to a T** — the real `colors_and_type.css` (`--a2ui-*`/`--pxs-*`), **no new hex** (replace my partial `tokens.css`).
- 🟡 **Brand assets** — Pixel-X mark (via `<use>`/mask), IBM Plex, the Lucide set, provider icons.
- ⬜ **A2UI React renderer** — GENERAL dynamic protocol renderer (v10+), renders anything the agent emits.
- 🟡 **State** — Zustand slices/stores (grid/animation/ui + chat-turns + per-category), history/auto-save.
- ✅ **Client SSE readers/reducers** (the proven pattern).
- 🟡 **Continuous / non-blocking chat input** (type while working).

## F. UI / UX — the living canvas  *(conduit half)*
- ✅ **The UI IS the agent** — persistent **z-0 digital wall** = its face/expression.
- ✅ **Wall = REAL Pixcel grid** (one screen/one resolution, TV model, canonical **RES ladder**, pixel-perfect logo).
- ✅ **Polymorphic per MODE** — pixel-art → the living wall; image → the **dotted IDE canvas**; video / AI-face / **dormant heartbeat**; agent-driven.
- ⬜ **Persistence** — the wall NEVER re-mounts; splash → workflow = one continuous state (**the bridge — not built**).
- 🟡 **Transitions** — graceful, no-fluff, "almost not there"; agent picks the easiest; a standardized tasteful style; NOT hard-defined.
- ✅ **Z-model** — wall z-0 · left nav anchor · right AI accordion · floating A2UI **edge** panels (flubber / ART REGION safe-area).
- ✅ **Nav** — 56px rail; **Chat · Art · Image · Video** + Export/Assets/Assistant; Art = `scribble`; 2.5px accent bar.
- 🟡 **Chat** — capped column (rule #8, never full-bleed), streaming block-cursor, multi-step **plan rows**, **suggestions** links, **sources/citations** row.
- 🟡 **Loading experience** — the end-to-end streamed reveal is a "work of art"; Loading Detail/Style/Thought; pacing target (Opus ~16–30s, instant→text→a2ui).
- ✅ **Splash** — FROZEN gold-reference (real low-res wall + prompt bar).
- 🟡 **Component 7-state coverage** (default/hover/focus/active/disabled/loading/error).
- ✅ **A2UI ≈ 99% of the UI** (dynamic). A2UI element library: stat/card/chart/gallery/dashboard/table/options/alert…

## G. SURFACES — the category workflows  *(product + conduit)*
- 🟡 **Chat** — the front door / universal assistant (default, upsell Pixcel; validate intent).
- ⏸️ **Art / Pixcel Artisan Studio (pixel-art live-paint, artboard)** — **DEFERRED to PHASE 2** (Brian, 2026-07-01). Huge value + potential, but v1 focuses on the agent + generation pipelines → the episode. We still LEVERAGE the **Pixcel JSON storage pattern** everywhere (huge). The crown-jewel engine stays intact, just not the v1 target.
- 🟡 **Settings panel** — basic user settings (Model/Active-Model/Smart-Routing/Temperature · Tools: Content-Style/Performance/Web-Search/Geolocation/Data-Sources · Conversation: History/Max-Messages · Display: Action-Bar/Stream/Sources) + Media + Data-Sources tabs. **Where the system-model choice lives.** Leverage photolif's version as reference. On the checklist; build when needed, not day one.
- 🟡 **Image** — the Image IDE (sheet-grid ↔ focus editor, tool rail, **semantic edits + version history**, model fan-out, **Open in Studio** 300ms morph).
- 🟡 **Video** — generation + node **storyboarding** + scene chaining/stitching/transitions.
- ⬜ **Scenes / Storyboards** — Project Echelon (the film bible), scene records, reuse from assets.
- 🟡 **Assets** — the centralized catalog UI (metadata detail, tags/roles, → Scene / Animate actions).
- 🟡 **Studio/IDE** — the editor surfaces + export.
- ⬜ **Export** — formats (JSON / PXC / PNG / film) + the export affordance (a known gap).
- ✅ **Vector** — logos/fonts/icons/glyphs/sprites + photo→vector (scope noted).

## H. Cross-cutting product truths
- ✅ **North-star** — the AI **film studio**; customer = Brian; the **"Don't Let the Train Stop"** proof demo; living/dynamic/interactive media (movies → games → anything).
- 🟡 **Business / monetization — DUAL-SHAPING (account NOW, don't build deep yet).** Engineering drives UX *and* the business — one interconnected product. **NOT Canva** (Canva = human-curated templates/materials + AI-assist, the human is the artisan; Pixcel = shape-the-LLM-then-unleash-it, the LLM *is* the artisan — but via the **fence knob** we also cover Canva's templated end). **Cost reality is a FOUNDATION constraint:** we run REAL generative AI, so truly-free is dangerous (1M users × $1 free = $1M debt). From day one the core must: **(a) METER every generation** (token/$ per user), **(b) HARD-CAP spend per user** (never charged hundreds/user), **(c) support two billing modes — subscription (monthly/yearly) + on-demand (pay-as-you-go).** Zero-barrier entry (Canva's growth engine: free stuff for an email → massive base → freemium → power users) is desired but gated behind a **capped free-token/bandwidth** allowance (or assume signed-up-and-paying). **Usage-transparency UX** like Cursor / Claude Code: plan tokens remaining, on-demand cap + proximity, real-time expenses/analytics/logging, alerts/triggers (keep users happy, paying, successful). "Cable-provider" model long-term. Build the *plumbing* (metering/caps/billing-mode hooks) into the foundation; build the billing UI later. Detail: [[project_business-monetization]].
- 🟡 **IP** — recipe-IP; fully on-chain compact art; trajectory provenance.
- ✅ **Security** — never expose the API key; gated generation (flag every spend); no exemplars in the AI pipeline; hand-authored gallery art.
- 🟡 **Performance / scale** — Web Workers + WASM + OffscreenCanvas keep the main thread free; async so the advisor stays available; low-res headroom.
- ⬜ **Collaboration / multiplayer** — the Train is paid, hosted-on-URL, multi-user, async-loading + JSON-stitched (a core shape if we chase the Train).
- 🟡 **Accessibility** — alt text / screen-reader fields already in the Assets metadata; carry through.

## I. OPEN — what we're waiting on / must decide before/at the core
1. ⬜ **Brian's DB-chat design handoff** (the gate — schema, tables, sessions, assets store).
2. ⬜ **A2UI v10+** protocol + data design (modern pattern; the general renderer contract).
3. ⬜ **The persistence "bridge"** (hoist the wall; one continuous state).
4. ⬜ **The film stitch/transition pipeline** (async scene generation → stitch → transition).
5. ⬜ **Export** formats + affordance.
6. 🟡 **Monetization/spend** model wired into the backend.
7. ⬜ **Scenes/Storyboards** data + surface.

---

### The question this checklist exists to answer
**Is there a core shape NOT on this list?** If yes, it goes in *now* — before we carve. Add it, decide it,
or mark it OPEN. The goal is to leave this spot with the whole statue roughed out and nothing unaccounted.
