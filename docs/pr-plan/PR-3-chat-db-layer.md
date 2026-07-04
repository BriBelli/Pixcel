# PR 3 — Chat DB layer + schema

**Branch:** `feature/chat-db-layer`
**Size:** Medium (~450–650 lines incl. tests), **backend/data only — NO UI.**
**Depends on:** PR 1/2 (merged). **Decisions:** ✅ LOCKED (below).

---

## Decisions locked (2026-07-01, Brian — "yes to all")
1. **Table layout:** ONE table per **entity** + a `category` attribute (Thread/Interaction/Prompt/Usage …),
   NOT separate tables per category. *(Accepted as a v1 pattern — expandable; watch hot-partition/perf at scale.)*
2. **Prompt = a first-class entity** (`Prompt` table); `source_prompt_id` references it (recipe-IP).
3. **Usage + cap:** a `Usage` row per interaction (tokens/$) + a running total & **hard cap** on the user record.
4. **`a2ui_version`** stamped on every stored A2UI snapshot.
5. **Assets** are central + shared + project-linked (Asset/Project tables land with the generation PRs — schema reserved now).
6. **Status:** the edit/delete cascade sets downstream turns to **`inactive`** (programmatic, per-interaction; audit-only for v1) — store `parent_interaction_id` so branch-viewing is a later no-migration add. **`archived`** is RESERVED (defined, unused for the cascade) for an EXPLICIT thread/project-level cold-storage concept — a future two-tier active-DB / archive-DB partitioned by last-viewed (Brian, 2026-07-04).
7. **Search:** simple for v1 (DynamoDB + GSIs on `asset_type`/`tags`); embeddings-over-8-Part is phase 2.
8. **Dev DB:** a thin **repository interface** + an **in-memory/local adapter** for dev; a DynamoDB adapter behind
   the same interface for prod.
9. **A2UI v10:** deferred (blocks the renderer PR, not this one).

## Scope (chat data + the repository foundation)
- **Repository interface** (`src/lib/db/repository.ts`) — the port every entity uses; adapters implement it.
- **In-memory/local adapter** (`src/lib/db/adapters/memory.ts`) — dev persistence (a JSON file or process memory).
  A DynamoDB adapter is a later swap behind the same interface (stubbed/noted, not built here).
- **Models/types** (`src/lib/db/models.ts`) — `Thread` (id, `user_id`, `category`, active, title, timestamps,
  `context`), `Interaction` (id, thread_id, **status** enum, model, prompt{text,attachments}, response{text,
  tokens_used, a2ui, `a2ui_version`}, `parent_interaction_id`), `Prompt` (first-class), `Usage` (per-interaction
  tokens/$). Every record carries **`user_id`** (Auth0).
- **Status enum + transitions** — `active`/`pending`/`edited`/`deleted`/`inactive`/`archived`/`failed`/`cancelled`;
  only `active` is visible; edit/delete cascade downstream to **`inactive`** (`archived` is RESERVED — see Decision 6).
  **Transitions ONLY touch records currently `active`** — never re-mutate a non-active row (skip if already
  `inactive`/`deleted`): preserves the pre-existing audit trail + is more optimal (Brian).
- **Living context** (`src/lib/db/living-context.ts`) — memory-first / DB-async: open→hydrate active, new→append+
  insert, delete→mark deleted, edit→mark edited+insert+cascade. Addressable by `interaction_id`.
- **Pagination** — reads use `limit` / `offset` **over the ACTIVE records only**; the active-status filter and
  the pagination run TOGETHER in the backend (async) — pagination lives off active rows, not the audit set (Brian).
- **Metering** — persist `tokens_used`; write a `Usage` row; a **cap-gate** helper (reject/flag when the user's
  running total ≥ their hard cap).
- **Wire the `chat-turn` route** to read/write through the repository (persist the turn + its a2ui snapshot).

## Out of scope
No UI (PR 4). No Asset/Project tables yet (generation PRs — schema reserved). No DynamoDB adapter (interface +
memory adapter only). No embeddings/search index.

## Files (estimate)
`src/lib/db/{repository,models,living-context,usage}.ts` · `src/lib/db/adapters/memory.ts` · route wiring in
`app/api/chat-turn/route.ts` · unit tests under `src/lib/db/__tests__/`.

## Reviewable because
Data-layer only, no UI — testable via unit tests (status filter, living-context mutations, cascade, cap-gate)
and the route (a turn persists + reloads). The repository interface makes the DynamoDB swap a later, isolated PR.

## Verify
tsc + build green · unit tests pass · a chat turn persists + reloads through the route (dev adapter) · cap-gate
blocks past the limit. No model calls beyond the existing chat-turn (flag any spend).
