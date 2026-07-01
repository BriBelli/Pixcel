# PR 1 — Design foundation: tokens + brand assets

**Branch (proposed):** `feature/design-foundation`
**Size:** Small (~150–300 lines; mostly one token file + a globals reconciliation — the assets are files, not lines)
**Blocking decisions:** **none.** Independent of every 🔴 decision — this is why it goes first while we settle the DB/A2UI questions.

---

## Why this PR
Follow the Claude Design system **to a T** means building on its *real* tokens and brand assets, not my
hand-made partial `tokens.css`. This PR swaps in the canonical token file and lands the brand asset set, so
every later component is token-true and brand-correct. Pure conduit foundation — no product logic.

## Scope (what's in)
1. **Canonical tokens.** Replace `packages/pxs-studio/src/app/tokens.css` (my partial) with the real
   **`colors_and_type.css`** from the design system (`design-system/pixcel-handoff/colors_and_type.css`) — the
   full `--a2ui-*` / `--pxs-*` set + type scale + the IBM Plex `@import`. Per the handoff, `colors_and_type.css`
   and the app's token file are *the same file*; this makes ours that file.
2. **Keep the additive Pixcel supplement.** Preserve the Pixcel-only additions my partial added that aren't in
   the design file (z-index scale, layout tokens like nav width) as a clearly-marked *supplement* block —
   nothing that overrides a canonical token.
3. **Brand assets → `public/brand/`:**
   - `logo-mark.svg` (the Pixel-X, exposing `<symbol id="pixcel-x">`) + variants (`-white`, `-black`,
     `-on-light`, `-app-icon`, `-favicon`), and `logo-wordmark*.svg`.
   - `icons/*.svg` — the Lucide essentials set.
   - `provider-icons/*.ico` — Anthropic / GPT / Gemini / xAI / Flux / fal / Ideogram / Recraft / Replicate /
     Stability / internet.
4. **Fonts.** Confirm IBM Plex Sans/Mono load (CDN `@import` in the token file). Local `.woff2` is a prod/perf
   follow-up, not this PR.
5. **Reconcile `globals.css`.** Ensure it imports the real tokens; reconcile the legacy `:root` aliases + the
   locked brand-blue exception block against the canonical tokens — drop redundant aliases the real tokens
   already provide; keep the locked brand blue only if the canonical `--a2ui-accent` differs.

## Out of scope (explicitly)
- **No components** — the `PixcelMark` / `Icon` React components that *consume* these assets are **PR 2**.
- No DB (PR 3), no chat re-engineer (PR 4), no logo-render change (`PixcelLogo`/`DigitalWall` stay as-is; the
  raw mark assets are just *added* for PR 2 to use).

## Files
| Action | Path |
| --- | --- |
| Replace | `packages/pxs-studio/src/app/tokens.css` → canonical `colors_and_type.css` (+ marked Pixcel supplement) |
| Edit | `packages/pxs-studio/src/app/globals.css` (reconcile aliases + brand-blue exception vs canonical) |
| Add | `packages/pxs-studio/public/brand/logo-mark*.svg`, `logo-wordmark*.svg` |
| Add | `packages/pxs-studio/public/brand/icons/*.svg` (Lucide set) |
| Add | `packages/pxs-studio/public/brand/provider-icons/*.ico` |

## Verify (no behavior change expected)
- [ ] `npx tsc --noEmit` clean.
- [ ] `npm run studio:build` green.
- [ ] `npm run studio:dev` boots, `GET /` → 200 (no prompt submitted).
- [ ] Splash + chat still render; every referenced `--a2ui-*` / `--pxs-*` resolves (no missing-var); dark theme intact.
- [ ] `logo-mark.svg` renders via `<svg><use href=".../logo-mark.svg#pixcel-x"/></svg>` (currentColor inherits) — quick manual check.
- [ ] Visual spot-check vs the design: dark charcoal, soft Google-blue accent, no broken colors. Splash frozen visual preserved (only global token changes flow through — allowed by the freeze rule).

## Reviewable because
Additive brand assets + a **token-file swap to the canonical source** + a small `globals` reconciliation. No
logic, no new components, ~zero behavior change (a visual token *alignment*). Safe first merge, and it unblocks
every UI PR after it by making tokens real.

## Risks / notes
- **Token reconciliation** is the only real risk: the canonical file may name/scale a few tokens differently
  than my partial. The splash/chat use a known subset (`--a2ui-bg-app`, `--a2ui-text-primary`, `--a2ui-accent`,
  `--a2ui-border-default`, radii, transitions) — all present in the canonical file. Expect minor, intentional
  visual shifts toward the real design. Reviewer should eyeball splash + chat.
- Keep `--pxl-brand-*` references (`DigitalWall`/`LandingPage`) resolving — map to canonical or retain the
  exception block.
