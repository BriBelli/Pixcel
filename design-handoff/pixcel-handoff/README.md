# Pixcel Design System

A design system for **Pixcel** — an AI-powered creative platform that fuses conversational AI (Pixcel Chat) with a pixel-art creation studio (Pixcel Studio). The visual language is **frosted glass, neutral charcoal, soft gradient accents** — "the UI should feel not there." Dark theme is the primary surface; the light theme exists as a toggle, not a co-equal.

> "Pixcel brings together two systems: Pixcel Chat — a conversational AI interface where agents return rich, interactive UI as structured JSON; and Pixcel Studio — a full-screen hybrid IDE for AI-driven image creation and editing."

---

## Index

| File / Folder              | What's in it                                                                                  |
| -------------------------- | --------------------------------------------------------------------------------------------- |
| `README.md`                | This file — context, content & visual foundations, iconography, manifest.                     |
| `SKILL.md`                 | Agent-Skill front-matter: brand name, description, entry point.                                |
| `colors_and_type.css`      | The full token system — primitives, semantic, typography, spacing, radii, motion.              |
| `components/`              | Exported design-system components (`PixcelMark`) — each a `.jsx` + `.d.ts` + preview card.      |
| `Pixcel Art Studio.html`   | The **Pixcel Art Studio** surface — the autonomous-artisan IDE (live char-map). Code in `pixcel-art/`. |
| `assets/provider-icons/`   | LLM/image provider favicons (Anthropic, GPT, Gemini, xAI, Stability, Recraft, …).              |
| `preview/`                 | One HTML card per concept, registered in the Design System tab.                                |
| `ui_kits/a2ui-chat/`       | Hi-fi recreation of the chat app + Pixcel Studio. JSX components + interactive `index.html`.   |

## Sources

This system was reverse-engineered from a single, attached GitHub repo:

- **Repo:** [`BriBelli/photolif`](https://github.com/BriBelli/photolif) (the project's display name is `Pixcel`)
- **Primary app:** `apps/a2ui-chat/` — Lit / Web Components chat + studio
- **Canonical token file:** `apps/a2ui-chat/src/styles/tokens.css` (mirrored in `colors_and_type.css`)
- **Studio palette:** `apps/a2ui-chat/src/styles/studio-palettes.css`
- **Agent guide:** `AGENTS.md`, `README.md`

No Figma was provided. No slide template was provided. No marketing site exists in the repo, so this system only models the **product surface** (chat + studio).

---

## Products

Pixcel is a **single product with two surfaces** that share one token system:

1. **Pixcel Chat** — the primary surface. A conversational AI interface with a left sidebar (threads + projects), a centered message column (max-width 640px, expandable to 1120px), a docked prompt bar at the bottom, and a glass header. Renders rich response components (`a2ui-card`, `a2ui-chart`, `a2ui-stat`, `a2ui-data-table`, etc.) inline.
2. **Pixcel Studio** — a full-screen, lazy-loaded sub-surface reached by clicking "Edit" on any generated image in chat. Photoshop-like workspace with a canvas, frame deck, inspector, and AI prompt bar. Uses `--pxs-*` tokens that mostly reference `--a2ui-*` underneath.

A third app, `apps/a2ui-demo`, is a component playground — not a separate product, so we treat it as documentation of Pixcel Chat's renderer.

### Pixcel Art Studio (core IP)

**Pixcel Art Studio** (`Pixcel Art Studio.html`, code in `pixcel-art/`) is the platform's hero surface: an **autonomous artisan you commission**, not a slider panel. You describe a piece; the agent runs the **Statue Method** — VISION → SHAPE → POLISH → QA — live on a drafting-table **char-map** that fills with glowing chars and then cascades into finished pixel art, watched in real time. It lives inside the same shell as the other surfaces and ships two layout directions (Easel · Atelier). Saved pieces go to **Assets**.

---

## Exported components

Reusable components live in `components/` and are exposed on `window.PixcelDesignSystem_019e1d` (each is a `<Name>.jsx` with `export function <Name>`, a `<Name>.d.ts`, and a `<name>.html` preview card).

| Component    | What it is                                                            |
| ------------ | --------------------------------------------------------------------- |
| `PixcelMark` | The locked brand mark — the 5×5 pixel "X" icon (optionally tiled) and the bitmap "pixcel" wordmark. Single ink color, no gradients. |

---

## Content Fundamentals

**Voice.** Direct, calm, second-person ("Sign in to Pixcel Chat", "Don't have an account?"). No exclamation marks. No marketing copy. Microcopy is one short sentence at most. The product name appears as **Pixcel Chat** or **Pixcel** — never stylized.

**Tone.** Technical-but-friendly, like a well-written settings panel from Google. There's no playfulness in the UI strings; the personality is in the system itself (frosted glass, the pixel-grid editor). Errors are de-escalated: "Invalid email or password. Please try again." rather than "Wrong!".

**Casing.** Sentence case for buttons and headings ("Create your account", not "Create Your Account"). Title case is reserved for proper nouns and model names ("Continue with Google", "Pixcel Studio"). Labels above inputs are sentence case ("Email", "Password").

**I vs You.** The product addresses the user as **you**. The agent refers to itself in the third person via the model badge (e.g. "Claude", "Gemini"), not "I". System messages are impersonal: "Trending up this month", not "I think it's trending up."

**Emoji.** Almost never. The only emoji in the codebase are a single ✉️ in the password-reset success state and an occasional ⌛ for a thinking indicator. The convention is **inline SVG**, not emoji. Treat emoji as a red flag for new copy.

**Specific examples (lifted from the codebase):**

| Surface              | Copy                                                              |
| -------------------- | ----------------------------------------------------------------- |
| Login header         | `Welcome back` / `Sign in to Pixcel Chat`                         |
| Signup header        | `Create your account` / `Get started with Pixcel Chat`            |
| Forgot-password CTA  | `Forgot your password?`                                           |
| Reset success        | `Check your email` — "We've sent a password reset link to …"      |
| Stat description     | `Trending up this month`                                          |
| Alert (warning)      | `Market Closed` — "Data is delayed by 15 minutes."                |
| Empty error          | `Invalid email or password. Please try again.`                    |
| Provider chip        | `Claude`, `GPT-4o`, `Gemini 2.5 Flash` — no extra words.          |

---

## Visual Foundations

**Color vibe.** Warm neutral charcoal, never blue-gray. The base scale (`--a2ui-cool-900` → `--a2ui-cool-100`) reads as photographic-paper black, not slate. The accent is a single soft Google blue (`#8ab4f8`) — used for primary buttons, focus rings, links, and one or two highlights per screen. **No gradients on UI surfaces.** No purple-blue tritone. Color, when it appears (success green, warning amber, error red), appears at low opacity over a charcoal panel, never as a saturated fill.

**Type.** Google Sans 400/500/700 for everything UI, Roboto Mono for code and tabular numerals. Headlines are **medium** weight, not bold — bold is reserved for stat values (`--a2ui-font-bold` on `.stat-value`) and h1s. Sizes follow a tight ramp: 11 / 12 / 14 / 16 / 18 / 22 / 28 px. There is no display face larger than 28px in the product itself.

**Spacing.** 4-px grid. Components stack with `var(--a2ui-space-3)` (12px) gaps inside cards and `var(--a2ui-space-4–6)` (16–24px) between cards. Paddings are usually 16–20px. The chat column is hard-capped at 640px / 1120px expanded — never full-bleed.

**Backgrounds.** Flat charcoal panels at four elevations (`--a2ui-bg-app` 900 → `--a2ui-bg-elevated` 500). No images, no patterns, no textures, no gradients on UI chrome. The only "image" backgrounds are user-generated artwork on the canvas inside Pixcel Studio.

**Animation.** Restrained. The signature easings are `cubic-bezier(0.22, 1, 0.36, 1)` for entrances (modals, progress fills) and a flat `ease` for hover state changes. Durations: 150 / 200 / 300 ms. No bounce, no spring, no scale-pop. Modals fade in with a 12px upward translate and a tiny 0.97→1 scale.

**Hover states.** Two patterns: (a) overlay — `background: var(--a2ui-bg-hover)` which is `rgba(255,255,255,0.06)`, used on icon buttons and rows; (b) shift — solid backgrounds bump one elevation step (`--a2ui-bg-tertiary` → `--a2ui-bg-elevated`). Accent buttons darken slightly via `--a2ui-accent-hover`. **Never use opacity-only hover.**

**Press / active states.** `background: var(--a2ui-bg-active)` (`rgba(255,255,255,0.10)`). No scale-down. Buttons do not "press in".

**Focus rings.** A 2px halo of `var(--a2ui-accent-subtle)` via `box-shadow`, **not** an outline. Inputs change `border-color: var(--a2ui-accent)` on focus.

**Borders.** Almost always `rgba(255,255,255,0.10)` (`--a2ui-border-default`). Subtle dividers go to 0.05, prominent edges to 0.18. **Never a solid 1px gray** — always alpha so the surface beneath shows through.

**Shadows.** Stacked black at increasing y-offset: `0 1 / 2 / 4 / 8 px` with matching blur. Used sparingly: cards in chat are shadow-less by default; only modals, dropdowns, and toasts get `--a2ui-shadow-lg` or higher.

**Glass.** Floating chrome (menus, the prompt bar header strip, model selector) sits on `rgba(18,18,22,0.82)` with `backdrop-filter: blur(…)`. Glass surfaces always have a 1px white-at-8% border. The brand instruction is literally "the UI should feel not there."

**Transparency & blur.** Used only for floating UI over a busy or photographic surface — never for static panels. The login modal sits on a `backdrop-filter: blur(6px)` overlay; menus on `backdrop-filter: blur(20px)`.

**Corner radii.** Buttons & inputs `--a2ui-radius-md` (8px). Cards & containers `--a2ui-radius-lg` (12px). The login modal `--a2ui-radius-xl` (16px). Chips & pills `--a2ui-radius-full`. **Never sharp corners.**

**Cards.** Background `--a2ui-bg-tertiary` (charcoal 600), 12px radius, 20px padding, **no border, no shadow** by default. On hover they gain `border-color: var(--a2ui-border-default)` and `--a2ui-shadow-sm`. Stats, alerts, list items, and grid cells all derive from this card pattern.

**Layout rules.** The chat sidebar is a fixed 280px. The header is a fixed 64px (56px on mobile, auto on small mobile). The prompt bar is `position: absolute` and overlays the bottom of the chat column with a `clamp(176px, 30vh, 268px)` scroll-pad on the messages so nothing hides behind it. Sidebar collapses to an overlay below 768px.

**Imagery.** User-generated only. Pixcel Studio renders pixel-grid frames (256–4096 cells) at integer scales — pixels are visible by design. The chat-app's "imagery" is its rich A2UI components: charts, data tables, stats, progress bars, all rendered from JSON.

---

## System status — locked

All foundational decisions are now closed. Nothing else is open for debate; the system is ready to hand to Claude Code (see `CLAUDE.md`).

| Decision | Locked to | Reference |
| --- | --- | --- |
| Logo mark | **Pixel X** (5×5 staircase) | `assets/logo-mark.svg` (glyph) · `assets/logo-mark-app-icon.svg` (tiled) |
| Logo wordmark | Pixel-grid wordmark | `assets/logo-wordmark.svg` |
| Display + UI font | **IBM Plex Sans** 400/500/700 | `colors_and_type.css` |
| Mono font | **IBM Plex Mono** 400/500 | `colors_and_type.css` |
| Icon library | **Lucide** (50 pre-bundled) | `assets/icons/README.md` |
| Theme primacy | Dark default, light as toggle | `colors_and_type.css` |
| Production stack | Lit / Web Components | `apps/a2ui-chat/` upstream |

**Implementation handoff:** `CLAUDE.md` at the project root is the rule-set Claude Code (or any engineer) should follow when implementing surfaces. It covers stack, idioms, hard rules, AI-workflow UI conventions, and the not-to-do list.

## Iconography

**The system has no icon font.** Every UI icon is an **inline SVG path written into the Lit template** of the component that uses it (e.g. the trend arrow in `a2ui-stat`, the info/warning/error glyphs in `a2ui-alert`, the Google G in `a2ui-login`). They share a stroke vocabulary: `viewBox="0 0 24 24"`, `stroke="currentColor"`, `stroke-width="2"` to `2.5`, no fills for line icons; or `fill="currentColor"` for filled ones. **18px** is the default render size; 14px in chips, 12px in trend badges, 40px for empty-state illustrations.

**Provider logos.** The chat uses real brand favicons for each LLM / image provider. These are bundled in this design system at `assets/provider-icons/`:

| File           | Provider     | Used for       |
| -------------- | ------------ | -------------- |
| `anthropic.ico`| Anthropic    | Chat model     |
| `gpt.ico`      | OpenAI       | Chat / image   |
| `gemini.ico`   | Google       | Chat / image   |
| `xai.ico`      | xAI Grok     | Chat           |
| `bfl.ico`      | Black Forest Labs (Flux) | Image |
| `fal.ico`      | fal.ai       | Image          |
| `ideogram.ico` | Ideogram     | Image          |
| `recraft.ico`  | Recraft      | Image          |
| `replicate.ico`| Replicate    | Image          |
| `stability.ico`| Stability AI | Image          |
| `internet.svg` | (generic web)| Web-search tool|

Render provider icons at **16–20px** in chips, model badges, and the chat input's model selector. Don't recolor them — they're brand marks.

**Emoji & Unicode.** Avoid. The codebase uses **one** emoji (✉️ on the reset-success screen) and **one** Unicode glyph (× for close buttons). New surfaces should use inline SVGs.

**Sourcing new icons.** **Lucide** is the design system's permanent icon source ([lucide.dev](https://lucide.dev), MIT, 1,700+ icons). It already matches the codebase's vocabulary: `viewBox="0 0 24 24"`, `stroke-width="2"`, rounded caps and joins. **50 essentials are pre-bundled** in `assets/icons/` — see `assets/icons/README.md` for usage paths (static SVGs, CDN script, or `lucide-react` npm). For new icons not yet bundled, follow the import pattern in the assets README.

> ✅ **Icon decision locked:** Lucide.

---

## Font substitution

The brand font is **IBM Plex Sans** (with IBM Plex Mono for code). Both are [OFL-licensed](https://github.com/IBM/plex/blob/main/LICENSE.txt) — free for any use including commercial — so the same font runs in production, Illustrator, and the design system.

This is a deliberate substitution: the codebase originally loads Google Sans, which Google licenses only to its own products. IBM Plex was chosen because (a) it's free for any use, (b) its squared-off `i`-dot rhymes visually with the pixel-grid logo, and (c) the family ships a matching mono so the system stays unified.

| Codebase font  | Substitute (locked)                                                | Notes                                                                                          |
| -------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Google Sans    | **IBM Plex Sans**                                                  | Used for everything — wordmark, UI, body, headings.                                            |
| Roboto         | IBM Plex Sans                                                       | Single sans, no second family needed.                                                          |
| Roboto Mono    | **IBM Plex Mono**                                                   | Matched weights + metrics — pairs cleanly with IBM Plex Sans.                                  |

### How it loads

- **Web (CDN):** `colors_and_type.css` imports IBM Plex Sans + Mono from Google Fonts. Zero setup, ~30 ms first load.
- **Local files:** drop the `.woff2` files into `/fonts/` and the system will prefer them over the CDN. Source: [github.com/IBM/plex/releases](https://github.com/IBM/plex/releases) — grab the latest `OpenType.zip` for desktop (Illustrator), or the `Web.zip` for `.woff2`.
- **Illustrator / desktop:** install the `.otf` files from the same release zip. Letter-spacing matches the system at **-20** (≈ `-0.02em`).
