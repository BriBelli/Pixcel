# CLAUDE.md — Pixcel design-system handoff

> Drop this file into the root of the Pixcel product repo (sibling of `apps/`, `packages/`).
> Anything in here is *the rule*. When a rule and your instinct disagree, follow the rule.

Pixcel is **AI-native pixel-art tooling**: a conversational chat (Pixcel Chat) that hands off to a full-screen editor (Pixcel Studio). The brand surface is **dark by default, warm charcoal, soft Google-blue accent, frosted glass on float chrome.** The phrase that decides every visual call: **"the UI should feel not there."**

---

## 1. Where things live

| Concern | Path |
| --- | --- |
| Design system root | `design-system/` (this project, copied or symlinked in) |
| Canonical tokens | `design-system/colors_and_type.css` |
| Brand marks | `design-system/assets/logo-*.svg` |
| Provider icons (Anthropic / GPT / Gemini / xAI / Flux / fal / etc.) | `design-system/assets/provider-icons/` |
| Lucide essentials, pre-bundled | `design-system/assets/icons/` |
| Hi-fi reference (React) | `design-system/ui_kits/a2ui-chat/` |
| Production Lit components | `apps/a2ui-chat/src/components/` |
| Production tokens (must match) | `apps/a2ui-chat/src/styles/tokens.css` |
| Studio palette | `apps/a2ui-chat/src/styles/studio-palettes.css` |

`colors_and_type.css` and `apps/a2ui-chat/src/styles/tokens.css` are **the same file**. If you change one, mirror to the other in the same commit.

---

## 2. Stack & idioms

- **Production:** Lit + Web Components. No React in `apps/a2ui-chat/`.
- **Design references** in `ui_kits/a2ui-chat/` are React — for *visual* fidelity only. Translate prop names to Lit attributes (`<a2ui-stat label="…" value="…" trend-direction="up">`).
- **Styling:** raw CSS using `--a2ui-*` tokens. No Tailwind, no CSS-in-JS, no SCSS.
- **No new color values.** If you need a color that isn't a token, you're wrong about the design — talk to the system, don't add a hex.
- **No new font families.** IBM Plex Sans / IBM Plex Mono are it.
- **No emoji.** One ✉️ exists on the reset-success state. That's the budget. Use inline SVG from Lucide.
- **No icon fonts.** Inline SVGs only — `viewBox="0 0 24 24"`, `stroke="currentColor"`, `stroke-width="2"`, no fills for line icons.

---

## 3. The hard rules

These are non-negotiable. Reviewers will revert PRs that break them.

1. **Dark theme is canonical.** Light theme exists, but design and test against dark first.
2. **No gradients on UI chrome.** Flat charcoal panels at four elevations. Gradients only inside user-generated artwork.
3. **No solid 1px gray borders.** Borders are alpha-on-current-surface: `rgba(255,255,255,0.10)` default, 0.05 subtle, 0.18 prominent.
4. **No opacity-only hover.** Use `--a2ui-bg-hover` overlay or bump the elevation step.
5. **No scale-pop on press.** Buttons don't shrink. Use `--a2ui-bg-active`.
6. **Focus is a 2px halo via box-shadow**, never `outline`. Inputs also shift `border-color` to `--a2ui-accent`.
7. **Cards have no border or shadow by default.** They earn `--a2ui-shadow-sm` + border on hover.
8. **Chat column is hard-capped** at `--a2ui-chat-max-width` (640px) / `--a2ui-chat-max-width-expanded` (1120px). Never full-bleed.
9. **Sidebar is 280px fixed**, collapses to overlay below 768px. Header is 64px (56 mobile).
10. **Prompt bar is `position: absolute`** with a `clamp(176px, 30vh, 268px)` scroll-pad on messages so nothing hides behind it.
11. **Glass surfaces always have a 1px white-at-8% border** and a `backdrop-filter: blur(…)`. Otherwise it's not glass — it's a tinted panel, which we don't do.
12. **Corner radii** by component class: buttons/inputs 8 (`--md`), cards 12 (`--lg`), modals 16 (`--xl`), chips full. Never sharp corners.
13. **Animation easing** is `cubic-bezier(0.22, 1, 0.36, 1)` for entrances, flat `ease` for hovers. Durations 150 / 200 / 300. **No bounce, no spring.**
14. **Sentence case** for buttons and headings. Title case only for proper nouns and model names.

---

## 4. Tone of voice

- Direct, calm, second-person. "Sign in to Pixcel Chat", not "Welcome to Pixcel!"
- One short sentence max per microcopy slot.
- No exclamation marks anywhere in the UI.
- Errors are de-escalated: *"Invalid email or password. Please try again."*
- Agent refers to itself by its model badge ("Claude", "Gemini"), never "I".
- System messages are impersonal: *"Trending up this month"*, not *"I think it's trending up."*

If you write copy that wouldn't fit in a Google settings panel, rewrite it.

---

## 5. Patterns you'll need often

**Cards** — `--a2ui-bg-tertiary`, 12px radius, 20px padding, no border, no shadow. On hover: gain border `--a2ui-border-default` and `--a2ui-shadow-sm`.

**Buttons** — primary fills `--a2ui-accent` with `--a2ui-text-inverse` text; secondary uses `--a2ui-bg-tertiary` with `--a2ui-text-primary`; ghost uses transparent → `--a2ui-bg-hover` on hover. 8px radius, 36–40px height, sentence case.

**Inputs** — `--a2ui-bg-input` background, 1px `--a2ui-border-default` border, 8px radius. On focus: border becomes `--a2ui-accent`, add 2px halo via box-shadow with `--a2ui-accent-subtle`.

**Chips & pills** — full radius, 12px horizontal padding, 24–28px height. Model-picker chips show provider favicon at 16px + model name in `--a2ui-text-md`.

**Floating chrome (menus, model picker, prompt bar header strip)** — `rgba(18,18,22,0.82)` + `backdrop-filter: blur(20px)` + 1px `rgba(255,255,255,0.08)` border + `--a2ui-shadow-lg`.

**Empty illustration glyphs** — 40px Lucide icon at `--a2ui-text-tertiary`. Don't draw custom illustrations; use type + a single glyph.

---

## 6. AI-specific UI conventions

These are conventions for the AI workflow surfaces. Reuse, don't reinvent.

- **Streaming text** uses the same `<p>` style as final text — no monospace, no typewriter cursor. A 1.2-em wide grey block-cursor pulses at the end while streaming; it removes itself on done.
- **Tool calls** render as a collapsible row inside the assistant turn: 16px Lucide glyph + tool name in `--a2ui-text-md` + relative time + chevron. Expanded view shows input JSON in a `code` block and output as a rich `<a2ui-*>` component.
- **Multi-step agent plans** render as a vertical list of pending / in-progress / done rows. State glyph on the left (circle / spinner / check), title in `--a2ui-text-md`, optional sub-step in `--a2ui-text-sm` `--a2ui-text-secondary`. The active row gets `--a2ui-bg-tertiary`; done rows are `--a2ui-text-secondary`.
- **Generated-image results** render as a 2- or 4-up grid using `<a2ui-image-result>`. Each tile has a hover overlay with **Edit in Studio**, **Save**, **Variations** actions. The hover overlay is a `linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.6) 100%)` — the **only** gradient allowed in the chrome.
- **"Open in Studio"** is the *only* way to enter Pixcel Studio. It animates: tile scales to fill viewport over 300ms with the entrance easing, then the Studio shell fades in over its surface.
- **Rate-limit / error states from the model** never use `--a2ui-error` for the whole card. The card is a normal `<a2ui-alert kind="warning">` with the error string in body copy. Red is reserved for destructive confirms.

---

## 7. Adding new components

1. **Check** `ui_kits/a2ui-chat/Rich.jsx` and `apps/a2ui-chat/src/components/`. If a similar component exists, extend it instead.
2. **Subclass** the Lit base — same lifecycle hooks, same `static styles` pattern, same `@property` decorators as siblings.
3. **Tokens only** for color / spacing / radius / shadow / font. If you wrote a hex code, you're wrong.
4. **Ship a preview card** at `design-system/preview/comp-<name>.html` mirroring the others. Register it in the Design System tab via the same pattern (`register_assets`-equivalent in the design-system repo).
5. **State coverage:** default, hover, focus, active, disabled, loading, error — for *every* interactive component. If the design doesn't have all seven, request them before implementing.

---

## 8. Iconography

- **Lucide is the only icon library.** 50 essentials are pre-bundled in `design-system/assets/icons/`. For new icons, copy the SVG from [lucide.dev](https://lucide.dev) into `assets/icons/` and commit.
- Default render size **18px**; 14px in chips, 12px in trend badges, 40px for empty-state.
- **Stroke 2** for line icons. Use `currentColor` so text-color cascades carry.
- Provider logos at `assets/provider-icons/` are brand marks — **never recolor them**. Render at 16–20px.

---

## 9. Fonts

- **IBM Plex Sans** 400/500/700 — UI, body, wordmark, headings.
- **IBM Plex Mono** 400/500 — code, tabular numerals, token labels.
- Letter-spacing default `-0.01em` on h1; everywhere else 0.
- Local `.woff2` files in `/fonts/` override the Google Fonts CDN at the top of `colors_and_type.css`. Production should ship local for offline & perf.

---

## 10. The brand mark

**Locked decision: Pixel X mark.** A 5×5 staircase X built from square pixels.

- `assets/logo-mark.svg` — **the canonical glyph.** Bare X, `fill="currentColor"`, no background. Exposes an inner `<symbol id="pixcel-x">` so it can be `<use>`-referenced. Color via CSS `color`.
- `assets/logo-mark-app-icon.svg` — X on a `#131418` charcoal tile. App icon / launcher only — never inline.
- `assets/logo-mark-on-light.svg` — X on a `#ffffff` tile. App icon for light contexts only.
- `assets/logo-mark-favicon.svg` — same content as `logo-mark-app-icon.svg`, kept under this filename because the chat app's `<link rel="icon">` points here.

**How to render the glyph** — `currentColor` does NOT inherit through `<img src>`. Pick one of:

```html
<!-- ✓ inline <use> — currentColor inherits from the host element -->
<svg width="24" height="24"><use href="/assets/logo-mark.svg#pixcel-x"/></svg>

<!-- ✓ CSS mask — tint via background-color -->
<span class="mark" style="
  -webkit-mask: url(/assets/logo-mark.svg) center/contain no-repeat;
          mask: url(/assets/logo-mark.svg) center/contain no-repeat;
  background: currentColor; width: 24px; height: 24px;
"></span>

<!-- ✗ <img src> — renders black on every surface, regardless of color -->
<img src="/assets/logo-mark.svg">
```
- The mark reads at 16px favicon up to splash-size.
- Wordmark (`logo-wordmark.svg`) is for the login screen and footer only.
- Don't combine mark + wordmark in the chat sidebar — use the mark alone.
- Don't add a tagline below the mark anywhere in product surfaces.

---

## 11. What NOT to do

A non-exhaustive list of things reviewers have rejected. Don't propose any of these.

- Purple-blue-gradient buttons.
- Glassmorphism on static panels (only float chrome).
- Animated SVG illustrations that play on page load.
- "Cute" empty states with mascots.
- Marketing-toned headers ("Let's create something amazing!").
- Toast notifications that auto-dismiss in under 4 seconds.
- Modal stacking — only one modal open at a time.
- Tooltips on every icon button; only on icons that aren't self-evident.
- Bouncing or scale-pop hover effects on cards.
- Saturated solid fills for status (use the `*-bg` 12%-opacity tokens).

---

## 12. When the design system can't answer

If you genuinely can't make the call from this doc + tokens + existing components: **don't invent**. Ask in the PR, link the surface, and the design lead will add the rule here. The system is meant to grow — but additions go through this file, not through one-off hex codes.
