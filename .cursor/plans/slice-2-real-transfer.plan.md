# Slice 2 — Real Transfer (Image agent) + Image IDE

**Status:** proposed — for review (Brian + Composer)
**Parent:** [transfer-image-ide.plan.md](transfer-image-ide.plan.md) · **Design:** [concepts/agents-and-transfer.md](concepts/agents-and-transfer.md)

## Goal
Turn the honest **Slice-1 transfer UX** into the **architected hand-off**: the Operator packages an **Epistemic Frame** and TRANSFERS to a **separate Image agent** that runs its **own OODA leg**, calls the **Model agent** for model+config, produces a real **gallery**, and hands back a **State Transfer Contract**. This closes every item the audit + Cursor review still flag as "true."

## Honest baseline (what Slice 1 actually is)
One tool-use Operator call sizes the turn: `ask / dispatch / transfer / reply`. But `transfer` is **UX over the same engine**:
- `route.ts` transfer branch calls the SAME `coordinateImage(...)` as dispatch (`runImageGen`), just after a `{transfer}` event + nav flip.
- `frame.subject` / `frame.medium` are captured then **unused**; `to: 'image'` is **hardcoded** (video medium ignored at emit).
- No Image-agent system prompt, no Epistemic-Frame injection, no specialist loop.
- Gate 1 is **inert** (`needs: []`, no `references`); the gallery is **raw links** (no hover overlay / Open-in-Studio); images **don't persist**.

These are the gaps Slice 2 closes. (Verify: `src/app/api/chat-turn/route.ts` transfer branch; `src/lib/engine/{coordinator,routing}.ts`.)

---

## Agent boundaries (LOCKED — Brian + Composer, 2026-07-07)
| Agent | Owns |
|---|---|
| **Operator** | Sizing (`ask`/`dispatch`/`transfer`/`reply`), hospitality, the **Epistemic Frame** (`goal`, `subject`, `medium`, section, budget), and `transfer.to` (nav). **NO image specs.** |
| **Image agent** | The image workflow: the **prompt**, `needs`, `aspectRatio`, `references`, `editing`, `count` — then calls the Model agent + coordinator. |
| **Model agent** | Model **selection + config + fan-out** (`selectModels`), invoked **BY the Image agent** (not the route). |

**On transfer the Operator hands the FRAME ONLY** — the Image agent owns the prompt and all routing specs. So: **remove the Operator's `generationPrompt` from the transfer path**; the `decide` tool sets `frame` only on transfer. **Exception — `dispatch`** (small/quick) stays Operator → `generationPrompt` → inline `runImageGen`, **no Image agent** (explicitly out of 2A scope, unchanged).

## Phase 2A — Real transfer (backend). *No new UI; same chat surface.*
1. **Image agent module** — `src/lib/agents/image-agent.ts`: a configured OODA specialist with its own system prompt. Input = the **Epistemic Frame** (state-injected → it starts at **Decide**, does not re-Orient). It emits its own short opener (`agent_start`/`agent_text`), **derives the `RoutingRequest`** (prompt, `needs`, `aspectRatio`, `references`, `editing`, `count`) from the frame, calls the Model agent, then generates. Exposes `runImageAgent(frame, { maxCostUsd }): AsyncIterable<events>`.
2. **Operator builds the Epistemic Frame + hands it off** — on `transfer` the route assembles the bounded frame (Localized Scope = goal/subject; Pruned Ontology = section/decisions; Local Boundaries = budget/count) and calls `runImageAgent(frame)`. The route **stops calling `coordinateImage` directly** for transfer, and passes **no image specs** (frame only).
3. **Model agent (standalone, in-process)** — extract `routing.ts` + `model-registry` into `src/lib/agents/model-agent.ts` with an agent identity (`selectModels(request) → RoutingDecision`), invoked **by the Image agent**. Interface as if remote; call in-process (A2A messaging seam later). Later drives Prompt-Guide scoring.
4. **Frame drives routing — one job, owned by Image agent + Model agent.** The **Image agent** derives the `RoutingRequest` from the frame; the **Model agent** selects models; **Gate 1 activates from the Image agent's output** (real `needs`, not `[]`). The **Operator** sets `transfer.to` from `frame.medium` + section (document the matrix; NOT always `'image'`).
5. **Frame budget** — a typed `EpistemicFrame` + `assertFrameBudget()` keeping it < ~500 tokens; assets referenced by **path, not content**.
6. **Metering** — meter the Operator call + the Image agent's tokens + image cost in ONE `recordUsage`; `remainingUsd` already deducted after the Operator call, before Image-agent generation (cap-race fix stands).

**2A acceptance:**
- [ ] Route `transfer` calls `runImageAgent(...)`, **never** `coordinateImage` directly.
- [ ] Operator assembles the Epistemic Frame only — **no image specs** on transfer.
- [ ] Image agent: opener + derives the `RoutingRequest` + generation.
- [ ] Model agent invoked **by the Image agent** (not the route).
- [ ] `transfer.to` from `frame.medium` + section (documented matrix; not always `'image'`).
- [ ] Gate 1 receives real `needs` **from the Image agent**.
- [ ] Meter Operator + Image-agent tokens + image cost in one `recordUsage`; cap-race deduction intact.
- [ ] Frame < ~500 tokens (`assertFrameBudget`), paths-not-content.
- [ ] tsc + lint clean; live Camaro test still generates. **Dispatch stays inline (out of 2A).**

---

## Phase 2B — The Image IDE surface (Claude Design) + real gallery
1. **Surface morph on transfer** — nav → Image (already), shell morphs to the Image IDE: left nav Image active · center **canvas** with the image prompt pre-filled · right **agent panel** (Agent / **Build** tabs) carrying the chat history, the Image agent already working. Ref: `pixcel-handoff/screenshots/image-ide-*.png`.
2. **Build tab = Prompt Guide** — the 5-part structured builder working WITH the Model agent (model-aware part scoring).
3. **Real gallery (gospel §6)** — 2/4-up grid; hover overlay with Edit-in-Studio / Save / Variations (the only allowed chrome gradient); Open-in-Studio.
4. **Persistence** — generated images become **Asset records** → survive reload. (folds in [persist-generation.plan.md](persist-generation.plan.md))

**2B acceptance:** a transfer lands you in the Image IDE (not plain chat); the gallery matches the gospel; images persist across reload.

---

## Phase 2C — Hand-back (State Transfer Contract). *May defer.*
When the Image agent's leg completes / escalates, it returns a **Delta State Payload** (`added/mutated/deleted` = the status graph) + Signal (next-phase, confidence). The Operator applies the delta as **code** (event-sourcing) and re-Orients without recompute. Deferrable behind a clean seam if 2A/2B are enough for now.

---

## Non-goals (explicitly out)
- Video generation (the Video agent) — later medium.
- OKF-file conversion of the registry (deferred until the Model agent's self-restocking needs it).
- The crown-jewel pixel engine (untouched).

## Settled decisions (Brian + Composer, 2026-07-07)
1. **Transport:** nested SSE in `/api/chat-turn` for 2A — add `agent_start` / `agent_text` events for the Image agent's turn. A dedicated `/api/image-agent` endpoint comes later (2B), when the Image IDE is a persistent multi-turn session.
2. **2B is its own slice.** Ship 2A alone → review gate → 2B (own branch).
3. **Model agent = in-process function now** (`model-agent.ts` wrapping `routing.ts`); interface as if remote, invoke in-process. A2A messaging seam later (2C+).
4. **Frame < ~500 tokens, enforced** — typed `EpistemicFrame` + `assertFrameBudget()`; paths-not-content for assets.

## Build order
1. **2A** — real hand-off (Image agent + Model agent + nested SSE + frame budget + metering).
2. **Review gate** — Brian + Composer verify acceptance + live tests.
3. **2B** — Image IDE surface + gospel gallery + persistence (own branch).
4. **2C** — State Transfer Contract (defer until warranted).
