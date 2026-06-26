# Pixcel Migration Backlog — the photolif "first PR review"

> Synthesis of the 5 parallel scans in `docs/migration-scan/` (01 backend-routing · 02 a2ui · 03 pxs-core ·
> 04 providers-pipelines · 05 substrate-data). Verdicts: **PORT→TS** · **RECREATE-as-agent** · **REFACTOR** ·
> **PORT-as-DATA** · **TRASH**. Read the per-area files for the detailed inventory tables.

## TL;DR — the shape of the merge
- **Cleanest seams (lift-and-shift):** the **substrate/fusion** (already code, not a plan), **pxs-core**, and
  the **a2ui-core protocol**. Low risk, high value — do these first.
- **Biggest lifts:** the **Lit→React renderer rebuild** (~35 components / ~31k LOC Lit); the **provider +
  pipeline port** (~13 image + 8 video adapters, not per-model); **re-patterning the routing brain** into agents.
- **The moat is DATA, not code:** the model registry (grown to **~98 image + ~60 video**, vs the plan's
  29/20), briefs, content-styles, palettes → **PORT-as-DATA** verbatim.

## ⚠ TRASH-not-treasure — do NOT mistake these for the crown jewel
- **photolif `pxc/schema.py` + `builder.py` + `operations.py` + `references/*.json`** — the **pre-Opus-4.8
  geometric schema-builder**. Emits gradients / multi-color domains / a **`mirror` op** → violates "Stay Pure"
  AND the no-auto-mirror soul guardrail. *Looks like an engine; it's the old broken approach.* **TRASH.**
- **The brittle routing decision trees** (`_pick_branch`, `score_model_for_branch`, the ~40-regex
  `classify_style`) — the plan's named anti-pattern. **TRASH** (keep a slim deterministic top-1 as a
  cold-start floor only).
- **`training_store.py` + the `.db`** — layer-centric logging of the OLD pipeline. **DEFER/throwaway**; the
  real corpus is the version-DAG + provenance, captured for free.

## 🔑 Do-first (unblockers, low risk)
1. **De-dup the TWO `PXSFrame` definitions** (`a2ui-core` vs `pxs-core`) — the fusion thesis silently cracks
   otherwise. This gates the substrate work.
2. **pxs-core lift-and-shift** — adopt photolif's source wholesale (named exports + `DrawingInstructions` +
   `resampleFrame`); then run `npm run studio:build` (the studio drags the whole barrel into its build graph).
3. **Port the registry `dispatcher-is-truth` equivalence test WITH the data** — or silently reintroduce the
   "picker lies about model capabilities" bug.

## ❓ Decisions for Brian
- **pxs-core `CellAnimator.cellBorders` default flips `true`→`false`** (a *visible* behavior change). Keep
  `true`, or adopt photolif's `false`? *(The other reconcile point — spatial-index threshold 10k→250k cells —
  is safe perf tuning; I'll adopt it unless you object.)*

## Workstream verdict map
| Area | Headline verdict | Lift | Detail |
|---|---|---|---|
| **Substrate / fusion** | PORT→TS near-verbatim — `pxc-service` (version-DAG + `.pxc`) + `pxc-asset-service` (the Oracle). **The "one version-history system" already exists in code.** | M | `05` |
| **pxs-core** | **ADOPT photolif wholesale** (superset; 2 reconcile points). Studio imports nothing by value → near-zero runtime risk. | S | `03` |
| **a2ui-core (protocol)** | **PORT-DIRECTLY** — ~1.2k LOC pure TS, generic over render type (built for React+Lit). | S | `02` |
| **a2ui-chat (Lit renderer)** | **RECREATE in React** — ~35 components / ~31k LOC. Seed = `a2ui-react` (11 atoms); target = the Claude Design `ide-workflow/` prototypes. Defer the PXC-studio surfaces to *this* repo's `pxs-studio`. | XL | `02` |
| **Routing brain** | **RECREATE as agents** — front-door orchestrator (P2) + image-router "oracle"; trees TRASHED; registry/briefs/content-styles → DATA. | L | `01` |
| **Providers + pipelines** | **PORT** the mechanical glue (~13+8 adapters, registry-as-data); **RECREATE** the LLM planners (image/edit/video/scene) as specialist agents; keep filters/cost as **RAILS**. | L | `04` |

## Recommended sequencing
- **S1 · Clean seams (low risk):** de-dup `PXSFrame` → pxs-core lift → a2ui-core port. *(Can start now; parallel-safe.)*
- **S2 · The fusion (high value):** substrate port (`pxc-service` + asset Oracle) — near-verbatim, lands the JSON spine.
- **S3 · Breadth port:** providers/registry + the equivalence test; then the LLM planners → specialist agents.
- **S4 · The orchestrator (P2):** the front-door agent (the "universal chat" front door) + the image-router oracle.
- **S5 · Renderer rebuild (P4):** Lit→React — the big UI lift; gated on the A1–A5 design-system pass **and**
  fixing the React seed's **flat-only** rendering (it must traverse nested/inline children or real agent output shows nothing).

## Top risks (carry into every brief)
1. **Nested A2UI children:** the React seed renders flat-mode only; LLM output is nested → silent blank render. Fix first.
2. **Provider-adapter drift** (multipart, fal 404-race, Kling JWT, per-vendor poll enums) with no TS test harness → build the harness during the port.
3. **Losing routing nuance** (cost caps, content gates, dropped-pin reasons) if "flatten to an agent" replaces deterministic filters → filters + cost stay **rails**; only *ranking* is agent judgment.
4. **Two `PXSFrame` defs** must die before the substrate port, or the fusion cracks silently.
