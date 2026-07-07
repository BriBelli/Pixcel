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

## Phase 2A — Real transfer (backend). *No new UI.*
Make the hand-off architecturally real; the surface can stay the current chat for 2A.

1. **Image agent module** — `src/lib/agents/image-agent.ts`: a configured OODA specialist with its own system prompt. Input = the **Epistemic Frame** (state-injected → it starts at **Decide**, does not re-Orient). It emits its own short opener + drives generation. Exposes `runImageAgent(frame, { maxCostUsd, section }): AsyncIterable<CoordEvent + agent events>`.
2. **Operator builds the Epistemic Frame** — on `transfer`, the route assembles the bounded frame (Localized Scope = goal/subject; Pruned Ontology = params/section; Local Boundaries = budget/count) and **hands it to the Image agent**. The route **stops calling `coordinateImage` directly** for transfer.
3. **Model agent (standalone)** — extract `routing.ts` + `model-registry` into `src/lib/agents/model-agent.ts` with an agent identity (`selectModels(request) → RoutingDecision`), invoked **by the Image agent** (not the route). It owns model+config; later drives Prompt-Guide scoring.
4. **Frame drives routing** — `frame.subject/medium/goal` shape the `RoutingRequest` (`needs`, `aspectRatio`, `references`); `to` is reasoned from `frame.medium` + section (video path **not** hardcoded). Operator populates `needs/aspectRatio/references` when the user attaches/edits → Gate 1 stops being inert.
5. **Metering unchanged** — the Image agent's image cost + any agent-call tokens still flow through `recordUsage` + the per-turn cap (already fixed).

**2A acceptance:** the route no longer calls `coordinateImage` for transfer; a separate Image agent runs the leg with the injected frame; `frame.medium='video'` routes without a hardcoded `'image'`; Gate 1 sees real `needs`. tsc + lint clean; live Camaro test still generates.

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

## Open questions (for the review)
1. **Nested SSE**: streaming a second agent's turn (its opener + tiles) within the same `/api/chat-turn` stream vs. a dedicated `/api/image-agent` stream the client opens on transfer. Which is cleaner?
2. **Scope of 2B**: the Image IDE surface is a large UI build — should 2B be its own slice, shipping 2A (real backend hand-off, same chat surface) first?
3. **Model agent boundary**: does the Image agent call the Model agent in-process (function) now, with the A2A/agent-messaging seam added later — or build the messaging seam upfront?
4. **Frame size discipline**: keep the Epistemic Frame < ~500 tokens (read-ahead: inject asset/model **paths**, not content) — enforce a budget?

## Suggested order
2A (real hand-off, same surface, testable) → review → 2B (Image IDE + gallery + persist) → 2C (hand-back) if warranted.
