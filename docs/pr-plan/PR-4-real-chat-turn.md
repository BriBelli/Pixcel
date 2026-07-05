# PR 4 — The real chat turn, to design standard

**Branch:** `feature/chat-turn-real` (this branch). **SPLIT into two merges: 4a then 4b.**
**Depends on:** PR 1 (tokens), PR 2 (primitives), PR 3 (DB — merged). The meaty one.

## Why
Replace the throwaway Slice-1 stub with the **real, design-true, DB-backed** chat front door. First truly
user-visible slice; the base for the orchestrator, the nav, and everything after. Today's `ChatView` is Slice-1:
bespoke inline `CHAT_CSS`, its own promptbar/option/chip markup (ignores the PR-2 primitives), `max-w-2xl` instead
of the chat-width tokens, typing-dots instead of a streaming cursor, assistant "speaks as I" (no model badge). We
rebuild it to standard, then wire it to the PR-3 DB.

---

## PR 4a — shell + chat display (design-true, NO new backend)
**Size:** medium (~400–550). Still reads from the existing `chat-turns-store` view-model — no DB wiring yet.

- **Rebuild `ChatView` on the PR-2 primitives + tokens only.** Delete the bespoke `CHAT_CSS`
  promptbar/option/chip; use `Composer` (bottom), `Button` (a2ui options), `Chip` (suggestions),
  `Icon`/`PixcelMark`. Zero new hex, tokens only.
- **Hard-capped chat column (rule #8, never full-bleed):** swap `max-w-2xl` for the width tokens
  (`--a2ui-chat-max-width` 640, wide variant 1120). Centered, wall persists behind (z-0).
- **Turn structure → `src/components/chat/`** (new folder): `MessageTurn`, `AssistantHeader` (model badge —
  **agent speaks as its model badge, "Opus 4.8", not "I"**), `StreamingCursor` (a blinking **block** ▍ at the
  tail of streaming text, NOT typewriter), `PlanRows` (circle → spinner → check; renders the `status` phase now,
  structured to hold many steps for the orchestrator later), `SuggestionsRow`, `SourcesRow` (empty scaffold).
- **A2UI options** rendered via `Button`/`Card` (tasteful — still NOT the general renderer; that's the v10 PR).
- Design fidelity: sentence case, glass only on float chrome, the design's spacing/radii/easing, 2px focus halo,
  no scale-pop. Thinking indicator only pre-text; streaming shows the block cursor.
- **Verify:** tsc + build green · dev renders design-true (column capped, model badge, block cursor, primitives) ·
  crown jewel untouched. No DB, no new routes.

## PR 4b — persistence + mutations (wires the PR-3 DB)
**Size:** medium (~350–500).

- **Data → living-context → UI.** Wire the client to the DB through the route + a hydrate path:
  - **open** → hydrate **active** interactions for the thread (paginated, via PR-3 `listActiveInteractions`).
  - **new** → append + insert (already persists in the PR-3 route; client now carries `thread_id` from the
    `done` event and reloads from DB, not just the in-memory view-model).
  - **delete** (last turn) → soft delete: guarded status transition + cascade `archived` (PR-3 `status.ts`).
  - **edit** (inline) → **Gate-1 confirm** → transition target `edited` + insert child (`parent_interaction_id`)
    + cascade-archive downstream + **re-stream** the new turn.
  - **regenerate** → reuse the prompt, reuse-in-place.
- **Store + replay the A2UI snapshot** — deterministic history re-render from the stored `a2ui` + `a2ui_version`.
- **Gate mutations while streaming** (no edit/delete/regenerate mid-stream).
- **New routes** (thin, over PR-3 helpers): `GET /api/chat-history` (hydrate active, paginated) ·
  `POST /api/chat-mutate` (delete/edit/regenerate). No new DB logic — just call `living-context`/`status`/`queries`.
- **Verify:** a prompt renders + **persists/reloads** (refresh restores from DB) · edit/delete/regenerate
  transition status correctly + cascade `archived` (confirm in `.pxs-dev-db.json` / `db:inspect`) · crown jewel
  untouched.

## Out of scope
Real orchestrator intelligence (the stub prompt stays until a later phase) · the general A2UI renderer (v10 PR) ·
the nav-records panel (PR 5) · Settings/model config (PR 6).

## Reviewable because
Builds on PR 1–3 (reviewers already know the tokens, primitives, and status/DB model). The split keeps each half
digestible: **4a proves "real chat renders to standard"; 4b proves the persist/edit/delete/regenerate pattern**
against the DB that already has unit tests.
