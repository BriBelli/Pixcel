# Prompt history — edit + attach + cascade

**Status:** next up
**Parent:** `pixcel-platform.plan.md`

## Goal
A past **user** message can be edited (double-click → editable), the composer supports **file attachments**, and editing or regenerating a message **traverses the subsequent records and marks them `inactive`** (re-run from that point) — matching the photolif design and the status cascade we already have.

## Context / what exists
- photolif `apps/a2ui-chat/.../a2ui-chat-message.ts` has the exact edit UX: double-click → inline textarea → Enter submits → `edit-message` event (Esc cancels).
- We already have `cascadeDeactivateDownstream(repo, threadId, fromCreatedAt)` in `lib/db/status.ts`, plus `LivingContext.editTurn` / `deleteTurn`.
- `components/chat/MessageTurn.tsx` renders the user bubble; `components/ui/Composer.tsx` is the input; `store/chat-turns-store.ts` owns turn state + `deleteTurn`.
- `inactive` is one-way from the UI (no reactivation).

## Tasks
- [ ] **Editable user turn** — double-click the user bubble → inline `<textarea>` with Cancel / Send; Enter = send, Esc = cancel (port photolif's edit block to our tokens).
- [ ] **`editTurn` store action** — `editTurn(interactionId, newText)`: POST to `/api/chat-mutate` (action `edit`) → cascade downstream turns to `inactive` → re-run the turn from the edited message (fresh assistant response).
- [ ] **Regenerate wiring** — the footer regenerate action uses the same path: deactivate downstream, re-run this turn.
- [ ] **File attachment** — paperclip in the composer → file picker → attached-file chips above the input → files ride with the prompt (as references for edit/compose later).
- [ ] **Verify** — edit an earlier turn → later turns drop from view (marked inactive, not deleted) → a fresh continuation runs; DB shows the audit trail intact.

## Acceptance
- Double-click a past user message → it's editable; sending re-runs from there and downstream turns disappear (inactive in DB, not destroyed).
- Regenerate does the same cascade.
- A file attached in the composer is carried with the message.

## Out of scope
- Using attached files as real image references in generation (that's the edit/compositing plan).
