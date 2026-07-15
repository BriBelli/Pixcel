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

## The Asset model (reshaped by Brian's lineage/resource vision — the spine everything stands on)
Assets are **first-class citizens** with a literal **lineage tree**: images are reusable building blocks/references ("1000 words to the LLM"), a generation's parents = the references + formula that produced it, and editing an upstream asset can propagate to its children. One `Asset extends BaseRecord` (`category:'asset'`), metadata-first:
- **Core:** BaseRecord + `kind: 'image'|'video'|'pixel'|'vector'|'sketch'|…`, `tags: string[]`.
- **Provenance:** `source: 'generated'|'upload'`, `interaction_id`, `thread_id`, `workflow_id?`, `recipe?: { prompt, parts?, formula?, score?, model, modelLabel }`, `gen_cost_usd?`.
- **Lineage (the tree, many-to-many):** `parent_asset_id?` (edit/version lineage — never overwrite) **AND** `reference_asset_ids?: string[]` (the references that produced a generation — the *edges*). This is what the node pre-viz pipeline renders.
- **Retention (the resource control):** `retention: 'ephemeral'|'saved'` + `expires_at?`. Ephemeral = in-chat attachments + fresh generations: available in chat history, auto-GC'd after a TTL, don't permanently count against quota. Saved = promoted by a **deliberate action** (explicit upload / "Save to assets"): durable, lineage-tracked, counts against the user's asset-space quota.
- **Blob facet:** `url`/`data`, `thumbnail?`, `width?/height?/durationS?`, `mime?`, `index?`. (nano-banana returns self-contained `data:` URLs — durability is real today; the concern is DB bloat → thumbnails, not URL expiry.)
- **WP editorial (drawer):** `title?, altText?, caption?, description?`.

Aligns with checklist's **8-part metadata** + media-as-JSON provenance/trajectory. Ties the **per-user resource bucket** (asset-storage quota + AI-spend, tiered/monetized — see `project_business-monetization`): the two-tier retention is how users *control their own resourcing* instead of us bloating or starving them.

## Slices (statue — each ships + verifies on its own)
- **Slice 1 — Persistence backbone (close the data-loss gap).** Add `asset` category + `Asset` entity + `AnyRecord` union; accumulate `image` events in both routes (mirror `emittedBlock`); `db.put` one asset per tile linked to `interactionId`; add `listAssets` query; hydrate `loadThread` to populate `images` from assets. **Verify: generate → reload → images still there.** *(This is the existing persist-generation plan.)*
- **Slice 2 — Metadata + provenance/lineage.** Flesh out the recipe (prompt parts + formula + score + model), tags, `parent_asset_id` lineage. Persist the builder/recipe alongside the image so an asset is reproducible. **Verify: an asset round-trips its full recipe + a re-gen from it produces a linked child.**
- **Slice 3 — Durable bytes + the JSON substrate ("never lost", reframed 2026-07-15).** Storage is TIERED, not one blob path: **saved** assets keep the REAL full-res file (durable blob — the JSON was too pixelated to match the LLM); **in-state** references + unsaved generations + **version history** store as **Pixcel Image→JSON** records (compact, queryable, unlimited previous/next history without the file in the DB — proven in Photolift); **export** = a Pixcel JSON record distilled to any file type at highest quality (JSON→PNG). Provider-URL expiry is handled by persisting bytes (nano-banana already returns self-contained `data:` URLs). **Verify: unsaved reference survives as JSON + renders; a saved asset keeps its true file; export a JSON record → PNG.** (Media-as-JSON applied to storage — don't undervalue the conversion.)
- **Slice 4 — The Assets library UI** (the surface). DB-backed grid + kind chips + tag cloud + search-by-any-metadata; the **Asset Details drawer** (editorial fields, read-only facts, Used-In backlinks); per-asset actions (save/export/open-in-Pixcel-Studio). **Hover-driven Save-to-Assets** on the workflow grid: hover a generated tile → **Save to Assets · heart · delete · copy · view** (view = carousel of the workflow's state); Save promotes in-state→first-class and **auto-prefills metadata** from the project (correlated); clicking a catalog asset opens the drawer with those fields already populated. Don't overdo metadata — do it right (the spiderweb). WP-pattern × Pixcel-metadata; modern (lazy-load on scroll, top-right Add = drag-drop upload, no hidden tabs). **Design is mine to craft (no Claude Design yet) — prototype for Brian's eye.**
- **Slice 5 — Feedback loop.** Assets feed back as **references** into new generations (role binding + smart-tag fan-out); ties the model-shaped reference slots. Populates `reference_asset_ids` (the lineage edges).
- **Slice 6 — Retention + resource buckets** (the GIGO control + monetization foundation). Ephemeral vs saved lifecycle; TTL/GC for ephemeral (kept visible in chat history until swept); the **"pending removal" holding tab** where users save keepers; per-user **asset-space quota** alongside `hard_cap_usd` (AI spend), tiered. Dual-shape: land the `retention`/`expires_at` fields + quota accounting in Slice 2/6, enforce GC + the tab here.
- **Slice 7 — The lineage tree / node pre-viz pipeline** (north-star surface). A **Node-Based Pre-Visualization / Storyboarding / Visual Production Pipeline Builder** that renders + manipulates the asset lineage graph (edit an upstream node → propagate). Big; planned now, built later — the model (`parent_asset_id` + `reference_asset_ids`) is the foundation so we're not caged.
- **Slice 8 — Export + cloud-ready.** Download/`.pxc`-style export; confirm the adapter boundary is swap-ready for DynamoDB cloud sync.

## Open inputs (need from Brian before the marked slices)
1. **The improved DB-chat design handoff** (checklist §B line 44 — "study first"). Slices 1–3 don't conflict with it and can proceed; Slice 4 (UI) and the final metadata lock should align to it.
2. **Reference images** — photolif asset-library screenshots + any rough sketch of the asset UX (WordPress-inspired, metadata-centric). No Claude Design exists for this yet; the UX is where refs save iterations. Data model I can ground from the docs.

## Out of scope (now)
- Full baton handoff/handback mechanics (next plan); deep/long-term user-directive memory; on-chain provenance execution; multi-account family-share (design the user-scope seam, don't build it).

## Verify (end-to-end, per slice above)
Generate → reload → asset present with recipe; edit → linked child version; provider-URL-expiry → still renders; library browses/filters/opens; asset re-used as a reference.
