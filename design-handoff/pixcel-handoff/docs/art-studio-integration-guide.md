# Pixcel Art Studio — UI prototype → repo integration guide

**Prototype:** `Pixcel Art Studio.html` (+ `pixcel-art/engine.jsx`, `studio.jsx`, `app.jsx`) in this design-system project.
**Target repo:** `github.com/BriBelli/Pixcel` → `packages/pxs-studio` (Next.js + React, Tailwind, Nx).

> **The prototype is the design spec, not the data layer.** Your repo already has the real,
> store-driven, SSE-fed implementation (`MatrixArtStage`, `LiveArtisanPanel`, `live-art-store`,
> `/api/live-art`). This integration **keeps every bit of that wiring** and changes only the
> *look, layout, and feel* to match the prototype. Do not re-implement generation.

---

## 1. What maps to what

| Prototype piece (this project) | Real file in repo | Action |
| --- | --- | --- |
| Immersive char-map canvas (`CharMapTable`, `MatrixField`, cascade) | `src/components/MatrixArtStage.tsx` | **Restyle + relayout.** Keep the canvas draw loop & store reads; change color, scale, framing. |
| Slot-machine meta overlay (`SlotMeta`) | `MatrixArtStage.tsx` (the side "live · data" column) | **Replace** the side column with the centered, fading vertical-scroll overlay. |
| Agent right rail (`AgentRail`, `RequestTurn`, `PhaseLine`, `Controls`, `BriefCard`) | `src/components/LiveArtisanPanel.tsx` / `AiChatPanel.tsx` | **Restyle** to the prototype's rail; keep store actions (start / iterate / save / cancel). |
| IDE shell — nav rail, top bar, theme toggle, layout | `src/components/Studio.tsx` | **Adopt** the nav rail + 46px top bar + moon/sun theme toggle + single-canvas layout. |
| Statue-Method phase labels (VISION → SHAPE → POLISH → QA) | `MatrixArtStage` `phaseLabel`, `LiveArtisanPanel` breadcrumb | **Rename/align** labels to the prototype's wording. |
| Design tokens (`--a2ui-*`, `--pxs-*`) | `src/app/globals.css` | **Reconcile** — see §4. |

---

## 2. Keep exactly as-is (the data layer)

Do **not** touch these — the prototype faked them; your repo does them for real:

- `src/store/live-art-store.*` — the `job` object (`stage`, `status`, `pendingReveal`, `revealSeq`,
  `frame`/`latestFrame`, `feed`, `lastVerdict`, `costUsd`, `gestures`, `paletteMap`, `dims`).
- `src/app/api/live-art/route.ts` and `generate-art/route.ts` — the SSE stream + Anthropic calls.
- The canvas WRITE→CASCADE→DATA mechanics in `MatrixArtStage` (`queue`, `revealAt`, `cascadeStart`,
  the diagonal `front` wave). This *is* the live show — the prototype only imitated it.

Everything below is presentation only.

---

## 3. The visual changes (the actual work)

### 3a. `MatrixArtStage.tsx` — from boxed green stage → immersive blue canvas
1. **Color:** replace `const PHOS = '125,255,176'` with the Pixcel glow blue. Pull from tokens —
   `--pxs-glow` ≈ `rgb(138,180,248)` (`#8ab4f8`). Define `const INK = '138,180,248'` and use it for
   the written chars, the typing cursor, the reveal-flash front, and the idle char-sea (`rgba(INK,0.06)`).
   Keep `BG` driven by the theme bg token, not a hard `#0d1117`.
2. **Full-bleed, art-centered:** today the stage is `inline-block` at `maxEdge=460` with a side column.
   Make the canvas fill its container (the whole center column) and **center the art region** inside a
   larger char-sea. Two ways:
   - *Simplest:* keep the art canvas at its natural `cols*px`, center it in a flex container whose
     background is a faint DOM/canvas char-sea (port `MatrixField`).
   - *Truest to prototype:* enlarge the canvas to the container and offset the art grid to center,
     drawing the idle char-sea across the **whole** canvas (extend the `for y/x` loop to the full
     canvas dims, only the centered sub-rect holds real cells).
3. **Subtle bounds guide:** drop the heavy `box-shadow` ring + CRT scanlines. Add the prototype's
   four **crop-mark corners** (1px accent L's) around the art region — that's the "who cares for a
   bold canvas" cue.
4. **Remove** the green glow shadow and the bottom "✓ resolved" bar duplicate (the rail already says it).

### 3b. Slot-machine meta overlay (replaces the side "live · data" column)
Port `SlotMeta` from `pixcel-art/engine.jsx`:
- Absolute, down the **left margin** of the canvas, vertically centered, `width ≈ 230`.
- Feed it `job.feed` (your existing log) + the active thinking line.
- **Mask-fade top & bottom:** `mask-image: linear-gradient(to bottom, transparent, #000 22%, #000 78%, transparent)`.
- Newest line at the bottom; the active "thinking" line brighter (`INK`, glow) vs log lines (~0.55).
- **Watch out:** the entrance animation must **not** put `opacity` in the keyframe end-state (a
  re-render restart bug leaves lines stuck at opacity 0). Animate **transform only**; let inline
  opacity be the resting value. (This exact bug bit the prototype — keyframe is transform-only now.)

### 3c. `LiveArtisanPanel.tsx` — the agent rail
- Restyle to the prototype rail: header ("Pixcel AI · autonomous artisan"), the **You requested**
  bubble + artisan reply (`RequestTurn`), `PhaseLine` (one clean row: `resolved · 05:08 · $0.77 ·
  960 cells`), `Controls` (Save / Iterate / Redo / Cancel), the Statue-Method breadcrumb, and the
  collapsible **Design brief**.
- **Declutter during generation:** the live thinking now lives in the canvas slot-meta — remove the
  big duplicate THINKING box and the in-rail data ledger so the rail isn't crowded (this was a
  specific fix in the prototype).
- Keep all button handlers wired to the store actions you already have.

### 3d. `Studio.tsx` — the shell
- **Nav rail (56px):** the app-feature switcher (Art / Image / Video / Anim + Assets + Tweaks),
  Pixcel **X** mark at top (`logo-mark-white.svg`). Active item gets the accent bar.
- **Top bar (46px):** "Pixcel Art · Studio", save-state dot, the Easel/Atelier layout toggle (optional),
  and the **moon/sun theme toggle** (not the old sparkles glyph — it needs a self-evident icon).
- **Single immersive canvas** as the center; agent rail on the right (Easel) — the prototype's default.
- Saved pieces route to **Assets** (your gallery / `ArtGalleryTab`).

---

## 4. Token replacement (do this first — everything depends on it)

> **Decision (owner):** the current Tailwind/GitHub palette is **not** sacred — replace it. The
> Pixcel design system becomes the real source of truth. Tailwind stays as the *utility/layout
> engine*; only its **theme** gets repointed at the design-system tokens.

1. **Make the DS tokens the source of truth.** Copy `colors_and_type.css` (the `--a2ui-*` / `--pxs-*`
   tokens + IBM Plex font faces) from this design-system project into `pxs-studio` (e.g.
   `src/app/tokens.css`) and `@import` it at the top of `globals.css`. Delete the old `:root`
   block (`--background-primary: #0d1117` …) — those values go away.
2. **Repoint Tailwind's theme** (`tailwind.config`) at the tokens so existing utility classes render
   in the Pixcel palette instead of the GitHub one:
   ```js
   theme: { extend: { colors: {
     'bg-app': 'var(--a2ui-bg-app)', 'bg-primary': 'var(--a2ui-bg-primary)',
     'bg-secondary': 'var(--a2ui-bg-secondary)', 'bg-tertiary': 'var(--a2ui-bg-tertiary)',
     'text-primary': 'var(--a2ui-text-primary)', 'text-secondary': 'var(--a2ui-text-secondary)',
     'text-tertiary': 'var(--a2ui-text-tertiary)', 'border': 'var(--a2ui-border-default)',
     accent: 'var(--a2ui-accent)', glow: '#8ab4f8',
     success: 'var(--a2ui-success)', warning: 'var(--a2ui-warning)',
   } } }
   ```
   Existing components keep their `className`s but now read Pixcel. New prototype-ported components
   can use inline `var(--a2ui-…)` directly — both resolve to the same tokens.
3. **Font:** swap `Space Grotesk` → **IBM Plex Sans** (UI) + **IBM Plex Mono** (the char-map, costs,
   log) per the design system.
4. **No new hex codes** — every color comes from a token (the repo's own rule, and ours).

---

## 5. Phase-label alignment

Prototype Statue Method → your `job.stage`:

| Prototype | Repo `phaseLabel` today | Note |
| --- | --- | --- |
| VISION | DESIGNING (`stage==='vision'`) | same beat |
| SHAPE · pass 1 | WRITING | first block-in |
| REFINE · pass N | THINKING | the hot-potato passes |
| QA | (resolving) | fresh-eyes judge |
| resolved | RESOLVED | done |

Just rename the display strings; don't change `stage` values the store/API emit.

---

## 6. Suggested order of work
1. §4 tokens in `globals.css` (unblocks everything).
2. `MatrixArtStage.tsx` — color swap → full-bleed/centered → crop marks → slot-meta. Verify against
   a real run (`npm run studio:dev`, `ANTHROPIC_API_KEY` set).
3. `LiveArtisanPanel.tsx` — rail restyle + declutter.
4. `Studio.tsx` — nav rail, top bar, theme toggle, layout.
5. Pass on mobile (the prototype is responsive; the slot-meta narrows, rail → bottom dock).

---

## 7. How to hand this off
- The four prototype files (`engine.jsx`, `studio.jsx`, `app.jsx`, `Pixcel Art Studio.html`) are the
  pixel reference — open the HTML side-by-side while porting.
- This repo has `.claude/` skills + Claude Code: hand Claude Code this doc + the prototype files and
  have it make the edits against the real components. It already knows the store/SSE contracts.
