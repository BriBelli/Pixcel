# PR 6 — Settings panel + system-model config

**Branch (proposed):** `feature/settings-panel`
**Size:** Medium
**Depends on:** PR 1/2 (tokens/primitives). **Optional / parallel — does NOT block PR 3–5.**

## Why
Basic user settings + the home for the **system-model choice** (advisor/executor configurable, Opus default —
the revised model policy). Leverage photolif's settings as reference; start simple.

## Scope (from Brian's reference screenshot)
- **Model:** Active model (system-model picker: Opus default; Gemini/Haiku options; Sonnet excluded) · Smart
  routing toggle · Temperature.
- **Tools:** Content style · Performance · Web search · Geolocation · Data sources.
- **Conversation:** History toggle · Max messages.
- **Display:** Action bar · Stream response · Sources · Sources position.
- Tabs: Settings · Media · Data Sources (Media/Data-Sources can stub first).
- Persist settings per user (DB or local first).

## Out of scope
Wiring every setting to real behavior — land the panel + the model config that matters now; other toggles can
be persisted-but-inert until their feature exists.

## Reviewable because
Self-contained panel; not on the critical path; reviewable against the photolif reference + the design rules.

## Verify
tsc + build + dev-200 · panel matches the reference · system-model choice persists + is read by the chat route.
