# Migration Scan 03 — `pxs-core` reconciliation

**Scope:** diff `photolif/libs/pxs-core` (the FORKED + advanced copy) against the tracked
`packages/pxs-core`, and identify what must keep working for `packages/pxs-studio`.
**Verdict in one line:** the gap is **small and clean**. Photolif is a near-identical, slightly
advanced superset. Adopt photolif's source wholesale; the only judgment calls are **two changed
runtime defaults** (`cellBorders`, the auto-enable cell threshold). **The studio does not import
`@pxs/core` at runtime at all**, so the merge risk to the studio is near-zero.

Both trees ship the same 23 files with one extra module on the photolif side
(`DrawingInstructions.js` + `.d.ts`). Config/build/type files are byte-identical
(`package.json`, `project.json`, `vite.config.js`, `README.md`, `src/types/pxs-types.d.ts` all
diff clean). The PXSFrame/PXSCell/PXSAnimation data model is identical — the clean seam the plan
relies on.

---

## Inventory / diff table

| Feature / module | In this repo? | In photolif? | Difference | Verdict | Risk to studio |
|---|---|---|---|---|---|
| Data model (`pxs-types.d.ts`: PXSFrame/PXSCell/PXSAnimation) | yes | yes | **identical** (byte-for-byte) | KEEP-EITHER | none |
| `package.json` / `project.json` / `vite.config.js` / `README.md` | yes | yes | **identical** | KEEP-EITHER | none |
| **Module exports** (every file) | `export default {};` (empty) | **named exports** (`export { ClassName }`) | photolif fixed all barrel re-exports to real named exports; this repo's modules export an empty object | **ADOPT-PHOTOLIF** | none (studio imports nothing from the barrel; pure improvement / tree-shakeable) |
| `index.js` barrel | 17 lines | + `export * from './helpers/DrawingInstructions.js'` | photolif adds one re-export | ADOPT-PHOTOLIF | none |
| **`DrawingInstructions.js` (+`.d.ts`)** | **absent** | **present** (754 lines) | NEW module: rasterizes a compact `{cols,rows,layers:[…]}` instruction format → PXSFrame (fill/rect/rrect/circle/ellipse/line/arc/gradient/multi-stop/polygon/cells/floodfill/mirror/bezier/pattern; blend modes). LLM-friendly compact form. | **ADOPT-PHOTOLIF** | none (additive; studio doesn't reference it) |
| `ImageHelpers` quality presets | retro→vga (max 640) | + `xga:1024, hdplus:1280, fhd:1920, max:0` | photolif extends presets and adds **`max:0` = native source resolution (no downsample)** | **ADOPT-PHOTOLIF** | none (studio has its OWN `QUALITY_PRESETS` in `ImageTab.tsx`, independent) |
| `ImageHelpers.calculateDimensions` | `||` fallback | `??` fallback + early-return for `maxSize===0` (native res) | supports the new `max` preset | ADOPT-PHOTOLIF | none |
| **`ImageHelpers.resampleFrame()`** | **absent** | **present** | NEW: client-side nearest-neighbor resample of a PXSFrame to new dims (no server round-trip); preserves per-cell `opacity`; stamps `resampledFrom` metadata | ADOPT-PHOTOLIF | none |
| **`CellAnimator` default `cellBorders`** | **`true`** | **`false`** | ⚠ **behavioral default conflict** — borders on vs off by default | **MERGE / DECIDE** (see below) | low–med IF the studio ever instantiates CellAnimator with defaults (it currently does not) |
| **`CellAnimator` auto-enable threshold** (viewport + spatial index + Phase-2C) | **`>= 10000` cells** | **`>= 250000` cells** | ⚠ photolif raises the auto-enable cutoff 25× (3 call sites) | **MERGE / DECIDE** | low (perf tuning; studio drives rendering via its own workers, not this auto path) |
| `WASMIntegration` dynamic import | `await import(wasmPath)` | `await import(/* @vite-ignore */ wasmPath)` | photolif silences the Vite dynamic-import warning | ADOPT-PHOTOLIF | none |
| All renderers (HTML/Canvas/WebGL/Base), spatial, transforms, storage, performance, FrameDeck, PatternHelpers, AnimationHelpers, CellGroup | yes | yes | **identical except the `export default {}` → named-export line** | ADOPT-PHOTOLIF | none |
| `.pxc` envelope / `PixcelProject` version-DAG / on-chain compact form | n/a | **NOT in pxs-core** | These live in photolif's **app layer** (`apps/a2ui-chat/src/services/pxc-service.ts`, `pxc-asset-service.ts`, `components/pxc/*`), not in the library | **OUT OF SCOPE here** → belongs to the P3 app/breadth port | n/a |

---

## Recommended reconciliation plan (step order)

The data model and all configs are identical, so this is a **lift-and-shift with two decisions**,
not a real merge. Recommended order:

1. **Adopt photolif's `libs/pxs-core/src` wholesale** as the new `packages/pxs-core/src`. It is a
   strict superset: same files, named exports everywhere (a genuine fix over this repo's empty
   `export default {}`), plus the new `DrawingInstructions` module and the `ImageHelpers`
   additions. Nothing in photolif's core is a regression to this repo.
2. **Keep the tracked package shell unchanged** — `package.json`, `project.json`,
   `vite.config.js`, `README.md`, `pxs-types.d.ts` are byte-identical, so no reconciliation needed.
   (Confirm the Nx `project.json` name/targets still resolve from the tracked location.)
3. **Resolve the two default conflicts** (the "~2 defaults" the log flagged) — see below.
4. **Verify the studio still builds.** `next.config.js` `transpilePackages:['@pxs/core']` +
   `tsconfig.json` path `@pxs/core → ../pxs-core/src/index.js` must keep resolving. Since the
   studio pulls only the barrel (into the Turbopack graph) and calls nothing from it, swapping the
   source should be transparent. Run `npm run studio:build` to confirm the barrel still
   transpiles (note: there is no test runner — do not claim "tests pass").
5. **Defer the `.pxc`/PixcelProject/on-chain layer** to the P3 app port; it is not part of
   pxs-core.

### The specific conflicts to resolve

- **`cellBorders` default — `true` (this repo) vs `false` (photolif).** This is the only conflict
  with a visible behavioral effect. Decision needed from Brian. Recommendation: this is a
  *constructor default*, and **the studio overrides rendering anyway / does not instantiate
  CellAnimator with bare defaults in `src`**, so either value is safe for the studio. Photolif's
  `false` is the more-advanced (newer) choice; default to ADOPT-PHOTOLIF unless Brian wants borders
  on by default. Flag, don't silently pick.
- **Auto-enable threshold — `>= 10000` vs `>= 250000` cells** (viewport, spatial index, Phase-2C,
  3 call sites in `CellAnimator`). Pure perf tuning: at what grid size the heavyweight subsystems
  auto-engage. Photolif's 250k is the tuned value from the more-mature fork. ADOPT-PHOTOLIF.
  Low risk because the studio offloads heavy rendering to its own Web Workers
  (`grid/image/render.worker.ts`) rather than relying on this auto path.

### What the studio imports that must keep working

**Finding: the studio imports NOTHING by value from `@pxs/core`.** Verified across
`packages/pxs-studio/src`:
- `@pxs/core` is a declared dependency (`package.json`), wired via `tsconfig` path and
  `transpilePackages`, and the barrel is pulled into the Turbopack graph (build chunks reference
  `@pxs/core` → `WASMIntegration`), but **there are zero `import … from '@pxs/core'` statements in
  the studio source** (type or value).
- The studio **re-defines `PXSFrame` / `PXSCell` / `PXSAnimation` locally** in
  `src/store/pxs-store.ts`, and every component imports those types from the store, not from core.
- The studio has its **own** `QUALITY_PRESETS` (`src/components/ImageTab.tsx`) — unrelated to
  `ImageHelpers.QUALITY_PRESETS`.

So the contract the merge must preserve is minimal: `@pxs/core`'s barrel (`index.js`) must keep
resolving and transpiling cleanly under Turbopack. Photolif's named-export barrel satisfies this
strictly better than the current empty-default barrel.

### Top 3 risks to the studio

1. **Barrel resolution / transpile under Turbopack.** The studio pulls the whole `@pxs/core`
   barrel into its build graph (it drags in `WASMIntegration`). If photolif's `index.js` re-exports
   something that fails to transpile (e.g. the new `DrawingInstructions` import chain, or the
   `/* @vite-ignore */` dynamic import in a Next/Turbopack context rather than Vite), the studio
   build could break even though no code calls it. **Mitigation:** run `npm run studio:build`
   after the swap; this is the one must-verify.
2. **WASM load path.** `WASMIntegration.js` loads `/wasm/pkg/pxs_compute_bg.wasm`; per CLAUDE.md the
   actual build output is `dist/wasm/`. The fork didn't change this (only added `@vite-ignore`), so
   the existing path mismatch is inherited, not introduced — but anyone touching WASM wiring during
   the merge should confirm the path.
3. **`cellBorders` / threshold defaults silently flipping behavior** *if* a future studio change
   starts using `CellAnimator` directly with defaults. Today the studio doesn't, so it's latent —
   but the merge bakes in photolif's `false`/`250000`, which should be a recorded decision so it
   isn't a surprise later.

### Open questions (for Brian)

- **`cellBorders` default:** keep this repo's `true`, or take photolif's `false`? (Recommend
  photolif's `false`; flagging because it's a visible default.)
- The studio's local `PXSFrame`/`PXSCell` types duplicate `pxs-core`'s. Out of scope for this
  scan, but the unification's "one version-history / one data model" goal probably wants the studio
  to eventually import the model from `@pxs/core` rather than re-declaring it. Worth a follow-up
  ticket; not required for the P0 core swap.
- `DrawingInstructions._opMirror` is a generic rasterizer op (compact-format painting), **not** an
  art-generation auto-mirror — it does not violate the craft-rubric "never auto-mirror art" rule.
  Confirm no future code wires it into the artisan output path.
