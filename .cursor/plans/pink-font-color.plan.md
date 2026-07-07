---
name: Pink font color
overview: Change primary body text from neutral gray to pink by updating --a2ui-text-primary in tokens.css.
todos:
  - id: f7a2b1c0-0001-4000-8000-pink00000001
    content: Pick dark + light pink hex values for readable contrast
    status: pending
  - id: f7a2b1c0-0002-4000-8000-pink00000002
    content: Update --a2ui-text-primary in packages/pxs-studio/src/app/tokens.css (dark line 54, light line 102)
    status: pending
  - id: f7a2b1c0-0003-4000-8000-pink00000003
    content: Grep for hardcoded primary-text hex overrides in pxs-studio/src and fix any stragglers
    status: pending
  - id: f7a2b1c0-0004-4000-8000-pink00000004
    content: Visual pass — chat, nav, both themes; confirm secondary/muted text unchanged
    status: pending
  - id: f7a2b1c0-0005-4000-8000-pink00000005
    content: Run tsc --noEmit and studio:build
    status: pending
isProject: true
---

# Pink font color

Change primary body text color to pink. Color only — not font size.

## Why

Primary text is `--a2ui-text-primary` in `packages/pxs-studio/src/app/tokens.css`. Components like `QuestionBlock` already use `color: var(--a2ui-text-primary)`. One token change propagates everywhere.

## Target file

`packages/pxs-studio/src/app/tokens.css`

```css
/* dark (line 54) */
--a2ui-text-primary: #f472b6;   /* or #ff69b4 */

/* light (line 102) */
--a2ui-text-primary: #db2777;   /* or #be185d */
```

`--pxs-text` (line 149) aliases `--a2ui-text-primary` — no separate edit needed.

## Do not touch

- Font size tokens (`--a2ui-text-md`, etc.)
- `--a2ui-text-secondary`, `--a2ui-text-tertiary`, `--pxs-text-muted`
- Accent, link, success, error colors

## Verify

- Chat question labels pink in dark theme
- Same surfaces pink in light theme with readable contrast
- Secondary text still gray
- `tsc --noEmit` + `npm run studio:build` green
