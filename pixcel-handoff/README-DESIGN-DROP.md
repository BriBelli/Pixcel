# Pixcel — design drop

Complete. Every design file, its dependencies, and rendered screenshots. Drop the folder anywhere
in the repo; the `.dc.html` and `.html` files open directly in a browser from `design/`.

## Read in this order

| File | What it is |
| --- | --- |
| `OBJECT-MODEL-HANDOFF.md` | **The spec.** Project / Asset / Recipe definition, five verbs, schema delta vs `main@b0a91f6`, the auto-promote vs deliberate-save rationale (§4), reconciles settled (§7), build order + acceptance checks (§6). |
| `CLAUDE_CODE_KICKOFF.md` | Paste-into-Cursor prompt. Scopes Slice 1 only, then stop and report the diff. |
| `CLAUDE_CODE_PROMPT.md` | The app shell / refresh build prompt. Reconciled 2026-07-29 — Audio is now in scope, splash→IDE added, Projects behavior deferred to the object model. |
| `REFRESH-SPEC.md` | Refresh spec: nine tunable tokens, glass formulas, per-screen notes. |

## Merging into `pixcel-handoff/`

This drop supersedes `pixcel-handoff/` but does **not** replace it wholesale. It contains no
equivalent of `CLAUDE.md` (the non-negotiable design rules the executor briefs enforce),
`START_HERE.md`, or `docs/art-studio-integration-guide.md` — keep those.

**Overwrite:** `Pixcel Art Studio.html`, `image-slot.js`, `support.js`, `assets/`.
**Add:** every doc at this level, and all of `design/`.
**Diff before overwriting:** `colors_and_type.css` — `packages/pxs-studio/src/app/tokens.css` names
it as the token source of truth. Don't move that silently.
**Delete only after confirming nothing imports them:** `ide/`, `ide-workflow/`,
`Image IDE - MVP.html`, `Image IDE - Workflow.html` — the `(instant)` files in `design/` are
self-contained replacements.
**Do not rename anything under `screenshots/`** — `.cursor/plans/*.plan.md` cite
`image-ide-*.png` by filename.

## Designs — `design/`

Interactive sources. `support.js`, `image-slot.js`, `deck-stage.js`, `_ds/` and `assets/` sit
beside them and are required — keep the folder intact.

| File | Surface |
| --- | --- |
| `Pixcel Refresh.dc.html` | **The app.** Chat · Image · Video · Audio · Projects · Assets, plus both style modes. Newer than the repo copy — it has the Projects screen. |
| `Pixcel Object Model.dc.html` | The object-model diagram (1a) and the lineage view (1b). Click any lineage node. |
| `Image IDE - MVP (instant).html` | Image IDE, MVP direction. |
| `Image IDE - Workflow (instant).html` | Image IDE, workflow direction. |
| `Pixcel Art Studio (instant).html` | Art Studio surface — the Statue Method char-map. |
| `Pixcel Chat Bubbles.dc.html` | Three chat-bubble treatments. Exploration, not in the main flow. |
| `Pixcel Pitch Deck.dc.html` | Pitch deck. |

## Screenshots

`design/object-model-1a.png` — the three nouns with real field lists. Amber `+` = field to add;
unmarked = already in `models.ts`.
`design/object-model-1b-lineage.png` — the lineage view (Slice 6). Reads only existing edges.
`design/projects-screen.png` — the Projects screen at full detail (Slice 3).

`design/screens/` — every app screen as rendered:

```
01-chat.png            04-video-splash.png    07-assets.png
02-image-splash.png    05-audio-splash.png
03-image-ide.png       06-projects.png
```

## Settled since the last exchange

- **`seeded_from` keeps its tag.** `{ kind: 'asset' | 'recipe', id }` — the engineer's version wins;
  a bare id can't say what it points at without a lookup. `'template'` → `'recipe'` for vocabulary.
- **Only `promoted_at` + `expires_at` outstanding on `Thread`.** The other three are on the branch.
- Everything else in the handoff stands as written.

## Reading the Projects screen

Details that are load-bearing, not decoration:

- Saved projects carry **no chip** — saved is the norm, only the exception gets marked.
- Expiry is stated on the row and goes **amber under 5 days** (`Untitled`, 3 days).
- The sweep rule is printed next to the filter, so the 14-day GC is never a surprise.
- Lineage shows inline in mono where it exists — "opened from gallardo-predawn · v2",
  "from template · Character Reference Sheet". This is what makes the object model visible in daily
  use instead of living only in a diagram.
- Row actions are exactly the three verbs a Project supports: Duplicate · Save as template · Delete.

## Reconciled 2026-07-29

Both older docs were audited against the current design and corrected. What was stale:

- **Audio was listed as roadmap / "do not build."** It has a designed splash. Fixed in both docs.
- **Screen count said five.** It is six.
- **The splash→IDE lens was missing entirely** — both docs described Image as always-three-panel.
  The splash is what a user actually lands on, so it is now specified first.
- **The Projects screen section predated the object model** (it described edit/trash icons and no
  retention concept). Rewritten to match: filter pills, Draft chips, expiry rules, three verbs,
  undo/confirm.
- **File paths pointed at the folder root** (`README.md`, `Pixcel Refresh.dc.html`,
  `colors_and_type.css`). Everything design now lives in `design/`; `README.md` → `REFRESH-SPEC.md`.
- **State list** was missing the lens, filter, undo and confirm state.

Not stale, checked and left alone: the whole token system. The base greys (`#131417` / `#2b2c30` /
`#ecedef` / `#9a9ca2`), glass base `#191a1e` at 0.70 / 0.57 / 0.35, blur 15px, and the coral→violet
accent all still match the live theme. Warmer hexes appear in the design file only as CSS `var()`
fallbacks and never resolve.

## Still open

- **Assets** has no All · Saved filter yet — `Asset.retention` already supports it; the UI is next.
- Workflows and Guides copy on the splash screens is placeholder.
- Media tiles accept drag-drop but ship with placeholders — no real stills yet.
