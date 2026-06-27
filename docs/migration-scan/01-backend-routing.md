# Migration scan 01 — the backend routing brain

> **Area:** `photolif/a2ui-agent/` — the FastAPI/Python backend that is the LLM router, the
> two-gate model selection / 8×8 multi-agent fan-out, the agent (`generate_stream`) loop, plus
> `content_styles/`, `model_briefs/`, and the model registry/recipe data.
>
> **Governing decisions (from `PIXCEL-UNIFICATION-PLAN.md` + `UNIFICATION-LOG.md`):**
> (1) ONE product; (2) ALL-TypeScript — Python ports to TS; (3) the **statue method / "chef"** is the
> system primitive — brittle Python decision-trees get **RE-PATTERNED as autonomous agents**, not ported
> line-for-line; (4) this repo's artisan engine (`packages/pxs-studio/src/lib/live-jobs.ts` + prompts) is
> the untouchable crown jewel.
>
> **Headline verdict:** the routing brain splits cleanly into **two kinds of asset**. The *decision logic*
> (the regex classifier, the legacy branch+score tree, the `_route_turn` LLM call, the agent loop) gets
> **RECREATED** as the front-door orchestrator + an **image-router specialist agent** under the chef
> primitive. The *knowledge* (registry, briefs, content-styles, references, drop-reason vocabulary, SSE
> contract) is **PORT-as-DATA / PORT→TS** — it is the moat and must survive verbatim. The deterministic
> Gate-1 policy filter and the typed `RoutingDecision`/telemetry shapes are **PORT→TS as RAILS** (code that
> genuinely earns its structure — the "isolated focused box" the plan blesses).

---

## Inventory

> Effort: S ≈ <0.5d mechanical · M ≈ 1–3d · L ≈ multi-day / needs design.
> Target paths are proposals for the architect; all under the unified `packages/`.

### Front door + agent loop (the orchestrator brain)

| path | what it does | verdict | target path | effort | risk | dependencies |
|---|---|---|---|---|---|---|
| `app.py` | FastAPI app: routes (`/api/chat`, `/api/video`, `/api/storyboard/render`, model-list + admin endpoints), CORS/auth/rate-limit middleware, SSE keepalive plumbing, `ChatRequest`/`VideoRequest` Pydantic envelopes | **RECREATE** (as Next.js route handlers / Node service) | `packages/pxs-studio/src/app/api/chat/route.ts` (+ `video`, `storyboard`) | L | High | SSE contract, auth (Auth0), rate-limit store, the orchestrator agent |
| `llm_providers.py` → `LLMService.generate_stream` (~1.2K LOC) | **The agent loop / front door.** Orchestrates: `_route_turn` → skip-check → parallel explorers (web search + data sources) → style/micro-context assembly → LLM generation w/ token streaming + fallback → post-process (normalize, chart hints, hierarchy). Emits the SSE `step`/`token`/`complete` events. | **RECREATE as the front-door orchestrator agent** (chef VISION→route→gather→cook→plate) | `packages/pxs-agent/src/orchestrator/` (new) | L | High | the chef primitive (P1), content-styles-as-data, A2UI schema, provider adapters |
| `llm_providers.py` → `LLMService._route_turn` + `_make_route_turn_system` + `_ROUTE_TURN_PROMPT_TEMPLATE` + `_ROUTER_MODELS` | The unified intent classifier: one cheap LLM call returns `pixcel_intent` / `image_intent` / `search` / `location` / `data_sources`. Multi-provider fallback chain. | **RECREATE** — this IS the front-door agent's intent step; fold into the orchestrator's VISION/route, keep the cheap-fast-model fallback ladder | `packages/pxs-agent/src/orchestrator/` | M | Med | router model list (DATA), provider adapters |
| `llm_providers.py` → `LLMProvider`/`OpenAIProvider`/`AnthropicProvider`/`GeminiProvider`/`XAIProvider` (~1.2K LOC) | Per-vendor LLM adapters: `generate`, streaming, image injection, health check. | **PORT→TS** (thin adapters; prefer official TS SDKs / Vercel AI SDK over hand-rolling) | `packages/pxs-agent/src/providers/` | M | Med | vendor TS SDKs, env keys |
| `llm_providers.py` → JSON repair + A2UI normalization (`parse_llm_json`, `_repair_json`, `_close_json_brackets`, `_normalize_a2ui_components`, `_normalize_single`, `_normalize_chart_data`, `_apply_chart_hints`, `_enforce_visual_hierarchy`, `_normalize_suggestions`) (~600 LOC) | Hardens raw LLM output into valid A2UI component trees — bracket repair, component shape coercion, chart-data inference, hierarchy ranking. | **PORT→TS as RAILS** (load-bearing robustness layer; mechanical but must be faithful) | `packages/pxs-agent/src/a2ui/normalize.ts` | M | Med | A2UI schema (a2ui-core, already TS) |
| `llm_providers.py` → `_route_turn` peripherals (`_can_skip_explorers`, `_derive_hints_from_data`, `_refine_style_from_data`, `_wants_images`, `_fallback_data_sources`, `_trim_history`, `_build_messages`, location plumbing) | Heuristics around the loop: explorer-skip, data→hint derivation, history trimming, image-intent regex. | **REFACTOR** — most become the agent's own reasoning; keep `_trim_history` + image plumbing as utilities | `packages/pxs-agent/src/orchestrator/util` | M | Low | — |
| `llm_providers.py` → `_find_best_model` / `_find_faster_model` / `_derive_complexity` / `_get_model_tier` / `resolve_tool` / `get_tool_states` | Adaptive LLM-model selection + tool-toggle resolution (env-lock vs user setting). | **REFACTOR** (collapse into orchestrator config + the `auto` law) | `packages/pxs-agent/src/orchestrator/` | S | Low | tool registry (DATA) |
| `tools.py` (`WebSearchTool`, `fetch_image_as_data_url`, `rewrite_search_query`, `should_search`) | Web-search explorer + image-fetch + query rewrite. | **PORT→TS** | `packages/pxs-agent/src/tools/` | S | Low | a search provider key |
| `micro_contexts.py` | Registry of small reusable prompt fragments, assembled under a byte budget. | **PORT-as-DATA** (+ tiny assembler) | `packages/pxs-agent/src/context/micro-contexts.ts` | S | Low | — |
| `a2ui_summary.py` | Summarizes a prior A2UI component tree → short text for history context. | **PORT→TS** | `packages/pxs-agent/src/a2ui/summary.ts` | S | Low | A2UI schema |
| `auth_jwt.py` | Auth0 JWT verification (JWKS cache, sig/iss/aud/exp checks). | **REFACTOR** (use a Node JWT lib / NextAuth; behavior-port) | `packages/pxs-studio/src/lib/auth/` | M | Med | Auth0 config |
| `pxc/user_rate_limit.py` | Per-verified-user fan-out budget (stops N×K vendor blasts). | **PORT→TS** | `packages/pxs-agent/src/limits/` | S | Med | a shared store (Redis/in-mem) |
| `training_store.py` | SQLite feedback/training-data store + JSONL export. | **REFACTOR** (out of this area's scope; flagged — TS store later) | TBD | — | — | — |

### The two-gate routing + 8×8 fan-out (the would-be "oracle")

| path | what it does | verdict | target path | effort | risk | dependencies |
|---|---|---|---|---|---|---|
| `pxc/image_gen.py` → `_apply_gate1_chain` + `_filter_content`/`_filter_product_tier`/`_filter_aspect`/`_filter_available`/`_filter_cost` | **Gate 1** — deterministic policy/availability filter (content_blocks, product_tier, aspect, env-key, health-probe, ref-capability, cost). Closed drop-reason vocabulary. | **PORT→TS as RAILS** (this is *legit* code-structure — pure, deterministic, test-locked; the chef should NOT re-reason policy each call) | `packages/pxs-agent/src/routing/gate1.ts` | M | Med | registry (DATA), health-probe state |
| `pxc/image_gen.py` → `route_image_request` | Gate-2 wrapper: takes the LLM `image_model_ranking`, validates vs registry, re-applies Gate 1, else falls back to legacy branch+score. Stamps `_gate2_source`/`_gate1_drops`/`_branch`. | **RECREATE** — the **LLM-ranking path is the oracle**: make it the image-router specialist agent ranking Gate-1 survivors from briefs. Keep the validate-against-registry + re-apply-Gate-1 wrapper as rails. | `packages/pxs-agent/src/agents/image-router/` | M | High | Gate 1, briefs (DATA), model_catalog assembler |
| `pxc/image_gen.py` → `_pick_branch` + `_branch_seed_cascade` + `score_model_for_branch` (legacy branch+score tree) | The **brittle deterministic decision tree** — picks a "branch" (high_reference, etc.) and hand-scores models. The plan's named anti-pattern. | **RECREATE → mostly TRASH** — replaced by the image-router agent. Keep a *minimal* deterministic top-1 as the cold-start / LLM-unavailable safety net only. | `packages/pxs-agent/src/routing/fallback.ts` (slim) | M | Med | registry strengths (DATA) |
| `pxc/image_gen.py` → `plan_image_routing_decision` + `plan_multi_agent_fanout` + `execute_image_cascade` + `_dispatch_via_internal_fanout` | Builds the typed `RoutingDecision`, plans the single cascade (primary + ≤2 fallbacks) and the **8×8 multi-agent fan-out** (N models × K images, pins, backfill, caps), then the executor walks it. | **REFACTOR** — keep the **plan/execute split + the typed decision as RAILS** (proven structure the plan endorses); the *ranking that feeds the plan* is what becomes agentic. Executor (parallel dispatch, fallback walk) is mechanical port. | `packages/pxs-agent/src/routing/plan.ts` + `execute.ts` | L | High | Gate 1/2, provider dispatch, telemetry, SSE |
| `pxc/routing_types.py` | `RoutingDecision` / `CascadeNode` / `ExecutionResult` dataclasses + `to_dict` (the SSE/JSONL serialization shape). | **PORT→TS** (interfaces; near-verbatim — this is the frontend contract) | `packages/pxs-agent/src/routing/types.ts` | S | Low | — |
| `pxc/routing_telemetry.py` | Appends one JSON line per cascade attempt to `routing.jsonl` (gate1/gate2/attempts/winner) — the "why didn't model X run" log. Privacy + pytest-pollution guards. | **PORT→TS** (the routing-transparency feature the plan calls out; keep verbatim event shape) | `packages/pxs-agent/src/routing/telemetry.ts` | S | Low | RoutingDecision shape |
| `pxc/model_catalog.py` → `build_model_brief` / `build_model_catalog` / `_load_brief` / front-matter+section parsers | Assembles per-model briefs (registry machine-facts + brief prose) into the **Gate-2 LLM prompt**. Also `build_picker_payload` / `_derive_badges` for the picker UI. | **PORT→TS** (the brief-assembler is the oracle's "cookbook" loader) | `packages/pxs-agent/src/agents/image-router/catalog.ts` | M | Med | registry + briefs (DATA) |
| `pxc/model_catalog_check.py` | Validates registry `model_id`s against vendor catalog APIs (admin/CI; never paid inference). | **PORT→TS** (or keep as a maintenance script) | `packages/pxs-agent/scripts/` | S | Low | vendor catalog APIs |

### Knowledge / recipes — the moat (DATA, not code)

| path | what it does | verdict | target path | effort | risk | dependencies |
|---|---|---|---|---|---|---|
| `pxc/model_registry.py` (`IMAGE_MODELS` ~98 rows + `VIDEO_MODELS`) | The canonical capability matrix: strengths, best_for, content_blocks, tiers, aspect_ratios, cost/latency, ref-caps, batch strategy, siblings, roadmap. **4112 LOC of curated knowledge.** | **PORT-as-DATA** (Python dict → typed JSON/TS const; the curation is irreplaceable IP) | `packages/pxs-agent/data/model-registry.ts` | M | Med | the `dispatcher-is-truth` equivalence invariant must be re-encoded in TS |
| `pxc/model_briefs/*.md` (44 briefs + `README.md` schema) | One prose brief per model (Positioning/Strengths/Weaknesses/prompt-patterns/failure-modes/Policy). The Gate-2 LLM's domain knowledge. **Pure runtime DATA, framework-agnostic — copy as-is.** | **PORT-as-DATA** (verbatim; keep the `<model_id>.md` ↔ registry referential-integrity test) | `packages/pxs-agent/data/model-briefs/` | S | Low | registry keys |
| `pxc/references/*.json` (abstract, character, landscape, vehicle) | Per-subject-class reference recipe data. | **PORT-as-DATA** | `packages/pxs-agent/data/references/` | S | Low | — |
| `content_styles/*.py` (9 styles: analytical, comparison, content, custom, dashboard, howto, pixcel, quick, visual_reference) + `_base.py` | **The "PLATE" library** — per-intent A2UI presentation scaffold + component-priority + prompt context. The plan names this **core IP** (the chef's second selection job). | **PORT-as-DATA** (each `STYLE` dict → JSON/TS; the embedded prompt prose is the recipe) | `packages/pxs-agent/data/content-styles/` (rename "content-style" → "plate"/"presentation") | M | Med | A2UI component types |
| `content_styles/__init__.py` → `classify_style` + `_CLASSIFICATION_RULES` (regex tree) | **The brittle regex intent classifier** — ~40 ordered regexes mapping message → style. The plan's archetypal brittle tree. | **RECREATE → TRASH** the regex; the front-door agent's `_route_turn`-style LLM classifier already supersedes it. Keep `STYLE_DESCRIPTIONS` as the agent's option list; keep regex only as a zero-cost cold-start hint, if at all. | `packages/pxs-agent/src/orchestrator/` | S | Low | content-styles (DATA) |
| `content_styles/__init__.py` → `get_system_prompt`/`get_component_priority`/`get_available_styles` + pixcel-craft skill loader | The plate loader/composer (base rules + style prompt + craft skill). | **PORT→TS** (thin loader over the DATA) | `packages/pxs-agent/src/orchestrator/plate.ts` | S | Low | content-styles, skills |
| `skills/pixcel-craft.md` | Skill text appended to the system prompt (when to emit proactive suggestions). | **PORT-as-DATA** | `packages/pxs-agent/data/skills/` | S | Low | — |
| `data_sources/` (`_base.py`, `rest.py`, `databricks.py`, `config.yaml`) | External data-source adapters (passive-mode injection) + analyzer context. | **REFACTOR** (port the seam; defer specific adapters — likely out-of-scope for first slices) | `packages/pxs-agent/src/data-sources/` | M | Low | — |

---

## Recommended approach — re-patterning the routing brain

### The shape: one front-door orchestrator + one image-router specialist, both = the chef

Today the routing brain is one ~1.2K-LOC procedural method (`generate_stream`) that hard-codes a fixed
pipeline (route → explore → style → generate → post-process), plus a separate two-gate cascade in
`image_gen.py`. The unification splits this into **two instances of the chef primitive (P1)** plus a thin
band of **rails**:

1. **The front-door orchestrator (P2 — the Pixcel Assistant).** Recreate `generate_stream` + `_route_turn`
   as the chef in its "orchestrator" context. Its VISION = the user's order; its two selection jobs are the
   plan's **RECIPE** (which workflow/specialist) and the **PLATE** (which `content_styles` scaffold + AI
   context). It *gathers* (web search, data sources, history/A2UI summary), *delegates* to specialists via
   MCP/skills, *cooks* (the generation call), and *plates* via A2UI. The fixed Python phase-order dissolves
   into the agent's own reasoning — but the **JSON-repair + A2UI-normalize layer stays as rails** (an LLM
   that emits slightly-wrong JSON shouldn't crash the plate). The `auto`-is-default law is encoded here:
   intent/workflow/plate all default to agent-decides.

2. **The image-router specialist agent (the "oracle").** This is the headline RECREATE. The *existing
   LLM-ranking path already is* a proto-oracle: `model_catalog.build_model_catalog` assembles the registry
   facts + briefs into a prompt, an LLM ranks Gate-1 survivors, `route_image_request` validates the ranking
   against the registry. Re-pattern that into a chef whose **RECIPE = the model briefs (the cookbook)** and
   whose job is "rank these eligible models for this creative intent, explain why." The brittle
   `_pick_branch` / `score_model_for_branch` decision tree is **retired** to a minimal deterministic
   top-1 used only when the LLM is unavailable (cold start). Same agent serves single-pick and the **8×8
   multi-agent fan-out** — fan-out is just "rank, then take top-N" feeding `plan_multi_agent_fanout`.

3. **Rails the plan explicitly blesses (keep as deterministic TS code).** Not everything should be
   re-reasoned per request — the plan's "code only as RAILS where structure genuinely earns it":
   - **Gate 1** (`_apply_gate1_chain`): pure policy/availability filtering with a closed drop-reason
     vocabulary. Deterministic, test-locked, must never be a model's discretion (content policy, valid
     aspect ratios, dead API keys). Port faithfully.
   - **The plan/execute split + typed `RoutingDecision`** (`routing_types.py`, `plan_*`, `execute_*`): a
     frozen plan the executor purely consumes. This is exactly the "isolated focused box" hybrid — the
     *ranking* is agentic, the *plan it produces and the cascade walk* are mechanical. Port the structure;
     swap only the ranking source.
   - **Routing telemetry + the SSE event contract** (`pxc_routing_decision`, `pxc_multi_agent_tile`, …):
     these are the routing-transparency feature the plan names as proven/shipped. Port verbatim — they are
     also the frontend contract.

### What stays as DATA (the moat, ported not rewritten)

The registry (~98 image models, curated), the 44 model briefs, the per-subject references, the 9
content-styles (the PLATE library), and the pixcel-craft skill are **knowledge, not logic**. They are the
single most valuable, least-replaceable thing in this area. Port them **as typed JSON/TS data**, preserve
the referential-integrity tests (brief ↔ registry, registry ↔ docs), and re-encode the **dispatcher-is-truth
invariant** (registry can't claim a capability the dispatcher won't honor) as a TS CI test from day one —
it is the bug that historically lied to the picker.

### Top 3 risks

1. **The `dispatcher-is-truth` equivalence invariant.** The 4112-LOC registry and the dispatcher must agree
   on every capability; a Python CI test enforces it today. Porting the registry to TS data *without*
   simultaneously porting that equivalence test will silently reintroduce the "picker advertises what the
   dispatcher refuses" class of bug. Port the test **with** the data, not after.
2. **Quality regression in the ranking when the tree → agent.** The legacy branch+score tree is
   deterministic and test-pinned; the agentic oracle is not. The fan-out's "primary counts + dropped pins
   WITH reasons" transparency (a proven, shipped feature) must be preserved through the swap, and the
   agent's ranking quality A/B-validated against the legacy cascade before the tree is deleted. Per the
   "quality is the product / revert on any drop" memory, keep the deterministic path runnable as the
   comparison baseline.
3. **SSE streaming + cancellation parity in Node.** `generate_stream` is a 1.2K-LOC async generator with
   keepalive heartbeats, mid-stream client-disconnect cancellation, and a producer/consumer queue. Next.js
   route handlers / Node streams have different cancellation semantics; a naive port risks orphaned vendor
   calls (cost) and `ERR_INCOMPLETE_CHUNKED_ENCODING` on the client. This is the highest-effort, highest-risk
   port and gates the whole front door.

### Open questions for the architect

- **Where does the orchestrator run?** Next.js route handlers (`app/api/*/route.ts`, co-located in
  `pxs-studio`) vs a standalone `packages/pxs-agent` Node service the studio calls. Affects SSE, auth,
  rate-limit store, and how specialists are reached (in-process vs MCP). The plan says "specialists reached
  via MCP/skills" — does the first slice already stand up an MCP boundary, or start in-process and extract
  later?
- **Provider adapters: hand-port or adopt a TS framework?** `llm_providers.py` re-implements per-vendor
  streaming. The Vercel AI SDK / official TS SDKs would erase most of that, but change the streaming/tool
  surface. Decide before porting 1.2K LOC of adapters.
- **How much of the legacy branch+score tree survives as the cold-start floor?** Zero (pure LLM, error if
  unavailable) vs a slim deterministic top-1. The plan leans agentic; the quality-floor memory leans
  keep-a-baseline.
- **`content_styles` naming + scope.** The plan wants to rename "content style" → PLATE/presentation and
  treat it as the chef's second selection job. Confirm the rename and whether all 9 styles port in the first
  slice or just the ones the flagship needs (`pixcel`, `custom`, `visual_reference`).
- **Rate-limit + Auth0 store.** Per-user fan-out budget needs a shared store (Redis?) once multi-instance.
  In-memory for the first slice, or stand up the store now?
