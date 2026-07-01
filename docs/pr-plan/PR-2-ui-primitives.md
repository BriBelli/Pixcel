# PR 2 — UI primitives (the library seed)

**Branch (proposed):** `feature/ui-primitives`
**Size:** Small–medium (~300–500 lines)
**Depends on:** PR 1 (tokens/assets). **Blocking decisions:** none.

## Why
Seed the **powerful UI component library** (unified in brand/style with the A2UI React library). Build the
primitives the chat needs, correct to the CLAUDE.md rules, so PR 4 consumes them instead of reinventing.

## Scope
- **Primitives:** `Button` (primary/secondary/ghost), `Input`/`Composer`, `Card`, `Chip`/`Pill`, `IconButton`,
  `Avatar`, `Tooltip`, and the brand-asset consumers `PixcelMark` (Pixel-X via `<use>`/mask) + `Icon` (Lucide).
- **Every interactive primitive ships all 7 states** (default/hover/focus/active/disabled/loading/error),
  tokens-only, per CLAUDE.md (alpha borders, 2px focus halo, no scale-pop, radii 8/12/full, easing no-bounce).
- **A `/preview` page** (storybook-lite) rendering each primitive in every state for review in isolation.

## Out of scope
No app wiring / no chat changes (PR 4 consumes these). No A2UI renderer (that's its own later PR + the v10 lock).

## Reviewable because
Additive library + a preview page; no app behavior change; every state verifiable in isolation.

## Verify
tsc + build green · `/preview` shows each primitive × 7 states · matches the design (dark, tokens, glass only on float chrome).
