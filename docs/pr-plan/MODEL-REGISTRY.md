# Model Registry & Multi-Model Fan-Out — Architecture Sign-Off

**Status:** approved (Brian + architect, 2026-07-17). Seeded from the *Pixcel Model Codex*.
**Both on the hook.** This records what we approved, reshaped, and rejected — so nothing regresses.

## Why

The Model agent must know every rostered provider intimately and route across them (auto fan-out or
manual N×M) — WITHOUT recreating photolif's failure: a static, hand-maintained model table that was
stale the moment it was written. The Codex is a great *snapshot*; a snapshot cannot be the source of
truth.

## The cut (the load-bearing decision)

**One deterministic floor. Everything else autonomous.**

- **Deterministic floor = the APIs.** Companies + API keys + live docs. Hardcoded, small, stable.
  → `packages/pxs-studio/src/lib/engine/provider-roster.ts`. This is *all* Brian wants pinned.
- **Autonomous layer = everything above.** Which models exist, versions, capabilities, prices,
  reference limits, prompt formulas, and per-model *techniques* (burst, character sheets, motion
  transfer). The Model agent owns these, refreshed against `docsUrl` / `modelsEndpoint`. NEVER
  hardcoded as truth.

## Verdicts on the Codex

- **APPROVE** the Codex as *seed content* for the registry.
- **REJECT** the Codex's model/version table as *config*. Version strings (Nano Banana 2, GPT Image
  2, Kling v3, Veo 3.1, Flux.2 Pro, `gemini-omni-flash-preview`, …) are guesses; they live nowhere
  as constants. The registry discovers the real ones.
- **APPROVE + it's the moat:** the Model agent resolves **native capability FIRST**; a "trick" is a
  fallback the agent selects only when the model lacks the native ability. Burst/character-sheet are
  *techniques in the agent's toolkit*, never user-facing feature buttons.
- **RESHAPE character consistency:** drop the train-a-custom-model pipeline (a 2024-era workaround).
  Right grain = one good reference → agent-generated **base Profile sheet** → a **tagged Character
  asset** (reuses the `@`-mention + lineage system). Expansion sheets (poses/expressions/action) are
  generated **on demand**, same character id — NOT one mega-sheet (dilutes fidelity + blows the ref
  budget). The agent decides how many sheets a job needs.
- **RESHAPE audio:** audio is a required partner for Echelon, but it's a **timing substrate**, not a
  post-step. Beat map + sync points live in the JSON substrate; cuts anchor to them. Omni is *one
  renderer*, never the spine (no Omni-lock-in). The Omni Python/TS threads (SynthID/C2PA/JWT/chunk)
  are food-for-thought, not spec.
- **GATE:** TV-MA / uncensored routes (Replicate, xAI) pass the spend-cap + policy gate before they
  are reachable. Dropped providers (Stability, fal) are **reversible rows**, never deletions.

## Freshness — stale-while-revalidate (Brian's "reinvoke 24h", answered)

A workflow NEVER pays a live-traversal tax mid-turn.
1. The seeded snapshot is served **instantly** (never cold-start-empty).
2. Past its TTL (default 24h) it is *still served* — a **background** refresh is queued for next time.
3. Every asserted capability carries `sourceRefreshedAt` → the agent says "as of <date>" and
   downgrades confidence gracefully instead of stalling.
→ `packages/pxs-studio/src/lib/engine/staleness.ts` (pure, `now`-injected, 8/8 tests).

## What already existed (don't rebuild)

- `model-registry.ts` — curated catalog, already carries `sourceRefreshedAt` + `preview`
  ("knowledge but not callable"). The self-restocking seam was drilled on purpose (roadmap P6).
- `routing.ts` — **fan-out already works**: LLM splits `count` across models (per-model `n`), with a
  deterministic tier fallback. `RoutingDecision.fanout: RoutedModel[]`.
- `model-agent.ts` — selection + capability facts + graceful default.

## Build order (slices)

1. ✅ **Provider roster (floor) + staleness policy** — `provider-roster.ts`, `staleness.ts`. DONE.
2. ✅ **Refresh worker (reconcile engine)** — `model-refresh.ts`: `providersDue` → `fetchLive` →
   conservative `reconcile` (confirm / discover / flag, never auto-retire). I/O injected, pure +
   tested (11 tests). Real per-provider network fetch behind default deps. Does NOT yet persist or
   run on a schedule — that's 2b. DONE (engine).
   - **2b (next):** persist reconcile diffs to a registry store + a background trigger (so results
     stick and the loop actually runs). Enrich discoveries / retire ghosts via the maintenance agent.
3. **Registry ⇄ roster wiring + video models** — models reference a `providerId`; extend registry
   beyond image (video: Google/Replicate/etc.), seeded version-agnostic.
4. **Capability-vs-technique resolver** — native-first; techniques toolkit (burst/sheet/motion) as
   agent-selected fallbacks.
5. **Character / Object Profile** — single ref → base sheet → tagged asset; expansion sheets on demand.
6. **Audio timing track** in the JSON substrate — beat map + sync points; design the slot now.
7. **Fan-out surfacing** — per-model score dropdown in the Prompt Guide (hooks exist; score already
   per-model).

## Out of scope (for now)

Real Omni integration code, C2PA/SynthID pipeline, chunked upload, JWT layer — all deferred; the
design here is ours, not the Gemini-thread scaffolding.
