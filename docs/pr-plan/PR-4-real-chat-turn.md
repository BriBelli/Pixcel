# PR 4 — The real chat turn, to design standard

**Branch (proposed):** `feature/chat-turn` (split: `-shell` / `-persistence`)
**Size:** Large (~800–1200 lines) — **split into 4a / 4b if it exceeds ~600.**
**Depends on:** PR 1 (tokens), PR 2 (primitives), PR 3 (DB). The meaty one.

## Why
Replace the throwaway Slice-1 stub with the **real, design-true, DB-backed** chat front door. This is the first
truly user-visible slice and the base for the orchestrator, the nav, and everything after.

## Scope
### PR 4a — shell + chat display
- Re-engineer `ChatView` on the primitives + tokens: **hard-capped chat column** (rule #8, never full-bleed),
  user/assistant turns, **streaming block-cursor** (not typewriter), **multi-step plan rows** (circle/spinner/
  check), **agent speaks as its model badge** (not "I"), suggestions row, sources row placeholder.
- Wall persists behind (z-0); glass only on float chrome; sentence case; the design's spacing/radii/easing.
### PR 4b — persistence + mutations
- Wire Data → living context → UI: **open** (hydrate active), **new** (append + insert), **delete** (last
  turn, soft), **edit** (inline, Gate-1 confirm, status transitions + cascade `archived` + re-stream),
  **regenerate** (reuse prompt, reuse-in-place). Store + replay the **A2UI snapshot**. Gate mutations while streaming.

## Out of scope
Real orchestrator intelligence (later phase — the stub prompt stays until then); the general A2UI renderer
(v10 PR); the nav-records panel (PR 5).

## Reviewable because
Builds on PR 1–3 (reviewers already understand tokens, primitives, and the status/DB model); split keeps each
half digestible. 4a proves "real chat renders to standard"; 4b proves the 3-procedure persist/edit/delete pattern.

## Verify
tsc + build + dev-200 · a prompt renders design-true and persists/reloads · edit/delete/regenerate transition
status correctly + cascade archived · crown jewel untouched.
