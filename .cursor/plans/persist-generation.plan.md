# Persist generation (baton foundation)

**Status:** after prompt-history-edit
**Parent:** `pixcel-platform.plan.md`

## Goal
Generated images **survive reload** — persisted as records, not held in memory. This is the first concrete step of the baton / living-context spine: state lives in the DB, the UI hydrates a bounded view.

## Context / what exists
- Today `dispatch` streams image tiles into the turn, but nothing is persisted → reload loses them.
- We have SQLite + `Thread` / `Interaction` + `status` + `LivingContext` (`loadThread` hydrates active turns).
- Target substrate: assets are their own records (8-part metadata backbone) referenced by the turn; the workflow is a `Workflow` baton record anchoring correlated active records.

## Tasks
- [ ] **Asset record for each generated image** — persist `{ url/data, model, prompt, created_at, status }`, referenced by the interaction that produced it.
- [ ] **Hydrate on load** — `loadThread` rehydrates a turn's images from its asset records.
- [ ] **`Workflow` baton record (minimal)** — `{ id, goal, medium, params, holder, passLog, status }`; the dispatched image run writes to it.
- [ ] **Edge model (start)** — generalize LivingContext's "correlated" filter beyond `thread_id` so a workflow's context = its correlated active records; `assemble(active + correlated)`.
- [ ] **Verify** — generate → reload → images still present; the workflow is a queryable row.

## Acceptance
- Generate images, reload the page → the images are still there.
- The workflow + its assets are queryable records with `status` (active/inactive), inactive one-way from the UI.

## Out of scope
- Deep/long-term memory (user directives) — deferred.
- Full baton handoff/handback mechanics — next plan.
