# PR 7 — Action bar (message meta-actions)

**Branch (proposed):** `feature/message-action-bar`
**Size:** Small–medium
**Depends on:** PR 4 (chat turn). **Optional / parallel — never blocks the core.**

## Why
Brian's "beyond current scope but nice to incorporate" item — parked here so it can ship after the core
interactions work (or in parallel if someone else owns UI polish).

## Scope
- Per-assistant-turn **meta-actions row**, hover-revealed: **Copy** · **Regenerate** · **thumbs up/down**
  (feedback stored as metadata for now) · **model badge · duration · timestamp**.
- Wire Copy + Regenerate to the existing flows (Regenerate reuses PR 4b's reuse-in-place path); thumbs just
  persist metadata.

## Out of scope
Analytics/feedback *processing* (metadata only for now). Any layout overhaul.

## Reviewable because
Additive UI on top of an existing turn; one cluster; not on the critical path.

## Verify
tsc + build + dev-200 · row appears on hover · Copy/Regenerate work · thumbs persist metadata · matches the design (ghost buttons, tokens).
