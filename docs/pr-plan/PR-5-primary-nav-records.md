# PR 5 — Left Primary Nav → per-category records panel

**Branch (proposed):** `feature/primary-nav-records`
**Size:** Medium (~400–600 lines)
**Depends on:** PR 3 (DB), PR 4 (shell). **Blocking decisions:** the category↔table lock (🔴 #1).

## Why
The persistent left anchor + the per-category browser Brian called out: the 56px rail expands into a panel of
the category's records (chat threads now; project slots for Art/Image/Video).

## Scope
- **56px primary nav rail** (design-exact): Pixel-X top; **Chat · Art · Image · Video** + Export/Assets/
  Assistant pinned bottom; Art = the `scribble` glyph; 2.5px accent bar on the active item.
- **Expand-to-panel:** clicking/opening the rail expands a labeled panel listing the active category's records
  — **chat threads** (from the DB, `active`, newest first) for Chat; project rows for the media categories;
  "New" affordance; select → hydrate that thread.
- Reads the DB (threads/projects per category, user-scoped).

## Out of scope
The media-category *workflows* themselves (image/video generation) — those are later phases; the panel shows
their records/slots but doesn't run them yet. Assets full catalog (its own surface).

## Reviewable because
Builds on PR 3/4; one surface, end-to-end (rail → panel → select → hydrate). Design-exact nav is easy to review
against the prototype.

## Verify
tsc + build + dev-200 · rail matches the design · panel lists real threads · select hydrates the thread into the chat.
