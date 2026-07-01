# PR 2 — UI primitives + the Composer (the library seed)

**Branch:** `feature/ui-primitives`
**Size:** Small–medium (~400–650 lines incl. the preview page)
**Depends on:** PR 1 (tokens/assets, merged). **Blocking decisions:** none.

---

## Why
Seed the **powerful UI component library**, unified in brand/style with the A2UI React library. Build the
primitives the chat + workflows need — correct to the CLAUDE.md rules — so later PRs consume them instead of
reinventing. The Composer (the prompt bar) is included, but **kept simple**: the prompt bar isn't fully
designed yet — both the Claude Design and photolif have gaps — so we do NOT chase a rich version here.

## Scope

### 1. Primitives (`src/components/ui/`)
Each interactive one ships **all 7 states** (default / hover / focus / active / disabled / loading / error),
tokens-only, per CLAUDE.md (alpha borders, 2px focus **halo** not outline, no scale-pop, radii 8/12/full,
easing `cubic-bezier(0.22,1,0.36,1)`, glass only on float chrome).
- `Button` (primary / secondary / ghost) · `Input` · `Card` · `Chip`/`Pill` · `IconButton` · `Avatar` · `Tooltip`.
- Brand-asset consumers: **`PixcelMark`** (Pixel-X via `<use href="/brand/logo-mark.svg#pixcel-x">` / CSS mask —
  currentColor-tintable) and **`Icon`** (Lucide, from `public/brand/icons`).

### 2. The Composer (start SIMPLE)
Take what we already have in the splash search bar and give it the clean, correct CSS — to the **Claude
Design**: a tokens-only prompt input (attach · textarea · send), all 7 states, the design's radii/borders/
focus-halo/easing. Used by the splash search + the chat composer. Nothing fancy.

**DEFERRED (NOT this PR — the prompt bar isn't fully designed; both sources have gaps):** the rich footer
(model chip · quality pill · Generate ×N). We add those only once they're actually designed and their
features exist. No rich "photolif" version now.

### 3. Preview page (`app/preview/`)
Storybook-lite: every primitive × 7 states + the Composer, for review in isolation.

## Out of scope
No real model routing / quality scoring / generation (later PRs). No DB. No app wiring — PR 4 swaps the current
splash/chat inputs to consume the Composer; PR 2 just builds + previews it.

## Files (estimate)
`src/components/ui/{Button,Input,Card,Chip,IconButton,Avatar,Tooltip,PixcelMark,Icon,Composer}.tsx` ·
`src/components/ui/index.ts` · `src/app/preview/page.tsx`.

## Reviewable because
Additive library + a preview page; **zero app behavior change**; every state/variant verifiable in isolation;
the Composer is checkable side-by-side against the photolif reference.

## Verify
tsc + build green · `/preview` renders each primitive × 7 states + the Composer · matches the design (dark,
tokens, glass only on float chrome).

## ⬜ Confirm in review (my defaults, override any)
1. **Composer stays simple** — a clean, design-correct prompt input (attach · textarea · send); the rich
   footer (model / quality / Generate) is deferred until it's designed. ✅ default.
2. **One Composer** used by both the splash search and the chat composer. ✅ default.
3. **Primitive set** — Button/Input/Card/Chip/IconButton/Avatar/Tooltip enough for now, or add any?
