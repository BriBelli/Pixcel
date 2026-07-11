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
