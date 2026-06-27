# Pixcel Art Studio — UI retrofit · Claude Code kickoff

Paste the prompt below into **Claude Code, running in the `BriBelli/Pixcel` repo**. Drop this whole
`handoff/` folder somewhere in the repo first (e.g. `packages/pxs-studio/design-handoff/`) so Claude
Code can read the reference files.

---

## What's in this folder

| File | Use |
| --- | --- |
| `pixcel-art-studio-reference.html` | **The visual spec.** Single self-contained file — open in a browser, run "owl", watch the live show. Everything should end up looking/feeling like this. |
| `integration-guide.md` | The file-by-file change list (what maps to what, what to keep, build order). **Read this first.** |
| `prototype-src/engine.jsx` | Char-map canvas, cascade, `SlotMeta` overlay, icon set — the look reference for `MatrixArtStage`. |
| `prototype-src/studio.jsx` | The IDE shell, agent rail, top bar, theme toggle — look reference for `Studio` / `LiveArtisanPanel`. |
| `prototype-src/app.jsx` | App composition + Tweaks. |
| `colors_and_type.css` | The Pixcel design-system tokens (`--a2ui-*` / `--pxs-*`) + IBM Plex fonts. **New source of truth.** |

---

## The prompt to paste

> You're retrofitting the **Pixcel Art Studio** UI in `packages/pxs-studio`. A design prototype lives
> in `design-handoff/` — `pixcel-art-studio-reference.html` is the visual target; `integration-guide.md`
> is the change plan. Read both before editing.
>
> **Ground rules:**
> - **The engine is sacred.** Do NOT change `live-art-store`, `/api/live-art`, `/api/generate-art`, or
>   the WRITE→CASCADE→DATA canvas mechanics in `MatrixArtStage`. This is a **restyle + relayout only** —
>   keep every store read and SSE wire intact.
> - **Replace the palette.** The current GitHub-ish Tailwind theme goes away. Make `colors_and_type.css`
>   (the `--a2ui-*` / `--pxs-*` tokens) the source of truth: copy it into the app, `@import` it in
>   `globals.css`, delete the old `:root` palette, and repoint `tailwind.config` colors at the tokens
>   (see guide §4). Fonts → IBM Plex Sans / IBM Plex Mono. **No new hex codes** — tokens only.
> - Follow the repo's own `CLAUDE.md` / `AGENTS.md` conventions.
>
> **Do the work in this order (guide §6):**
> 1. Tokens + Tailwind theme (`globals.css`, `tailwind.config`). Verify the app still builds.
> 2. `MatrixArtStage.tsx`: phosphor green (`125,255,176`) → Pixcel glow blue (`#8ab4f8`); boxed 460px
>    stage → full-bleed canvas with the art **centered** in a faint char-sea; drop the CRT scanlines +
>    green glow ring; add the four crop-mark corners; replace the side "live·data" column with the
>    centered **slot-machine meta overlay** (port `SlotMeta` from `prototype-src/engine.jsx` — animate
>    **transform only** in the keyframe, never opacity, or lines stick at 0).
> 3. `LiveArtisanPanel.tsx`: restyle to the prototype's agent rail (request bubble, one-line
>    `PhaseLine`, Save/Iterate/Redo controls, Statue-Method breadcrumb, collapsible brief). Remove the
>    duplicate THINKING box + in-rail data ledger during generation — that now lives in the canvas overlay.
> 4. `Studio.tsx`: 56px nav rail (Pixcel **X** mark + Art/Image/Video/Anim + Assets), 46px top bar with
>    the **moon/sun** theme toggle (not a sparkles glyph), single immersive canvas + right rail.
> 5. Align Statue-Method labels (guide §5) — display strings only; don't touch `job.stage` values.
> 6. Verify against a real run (`npm run studio:dev`, `ANTHROPIC_API_KEY` set) on desktop + mobile.
>
> Work component by component. After each, build and show me a screenshot before moving on. Don't
> refactor the engine or invent features that aren't in the prototype.

---

## After Claude Code is done — review checklist
- [ ] Live show runs on a real `owl` request, blue not green, no console errors.
- [ ] Canvas is full-bleed with the art centered + crop marks; no boxy ring or scanlines.
- [ ] Slot-machine meta scrolls + fades top/bottom; lines are visible (not stuck at opacity 0).
- [ ] Rail isn't crowded during generation; resolved state shows the one-line `PhaseLine`.
- [ ] Theme toggle is moon/sun and actually flips the palette.
- [ ] Saved pieces land in Assets.
- [ ] Mobile: rail becomes a bottom dock, slot-meta narrows, canvas still readable.
