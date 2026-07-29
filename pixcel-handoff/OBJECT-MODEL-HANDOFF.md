# Pixcel — Project / Asset / Recipe · design handoff

Checked against `BriBelli/Pixcel@main` (`b0a91f6`), `packages/pxs-studio/src/lib/db/models.ts`.
Design source: `Pixcel Object Model.dc.html` (1a model, 1b lineage) and the Projects screen in
`Pixcel Refresh.dc.html`.

---

## 1 · The definition (locked)

**An asset is immutable; a project is mutable.** If two edits to it could conflict, it's a Project.
If it can only be replaced, never changed, it's an Asset. That is the whole line.

| Noun | Is | Photoshop analog | Table |
| --- | --- | --- | --- |
| **Project** | a workspace with a *timeline* | the .PSD | `Thread` |
| **Asset** | an output pinned to one *moment* | the exported PNG | `Asset` |
| **Recipe** | the reusable *method*, no pixels | a saved Action | `Prompt` |

Three nouns, not two. Most of the Project-vs-Asset confusion was two entities being asked to
cover three roles — the third already exists in the schema as `Prompt`.

`parent_asset_id` does not break immutability: each **row** is frozen, the **lineage** is what
grows. Same as git — blobs are immutable, branches move.

---

## 2 · Five verbs

| Verb | Transition | Writes |
| --- | --- | --- |
| Duplicate (Save As) | Project → Project | `cloned_from_thread_id` |
| Save as template | Project → Recipe | `source_thread_id` |
| New from template | Recipe → Project | `seeded_from` |
| New version | Asset → Asset | `parent_asset_id` |
| **Open as project** | Asset → Project | `seeded_from` + `reference_asset_ids[]` |

**Open as project is the one that matters.** Photoshop opening a PNG gives you one flat layer —
the method is gone. Our assets carry `reference_asset_ids[]` and the prompt, so this verb must
rehydrate **the recipe and the references**, not just the pixels. Build it on purpose.

---

## 3 · Schema delta vs `main@b0a91f6`

### `Asset` — nothing to add
`retention`, `expires_at`, `parent_asset_id`, `reference_asset_ids[]`, `thread_id`,
`interaction_id` are all present. Asset's lifecycle is done.

### `Thread` — the real gap (4 fields)
Currently `Thread` has only `title` + `context` beyond `BaseRecord`. It has **no** draft/saved
concept, so nothing the Projects screen needs is queryable yet:

```ts
retention?: 'ephemeral' | 'saved';   // mirrors Asset
promoted_at?: number;                // ms epoch — set on promotion
expires_at?: number;                 // ms epoch — ephemeral only
cloned_from_thread_id?: string;      // Duplicate provenance
seeded_from?: { kind: 'asset' | 'recipe'; id: string };
```

**`seeded_from` is a tagged shape, not a bare id** — settled 2026-07-29. The engineer pushed back
that a bare id can't tell you whether it points at an Asset or a Recipe without a lookup, and he's
right; the discriminated shape is better. Adopted, with `'template'` renamed to `'recipe'` to match
the vocabulary here. Three of these fields (`retention`, `cloned_from_thread_id`, `seeded_from`)
are already on the working branch — only `promoted_at` and `expires_at` remain.

### `Prompt` — 3 fields, and one is blocking
`Prompt` has `text`, `tags`, `tokens` — **no display name**. A Recipe cannot be surfaced as a
saved Tool without a label, so `name` is a prerequisite for the Character Reference Sheet
surface, not a nice-to-have.

```ts
name: string;                 // BLOCKING — required to list a Recipe in any UI
source_thread_id?: string;    // which project it was extracted from
variables?: string[];         // the slots a template exposes
```

`Interaction.source_prompt_id` already exists — every *use* of a recipe is recorded, so
"used by N projects" is derivable today with no new field.

### Deletion — no new data needed
`RecordStatus` already has `'deleted'`. The 10-second Undo is a status flip back to `'active'`,
not a trash table. **Never surface `'deleted'` in any list.** Leave `'archived'` alone — it's
reserved for the future cold-storage tier, not for deletes.

---

## 4 · One deliberate asymmetry — do not "harmonize" it

`Asset.retention` says ephemeral → saved requires **a deliberate act** (an explicit save/upload).
`Thread.retention` must promote **automatically** on the project's first asset. No save button.

These differ on purpose. Assets are cheap to make and expensive to store, so saving is opt-in.
Projects are where work *lives* — asking the user to save one is how work gets lost, which is the
entire problem this model exists to solve. Naming a project is decoration, not commitment.

---

## 5 · Answers to the two open UX questions

**"Hide drafts from the Projects list, or dim them?"** Neither. One list, one scroll, drafts at
**full contrast** with a `Draft` chip. A segmented filter — **All · Saved · Drafts**, default All,
sorted by recency — replaces the tabs. Tabs imply separate storage and force the user to guess
which room their work is in; that is the failure mode, not the fix. Dimming reads as disabled.

**Clutter is a lifecycle problem, not a visibility problem.** Sweep ephemeral projects with zero
assets after **14 days**, and say so *on the row*: `Jul 15 · no assets yet · expires in 12 days`.
Under 5 days the expiry turns amber. Honest, self-cleaning, and it removes every reason to hide
anything. The rule is also stated once next to the filter.

**No trash.** But deleting needs a 10-second **Undo** toast. Deleting a *saved* project that holds
assets confirms once first ("This project holds 4 saved assets. They go with it."). Drafts delete
silently → toast.

**Placement.** Drafts belong on **Projects**, not Assets — a draft is a project. Assets gets the
same pattern independently (**All · Saved**, `Unsaved` chip on ephemeral). Don't merge the lists:
they answer different questions — *what was I working on* vs *what did I make*.

---

## 6 · Build order

1. **Thread fields** (4) + `Prompt.name`. Inert, additive, no migration.
2. **Auto-promotion.** Project born `ephemeral`; `retention='saved'` + `promoted_at` on first
   asset insert. Backend only.
   *Accept:* a chat that generated one image survives reload and shows under Saved.
3. **Projects screen** — filter row, Draft chip, expiry line, delete → confirm/undo.
   *Accept:* Drafts count matches `retention='ephemeral'`; undo restores within 10s.
4. **The three verbs** — Duplicate, Save as template, Open as project.
   *Accept:* Open as project on an asset produces a project whose prompt and references are
   pre-loaded; `seeded_from` points at the asset.
5. **Recipes surface** — Prompt as saved Tools/Templates. Character Reference Sheet is the case.
6. **Lineage view** (`1b`) — reads only existing edges, no new data.
7. **GC sweep** — the 14-day job. Last, because the UI already tells the truth about it.

---

## 7 · Reconciles settled with the engineer (2026-07-29)

| Point | Outcome |
| --- | --- |
| `seeded_from` shape | **Engineer's version wins** — `{ kind: 'asset' \| 'recipe', id }`. A bare id needs a lookup to know what it points at. |
| 3 of 4 `Thread` fields already on branch | Confirmed. Only `promoted_at` + `expires_at` outstanding. |
| `Asset` untouched | Independently confirmed against `models.ts` — nothing to add. |
| Auto-promote vs deliberate save asymmetry | Agreed on both sides. Keep it. |
| Drafts hidden vs shown | Superseded — shown at full contrast with a `Draft` chip. |

## 8 · Not to do

- No trash/Deleted tab. No `archived` for deletes.
- No merge-back. `cloned_from_thread_id` / `seeded_from` are breadcrumbs, never sync channels.
- No save button on projects.
- No dimming of drafts.
- Don't overload **Project** to also mean a folder. When a container for several projects is
  wanted, give it a different noun (Collection / Space). That drift is how this confusion returns.
