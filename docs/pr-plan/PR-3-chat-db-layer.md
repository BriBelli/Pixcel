# PR 3 — Chat DB layer + schema

**Branch (proposed):** `feature/chat-db-layer`
**Size:** Medium (~400–600 lines), **backend/data only**
**Depends on:** the 🔴 **schema locks** (see README §Decisions). **No UI.**

## Why
Stand up the DB-driven substrate for chat — the product half. Memory-first / DB-async, audit-safe, metered.
Implements Brian's `docs/chat-runtime-design.md` + the reviewed project/asset pattern.

## Scope
- **Thread** (pointer: id, `user_id`, active, title, timestamps, `context`) + **Interaction** (flat exchange
  row: id, thread_id, `status` enum, model, prompt{text,attachments}, response{text, tokens_used, a2ui snapshot}).
- **Status enum:** `active` (visible) · `pending` · `edited` · `deleted` · `archived` (cascade on edit/delete)
  · `failed`/`cancelled`. Only `active` enters living context + UI.
- **Living context** — in-memory active list, keyed by `interaction_id`; DB = source of truth, mutate instant /
  persist async; open→hydrate, new→append+insert, delete→mark deleted, edit→mark edited + insert new + cascade
  downstream to `archived`.
- **Auth0 `user_id` on every record.**
- **Metering primitive:** persist `tokens_used`; scaffold a **usage/budget row + per-user hard cap** check.
- **Store the A2UI snapshot** on the response (deterministic history re-render).
- **Dev DB:** DynamoDB-local *or* a mock adapter (🔴 decision 4). Wire the `chat-turn` route to read/write.

## Out of scope
No UI (PR 4). No asset/project tables yet unless the schema lock folds them here. No search index (its own decision/PR).

## Reviewable because
Data-layer only; testable via the route + unit tests (open/new/delete/edit/cascade, backward-compat with
field defaults). No UI surface to review — Swagger/curl/tests.

## Verify
tsc + build green · unit tests for the status filter + living-context mutations + cap gate · a chat turn
persists + reloads via the route.
