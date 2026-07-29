# START HERE — Claude Code

You are being handed the current Pixcel design source of truth. Everything you need is in this
folder. Read this file top to bottom and do what it says; there are no verbal instructions to wait
for.

Reconciled against `BriBelli/Pixcel@main` (`b0a91f6`) on 2026-07-29. If the code and these docs
disagree, **the code wins** — flag it, don't silently follow the doc.

---

## Step 1 — This folder IS `pixcel-handoff/`. Replace it wholesale.

This folder is the new canonical design source. It arrives already named `pixcel-handoff/`, so it
drops straight into the repo root over the old one. Every existing reference —
`docs/UI-LAYER-CHARTER.md`, the executor briefs, `packages/pxs-studio/src/app/tokens.css`,
`.nxignore`, `.gitignore` — keeps working untouched. Nothing to rename, nothing to reconcile.

Delete the old contents and use these. The old `ide/`, `ide-workflow/`, `Image IDE - MVP.html` and
`Image IDE - Workflow.html` are superseded by the self-contained `(instant)` files in `design/`.

**Two files to restore from git afterward** — they were authored repo-side, not by design, so they
are not in this drop:

```
git checkout HEAD -- pixcel-handoff/CLAUDE.md pixcel-handoff/docs/art-studio-integration-guide.md
```

`CLAUDE.md` is the non-negotiable design rules reviewers revert against — do not lose it. The old
`START_HERE.md` is superseded by this file and should stay gone.

**Do not rename anything under `screenshots/`** — `.cursor/plans/*.plan.md` cite `image-ide-*.png`
by filename. If the old `screenshots/` folder held captures not present in `design/screens/`,
restore it the same way.

`colors_and_type.css` now lives at `design/_ds/pixcel-design-system-*/colors_and_type.css` — that is
the canonical token file. Point `tokens.css` at it, or copy it to the path `tokens.css` already
expects. One source, no mirror.

Then update markdown references across the repo and report what you dropped.

---

## Step 2 — Build Slice 1, then stop

Read `OBJECT-MODEL-HANDOFF.md` — it is the spec. Then do **only** this, and report the diff before
writing any behavior.

**The definition, so it stops being relitigated:** an asset is immutable, a project is mutable. If
two edits could conflict it's a Project (`Thread`); if it can only be replaced, never changed, it's
an Asset. The third noun is the Recipe (`Prompt`) — the reusable method, no pixels.

**`Thread` — 2 fields outstanding.** Three (`retention`, `cloned_from_thread_id`, `seeded_from`) are
already on the working branch. Add:

```ts
promoted_at?: number;   // ms epoch, set on promotion
expires_at?: number;    // ms epoch, ephemeral only
```

**`Prompt` — 3 fields, one blocking.** `Prompt` is `text` + `tags` + `tokens` today, with no display
label, so a Recipe cannot be listed in any UI. `name` is a prerequisite, not a nice-to-have.

```ts
name: string;                 // BLOCKING
source_thread_id?: string;
variables?: string[];
```

**`seeded_from` keeps its tag.** `{ kind: 'asset' | 'recipe'; id: string }` — settled in your favor;
a bare id can't say what it points at without a lookup. `'template'` was renamed to `'recipe'` for
vocabulary only.

**Do not touch `Asset`.** `retention`, `expires_at`, `parent_asset_id`, `reference_asset_ids[]`,
`thread_id`, `interaction_id` are all already present. Confirm rather than re-add.

**Deletion needs no new data.** `RecordStatus` already has `'deleted'`, so the 10-second Undo is a
status flip back to `'active'`. No trash table, no Deleted tab. Leave `'archived'` alone — it's
reserved for cold storage, not deletes.

Additive only. No migrations, no renames, no behavior change. Expected diff: 2 fields on `Thread`,
3 on `Prompt`. Nothing else.

---

## Step 3 — Then, in this order

Full acceptance checks are in `OBJECT-MODEL-HANDOFF.md` §6.

2. **Auto-promotion** (backend only). Project born `ephemeral`; on first asset insert set
   `retention: 'saved'` + `promoted_at`. Ephemeral threads get `expires_at` at +14 days. There is
   deliberately **no save button**.
   *Note the asymmetry and do not "fix" it:* `Asset.retention` requires a deliberate save,
   `Thread.retention` promotes automatically. §4 explains why. Raise it if you disagree — don't
   harmonize silently.
3. **Projects screen** — design is built, see `design/screens/06-projects.png` and
   `REFRESH-SPEC.md` §6.
4. **The three verbs** — Duplicate, Save as template, **Open as project**. That last one must
   rehydrate the recipe *and* `reference_asset_ids[]`, not just the pixels. Photoshop gives you one
   flat layer when you open a PNG; beating that is the point of the whole model.
5. **Recipes surface** — Prompt as saved Tools/Templates. Character Reference Sheet is the case.
6. **Lineage view** — reads only existing edges, no new data. See
   `design/object-model-1b-lineage.png`.
7. **GC sweep** — the 14-day job. Last, because the UI already tells the truth about it.

The shell work in `CLAUDE_CODE_PROMPT.md` is independent and can run in parallel — but the Projects
screen can't be built truthfully until `Thread.retention` exists.

---

## What's in this folder

| File | What it is |
| --- | --- |
| `START_HERE.md` | This file. Supersedes the previous `START_HERE.md`. |
| `OBJECT-MODEL-HANDOFF.md` | The data-model spec. Definition, five verbs, schema delta, asymmetry rationale (§4), reconciles settled (§7), build order (§6). |
| `REFRESH-SPEC.md` | The visual system + app shell spec. Tokens, glass formulas, per-screen specs. |
| `CLAUDE_CODE_PROMPT.md` | The shell/refresh build prompt (parallel track). |
| `CLAUDE_CODE_KICKOFF.md` | Short form of Step 2 above, if you want it standalone. |
| — | `CLAUDE.md` and `docs/art-studio-integration-guide.md` were authored repo-side and are not in this drop — restore them with the `git checkout` in Step 1. |
| `README-DESIGN-DROP.md` | Full file index + what was found stale in the 2026-07-29 audit. |
| `design/` | All design sources. `.dc.html` / `.html` files open directly in a browser; `support.js`, `image-slot.js`, `deck-stage.js`, `_ds/`, `assets/` must stay beside them. |
| `design/screens/` | Every app screen as rendered — chat, image splash, image IDE, video, audio, projects, assets. |

**Newer than the repo:** `design/Pixcel Refresh.dc.html` has the Projects screen; the repo copy
doesn't.

---

## Hard constraints

- No trash / Deleted tab. Never surface `status: 'deleted'` in a list. Don't repurpose `'archived'`.
- No merge-back, ever. `cloned_from_thread_id` / `seeded_from` are breadcrumbs, not sync channels.
- No save button on projects.
- Drafts are never dimmed — full contrast with a `Draft` chip.
- **Project means document, never folder.** If a container for several projects comes up, it gets a
  different noun (Collection / Space). That drift is how this confusion returns.
- `design/Pixcel Chat Bubbles.dc.html` and `design/Pixcel Pitch Deck.dc.html` are explorations —
  **not build targets.**

## Known incomplete (not broken)

- **Assets** has no All · Saved filter yet. `Asset.retention` supports it; the UI isn't drawn.
- Guides / Workflows copy on the splash cards is placeholder pending real recipes.
- Media tiles accept drag-drop but ship with placeholders — no real stills.
- Video's novel-view-synthesis feature ("1 clip → 12 angles") is named on the splash with no model
  behind it. Provisional.
