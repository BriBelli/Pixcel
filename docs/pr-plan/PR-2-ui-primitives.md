# PR 2 — UI primitives + the Composer (the library seed)

**Branch:** `feature/ui-primitives`
**Size:** Small–medium (~400–650 lines incl. the preview page)
**Depends on:** PR 1 (tokens/assets, merged). **Blocking decisions:** none.

---

## Why
Seed the **powerful UI component library**, unified in brand/style with the A2UI React library. Build the
primitives the chat + workflows need — correct to the CLAUDE.md rules — so later PRs consume them instead of
reinventing. **The star of this PR is the Composer** (the prompt bar), matched to Brian's photolif reference.

## Scope

### 1. Primitives (`src/components/ui/`)
Each interactive one ships **all 7 states** (default / hover / focus / active / disabled / loading / error),
tokens-only, per CLAUDE.md (alpha borders, 2px focus **halo** not outline, no scale-pop, radii 8/12/full,
easing `cubic-bezier(0.22,1,0.36,1)`, glass only on float chrome).
- `Button` (primary / secondary / ghost) · `Input` · `Card` · `Chip`/`Pill` · `IconButton` · `Avatar` · `Tooltip`.
- Brand-asset consumers: **`PixcelMark`** (Pixel-X via `<use href="/brand/logo-mark.svg#pixcel-x">` / CSS mask —
  currentColor-tintable) and **`Icon`** (Lucide, from `public/brand/icons`).

### 2. The Composer ★ (matched to the photolif prompt-bar)
One component, a **framed card**: optional **header strip** (context/routing summary), the **prompt textarea**
body, and a **footer strip** — with the footer **configurable per surface** (built once, adapts):

| Variant | Footer contents |
| --- | --- |
| **Chat / splash-search** (front door) | attach · word count · **send** |
| **Image-generate** (the screenshot) | model chip (provider icon · "N models" · ▾) · word count · **quality pill** · primary **Generate ×N** |

Exact photolif styling: framed dark card, darker header strip, pill controls, the primary button. Real **word
count** + **send/attach** are wired. The **not-yet-built controls** (quality %, model count, Generate ×N) render
as **styled placeholders** — pixel-correct, inert — until their features land.

### 3. Preview page (`app/preview/`)
Storybook-lite: every primitive × 7 states + **both Composer variants**, for review in isolation.

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
tsc + build green · `/preview` renders each primitive × 7 states + both Composer variants · matches the design
(dark, tokens, glass only on float chrome) and the photolif Composer reference.

## ⬜ Confirm in review (my defaults, override any)
1. **Surfaces:** build ONE Composer used by BOTH the splash search and the chat composer (footer adapts). ✅ default.
2. **Unbuilt controls** (quality %, model count, Generate ×N): **styled placeholders** now, wired later. ✅ default.
3. **Footer sets** per variant as in the table above — add/remove any control?
