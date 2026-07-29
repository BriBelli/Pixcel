# Claude Code prompt — Pixcel UI Refresh (Bold)

Copy everything below the line into Claude Code as your first message.

---

Read `REFRESH-SPEC.md` in full before writing any code. It is the spec for the shell and the visual system. Then read `design/Pixcel Refresh.dc.html` as a **visual reference only**, and `design/_ds/pixcel-design-system-*/colors_and_type.css` for the canonical token names. Rendered captures of every screen are in `design/screens/`.

Anything touching persistence — the Projects screen's draft/saved behavior, Assets retention, lineage — is specified in `OBJECT-MODEL-HANDOFF.md`, and its build order supersedes the scope below where they overlap. Do that work from `CLAUDE_CODE_KICKOFF.md`, not from this prompt.

## What you are building

A refreshed app shell for Pixcel with six screens — **Chat, Image, Video, Audio, Projects, Assets** — behind a persistent 74px left rail, using the frosted-glass visual system described in the spec.

Image, Video and Audio each open on a **splash** (three educational cards: Guides · Workflows · Model features), not on the IDE. The three-panel workspace is a second state behind a per-surface lens. Build the splash first — it is what a user sees on arrival.

## Two files, one order

If you are picking up both tracks: land the object-model slices first (`CLAUDE_CODE_KICKOFF.md`), because the Projects screen cannot be built truthfully until `Thread.retention` exists. The shell work below is independent of it and can proceed in parallel.

## Target style: BOLD

The design ships two style modes. **Implement Bold as the default.** Do not implement Professional yet; just don't architect it away — keep the mode values behind tokens/a theme variant so Professional can be added later by swapping values, not by rewriting components.

Bold means:
- Background accent glow ON — one soft radial, top-right, `rgba(255,126,95,0.08)`, slow pulse (~14s).
- Media tiles get accent radial washes: `rgba(255,126,95,0.16)` and `rgba(137,87,229,0.16)`, alternating by position.
- Active rail item: coral text (`#ff7e5f`) + `inset 0 0 0 1.5px rgba(255,126,95,0.45)` over an `--px-ice` fill.
- Everything else stays neutral grey. Accent still appears ONLY on: brand mark, primary buttons (Render / Send / Add assets), active nav, and tile washes. Surfaces, strokes, and text stay neutral — do not tint them.

## Hard rules — these are where this usually goes wrong

1. **Do not port the HTML file.** It is a design prototype in a proprietary template format. Rebuild in this repo's real stack: **Lit / Web Components** under `apps/a2ui-chat/`, following existing component patterns. Never copy its `<x-dc>` markup, its `Component` class, or `support.js`.
2. **Do not hardcode hex values.** Map the `--px-*` tokens in the README onto the existing `--a2ui-*` tokens in `apps/a2ui-chat/src/styles/tokens.css`. Add new tokens there only if no equivalent exists. No parallel token system, no inline hex in components.
3. **Glass is three tiers of one hue, not three colors.** `--px-glass` (0.70), `--px-frost` (0.57), `--px-ice` (0.35) are the same base `#191a1e` at different alpha, all with `backdrop-filter: blur(15px)`. Do not substitute distinct colors, and do not drop the blur — the blur is what makes them inherit the background.
4. **Strokes stay 1px alpha-white hairlines** (`--px-stroke` / `--a2ui-border-default`). Never a solid gray border, never a faded/soft edge — the crisp edge against the darker base is the whole effect.
5. **Neutral base, no warm or purple cast.** The base greys are `#131417` bg, `#2b2c30` stroke, `#ecedef` text, `#9a9ca2` dim. If a surface reads pink/warm, a token got tinted — fix the token, not the component.
6. **Hover is never opacity-only.** Use the repo's existing patterns: `rgba(255,255,255,0.06)` overlay on rows and icon buttons; solid surfaces bump one elevation. Transitions 150–200ms ease, background only — no scale-pop, no bounce.
7. **Bento grids keep natural media dimensions.** Assets grid is `column-count: 4; column-gap: 16px` with cards `break-inside: avoid; display: inline-block; width: 100%`, and each tile carries the real aspect ratio of its media (3/4, 16/10, 1/1, 16/9, 4/5, 4/3 in the mock). Do not normalize everything to squares. Image Results uses a 2-col grid with a hero `span 2 / 16:9`, two `1/1`, and a wide `span 2 / 16:10`.
8. **Media tiles in the mock are placeholders.** Wire them to real asset thumbnails; keep the aspect-ratio-driven sizing.
9. **Icons: Lucide only** (`viewBox="0 0 24 24"`, stroke-width ~2, round caps), rendered 16–21px. Provider badges use the real favicons from the design system's `assets/provider-icons/` — never recolor them.
10. **Type: IBM Plex Sans** for UI, **IBM Plex Mono** for stat values, quality scores, and durations. Sentence case for buttons and headings. No emoji.

## Scope

Build: the rail + screen router, all six screens per the spec's per-screen sections, and the splash→IDE lens for Image/Video/Audio. Functional bits: rail navigation, the lens transition, the Assets/Projects grid⇄list segmented toggle, and a sort menu (Date added / Name / Type / Size) with real sorting.

Do **not** build (roadmap, explicitly out of scope): Video's two-way A2UI binding between the center builder and agent panel, the Storyboard→Film multi-layer timeline, 3D, or the novel-view-synthesis feature named on Video's splash. Leave no stubs for these.

**Audio is in scope** — its splash is designed. Earlier revisions of this prompt said otherwise; that is stale.

The Projects screen's retention filter, Draft chips, expiry rows and delete/undo behavior are **not** in this prompt's scope — they depend on `Thread.retention` landing first. See `OBJECT-MODEL-HANDOFF.md` §6.

## Approach

Start by exploring the repo and telling me your plan before you build:
- which existing components you'll reuse vs. create,
- exactly how you'll map `--px-*` onto `--a2ui-*` (list the pairs),
- where the rail and router will live.

Wait for my go-ahead on that plan. Then build screen by screen, starting with the shell + Image (the most complex — the three-panel A2UI). Show me each screen before moving on.
