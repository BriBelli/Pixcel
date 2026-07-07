# PR-8 — Persistent shell (the anchor everything sits inside)

## Why

The splash → chat hand-off feels like a snap — "startled from a nap." Root cause: each stage
renders a **whole view** (`LandingPage`, `ChatView`), and each view owns its **own** NavRail **and**
its own backdrop. The transition ([page.tsx](../../packages/pxs-studio/src/app/page.tsx)) stacks the
two full views and cross-fades them, so the one element that should be a fixed anchor — the primary
nav — *re-mounts and dissolves* with everything else. Worse, the backdrops don't even match: the
splash uses `<DigitalWall>` (LED wall + logo) while `ChatView` uses a different `.pxc-ambient`
gradient — so the hand-off also swaps the whole canvas underfoot.

This battles the mantra: the UI should feel **persistent** and **not there**. The nav must never
disappear; the digital wall must be one independent screen behind everything.

## Goal

The primary NavRail and the DigitalWall are **single, persistent instances at the shell**. They
never fade or move. Only the **center content** cross-fades between splash and chat. The wall is the
z-0 canvas *below* the nav; it re-tunes across stages (splash = logo + higher intensity; chat =
dormant, low intensity, no logo) instead of being swapped for a different backdrop.

```
shell (page.tsx)
  DigitalWall          ← z-0, full-bleed, ONE instance, re-tunes per stage
  NavRail              ← persistent left anchor, never fades, stage-aware activeSection
  content well         ← splash ⇄ chat cross-fade happens ONLY here
```

## Steps

1. **Shell owns the rail + wall.** In `page.tsx`, render ONE `<DigitalWall>` (z-0) and ONE
   `<NavRail>` (left anchor) outside the cross-fading layers. Drive them from `stage`:
   `activeSection` = `'chat'` on splash/chat; wall props (logo on/off, intensity) re-tune per stage.
   Route the rail's `onHome`/`onSection`/`onUtility`/settings through the existing stage handlers.
2. **Views become content-only.** Remove the NavRail + backdrop from `LandingPage` and `ChatView`;
   each returns just its center column (splash: prompt bar over the wall; chat: conversation /
   workspace). They no longer own `flex h-screen` with a rail — the shell provides the frame.
3. **Cross-fade the well, not the frame.** `layerStyle` applies only to the center content well.
   The rail + wall sit above/below at steady opacity through the whole hand-off.
4. **Unify the backdrop.** Retire `ChatView`'s `.pxc-ambient` in favor of the shared persistent
   `<DigitalWall>` held dormant (low intensity, `showLogo` off) behind the chat — one canvas from
   splash to conversation. (Keep reduced-motion behavior.)
5. **Wall re-tune, not re-mount.** The logo→dormant change is a prop transition on the SAME
   `<DigitalWall>` instance (intensity / logoScale), so it eases instead of cutting.

## Out of scope (later)

- **Studio** keeps its own rail for now — it has distinct utilities (Export/Assets/Assistant),
  active states, and floating chrome. Folding Studio under the shared shell is a follow-up.
- The workflow-mode "wall goes dormant / heartbeat" choreography (memory-noted) — separate.
- Any nav/section behavior change — this PR is purely persistence + backdrop unification, no new
  routes or actions.

## Verify

- Prompt on the splash → the nav **does not move or flash**; only the center swaps. No double rails
  at any point in the hand-off.
- The digital wall is continuous behind splash and chat (re-tunes, never swaps to a gradient).
- Splash, chat, and the 2B Image workspace all still render + function; nav active state tracks the
  stage/medium.
- `prefers-reduced-motion` → no drift, no cross-fade jank.
- `tsc --noEmit` clean. (No test runner configured.)

## Guardrails

- **Do NOT touch the 2B Operator/skills/workspace work** — this is shell-only. `ChatView`'s internal
  chat/workspace layout stays exactly as-is; only its outer rail + backdrop leave (moved up to the
  shell). The gold splash's visual result must be pixel-identical after the hoist.
- Its own branch off `main` (not the 2B branch).
