# Kickoff prompt for Claude Code

Paste everything below the line into Claude Code in the `BriBelli/Pixcel` repo.

---

We locked the Project / Asset / Recipe object model on the design side. Read
`design_handoff_pixcel_refresh/OBJECT-MODEL-HANDOFF.md` first — it is the spec, and it was written
against the real `packages/pxs-studio/src/lib/db/models.ts` at `main@b0a91f6`, not from memory.

**The definition, so we stop relitigating it:** an asset is immutable, a project is mutable. If two
edits could conflict it's a Project (`Thread`); if it can only be replaced, never changed, it's an
Asset. The third noun is the Recipe (`Prompt`) — the reusable method, no pixels. Most of the
confusion was two entities covering three roles.

## Do only this first (Slice 1 — additive, inert, no migration)

Nothing user-visible changes. This is the field landing, so the UI slices have something to query.

**1 · `Thread` gains four fields.** It currently has only `title` + `context` beyond `BaseRecord`,
so it has no draft/saved concept at all:

```ts
retention?: 'ephemeral' | 'saved';   // mirrors Asset
promoted_at?: number;                // ms epoch, set on promotion
expires_at?: number;                 // ms epoch, ephemeral only
cloned_from_thread_id?: string;      // Duplicate provenance
seeded_from?: string;                // Recipe id OR Asset id
```

**2 · `Prompt` gains `name` — this one is blocking.** `Prompt` has `text`, `tags`, `tokens` and no
display label, so a Recipe cannot be listed in any UI. Also add `source_thread_id` and
`variables?: string[]`.

**3 · Do not touch `Asset`.** `retention`, `expires_at`, `parent_asset_id`,
`reference_asset_ids[]`, `thread_id`, `interaction_id` are all already present. Asset's lifecycle
is finished. Confirm this rather than re-adding anything.

**4 · Deletion needs no new data.** `RecordStatus` already has `'deleted'`, so our 10-second Undo
is a status flip back to `'active'`. There is no trash table and no Deleted tab. Leave `'archived'`
alone — it is reserved for the future cold-storage tier, not for deletes.

Then stop and report the diff before writing behavior.

## Slice 2 next (backend only) — auto-promotion

A project is born `retention: 'ephemeral'`. On the **first asset insert** for that thread, set
`retention: 'saved'` and stamp `promoted_at`. Ephemeral threads get `expires_at` at +14 days.

There is deliberately **no save button** and no user action involved. Naming a project is
decoration, not commitment.

**Note the asymmetry and do not "fix" it:** `Asset.retention` requires a deliberate save;
`Thread.retention` promotes automatically. Section 4 of the handoff explains why. If you think they
should be consistent, raise it — don't harmonize them silently.

*Accept:* a chat that generated one image survives reload and appears under Saved. A chat with zero
assets stays `ephemeral` and carries an `expires_at`.

## After that

Slice 3 is the Projects screen (design is built — see the Projects screen in
`Pixcel Refresh.dc.html`): one list, segmented **All · Saved · Drafts** filter, default All, drafts
at full contrast with a `Draft` chip, expiry stated on the row, delete → undo toast (confirm first
if a saved project holds assets).

Slice 4 is the three verbs — Duplicate, Save as template, **Open as project**. That last one must
rehydrate the recipe *and* `reference_asset_ids[]`, not just the pixels. Photoshop gives you one
flat layer when you open a PNG; beating that is the point of the whole model.

Full order with acceptance checks is section 6 of the handoff.

## Constraints

- Additive only in Slice 1. No migrations, no renames, no behavior change.
- No merge-back, ever. `cloned_from_thread_id` / `seeded_from` are breadcrumbs, not sync channels.
- Never surface `status: 'deleted'` in any list.
- Don't overload **Project** to also mean a folder. If a container for several projects comes up,
  it gets a different noun.
- Question anything in the handoff that contradicts the code — the code is the truth, the handoff
  was written against one read of it.
