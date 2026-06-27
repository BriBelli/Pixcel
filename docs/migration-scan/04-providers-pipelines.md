# Migration Scan 04 — Model Providers + Generation Pipelines

> Sub-agent "first PR review" for merging `photolif/` → Pixcel monorepo.
> **Area:** model providers (image + video, ~13 provider integrations across a ~98-image / ~60-video
> registry) and the generation/surface pipelines (image, video, scenes, storyboards, edits, galleries).
> All source under `photolif/a2ui-agent/` (Python). Verdicts respect the LOCKED decisions: **ALL-TypeScript**;
> **statue/agent pattern is the primitive** (brittle pipelines → specialist agents, code only as rails);
> **provider lists/registries are DATA**; **crown jewel untouched**.

## TL;DR

- The **registry is pure DATA** — port it verbatim as a TS data module. Don't rewrite, transcribe.
- The **provider dispatch layers** (`image_gen.py`, `video_gen.py`) are **~85–91% mechanical** HTTP/SDK glue —
  a large but low-IQ mechanical PORT. The hard 10–15% is the cascade/routing brain.
- The **brittle LLM-driven decision pipelines** (`image_pipeline`, `edit_pipeline`, the routing planners) are
  the **RECREATE-as-agent** targets — exactly the "re-pattern as specialist agent" the plan calls for.
- **Real scale check:** the plan estimated "~29 image + ~20 video models." The registry has grown to
  **~98 image rows + ~60 video rows** (aggregators Replicate/fal host the long tail). The *data* port scales
  fine (more rows); the *adapter* port does NOT (adapters are per-PROVIDER, ~13 of them, plus 2 aggregators).

---

## 1. Providers inventory

**Auth model (all providers):** no hardcoded secrets anywhere. Each registry row carries an `env_key` field;
runtime does `os.getenv(env_key)` and **silently drops** models whose key is unset (no static `api_available`
flag — "adding a key later is a zero-diff"). This is a clean, portable pattern.

**Distinct provider secrets referenced by the registry (13):** `FAL_API_KEY`, `REPLICATE_API_KEY`,
`GEMINI_API_KEY` (a.k.a. `GOOGLE_API_KEY`), `OPENAI_API_KEY`, `RECRAFT_API_KEY`, `RUNWAY_API_KEY`,
`KLING_API_KEY`, `STABILITY_API_KEY`, `IDEOGRAM_API_KEY`, `XAI_API_KEY`, `LUMA_API_KEY`, `PIKA_API_KEY`,
`HAILUO_API_KEY` — plus `BFL_API_KEY` (Black Forest Labs / FLUX direct) and `ANTHROPIC_API_KEY` +
`TAVILY_API_KEY` for the LLM-routing / reference-search side. (`.env.example` is the canonical list; the
checked-in `.env` covers only a subset — partial key coverage in dev.)

### Image providers (registry: ~98 model rows across these adapters)

| Provider | Integration shape | Auth env | Verdict | Adapter effort |
|---|---|---|---|---|
| **OpenAI** (GPT-Image-2, 1.5-deprecated) | Official SDK (`openai.AsyncOpenAI`) | `OPENAI_API_KEY` | PORT→TS (`openai` JS SDK) | S |
| **Google Gemini** (Nano-Banana / Imagen family, 6 rows) | Official SDK (`google.genai.Client`) | `GEMINI_API_KEY`/`GOOGLE_API_KEY` | PORT→TS (`@google/genai`) | M |
| **xAI Grok Imagine** | OpenAI-compat SDK + raw httpx for edits | `XAI_API_KEY` | PORT→TS | S |
| **Recraft V4/V4.1** (2) | OpenAI-compat SDK (`external.api.recraft.ai/v1`) | `RECRAFT_API_KEY` | PORT→TS | S |
| **Black Forest Labs / FLUX** | raw httpx REST poll loop (direct or via Replicate) | `BFL_API_KEY` / `REPLICATE_API_KEY` | PORT→TS (`fetch`) | M (poll) |
| **fal.ai** (aggregator, 13 image rows) | raw httpx queue submit+poll | `FAL_API_KEY` | PORT→TS (`fetch`/`@fal-ai/client`) | M (queue+poll) |
| **Replicate** (aggregator, 16 rows img+vid) | raw httpx predictions API + poll | `REPLICATE_API_KEY` | PORT→TS (`replicate` JS) | M (poll) |
| **Stability** (SD 3.5) | raw httpx **multipart/form-data** | `STABILITY_API_KEY` | PORT→TS | M (multipart) |
| **Ideogram v4** | raw httpx **multipart/form-data** | `IDEOGRAM_API_KEY` | PORT→TS | M (multipart) |

### Video providers (registry: ~60 model rows; central `_PROVIDER_DISPATCH` of 8 adapters)

| Provider | Models | Integration shape | Auth env | Verdict | Effort |
|---|---|---|---|---|---|
| **Google Veo** (3, 3-fast) | SDK (`google-genai`) + REST fallback, async poll | `GEMINI_API_KEY` | PORT→TS | M |
| **Kling** (2 Pro/Std) | HTTP POST + poll, **JWT bearer** | `KLING_API_KEY` | PORT→TS | M |
| **Runway** (Gen-4 / Turbo) | HTTP POST + poll, bearer | `RUNWAY_API_KEY` | PORT→TS | M |
| **Luma** (Ray 2) | HTTP POST + poll, bearer | `LUMA_API_KEY` | PORT→TS | S |
| **Pika** (2.2) | HTTP POST + poll, bearer | `PIKA_API_KEY` | PORT→TS | S |
| **MiniMax / Hailuo** (02) | HTTP POST + poll, bearer | `HAILUO_API_KEY` | PORT→TS | S |
| **fal.ai** (aggregator: Seedance, Wan, Veo3, Hailuo Pro) | HTTP queue + poll, 404-race backoff | `FAL_API_KEY` | PORT→TS | M |
| **Replicate** (aggregator: Veo, Hailuo, Wan, Hunyuan) | HTTP predictions + poll | `REPLICATE_API_KEY` | PORT→TS | M |

**The registries themselves** (`model_registry.py` `IMAGE_MODELS` / `VIDEO_MODELS` dicts, + `model_catalog.py`,
`model_briefs/*.md` ×44, `routing_types.py`, `style_presets.py`, `micro_contexts.py`):
**PORT-as-DATA-registry**. `model_registry.py` is 185KB but is **pure data + ~20 stateless query/score
functions** (`resolve_generator_id`, `image_input_mode`, `max_refs`, `output_capabilities`,
`score_model_for_branch`, `get_available_image_models`, …) — transcribe the dicts to TS object literals/JSON
and re-implement the helpers as pure functions (mechanical, well-tested upstream).

**Per-model row schema** (port as a TS `interface`): `label, provider, env_key, tier, modality,
strengths{}, best_for[], content_blocks[], supports_editing, image_input_mode, max_reference_images,
aspect_ratios[], cost_per_image_usd:(min,max), max_batch_n, model_id` (+ video: `max_duration_s,
supported_durations_s[], fps_options[], supports_start_frame, cost_per_second_usd`).

---

## 2. Pipelines / surfaces inventory

| Pipeline / surface | What it does | Verdict | Target path | Effort | Risk |
|---|---|---|---|---|---|
| **`image_gen.py`** (227KB) — image provider dispatch + cascade | 13 provider adapters + `_generate_image_dispatch` (model_id→provider) + `plan_image_routing_decision` (Gate-1 filter + Gate-2 LLM rank) + `execute_image_cascade` (pure walker). | **PORT→TS** (adapters mechanical) + **RECREATE** the Gate-2 LLM ranker as the image-router specialist | `apps/.../providers/image/*` + image-router agent | **XL** | High (volume) |
| **`video_gen.py`** (75KB) — video provider dispatch + cascade | 8 async adapters via `_PROVIDER_DISPATCH`; POST→poll→fetch (no webhooks); `plan_/execute_video_cascade`; sibling-first fallback reordering. | **PORT→TS** (adapters + poll loop) + RECREATE ranker | `apps/.../providers/video/*` | **L** | Med (async polling) |
| **`video_image_role_classifier.py`** (15KB) | Small vision-LLM call: assigns user images → start/end frame / reference roles for img-to-video; confidence gate, conservative fallback. | **RECREATE-as-agent** (tiny LLM-decision specialist) | role-classifier sub-agent | M | Med |
| **`image_pipeline.py`** (92KB) — single-image surface | 5-step LLM decision tree: analyze → Tavily ref search → rank/select → cascade-generate → convert. The brittle orchestrator. | **RECREATE-as-agent** (the image specialist; the routing/ranking IS the statue oracle) | image specialist agent | **XL** | High |
| **`video_pipeline.py`** (25KB) — single-clip surface | LLM routing planner → emit cascade plan → dispatch clip tool (generate/transition/lipsync) → SSE progress/done. | **RECREATE** planner as agent + **PORT** dispatch glue | video specialist agent | L | Med |
| **`clip_pipeline.py` + `clip_template.py`** | Clip tool registry (generate/transition/lipsync, Anthropic tool_use schemas) + deterministic prompt-template builder. Prompt-Integrity guard. | **PORT→TS** (tool schemas as JSON; template = string util) | clip tools (rails) | M | Low |
| **`edit_pipeline.py` (21KB) + `edit_ops.py` + `editor.py`** — semantic edit / inpaint | LLM tool-picker (semantic_edit vs inpaint_element) fills structured slots → deterministic `edit_ops` executor; PXSFrame validate/apply-delta utilities. **This is the live-edit-studio brain** (a preserved photolif win). | **RECREATE** picker as agent + **PORT** `edit_ops`/`editor` (pure cell-math utils, candidates for `pxs-core`/WASM) | edit specialist + `pxs-core` utils | L | High (preserve UX) |
| **`scene_planner.py` + `scene_tools.py`** — Scenes surface | Schema-Architect LLM (request→hierarchical scene schema JSON) + scene IDE tool registry (set_prompt/title/start_frame/audio). | **RECREATE** planner as agent + **PORT** tool registry | scene specialist | M | Med |
| **`storyboard_pipeline.py` + `storyboard_tools.py`** — Storyboard surface | **No LLM** — walks the shot list, deterministic `_pick_tool` (two-anchor→transition else generate), dispatches each shot via `run_video_pipeline`, emits `pxc_film_*` SSE, signals client-side ffmpeg-wasm concat. | **PORT→TS** (mechanical loop + SSE) | storyboard orchestrator | M | Low |
| **`image_warmup.py`** (22KB) | Startup concurrent per-provider health probes → `_IMAGE_ENV_HEALTH`. No LLM. | **PORT→TS** (or startup hook) | provider health service | M | Low |
| **`routing_telemetry.py`** | Appends routing decisions / cascade attempts to `routing.jsonl`, sanitized. No LLM. | **PORT→TS** (or keep as side service) | telemetry util | S | Low |
| **`retry_policy.py`** | Exponential backoff, 429/503/timeout classification, Retry-After parsing. No LLM. | **PORT→TS** (cross-cuts every adapter — port FIRST) | shared HTTP util | S | Low |
| **`finetune_pipeline.py`** | SQLite→JSONL training-data export (alpaca/sharegpt). Not hot-path. | **REFACTOR/defer** (training infra; not a generation blocker) | (later) | S | Low |
| **`model_smoke.py` / `model_catalog_check.py`** | Roster discipline + live model availability checks (CI/ops). | **REFACTOR** (test/ops harness; port lazily) | scripts | S | Low |

---

## 3. Port strategy (prose)

### The shape: a TS provider-registry + a generation client + pipelines-as-agents

The cleanest port preserves photolif's already-good **3-layer separation** and only re-patterns the top layer:

1. **DATA layer — `@pxs/model-registry` (PORT-as-DATA).** Transcribe `IMAGE_MODELS` / `VIDEO_MODELS` and the
   44 `model_briefs/*.md` into TS object literals (or JSON + typed loader) with a `ModelRow` interface, plus
   the ~20 pure query/score helpers. This is the registry-as-DATA the plan mandates. **It scales by rows**, so
   the registry growing from "29/20" to "98/60" costs nothing here. The `env_key`-driven silent-drop
   availability model ports verbatim and is exactly right for the multi-provider reality.

2. **CLIENT layer — a `GenerationClient` with per-provider adapters (PORT→TS, mechanical).** `image_gen.py` is
   ~91% and `video_gen.py` ~85% mechanical glue: size/aspect mapping, JSON/multipart payload shaping, response
   parse → data-URL, and (video) a poll loop. Re-express each provider as an `Adapter` behind one interface
   (`generate(req) → result`), dispatched by `provider`. Swap Python SDKs for JS SDKs (`openai`,
   `@google/genai`, `replicate`, `@fal-ai/client`) and `httpx` → `fetch`. **Port `retry_policy.py` FIRST** —
   every adapter depends on it. The cascade *executor* (`execute_*_cascade`) is a pure walker over a
   `RoutingDecision` plan → ports as a clean state-machine consumer.

3. **PIPELINE layer — specialist agents (RECREATE), with code as rails.** The brittle, LLM-driven
   orchestrators (`image_pipeline`'s 5-step tree, the Gate-2 ranker, `edit_pipeline`'s tool-picker, the
   video/scene planners, the role-classifier) are exactly the "brittle Python decision tree" the plan says to
   flatten into autonomous specialists. They become the **image-router oracle**, **edit specialist**, **video
   director**, **scene/storyboard masters** — each = the chef primitive + domain context + the ported
   client/registry/tool-schemas as RAILS. The tool registries (`clip_tools`, `scene_tools`,
   `storyboard_tools`) port as DATA (JSON tool schemas the agent is handed).

### Mechanical vs needs-rethink

- **Mechanical (just transcribe):** the registry + briefs; all provider adapters; `retry_policy`,
  `routing_telemetry`, `image_warmup`, `clip_template`, `edit_ops`/`editor`; the storyboard loop (no LLM); the
  cascade *executors*; all tool-schema registries.
- **Needs rethink (re-pattern as agent):** Gate-1/Gate-2 routing brains, `image_pipeline` orchestration,
  `edit_pipeline` tool-pick, video/scene planners, the image-role classifier. The *intent* (filter by
  capability/cost/content → rank → cascade) is preserved as the agent's rails+context; the brittle
  if/elif-and-LLM-in-code-tree is what dies.

### Secrets & cost considerations

- **Secrets:** 13+ provider keys, env-only, no hardcoding — port the env-key pattern as-is. Centralize in one
  server-side secrets module; **these keys must never reach the React/client bundle** (all generation stays
  server-side). `.env.example` is the canonical inventory; dev `.env` currently has partial coverage (missing
  several video keys) — fine for the slice but the breadth port needs the full set in the deployment secret
  store.
- **Cost:** registry rows carry `cost_per_image_usd` / `cost_per_second_usd` ranges and the routing already
  does cost-capping + tier filtering. Aggregators (Replicate/fal) double-bill vs direct providers — the
  sibling-dedup + sibling-first fallback logic exists to exploit cross-host mirrors; preserve it. Video is the
  expensive surface (per-second pricing, long jobs); the warmup/health-probe gating avoids paying to discover
  a dead key. **Keep cost/tier filtering in the agent's rails, not "the LLM decides" — cost is deterministic.**

### Top 3 risks

1. **Volume of the adapter port + provider API drift.** ~13 image + 8 video adapters, each with bespoke
   size/multipart/poll quirks (Stability & Ideogram multipart; fal queue + 404-race; Kling JWT; per-vendor
   status enums). Mechanical but voluminous and **fragile to upstream API changes** — this is the single
   biggest sink of the P3 lift, and there is no TS test harness yet (photolif's is Python `tests/`).
2. **Losing routing nuance when "flattening to an agent."** The Gate-1/Gate-2 + cascade encodes hard-won
   craft (content-block gates, ref-capability guards, cost caps, sibling reordering, dropped-pin reasons that
   feed the Generation Console). If the RECREATE swaps deterministic filters for "let the LLM decide," quality
   and the routing-transparency UX regress. Mitigation: keep filters/cost/caps as **rails** (deterministic);
   only Gate-2 *ranking* is the agent's judgment.
3. **The edit pipeline is a shipped, preserved win.** `edit_pipeline` + `edit_ops` is the live-edit-studio
   (semantic edits → versioned PXSFrame records = the model↔artisan fusion). RECREATE-as-agent must preserve
   the exact edit→JSON-record contract and Prompt-Integrity guarantee, or it breaks a crown-jewel-adjacent UX.

### Open questions

- **JS SDK parity?** Confirm `@google/genai`, `replicate`, `@fal-ai/client` cover every call path used (esp.
  Gemini image edit / multi-ref, Replicate predictions poll). Where no good JS SDK exists (Recraft, Ideogram,
  Stability, Kling, Luma, Pika, Hailuo), `fetch` is fine but each is a hand-rolled adapter.
- **Where does the generation client run?** A Node service / Next route handlers / the agent runtime? Decides
  how secrets, streaming SSE, and long video polls are hosted (serverless poll-timeout limits matter for video).
- **Telemetry & training corpus.** `routing.jsonl` + `training_data.db` (~1.16 GB) feed the eventual training
  set — keep emitting the *same* schema from the TS client so the corpus stays continuous across the port.
- **Roster size for the slice.** Port all ~98/60, or start with one strong model per provider and grow the
  rows later? (Registry-as-DATA makes this a config decision, not a code one — recommend a curated subset for
  P3 first light, full roster after.)
- **Aggregator-vs-direct policy.** Some models exist on both direct + Replicate/fal — keep both (resilience,
  current behavior) or prefer direct (cost)? Currently encoded in sibling dedup/scoring.
