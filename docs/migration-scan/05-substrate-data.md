# Migration scan 05 — Substrate · Data · Training

> Scope: the **media-as-Pixcel-JSON** layer and persisted data in `photolif/` — the
> PixcelProject / version-DAG, the `.pxc` envelope, the compact on-chain form, the
> assets library ("Oracle"), storage adapters, and training data (`training_store.py`,
> `training_data.db`, recipes / registries / content_styles-as-data). Analysis only.
>
> **Headline:** the substrate is the *cleanest* seam in the whole merge. The two halves
> already speak the **same `PXSFrame` data model** (verified — `@a2ui/core`'s `PXSFrame`/
> `PXSCell`/`PXSCompressedFrame` in `libs/a2ui-core/src/types.ts` are a structural dup of
> `@pxs/core`'s shapes), and the version-DAG + asset-Oracle are **already mature TypeScript**
> that already `import { PXSStorage, ImageHelpers } from '@pxs/core'`. Most of the substrate
> is **PORT-as-code (lift-and-shift)**, the context/recipe library is **PORT-as-DATA**, and
> the training corpus is a **DEFER**. The one trap: `a2ui-agent/pxc/schema.py` + `builder.py`
> + `operations.py` + `references/*.json` are the **OLD geometric schema-builder pipeline +
> exemplars** the proven artisan replaced — TRASH, do not port.

---

## Inventory

| Module / data | What it does | Verdict | Target path | Effort | Risk |
|---|---|---|---|---|---|
| `apps/a2ui-chat/src/services/pxc-service.ts` (949 L) | **The fusion seam.** `PxcService`: PixcelProject CRUD, version-DAG (`PixcelVersion` w/ `parentVersionId`), `.pxc` export/import envelope, in-mem undo/redo, thumbnails, `EditMessage`/`PromptSettingsSnapshot` history. Already TS, already on `@pxs/core` `PXSStorage`/`ImageHelpers`. | **PORT→TS** (lift, near-verbatim) | `packages/pxs-studio/src/services/pxc-service.ts` (or a shared `pxc` lib) | M | Low |
| `apps/a2ui-chat/src/services/pxc-asset-service.ts` (898 L) | **The Oracle.** Single kind-discriminated IndexedDB asset store (`image/video/audio/scene/storyboard/document/spreadsheet`), rich tags + indexes (by_kind/role/tag/kind_role), WP-style metadata, `payload` for recipes, user-scoping, lazy legacy migration, nav binding. | **PORT→TS** (lift, near-verbatim) | `packages/pxs-studio/src/services/pxc-asset-service.ts` | M | Low |
| `pxc-element-service.ts`, `pxc-scene-service.ts`, `pxc-storyboard-service.ts`, `pxc-scene-renderer.ts`, `pxc-storyboard-render.ts`, `data-source-registry.ts` (~2.4k L) | Typed adapters over the asset `payload` (scene/storyboard/element recipes) + client render helpers. Pure TS. | **PORT→TS** (with P3 scenes/video breadth) | `packages/pxs-studio/src/services/` | M | Med (depends on video breadth port) |
| `libs/a2ui-core/src/types.ts` — `PXSFrame`/`PXSCell`/`PXSCompressedFrame`/`PXSAnimation` | A **second, independent definition** of the core data model used by the chat app. Structurally identical to `@pxs/core`. | **REFACTOR → de-dup** | re-export from `@pxs/core` `pxs-types.d.ts`; delete the dup | S | Med (every `@a2ui/core` importer must repoint) |
| `libs/pxs-core/` (photolif's copy) | photolif's headless engine — same module tree as the root `packages/pxs-core`. `ImageHelpers.compressFrame` = the **compact form** (`{c,r,d,m}`, row-major color array; the on-chain atom). `StorageAdapters.js` = the storage layer (memory/IndexedDB/localStorage, compress-on-write). | **REFACTOR** (reconcile into tracked `packages/pxs-core`) | `packages/pxs-core` | M | Med — **covered by P0 / scan-area "core"; flagged here as the shared dependency** |
| `a2ui-agent/training_store.py` (248 L) + `training_data.db` | SQLite (`aiosqlite`) interaction/feedback log → JSONL export for fine-tuning. Schema is **layer-centric** (`response_layers`, `layer_count`, `canvas_coverage`) = the OLD pipeline's output shape. The `.db` here is **36 KB** (the ~1 GB copy is gitignored / not in tree). | **DEFER** (PORT-as-code later; reshape schema) | `packages/.../lib/training-store.ts` (provenance from the version-DAG, not layers) | M (later) | Med |
| `a2ui-agent/content_styles/*.py` (10 styles, `__init__` registry, `_base.py`) | The **PLATE library**: per-intent A2UI scaffold + component-priority + system-prompt context (analytical/comparison/dashboard/howto/quick/visual_reference/content/pixcel/custom). Plan calls this "core IP." | **PORT-as-DATA** (TS data + a thin classifier) | `packages/.../agent/plates/*.ts` | M | Med (must drop the *prose* prompts that assume the old pipeline) |
| `a2ui-agent/content_styles/pixcel_templates/*.py` (abstract/landscapes/vehicles/characters) | Hard-coded per-subject pixel "templates" feeding the old schema-builder. | **TRASH** | — | — | Low (violates "no exemplars / hand-authored" rule) |
| `a2ui-agent/pxc/model_registry.py` (4112 L) + `model_briefs/*.md` | The image/video **model catalog as data** (capabilities, briefs, vocab, provenance). The routing *logic* is another scan's problem; the **registry + briefs are DATA**. | **PORT-as-DATA** | `packages/.../agent/model-registry.ts` + `model-briefs/*.md` | L | Med (CI sync contracts; another scan owns routing) |
| `a2ui-agent/pxc/style_presets.py` | Constrained-palette + technique-hint presets (synthwave/ghibli/…) injected by keyword. Palette data is fine; technique prose leans on soft-edge tricks. | **PORT-as-DATA** (palettes) / **REFACTOR** (prune technique prose per craft rubric) | `packages/.../agent/style-presets.ts` | S | Med (rubric: AA/dither/soft-edge hints HURT) |
| `a2ui-agent/pxc/schema.py` (501 L), `builder.py`, `operations.py`, `rasterizer.py`, `raster.py`, `editor.py`, `edit_ops.py` | The **OLD geometric "Hierarchical Latent Schema" builder**: percentage bound-boxes → domains with `gradient_fill`, `templated_polygon`, `bevel`, **`mirror`**, multi-color regions. This is the pre-Opus-4.8 pipeline the proven artisan **replaced**. Multi-color/gradient cells + a `mirror` op directly violate "Stay Pure" + the no-auto-mirror guardrail. | **TRASH** | — | — | **High if mistaken for the artisan** — explicitly NOT the crown jewel |
| `a2ui-agent/pxc/references/*.json` (vehicle/character/landscape/abstract) | Per-category **exemplar** descriptions (palette + layer summaries) fed to the old builder. | **TRASH** | — | — | Low (banned: "no exemplars in AI pipeline") |
| `a2ui-agent/pxc/export.py` (`frame_to_svg`, server export) | Server-side PXS→SVG/PNG export. Small, mechanical. | **PORT→TS** (or fold into existing studio export) | `packages/pxs-studio` export utils | S | Low |
| `a2ui-agent/pxc/validator.py` | Schema validity checks for the old builder. | **TRASH** (replace w/ a `PXSFrame` "Stay-Pure" validator) | — | S | Low |
| `apps/a2ui-chat` IndexedDB stores (`pxc-store`, `pxc-assets`, retired `pxc-scenes`/`pxc-storyboards`) | Live persisted data shape. No production data yet (services note "no production data"); V2 wipes the retired DBs. | **REFACTOR** (carry shape; no data migration needed) | IndexedDB (today) → DynamoDB single-table (doc'd path) | S | Low |

Effort: **S** ≈ hours, **M** ≈ a day or two, **L** ≈ multi-day / contract-bearing.

---

## The recommended port

### The fusion seam (model output ↔ artisan / Studio)
The plan's "THE FUSION" already exists in code and is almost free to bring over. The connective
tissue is **two TS services + one shared data model**:

1. **`PxcService`** owns `PixcelProject` = `{ projectId, versions: PixcelVersion[],
   currentVersionId, threadRefs, editHistory }`. A `PixcelVersion` is a full `PXSFrame` plus
   `parentVersionId`, `prompt`, `operation`, **`imageModel`/`imageModelLabel`** (provenance:
   which model produced this version), and an optional `svg`/`sourceImage`/`layerMode`. **This
   IS the one-version-history-system the plan wants** — semantic edit → `addVersion()` → a new
   diffable JSON record on a DAG. Model output and artisan edits land on the *same* chain
   because both are just `PXSFrame`s. The `.pxc` envelope = `{ format:'pxc', version:1,
   exportedAt, project }` (`exportProject`/`importProject`, with fresh-ID remapping). The
   **compact on-chain form** is `ImageHelpers.compressFrame` → `{c,r,d,m}` (row-major color
   array) — sub-1 KB for low-density frames, the genuine fully-on-chain atom.
2. **`PxcAssetService`** is the Oracle: one kind-discriminated IndexedDB table, asset IDs +
   rich indexed tags + WP-style metadata + a `payload` for recipe kinds. Every model/agent
   output is a first-class addressable JSON citizen here.
3. **The shared model**: the only refactor the seam needs is **collapsing the two `PXSFrame`
   definitions into one** (`@pxs/core` wins; `@a2ui/core`'s `types.ts` re-exports). After that,
   model→Pixcel-file→Studio-edit is type-safe end-to-end.

**Recommended order:** (a) reconcile `pxs-core` (P0, "core" scan) and de-dup `PXSFrame`; (b)
lift `pxc-service.ts` + `pxc-asset-service.ts` near-verbatim into `pxs-studio` (they're already
React/`@pxs/core`-clean, not Lit-coupled — the only Lit-adjacent dep is `navService`, which is
a thin sidebar shim to swap); (c) bring the typed scene/storyboard/element adapters with the P3
video breadth, not before.

### Data-as-data
Port as **data + a thin TS classifier/loader**, never as Python control flow:
`content_styles/*` (the PLATE/scaffold library — the chef's presentation choice), the
`model_registry` + `model_briefs/*.md` (the catalog the router *reads*; the router itself is a
different scan), and `style_presets` **palettes** (prune the soft-edge technique prose — the
craft rubric says AA/dither/hue-shift hints hurt). Drop every prose prompt that narrates the old
layer/schema pipeline.

### The training-corpus plan — DEFER
Two reasons to wait: (1) `training_store.py`'s schema is **layer-centric**
(`response_layers`, `layer_count`, `canvas_coverage`) — it logs the OLD builder's output, not
the artisan's trajectory; porting it as-is would enshrine the wrong shape. (2) The plan's real
corpus is **the accumulated `PixcelProject` version-DAGs + provenance** (`imageModel`, prompt,
operation per version) — i.e. the substrate already *is* the corpus generator, captured for
free as users work. **Recommendation:** do NOT port `training_store.py` in the first slice.
Land the version-DAG + Oracle, let provenance accumulate, and design a TS training-export later
that reads the DAG (version lineage = the trajectory) rather than a separate interactions log.
Treat the existing `.db` as throwaway (36 KB here; the ~1 GB gitignored copy is the old
pipeline's logs and is not a training asset for the new engine). This aligns with the proven
trajectory-capture already in the root repo's `runStatueEngine` (M3).

### Top 3 risks
1. **Mistaking the old schema-builder for the crown jewel.** `pxc/schema.py` + `builder.py` +
   `operations.py` + `references/*.json` look like "the Pixcel engine" but are the **pre-Opus-4.8
   geometric pipeline** the artisan replaced — and they emit `gradient_fill` / multi-color
   domains / a `mirror` op that violate "Stay Pure" and the no-auto-mirror guardrail. **TRASH
   them; the artisan lives untouched in the root repo (`lib/live-jobs.ts`).** Highest-consequence
   confusion in this scan area.
2. **Two `PXSFrame` definitions drifting.** `@a2ui/core` and `@pxs/core` independently declare
   the model. They agree *today*; if the merge ports services without collapsing the type, a
   future edit to one diverges silently and the "every asset is the same JSON" thesis cracks.
   De-dup is small but load-bearing — do it first.
3. **`navService` / sidebar coupling.** Both substrate services call `navService.upsert/remove`
   to drive photolif's Lit sidebar. That's the only non-`@pxs/core` dependency in otherwise-clean
   services; it must be re-pointed to the React/Claude-Design nav, or the lift drags Lit chrome
   assumptions in.

### Open questions
- **`.pxc` envelope version:** stays `version:1`, or do we extend it now to carry the asset-Oracle
  graph (so a `.pxc` is a self-contained project *and* its referenced assets) for true on-chain/
  export portability?
- **On-chain compact form:** `compressFrame` is **lossless but not palette-indexed** (`d` is an
  array of full hex strings). For a sub-1 KB on-chain atom we likely want a **palette-indexed**
  variant (`palette[] + index[]`) — design now or defer to the IP/on-chain workstream?
- **Asset-Oracle scope:** the version-DAG (`pxc-store`) and the Oracle (`pxc-assets`) are *two*
  stores with a `migrateLegacyProjects` bridge. Unify into one addressable graph (every version =
  an asset row), or keep the project/asset split? Affects "the AI has central intelligence over
  all assets/projects/workflows."
- **Training schema authority:** confirm the corpus is sourced from the **version-DAG trajectory**
  (recommended) vs. reviving a dedicated interactions log. Decides whether `training_store.py` is
  DEFER-then-port or TRASH.
