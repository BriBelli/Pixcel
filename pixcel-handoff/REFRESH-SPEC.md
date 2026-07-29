# Handoff: Pixcel UI Refresh (App Shell + Screens)

> **Scope note.** This doc covers the **visual system and app shell**. The Project / Asset / Recipe
> data model, the Projects screen's draft/saved behavior, and the lineage view are specified
> separately in `OBJECT-MODEL-HANDOFF.md` — read that for anything touching persistence.
> Last reconciled against the design: 2026-07-29.

## Overview
A refreshed visual system and multi-screen app shell for **Pixcel** — an AI creative platform that fuses conversational AI with media-creation studios (image, video, and roadmap: audio, 3D). This handoff covers the app shell (left rail + screen router) and six screens: **Chat, Image, Video, Audio, Projects, Assets**, plus a switchable **style system** (Professional / Bold) and a set of surface/stroke/blur/accent tokens.

The look: neutral warm-charcoal → **neutral grey** glass ("frost/ice") surfaces, sharp thin strokes that read as a cut edge against a darker base, and a single coral→purple accent (`#ff7e5f → #8957e5`) reserved for the brand mark and action items only. It descends from Pixcel's own principle: "the UI should feel not there."

## About the Design Files
The file in this bundle (`Pixcel Refresh.dc.html`) is a **design reference created in HTML** — a prototype showing the intended look, layout, and behavior. It is **not production code to copy directly**. It is authored as a self-contained "Design Component" and uses an internal template runtime; do not lift that runtime.

**The task is to recreate these designs in Pixcel's real codebase** (per the source, Lit / Web Components in `apps/a2ui-chat/`, with `--a2ui-*` / `--pxs-*` CSS tokens) using its established patterns. Map the tokens below onto the existing token file rather than hardcoding hex values.

## Fidelity
**High-fidelity.** Colors, typography, spacing, radii, and interactions are final-intent. Recreate pixel-close using the codebase's existing components and token system. Media tiles in the mock are gradient **placeholders** — wire them to real asset thumbnails.

## Design Tokens

The refresh introduces a `--px-*` layer. Map these onto Pixcel's existing `--a2ui-*` tokens (do not create a parallel system if the codebase already has equivalents).

### Base (neutral grey — Professional mode defaults)
| Token | Value | Role |
|---|---|---|
| `--px-bg` | `#131417` | App background (neutral, no warm/purple cast) |
| `--px-stroke` | `#2b2c30` | Hairline stroke — 1px solid, reads as a cut edge |
| `--px-text` | `#ecedef` | Primary text |
| `--px-dim` | `#9a9ca2` | Secondary / muted text, icons |
| glass base color | `#191a1e` | Base color for glass/frost/ice, tinted by opacity |

### Glass / Frost / Ice (derived from glass base color + opacity `0.7`)
| Token | Formula | Use |
|---|---|---|
| `--px-glass` | `rgba(25,26,30, 0.70)` | Rail, cards, prompt bars, headers (most opaque) |
| `--px-frost` | `rgba(25,26,30, 0.57)` | Inner cards, stat/builder panels (mid) |
| `--px-ice` | `rgba(25,26,30, 0.35)` | Chips, inputs, thumbnails, active-nav fill (most transparent) |
| blur | `backdrop-filter: blur(15px)` | Applied to all glass surfaces |

All three are the **same hue** at different alpha; the blur + low alpha lets them inherit and soften the background — that is the frost effect. Stroke stays crisp so edges stay legible.

### Accent (action items + brand only)
| Token | Value |
|---|---|
| `--px-accent-from` | `#ff7e5f` (coral) |
| `--px-accent-to` | `#8957e5` (violet) |
| `--px-grad` | `linear-gradient(135deg, #ff7e5f, #8957e5)` |
| button shadow | `0 6px 20px rgba(137,87,229,0.35)` |

Accent appears ONLY on: brand mark (rail logo, agent avatars), primary buttons (Render, Send, Add assets), and — in Bold mode only — the active-nav outline and media-tile washes.

### Style modes
- **Professional** (default): background glow OFF; media tiles are neutral frost (`--px-tintA`≈`rgba(255,255,255,0.028)`, `--px-tintB`≈`rgba(255,255,255,0.022)`); active nav is a neutral highlight (`--px-ice` fill + `inset 0 0 0 1px --px-stroke`).
- **Bold**: background accent glow ON (`rgba(255,126,95,0.08)`); media tiles get coral/violet radial washes (`rgba(accent,0.16)`); active nav uses coral text + `inset 0 0 0 1.5px rgba(255,126,95,0.45)`.

### Type, spacing, radii
- Font: **IBM Plex Sans** (400/500/600/700); mono: **IBM Plex Mono** (stat values, quality score, durations).
- Type ramp used: 30px h1 (600), 16px section titles (600), 15px body, 14/13px controls, 12px meta, 11px labels (uppercase, letter-spacing 0.4px), 10px badges.
- Spacing on a 4px grid; card padding 18–22px; screen padding 40×48px; gaps 12–18px.
- Radii: buttons/inputs/chips 9–11px, cards 12px, pills/avatars 9999px.
- Icons: Lucide (24×24 viewBox, stroke-width ~1.9–2, round caps), rendered 16–21px.

## App Shell
- **Fixed left rail**, 74px wide, glass (`--px-glass` + blur), 1px right stroke. Top: brand mark (34px gradient rounded square). Nav group: **Chat, Image, Video, Audio** (icon 21px + 11px label, stacked, centered). Flex spacer. Bottom: **Projects, Assets** (same treatment) + a circular profile avatar.
- Nav item = 58px column button, radius 12px. Active state per style mode (above). Inactive: transparent bg, `--px-dim` color.
- **Content area** fills remaining width; a single active screen shows at a time (router by `screen` state). Design canvas is 1440×940.
- **Background**: very faint 140px grid (`rgba(255,255,255,0.014)`, slow 40s drift). In Bold, add one soft accent radial glow top-right (14s pulse).

## Screens / Views

### 1. Chat
- **Purpose**: natural conversation with the model agent.
- **Layout**: centered column, max-width 720px, vertical message stack; prompt bar docked at bottom over a fade-to-bg gradient.
- **Components**: user bubble (right-aligned, `--px-frost`, radius `16 16 4 16`); agent turn (28–34px gradient mark avatar + text + a 2-up media grid of result tiles with a "Nano Banana" caption chip + model badge "Opus 4.8" + timestamp). Prompt bar: attach icon, "Consult with me…" input, 40px gradient Send button (paper-plane icon).

### 2. Image — splash, then the three-panel IDE

Image, Video and Audio each open on a **splash**, not on the IDE. The three-panel workspace is a
second state behind a per-surface lens (`lensImage | lensVideo | lensAudio`, `'chat' | 'ide'`).

**Splash.** Centered column. h1 (32px/500) + a 16px dim subtitle on one line, then a row of three
equal flex-grow cards, each ~148px of preview content and a coral action link at the bottom:

| Card | Action link | Purpose |
| --- | --- | --- |
| Image guides | "Use an image guide" | The structured approach — Character Reference Sheet is the running example. |
| Image workflows | "Build an image workflow" | Reusable multi-step recipes. |
| Model features | "Browse features" | What each model can actually do. |

These are **educational, not a mood board** — each card shows structure (labeled preview lines),
not sample imagery. Copy: "Start from a reusable workflow, and/or craft it with your Image Agent."
Any card opens the IDE (`lens = 'ide'`). Guides/Workflows content is placeholder pending real recipes.

Video's splash mirrors it; Audio's too. Video's card set names a novel-view-synthesis feature
("1 clip → 12 angles") that has **no model wired behind it yet** — treat the name as provisional.

**IDE (`lens = 'ide'`)**
- **Layout**: CSS grid `1.35fr 1.05fr 0.9fr`, full height, 1px column strokes.
  - **Left · Results**: uppercase "RESULTS" label + a **Bento** grid (`grid-template-columns:1fr 1fr`): tile 1 = hero `grid-column:span 2; aspect-ratio:16/9`; tiles 2–3 = `1/1`; tile 4 = wide `span 2; aspect-ratio:16/10`. Rounded 12px, thin stroke, neutral frost fill (accent wash only in Bold).
  - **Center · Prompt guide**: header (sparkle icon + "Prompt guide · car" + ×). Scroll body with frost cards: **Prompt quality** (46px ring showing "6" + "Thin · 0/5 parts" + note), **References** ("Attach — up to 3" dashed dropzone + 52px ref thumbs), **Subject** (label + amber "THIN" badge + helper + input "a car" + suggestion chips: "+ classic muscle car / + sleek EV / + vintage roadster / + glossy metallic paint"), **Action** (label + THIN + textarea). A floating gradient **Render** button (sparkle icon) pinned bottom-right.
  - **Right · Agent**: header ("Agent" + ×), chat (user bubble + agent turn with 2-up result tiles + "Opus 4.8" badge), docked mini input with 34px gradient send.

### 3. Video (mirrors Image)
- Same splash → IDE pattern. Same three-panel grid in the IDE. Left = **Storyboard** (stacked 16/9 shot frames with ↓ connectors + dashed "+ Add shot"). Center = **Scene builder** (Scene textarea, Camera & motion chips, Duration with a mono "6s" + gradient progress bar) + floating **Render clip**. Right = **Agent** (identical pattern).

### 4. Audio
- Same splash → IDE pattern as Image and Video, with its own three cards. The IDE side is the least
  developed of the three — treat the splash as the specified part.

### 5. Assets (macOS-feel full view)
- **Purpose**: browse everything saved; grid or list; sort; search.
- **Layout**: max-width 1120px, 40×48px padding. Header row: "Assets" h1 + description; right controls = segmented **list/grid** toggle (functional), "Date added ▾" sort control, gradient **+ Add assets** button. Filter chips row (All 6 / Images 4 / Video 2) + a 260px search field. 
- **Grid view = Bento masonry**: CSS `column-count:4; column-gap:16px`; each card `break-inside:avoid; display:inline-block; width:100%; margin-bottom:16px`. Media uses **natural aspect ratios** per item (3/4, 16/10, 1/1, 16/9, 4/5, 4/3) so tiles pack like a bento. Card = 12px radius, thin stroke, glass; media area with a top-left "IMAGE"/"VIDEO" badge; footer with title + source (e.g. "Nano Banana", "Runway", "Flux").
- **List view**: rows with 56×44 thumb + title/meta (source · dimensions) + type badge.

### 6. Projects (macOS-feel full view)

Behavior is specified in `OBJECT-MODEL-HANDOFF.md` §5 — this is the visual side only.

- Header pattern: "Projects" h1 + description; list/grid toggle + "Date added ▾" sort. Dashed
  **New project** row (gradient + icon).
- **Retention filter row** under the description: three pills — **All · Saved · Drafts** with counts,
  `All` default and active (coral text, `rgba(255,126,95,0.13)` fill, `rgba(255,159,133,0.4)`
  stroke); inactive are dim text on a hairline. Pills are `nowrap`. Right-aligned on the same row, a
  12px dim line with a clock icon: "Drafts with no assets are swept after 14 days."
- **List rows**: folder icon + name + (if ephemeral) a `Draft` chip
  (`rgba(255,159,133,0.14)` / `#ff9f85`, 11px, pill). Meta line "Jul 15 · 4 assets"; for drafts
  "· expires in N days" — **amber `#f0b166` when N ≤ 5**, dim otherwise. Optional third line: the
  lineage breadcrumb in IBM Plex Mono 11px `#8a848f` with a branch glyph — "opened from
  gallardo-predawn · v2", "from template · Character Reference Sheet".
- **Saved projects carry no chip.** Saved is the norm; only the exception gets marked. Drafts are at
  **full contrast** — never dimmed.
- **Row actions** are exactly the three verbs a Project supports: Duplicate · Save as template ·
  Delete (32px icon buttons, `rgba(255,255,255,0.06)` hover, trash goes `#f08a7a`). There is no
  Edit action.
- **Delete**: drafts delete immediately → a fixed bottom-center **Undo toast** (10s, 2px coral
  progress bar draining left-to-right). A saved project holding assets shows a 420px confirm first
  ("This project holds N saved assets. They go with it."), then the toast. **No trash anywhere.**
- **Grid view**: 2-col cards with a 16/10 cover, name, Draft chip and expiry — same rules as the list.
- **Empty state** per filter: "No drafts — every project here has produced something."

## Interactions & Behavior
- **Rail nav**: click routes to that screen (single active screen; `screen` state). Active item restyles per mode.
- **Assets/Projects view toggle**: segmented control switches grid⇄list (`assetsView` / `projectsView` state; toggles container display).
- **Sort control**: opens a standard sort menu (Date added / Name / Type / Size) — wire to real sorting. macOS Finder-like affordance.
- **Hover** (apply from Pixcel's existing patterns): overlay `rgba(255,255,255,0.06)` on rows/icon buttons; cards gain stroke + small shadow. **Never opacity-only.**
- **Transitions**: 150–200ms ease; button/nav bg changes only, no scale-pop (matches Pixcel motion spec).
- **Render / Send**: trigger generation → append result tiles to Results/Agent.

## State Management
- `screen`: `'chat' | 'image' | 'video' | 'audio' | 'projects' | 'assets'` (default `image`).
- `lensImage`, `lensVideo`, `lensAudio`: `'chat' | 'ide'` (default `chat` — the splash).
- `assetsView`, `projectsView`: `'grid' | 'list'`.
- `pFilter`: `'all' | 'saved' | 'drafts'` (default `all`); `pUndo` / `pConfirm` drive the toast and
  the confirm dialog.
- Style tokens (`mode`, `bgColor`, `strokeColor`, `textDefault`, `textAccent`, `glassColor`, `glassOpacity`, `blurPx`, `accentFrom`, `accentTo`) — in the mock these are live tweak props; in production they map to theme tokens (mode = a theme variant, the rest = the token values above).
- Data (not built): projects list, assets list (with kind/dimensions/source/tags), chat threads, prompt-builder field state (two-way bound to agent panel), generation results.

## Assets
- `assets/logo-mark-white.svg`, `assets/logo-wordmark-white.svg` — Pixcel brand marks (included). Use the codebase's canonical brand assets in production.
- Provider icons (Anthropic, GPT, Gemini, Flux, Ideogram, Recraft, Stability, fal, Replicate, xAI) live in the design system at `assets/provider-icons/` — use for model badges.
- Icons otherwise: **Lucide**.
- Media thumbnails in the mock are **gradient placeholders** — replace with real generated assets.

## Files

All design files live in `design/` alongside the runtime they need — see `README-DESIGN-DROP.md`
for the full index.

- `design/Pixcel Refresh.dc.html` — the design reference (all six screens + style system).
- `design/_ds/…/colors_and_type.css` — Pixcel's canonical token file (map `--px-*` onto these
  `--a2ui-*` tokens). Diff before overwriting `pixcel-handoff/colors_and_type.css`.
- `design/assets/` — brand marks and provider icons used by the design.
- `design/screens/` — every screen as rendered.

## Not built (roadmap — noted for context, do not implement yet)
- Video's full two-way A2UI binding between center builder and agent panel.
- **Storyboard → Film**: a multi-layer, industry-style timeline editor (the video centerpiece).
- **3D** surfaces.
- Video's novel-view-synthesis feature ("1 clip → 12 angles") — named in the splash, no model behind it.

**Audio is no longer roadmap** — its splash is designed and in the file. Earlier revisions of this
doc listed it as out of scope; that is stale.

## Explorations — not for build
- `design/Pixcel Chat Bubbles.dc.html` — three chat-bubble treatments. The app uses the panel-as-glass
  treatment instead; this file is a reference, not a target.
- `design/Pixcel Pitch Deck.dc.html` — narrative deck, not a product surface.
