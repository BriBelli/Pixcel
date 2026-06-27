# Pixcel — Claude Code handoff

This package is a **design + front-end specification** for Pixcel. It is meant to be opened in **Claude Code, running inside the `BriBelli/Pixcel` repo**, so the prototypes here can be translated into production components.

Read this file first. Then read `CLAUDE.md` — it is the rulebook and it wins over anything you'd otherwise infer.

---

## What Pixcel is

Pixcel is **AI-native pixel-art tooling**: a conversational surface (Pixcel Chat) that hands off to full-screen editing surfaces (Pixcel Studio / Image IDE / Art Studio). The brand surface is **dark by default, warm charcoal, soft Google-blue accent, frosted glass only on floating chrome.** The phrase that settles every visual call: **"the UI should feel not there."**

---

## How to use this package

1. **Read `CLAUDE.md`** — the hard rules (dark canonical, no new hex values, no gradients on chrome, alpha borders, focus halos, radii scale, easing, tone of voice). Reviewers revert PRs that break these.
2. **Open the prototypes** (below) in a browser. They are the visual + interaction spec. Each is a self-contained HTML file that runs with no build step.
3. **Read the matching source** in the folder named after the prototype. The prototypes are written in **React (Babel-in-browser)** for fidelity only — production is **Lit + Web Components**. Translate prop names to attributes (`<a2ui-stat label="…" value="…" trend-direction="up">`).
4. **Use the tokens** in `colors_and_type.css`. Every color, space, radius, shadow, and font is a `--a2ui-*` / `--pxs-*` token. If you need a value that isn't a token, the design is wrong — don't add a hex.

---

## The canonical prototypes

These four are the **only** approved deliverables. Everything else from earlier exploration was left out on purpose.

| Prototype | What it is | Fidelity | Source folder |
| --- | --- | --- | --- |
| **`Pixcel Art Studio.html`** | The autonomous pixel artisan — describe a piece, watch it get drafted live on a char-map table (VISION → SHAPE → POLISH → QA). Easel + Atelier layout directions. | Hi-fi, interactive | `pixcel-art/` |
| **`Image IDE - Workflow.html`** | The tailored image workspace. Two-tier left nav (primary section rail + per-workflow tool rail), per-section landing (Art / Image / Video / Anim), agent dock. **This is the most current IDE build.** | Hi-fi, interactive | `ide-workflow/` |
| **`Image IDE - MVP.html`** | The leaner MVP cut of the same IDE shell — same nav system, fewer workflow surfaces. | Hi-fi, interactive | `ide/` |
| **`Canvas.dc.html`** | Blank canvas scaffold (Design Component shell) reserved for the unified canvas surface — included as the starting point, not a finished screen. | Scaffold only | — (`support.js` runtime) |

Rendered reference images are in `screenshots/`.

### Shared nav system (read this before touching either IDE)

Both IDE prototypes and Art Studio use the **same primary nav**: a fixed **56px** rail, Pixcel X mark on top, then stacked icon+label product sections — **Art** (the squiggle glyph) · **Image** · **Video** · **Anim** — with **Export / Assets / Assistant** pinned at the bottom. The active item carries a 2.5px accent bar.

- The **Art** glyph is the squiggle (`scribble` in the icon sets) **everywhere** it appears — nav, empty states, suggestion chips. Don't substitute a brush/feather.
- The **tool sub-rail** (move / crop / aperture / brush / adjust / dodge) is **tier 2** and is shown **only when the Image section is active**. It is intended to become workflow-dynamic — the agent suggests a curated workflow, the user picks, and that determines the tools in the rail. Treat the current tool list as a representative example for "Image", not a fixed set.

---

## File map

```
START_HERE.md                ← you are here
CLAUDE.md                    ← THE RULES — read second
README.md                    ← design-system overview (deeper background)
colors_and_type.css          ← canonical design tokens + type scale (CDN fonts)

Pixcel Art Studio.html       ← prototype  →  pixcel-art/
Image IDE - Workflow.html    ← prototype  →  ide-workflow/
Image IDE - MVP.html         ← prototype  →  ide/
Canvas.dc.html               ← scaffold   →  support.js

pixcel-art/                  ← Art Studio source (engine.jsx + studio.jsx + app.jsx + owl-data.js)
ide-workflow/                ← Workflow IDE source (shell, landing, agent, builder, …)
ide/                         ← MVP IDE source
pg/                          ← shared prompt-guide / tweaks-panel parts the IDE prototypes load
assets/                      ← logo marks (brand SVGs, see CLAUDE.md §10), Lucide icons, provider icons
fonts/                       ← IBM Plex notes (fonts load from Google Fonts CDN; self-host for prod)
image-slot.js                ← drag-and-drop image-slot web component used by the IDE prototypes
support.js                   ← Design Component runtime (only needed by Canvas.dc.html)

docs/                        ← extra reference: Art Studio integration guide + kickoff prompt
screenshots/                 ← rendered reference image of each prototype
```

---

## Translating prototype → production

- **React → Lit.** The `.jsx` files are reference implementations. Subclass the Lit base used by siblings in `apps/a2ui-chat/src/components/`, keep the same `static styles` + `@property` patterns. Don't introduce React into `apps/a2ui-chat/`.
- **Tokens only.** Pull color / spacing / radius / shadow / font from `colors_and_type.css`. `colors_and_type.css` and `apps/a2ui-chat/src/styles/tokens.css` are the same file — if you change one, mirror it.
- **Icons.** Lucide only, inline SVG, `viewBox="0 0 24 24"`, `stroke="currentColor"`, `stroke-width="2"`, no fills on line icons. Provider logos in `assets/provider-icons/` are brand marks — never recolor.
- **States.** Every interactive component needs default / hover / focus / active / disabled / loading / error. If the prototype doesn't show all seven, request them before implementing.
- **When the system can't answer:** don't invent a value. Ask in the PR and let the rule be added to `CLAUDE.md`.

---

## A good first task

Start with **`Image IDE - Workflow.html`** — it's the most current build and exercises the full nav system, the per-section landing, and the agent dock. Open it, read `ide-workflow/shell.jsx` (the chrome) and `ide-workflow/landing.jsx` (the empty state), then map the primary nav + tool rail onto the existing Lit shell in `apps/a2ui-chat/src/components/`.
