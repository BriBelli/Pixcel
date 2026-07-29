# Icon system — Lucide

**Source of truth:** [Lucide](https://lucide.dev) (MIT-licensed fork of Feather Icons). 1,700+ icons, 24-px viewBox, 2-px stroke, rounded caps/joins — visually identical to the icon style already in the Pixcel codebase.

## Why Lucide

- **Already matches the codebase.** The inline SVGs in `a2ui-stat`, `a2ui-alert`, `a2ui-login` are all `viewBox="0 0 24 24"`, `stroke-width="2"`, rounded line caps. Lucide is the same vocabulary. No re-learning a stroke weight.
- **Free for commercial use.** MIT license. No attribution required, no per-use fees.
- **Coverage.** 1,700+ icons; ships with new ones every release. Anything you reach for in Heroicons / Feather / Tabler is already here.
- **Three integration paths** so design and prod don't fight:

### Path 1 — Bundled SVGs (this folder)

50 of the most common icons are pre-copied into `assets/icons/<name>.svg`. Use them as static `<img>` tags or fetch them inline.

```html
<img src="/assets/icons/send.svg" width="18" height="18" />
```

Add color with a CSS filter (charcoal text):

```css
img.icon { filter: invert(89%) sepia(8%) saturate(72%) hue-rotate(202deg) brightness(94%) contrast(86%); }
```

Or inline the SVG and use `stroke="currentColor"` (what every file already declares):

```html
<svg width="18" height="18" viewBox="0 0 24 24" fill="none"
     stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <!-- paste paths from the .svg file -->
</svg>
```

### Path 2 — CDN (zero install, for prototypes)

```html
<i data-lucide="send" style="color: var(--a2ui-text-primary); width: 18px; height: 18px;"></i>
<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
<script>lucide.createIcons();</script>
```

### Path 3 — npm (production React / Lit)

```bash
npm install lucide-react   # or lucide for the framework-agnostic build
```

```jsx
import { Send, Sparkles, Pencil } from 'lucide-react';

<Send size={18} strokeWidth={2} />
```

## Need an icon that isn't bundled?

The full set is at <https://lucide.dev/icons>. Add it to this folder via:

```
github_import_files lucide-icons/lucide@main paths=["icons/<name>.svg"]
```

…then move it from `icons/` to `assets/icons/`.

## Sizes

- **14 px** — inside chips and trend badges
- **16 px** — toolbar buttons
- **18 px** — default (alerts, message actions, prompt-bar tools)
- **24 px** — section headers
- **40 px** — empty-state illustrations

## Stroke weights

Lucide ships at `stroke-width="2"` by default. The codebase occasionally bumps to `2.5` for tiny icons (trend arrows in `a2ui-stat`) so they read at 10–12 px. Never go below `1.5`.

## What we ship

50 icons covering the product's needs: arrows, chevrons, plus/minus/check/x, settings + user, message-circle/-square, send, sparkles + wand-sparkles (AI), image + grid + layout-grid (canvas), paperclip + mic (composer), share-2 + moon + sun (header), copy + thumbs-up/-down + refresh-cw (message actions), circle-alert / triangle-alert / circle-check / info (alert variants), eye + eye-off + download + upload + trash-2 (utility), pencil + eraser + paint-bucket + pipette + square + circle (Studio tools), zap + globe (misc).

For the rest, follow the import pattern above.
