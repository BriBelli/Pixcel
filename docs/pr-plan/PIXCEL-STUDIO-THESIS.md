# Pixcel Studio — the asset system as a production pipeline (thesis + scoped spec)

**Status:** first evaluation, from Brian's keystone brain dump (2026-07-14/15). Companion to `docs/pr-plan/ASSET-PERSISTENCE.md` (the buildable slices). This is the *why + shape + risks*.

---

## 1. Thesis (my evaluation)

**Pixcel is not a chat that makes images. It is a production pipeline where every artifact is a typed, provenance-rich Asset node, and the product is the graph that connects them.** Reference → generation → 15-sec clip → storyboard → film. The **asset spine IS the product**; the chat, the builder, the gallery, the node view are all *views onto that one graph*.

Three things make the vision cohere, and they're the moat:

1. **One substrate serves beginner → pro.** "Create a car" and "build a storyboard for Project X from my saved assets for a 15s video" run on the *same* Asset + lineage-edge model. Minimal→advanced is a matter of how many nodes you compose — not different products. This is what Brian means by "agnostic global features whose *compilation* performs any task": a small set of powerful primitives (Asset · Reference-edge · Scene · Storyboard · Film · View), composed — **not** a chasing pile of per-feature UIs.

2. **The moat is orchestration + standardization, not the models.** Anyone can call nano-banana or Seedance. The value is (a) the **Operator** turning a messy pro prompt into a correct multi-step workflow, and (b) the **Model Agent** dissolving each model's convoluted, siloed docs into one entryway + a common prompt formula. Seedance being "awesome but behind bad separate docs" is the exact wedge.

3. **"Views, not screens" is the antidote to brittle UX.** Brian's own warning: node builders are cages if done wrong. The escape is that the node/storyboard/timeline are *views onto a free graph the agent can also construct* — never a fixed node palette the user is trapped inside.

**Verdict:** the vision is coherent, differentiated, and — critically — *buildable in layers where each earns the next.* The risk is not the idea; it's scope discipline and the Operator's decision-tree explosion (§5).

---

## 2. The layered architecture

```
Layer 4  FILM          stitched storyboards + audio → hi-fi export        (Studio timeline)
Layer 3  STORYBOARD    ordered Scenes/shots + transitions                (node canvas)
Layer 2  SCENE         refs + prompt + model → 15s clip(s)               (atomic generation unit)
Layer 1  REFERENCE     the @image spine: typed slots bind assets→gen     (authoring layer)
Layer 0  ASSET         image·video·audio·doc·pixel·vector                (the atom + lineage edges)
─────────  cross-cutting  ─────────────────────────────────────────────
VIEWS      library grid/row  ·  per-asset lineage node-graph  ·  timeline
OPERATOR   escalates: single-gen → multi-step sub-workflow orchestration
MODEL AGENT industry specialist: model truth + prompt standardization
RESOURCE   two-tier retention · storage quota · AI-spend cap (per user)
```

Each layer is a typed record that references the layer below **by id** (photolif's proven indirection: re-render a Scene → every Storyboard using it picks up the new take). The lineage edges (`reference_asset_ids`, `parent_asset_id`) are what the node views render.

---

## 3. Scoped feature set — phases, requirements, acceptance criteria

### Phase A — Foundation (persistence + provenance) · *buildable now, mostly in flight*
**Features:** durable assets; recipe/provenance; lineage edges; two-tier retention (in-state vs saved); the Assets library (grid/row + Details drawer + tags + upload).
**Requirements:** `asset` entity with `source/retention/reference_asset_ids/recipe`; persist generated + attached-reference assets; hydrate on reload; a DB-backed library UI.
**Acceptance:**
- Generate → reload → images present *with recipe*. ✅ (Slice 1 shipped)
- Attach a reference → it persists as an **in-state** asset and rehydrates into the builder on reload. *(Slice 2)*
- A generation's `reference_asset_ids` point at the reference assets that produced it. *(Slice 2 — first real edges)*
- The Assets library lists all assets, filters by kind + tag, opens a Details drawer (title/alt/caption/description/role/tags), supports upload via a top-right **Add** (drag-drop) — **no hidden tabs**, lazy-load on scroll. *(Slice 4)*
- Only **saved** assets count against quota; in-state assets sweep on GC. *(Slice 6)*

### Phase B — The pipeline (Scene → Storyboard) · *the "new studio" core*
**Features:** Scene (atomic gen unit with typed ref slots); Storyboard (ordered scenes + transitions); the node canvas view.
**Requirements:** `scene` + `storyboard` records; shots reference Scenes *by id*; per-edge transition (`none`/`crossfade`/`agent-generated in-between`); the `@image` authoring layer compiling to typed slots.
**Acceptance:**
- Compose N reference assets + a prompt into a Scene → generate a 15s clip; a "take strip" holds A/B variants without polluting the library. 
- A Storyboard sequences Scenes on a canvas; reordering + per-edge transitions work; re-rendering a Scene updates every Storyboard using it.
- `@image1…@imageN` tokens in the prompt resolve to typed slot bindings at send; the model receives a **verbatim prompt + ordered typed refs** (prompt-integrity preserved).
- Per-asset **lineage view**: click a generated asset → its metadata + associated resources + a node-graph of its parents/children.

### Phase C — The Studio (film timeline + audio + export)
**Features:** film timeline stitching storyboards; audio (SFX / lip-sync / style-pacing / final mix); hi-fi video+audio export.
**Acceptance:** stitch storyboards into one timeline; attach/generate audio per the multi-use model; export a single hi-fi video+audio file with provenance.

### Phase D — The intelligence (Operator escalation + Model-agent specialist)
**Features:** Operator that decomposes complex pro prompts into sub-workflows; Model Agent as researched industry specialist + doc-standardizer.
**Acceptance:**
- Pro prompt ("storyboard Project X from saved assets, 15s") → Operator **proposes a workflow** (not a single gen), surfacing the real fork (NL-image-storyboard *vs* controlled per-frame) as A2UI options; zero spend until the user picks.
- "Top image/video models right now?" → Model Agent answers with current, **cited** intel (even for API-less models like Seedance), and can standardize any model's docs into the common prompt formula.

---

## 3.5 Model research — the standardization thesis is confirmed

A capability sweep of Nano Banana, Veo 3.1, GPT Image 2, Lyria, and Seedance 2 (mid-2026) returned the single most important validation:

**Every model, stripped of syntax, wants the same semantic spine:**
> **Subject → Action → Context/Environment → Composition/Camera → Style & Ambiance** (+ a typed reference list, a literal-text-to-render slot, and audio intent).

- Image models (Nano Banana, GPT Image 2) use *exactly* our builder's 5-part formula. Veo prepends **Cinematography**; Seedance adds a trailing **camera + audio** block — both supersets of the same spine. **Our `Subject/Action/Context/Composition/Style` formula IS the canonical schema.** We didn't approximate it — it's the industry's actual common denominator.
- **Seedance is the proof the adapter earns its keep.** Its docs impose a positional `@image1–9 / @video / @audio / @character` **DSL** with load-bearing ordering, per-mode templates, and hard caps — genuinely convoluted. The `@image` tags Brian saw *are Seedance's native grammar*. Our `@image` authoring layer **compiles the canonical prompt → each model's native dialect** (Seedance's `@`-pointers, Veo's "ingredients"/timestamp phrasing, Nano Banana's narrative refs) so **the user never touches the DSL.** That is the standardization moat, made concrete.
- **The adapter's shape:** one canonical prompt schema + a **per-model capability manifest** (clip length [Veo 4/6/8s · Seedance 5/10/15s], reference caps [Nano 14 · Seedance ~12 typed], resolution, aspect ratios, syntax dialect, sequence mechanism). The Model Agent maintains this; the per-model renderer reformats canonical→native. We already have `getModelFormula` + capability facts — this is the same pattern, extended.
- **The storyboard fork is model-dependent** (sharpens §3 Phase B): GPT Image 2 natively emits *up to 8 consistent images* from one prompt (the natural-language path); Nano Banana has *no* native sequence and delegates to **Veo** (keyframes→motion); Seedance uses **timeline/timestamp blocks**. So "how to build a storyboard" isn't one answer — the Operator/Model-agent pick the path *per target model*. This is exactly why the Operator must propose, not auto-pick.

## 4. My design opinions (where I'd push / diverge / simplify)

- **Build the graph before the graph *view*.** The node "365 sphere" is the reward, not the start. Phase A/B make the edges real; the node canvas only sings once there's a graph to render. Don't invert it.
- **`@image` = authoring sugar that compiles to typed slots.** Keeps prompt integrity AND the inline expressiveness the industry uses. This is the reconciliation — not a fork we agonize over.
- **The Operator becomes a PLANNER, not a bigger classifier.** The decision-tree explosion (§5) is not solved by a smarter single verdict — it's solved by decomposition: the Operator emits a *workflow* (ordered specialist calls), and uses **propose** to hand genuine forks back to the user. This is the OODA "workflow construction" job we already framed.
- **Lean on `propose` for the fidelity/NL fork.** Don't auto-pick NL-storyboard vs per-frame — surface both as workflow paths; the Model Agent *recommends* based on intent. This is the "tunable-determinism fence knob" made concrete.
- **Views, not screens — enforce it structurally.** Every surface reads the same asset graph; none owns its own data. That's how we avoid the brittle rewind-cage.
- **Simplify the retention model to the entry-point rule** (chat = in-state, upload/save = first-class). Don't over-engineer TTLs now; land the fields, enforce GC in Phase A's Slice 6.

---

## 5. Risk concerns (ranked)

1. **Operator decision-tree explosion (highest).** As prompts get pro-complex, a single classify can't hold it. *Mitigation:* Operator-as-planner + `propose` + sub-workflow decomposition; measure with real hard prompts, not "create a car." This is the make-or-break, and it's exactly where photolif's front door would have buckled.
2. **Cost/storage blowup.** Real gen-AI + durable media. *Mitigation:* two-tier retention + per-user storage quota + spend cap + meter-everything. Design the fields now, enforce before any public exposure.
3. **Fidelity-vs-natural-language mismatch.** Auto-picking the wrong storyboard path disappoints pros. *Mitigation:* propose both; Model Agent recommends; never silently choose.
4. **Model-doc standardization is lossy + drifts.** A common formula can flatten model-specific power, and models move monthly. *Mitigation:* common core + per-model shards (we already do formula-per-model); the Model Agent owns maintenance + live verification before quoting.
5. **Node-graph complexity/perf.** A whole-account spider web is unusable at scale. *Mitigation:* scope to per-asset lineage first (bounded), progressive disclosure, virtualize; the account-wide graph is a later, opt-in view.
6. **Over-scope / never ship.** The vision is enormous. *Mitigation:* the phased ladder — ship Phase A persistence first; each layer must earn the next with a working demo.
7. **The cage tension (his own warning).** Node builders trap users if they're fixed palettes. *Mitigation:* the agent can construct/modify the graph too; the node view edits a *free* graph, not a bounded flowchart.

---

## 6. Recommended path

Stay the course on **Phase A** (it's the foundation everything else stands on and half-built): finish **Slice 2** (attachments as in-state assets + lineage edges + rehydrate), then the **library UI** (Slice 4), then **retention/quota** (Slice 6). In parallel, the **Model Agent** gets its industry-specialist upgrade (research + doc-standardization) since it unblocks Phase D and is independently valuable. **Phase B (Scene/Storyboard)** starts once the asset graph is real. Don't touch the film timeline (Phase C) or the full node canvas until B proves the edges.

**One substrate, many views, earned in layers.**
