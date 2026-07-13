# Asset Persistence + Gallery — master plan

**Branch:** `feature/asset-persistence`
**Parent specs:** `.cursor/plans/persist-generation.plan.md` (backbone), `docs/CORE-FOUNDATION-CHECKLIST.md` §B (locked/pending DB decisions)
**Design reference (adapt, not copy):** photolif `docs/ASSETS.md` (WP-style library) + `docs/PIXCEL-PERSISTENCE.md` (blob+pointer, version-DAG)

## Why
Every generated image today lives **only** in `ChatTurn.images` in Zustand memory. The routes forward `image` events but never persist them; `loadThread` hard-codes `images: []`; the DB `response` has no images channel. We meter the spend (`Usage.gen_cost_usd`) and then **discard the artifact it paid for.** Assets are the backbone — "money-grade, never lost/corrupted" — so this is foundational, not a UI nicety.

## Goal
Generated media becomes a first-class, durable, metadata-rich **Asset** — persisted with provenance + lineage, survives reload, browsable in a library, and feeds back into new work. Minimal → advanced: the same model carries a single image and a multi-asset workflow.

## What exists (grounded) vs what's ours to build
- **Solid foundation:** single-table SQLite (`records`, category-discriminated, full record as JSON in `doc`, promoted columns for indexing). Repository port (`put/get/update/query`) + memory/sqlite adapters + `LivingContext` (memory-first, DB-async, status-cascade). Adding an `asset` category is a **narrow additive change** — no adapter/schema restructure.
- **The exact gap:** `image-agent/route.ts` + `chat-turn/route.ts` forward `image` events (`else send(ev)`) and persist `response:{text,tokens,a2ui}` — **no images**. `chat-turns-store.ts loadThread` returns `images: []`. (Smoking gun: `chat-turn/route.ts` comment "Generated images aren't persisted yet.")
- **Scaffolding to reuse:** the A2UI-block persist pattern (accumulate stream event → write to `response` → re-validate on hydrate) is the exact template for images; `Usage.gen_cost_usd`; `ChatTurn.interactionId` as the FK; the pixel Art gallery (`gallery-store.ts` / `ArtGalleryTab`) as the **UX template** (add/delete/favorite/provenance) — though it's localStorage + PXSFrame, not DB + URL.
- **The vision layer (photolif, adapt):** metadata-centric kind-discriminated `PxcAsset` (thin required core + optional per-kind facets + opaque `payload`); WP-style library (grid, kind chips, flat **tag cloud**, **Asset Details drawer**, Used-In backlinks); **flat tags = *what the asset is*, decoupled from *role* = *what it plays*** (bound later, per-context); version-DAG provenance (`{prompt, operation, parentAssetId}`); **blob+pointer** durability; storage-adapter boundary built for an IndexedDB/SQLite → DynamoDB swap.

## The Asset model (my shaping — the spine everything stands on)
One `Asset extends BaseRecord` (`category:'asset'`), metadata-first:
- **Core:** `id, user_id, category, status, created_at, updated_at` (from BaseRecord) + `kind: 'image'|'video'|'pixel'|'vector'|…`, `tags: string[]`.
- **Provenance / lineage (the Pixcel divergence):** `interaction_id`, `thread_id`, `workflow_id?`, `parent_asset_id?` (edits = new versioned assets, a DAG — never overwrite), `recipe?: { prompt, parts?, formula?, score?, model, modelLabel }`, `gen_cost_usd?`.
- **Blob facet (media):** `url` **and/or** `data`, `thumbnail?`, `width?/height?/durationS?`, `mime?`, `index?`.
- **WP editorial (drawer-editable):** `title?, altText?, caption?, description?`.
- **Opaque per-kind payload:** `payload?` (e.g. PXSFrame for pixel — small JSON stays inline; heavy pixels/video = blob+pointer).

Aligns with the checklist's **8-part metadata** + "media-as-JSON + version history/provenance/trajectory." Kept in the asset row; the heavy/expiring bytes get durability hardening in Slice 3.

## Slices (statue — each ships + verifies on its own)
- **Slice 1 — Persistence backbone (close the data-loss gap).** Add `asset` category + `Asset` entity + `AnyRecord` union; accumulate `image` events in both routes (mirror `emittedBlock`); `db.put` one asset per tile linked to `interactionId`; add `listAssets` query; hydrate `loadThread` to populate `images` from assets. **Verify: generate → reload → images still there.** *(This is the existing persist-generation plan.)*
- **Slice 2 — Metadata + provenance/lineage.** Flesh out the recipe (prompt parts + formula + score + model), tags, `parent_asset_id` lineage. Persist the builder/recipe alongside the image so an asset is reproducible. **Verify: an asset round-trips its full recipe + a re-gen from it produces a linked child.**
- **Slice 3 — Durable bytes ("never lost").** Provider image URLs **expire** — for money-grade durability, fetch the bytes and store them (data in `doc` for dev/SQLite; blob+pointer + object-storage adapter seam for prod). **Verify: an asset still renders after the provider URL would have expired.** ⚠️ Key risk — flagged.
- **Slice 4 — The Assets library UI** (the surface). DB-backed grid + kind chips + tag cloud + search; the **Asset Details drawer** (editorial fields, read-only facts, Used-In backlinks); per-asset actions (save/export/open-in-Pixcel-Studio). WP-pattern × Pixcel-metadata. **⛔ NEEDS your reference images + the DB-chat design handoff before building.**
- **Slice 5 — Feedback loop.** Assets feed back as **references** into new generations (role binding + smart-tag fan-out); ties the model-shaped reference slots.
- **Slice 6 — Export + cloud-ready.** Download/`.pxc`-style export; confirm the adapter boundary is swap-ready for DynamoDB cloud sync.

## Open inputs (need from Brian before the marked slices)
1. **The improved DB-chat design handoff** (checklist §B line 44 — "study first"). Slices 1–3 don't conflict with it and can proceed; Slice 4 (UI) and the final metadata lock should align to it.
2. **Reference images** — photolif asset-library screenshots + any rough sketch of the asset UX (WordPress-inspired, metadata-centric). No Claude Design exists for this yet; the UX is where refs save iterations. Data model I can ground from the docs.

## Out of scope (now)
- Full baton handoff/handback mechanics (next plan); deep/long-term user-directive memory; on-chain provenance execution; multi-account family-share (design the user-scope seam, don't build it).

## Verify (end-to-end, per slice above)
Generate → reload → asset present with recipe; edit → linked child version; provider-URL-expiry → still renders; library browses/filters/opens; asset re-used as a reference.
