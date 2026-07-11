# The Model Agent — the canonical knowledge system

> Canonical architecture (2026-07-10). The Model agent is the **driving force** behind the Prompt
> Builder Studio. The Prompt Guide is the Model agent's knowledge *surfaced*; the Image agent is a
> **router + referencer**, not a creator. Everything the user shapes is driven by the **target
> model's documented prompt formula**.

## The reframe (who drives what)

- **Model agent = the powerhouse.** It owns all model knowledge and drives the builder: the parts,
  specs, suggested chips, scoring, and recommendations all derive from the **target model's
  documented prompt formula + capabilities**. It is the canonical Prompt Guide brain.
- **Prompt Guide = the Model agent, surfaced.** Not a side-panel of tips — it is the model-specific
  formula/coaching the Model agent emits, rendered for the user (the "why each part matters, for THIS
  model, and how to strengthen it").
- **Image agent = router + referencer.** Its PRIMARY job is routing (pick/target the model) and
  REFERENCING the Model agent's model-specific formula — **not inventing**. It applies the formula and
  hands off to generate; it does not author the craft rules.

## One Model agent, all media

**One** Model agent manages **every generation model — image AND video** (and future media) over
**one** registry. NOT a separate image-model-agent and video-model-agent. Image-first now; video
models slot into the same registry + agent later. (Constructive / no per-media split — a backdoor for
video without a rebuild. See [[feedback_constructive-not-destructive]].)

## The three tiers (self-maintaining model knowledge)

1. **Registry — hot, in-state.** The canonical catalog: per-model structured facts (provider,
   capabilities, reference limits, aspect ratios, cost, `preview` flag, a pointer to its formula
   shard, `updated_at`, `source_url`). The fast path for routing/gating. *(Exists:
   `lib/engine/model-registry.ts`.)*
2. **Formula shards — warm, OKF skills.** Per-model **prompt FORMULA + craft**: the documented "how to
   prompt THIS model well" — which parts it rewards, its syntax, its strengths. This is what **DRIVES
   the builder's parts + scoring** for the target model. Markdown with `updated_at`. Injected on Orient.
   Crucially the formula includes **ASSEMBLY rules — order, weighting, format, and which parts even
   apply** — not just a part list. Different weighting (Subject-led vs Style-led), required ORDERING
   (some models weight by position), different included criteria. **So the same shaped intent yields a
   genuinely DIFFERENT final prompt string per model — you cannot send one prompt to N models.** The
   **assembler is model-driven** (the Model agent composes the final prompt per each model's rules),
   NOT a generic comma-join. This is exactly why the color-coded prompt view + the model toggle matter:
   flip models and you SEE the prompt redesign (different order/emphasis), not just a different score.
3. **Live research — cold, Tavily.** When a shard is stale (timestamp past a threshold) or a
   model/feature is unknown: research the provider + industry-leader docs, extract the formula/features,
   **verify**, and **promote** the finding → tiers 2/1.

## The maintenance loop (the "model scout")

A periodic sweep (cron) of provider/industry-leader sites for **new models, new features/components,
and deprecations** → proposes registry/shard updates (verified → promoted). This is the advanced,
thesis-driven researcher / feature-identifier Brian described.

- A model that needs a provider API key we **don't have** → registered `preview` (known, not callable
  — the flag already exists) **+ an admin/employee alert** (the token-gap queue). Human approves the
  key; then it flips out of preview.
- Freshness is explicit: every registry entry + shard carries `updated_at` + `source_url`; staleness
  triggers re-research.

## Selection (who picks the model)

The **generation** model is **agent-picked** (the two-gate router — best model for the intent) OR
**user-chosen** (it IS selectable, unlike the orchestrator BRAIN model, which stays locked to the
best). Establish **upfront**: (a) the target model(s) — agent or user, (b) the user's intent/prompt.
THEN the Model agent researches the target model's formula and drives the builder from it. If the user
doesn't know the models, the Model agent traverses tier 2 → tier 3 to recommend.

## How the Model agent makes a successful image (Brian's question, answered)

By pulling the **target model's documented prompt formula** from its knowledge and structuring the
builder + coaching around it — so the user fills exactly what THAT model rewards. It makes the model's
job easy by handing it its own ideal prompt shape. The **quality score** = the prompt measured against
that model's formula.

**Why the score is even possible.** A percentage — a bar, a target, a projection of success — needs a
*criteria* to measure against. The **formula IS that criteria**. No formula → no meaningful score, just
a made-up number. So the score is a **projection of accuracy against the model's formula**, and the
formula is only trustworthy because the Model agent keeps it true to the model's real documentation.
This is the whole basis of the surface: *context is the currency, and the formula is how you speak to
the model in its own language* — the difference between guessing and communicating precisely. It also
makes the score honest: we can show WHY it's 79, not just that it is.

## Reference INPUTS are model-shaped too (the Model agent drives the upload slots)

Reference images are NOT generic — each model has its own **input schema**, and the A2UI upload
component must render to match it (driven by the Model agent, same as the parts):

- **Typed slots** — Gemini / Nano Banana Pro: dedicated `character` / `style` / `object` references
  (seeded: `referenceLimits {object, character, style}` in the registry). The A2UI shows a dropzone
  per type, each with its own limit.
- **Named property fields** — Nano Banana: the API expects `character_images`, `reference_images`;
  uploads must land in the RIGHT field, not a generic bag.
- **Ordered / positional** — some Flux models require images in a specific ORDER (bad design, but we
  honor it): the A2UI shows an ordered list where position is meaningful.

So the registry's reference facts extend from a flat `maxReferences` to a **reference input schema**:
slot *kind* (typed | named | ordered), field names, per-slot limits, order-sensitivity. The Model
agent emits it; the A2UI renders the correct dropzones; the router maps uploads to the model's real
input fields at dispatch. A generic "Attach references" is a placeholder — the real thing is
model-shaped slots.

## Multi-model: the Model agent is the universal adapter (no universal protocol exists)

There is **no universal protocol** for model interfaces — top-N models have different parameters,
reference schemas, and feature surfaces (small to large). That fragmentation is exactly the gap
Pixcel fills: **the Model agent + A2UI + the JSON substrate ARE the universal layer**. The Model
agent normalizes heterogeneous model APIs into one coherent A2UI (human side); the router maps the
normalized inputs back to each model's real API at dispatch (machine side).

When **N models are targeted** (agent-picked or user-chosen — cf. the reference's "4 pinned + 8 auto ·
12 models"):

- **Shared core — fill once.** The common formula the user shapes (subject, style, composition); the
  Model agent maps it to EACH model's formula. The user never fills N forms.
- **Per-model divergence — only where they differ.** Reference schema (typed vs named vs ordered),
  unique features (editing, 4K, seed, aspect ratios), model-specific params → rendered as per-model
  A2UI sub-blocks, surfaced ONLY where models actually diverge (shared stuff isn't triplicated).
- **Score per model.** Each prompt measured against its OWN formula ("79% Nano Banana · 84% Flux") —
  honest per target, never one averaged fiction.
- **Generate → fan-out.** Each model gets its correctly-mapped inputs; outputs stream into the canvas
  per model.

The empty-canvas "feels like a chat but not" problem resolves the same way: it reads as a **workspace**
once it's populated with this A2UI (uploads, per-model slots, steps, then media) — the accumulating
canvas. Emptiness is the tell; rich agent-emitted A2UI is the fix.

## The unlimited agent composes bespoke workflows — and TEACHES

Hardcoding limits you; a weak agent limits you. Pixcel gives the agent the full pantry (model
knowledge + A2UI plating + JSON substrate) and lets it **cook the workflow to the request** — like a
chef assembling the perfect plate. Because the request × chosen models × their diffs are never the
same twice, **these workflows are one-of-a-kind almost every time.**

The A2UI is not just controls — it **teaches** (indicators as pedagogy):

- A component that exists only because a model has a **unique feature** carries an indicator: *"this
  is for Nano Banana — it does Y."*
- When two models **diverge**, show BOTH paths with the *why*: *"this way for Flux, this way for
  Gemini — they handle references differently."*
- Effect: the user learns how agents and models actually work, **by doing**. A single-model wrapper
  can't offer this. It turns the black box into a glass one — a real differentiator.

## The training endgame (workflows become the corpus)

Every bespoke workflow the agent composes is **trajectory data**. Over time we train a small / our own
model on the **workflows themselves** — it learns which components, which model diffs, and which paths
win, and begins to recognize/reuse pre-existing winning workflows. This is the same bootstrap as the
per-class art craft + the statue method's trajectory capture, now at the **workflow grain**. A corpus
of one-of-a-kind, model-diff-aware workflows is un-scrapeable — it exists only because the agent
generated it here. The tool teaches the USER and teaches the MODEL, both loops off the same workflows.
(See [[project_statue-method-milestones]], [[feedback_per-class-craft]].)

## Implications for the PR-10 build

- **The builder's formula is MODEL-DRIVEN, not generic.** PR-10a's generic
  Subject/Action/Context/Composition/Style is a **placeholder**; the real parts come from the target
  model's formula shard (Model agent). Different model → different parts/chips/weights.
- **Prompt Guide (PR-10d)** = the Model agent's model-formula surfaced.
- **Scoring (PR-10c)** = the prompt measured against the target model's formula (already scoped
  "model-aware" — this makes *where the awareness comes from* canonical).

## Guardrail

Still slots-not-screens: the **Model agent emits** the formula/parts/chips/scores; **code renders**.
Nothing per-model is hardcoded in the UI — the inversion of the hardcoded Photolift build.
