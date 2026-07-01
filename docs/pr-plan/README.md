# Pixcel — Phase 1 PR Plan (chat-orchestrator foundation)

> **Goal:** get from the throwaway Slice-1 stub to a **real, design-true, DB-backed chat front door + shell** —
> the base every later phase (generation, assets, film) sits on. Each PR is **additive and reviewable on its
> own**, shippable without blocking the next. Later phases are their own PR plans.
>
> **North star this serves:** v1 = Brian creates a **Netflix-quality ~15-min film sequence** from one written
> chapter (Project Echelon / Johnny Blackbones). See `docs/CORE-FOUNDATION-CHECKLIST.md`.

## Branch strategy
Umbrella `feature/chat-orchestrator` (current) → each PR a **sub-branch** → PR'd into the umbrella → umbrella
→ `main` when Phase 1 lands. (Or PR each straight to `main` — Brian's call.)

## The PRs

| PR | Title | Size | Blocking? | Plan |
| --- | --- | --- | --- | --- |
| **1** | Design foundation: tokens + brand assets | small (~150–300) | none — **can start now** | [PR-1](./PR-1-design-foundation.md) |
| **2** | UI primitives (the library seed) | small–med (~300–500) | after 1 | [PR-2](./PR-2-ui-primitives.md) |
| **3** | Chat DB layer + schema | medium (~400–600) | after 🔴 schema locks | [PR-3](./PR-3-chat-db-layer.md) |
| **4** | Real chat turn, to design standard | large (~800–1200; split 4a/4b) | after 1–3 | [PR-4](./PR-4-real-chat-turn.md) |
| **5** | Left Primary Nav → per-category records panel | medium (~400–600) | after 3/4 | [PR-5](./PR-5-primary-nav-records.md) |
| **6** | Settings panel + system-model config | medium | optional / parallel | [PR-6](./PR-6-settings-panel.md) |
| **7** | Action bar (message meta-actions) | small–med | optional / parallel | [PR-7](./PR-7-action-bar.md) |

**Recommended merge order:** PR1 → PR2 → PR3 → PR4a → PR4b → PR5 → (PR6, PR7 in parallel).
PR1 merges immediately (zero user-visible change). **PR3 + PR4a is the first "real chat renders" demo**; PR4b makes it persist.

## Future phases (own PR plans, later)
Orchestrator intelligence (real inform+offer / classify) · **A2UI v10 renderer** · image pipeline + **Prompt
Guide bar** + assets · **Agent panel** (Ask/Agent) · scenes → composition → the **15-min episode**.

## 🔴 Decisions to lock before the PR-3+ execution plans
*(PR 1 and PR 2 do NOT depend on these — they can proceed while we settle them.)*
1. **DB schema:** categories → separate tables *or* one table + `category`? prompt as a first-class entity?
   usage/cap home? `a2ui_version` stamp? asset↔project link (shared, not nested)? `archived` = audit-only or
   branch-viewable?
2. **Asset search/query strategy** — embeddings-over-8-Part vs GSIs vs OpenSearch (shapes PR-3's write path).
3. **A2UI v10 shape** — blocks the future renderer PR, *not* PR 1–7.
4. **Dev DB** — DynamoDB-local vs a mock adapter for PR-3.
5. **PR split** — OK with these 7, or merge/split any (esp. PR-4)?

## How we work these
Review **PR-1 first**. On approval: consolidate the current branch, cut a fresh branch for PR-1's code, build
it, PR it. Deeper implementation-plan docs (files/endpoints/handlers/test checklists) get written per-PR,
**sized to PR 1–3 first**, before any code in those.
