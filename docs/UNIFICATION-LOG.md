# Pixcel Unification — Decisions & Questions Log

> **For Brian to review.** A running log of (a) decisions locked, (b) **OPEN FORKS that need your call**
> (flagged, NOT decided autonomously — these could shift a significant design), and (c) the design review +
> migration backlog. Nothing hard-to-change has been coded. Plan: `PIXCEL-UNIFICATION-PLAN.md`.

---

## ⚠ OPEN FORKS — need your call (I paused; did not decide)

*(none open — FORK-1 resolved 2026-06-26: **React-everywhere**. See below.)*

---

## ✓ RESOLVED FORKS

### FORK-1 · Front-end framework → **React/Next everywhere** (Brian, 2026-06-26)
The Lit chat app (`apps/a2ui-chat`) gets ported to React as part of the breadth port (P3); the React
prototypes are the target (zero translation). The handoff's "production = Lit" rule is **superseded** —
it was written for the photolif-as-is target. The design system (tokens, rules, prototypes) is unchanged.

<details><summary>original analysis</summary>

**The conflict:** your Q2 answer was **React/Next**, and the Art Studio integration guide targets
`packages/pxs-studio` (Next.js + React). BUT the handoff's `CLAUDE.md` (the global rulebook) says
**"production is Lit + Web Components… No React in `apps/a2ui-chat/`"** — because photolif's existing chat
app is Lit. So the design assumes *Lit for the IDE/chat, React for the art studio*. The unification needs ONE.

**My recommendation: React/Next everywhere.** Reasons: (1) it's your pick; (2) **the prototypes are already
React/JSX** — React is the *zero-translation* target, Lit means translating every prototype; (3) single
language end-to-end (your stated preference); (4) this repo's proven studio is already React/Next. The
handoff's "Lit" rule was written for the **photolif-as-is** target and is **superseded by the all-React
unification**. The design system (tokens in `colors_and_type.css`, component specs, the rules) is
framework-agnostic and applies either way.

**The cost to be honest about:** photolif's `apps/a2ui-chat` is a *mature Lit app* (~35 A2UI components +
the chat surface). React-everywhere means **porting that Lit app → React** (part of the P3 lift). That's
real work — but it's work we'd largely do anyway (the unification rebuilds the front door from the Claude
Design), and the React prototypes give us the target for free.

**→ Confirm: React-everywhere (port the Lit chat → React)?  Or keep Lit for the chat/IDE + React only for the art studio (a hybrid front-end)?**
</details>

---

## ✅ Decisions locked (from your calls)
1. **ONE product: Pixcel.** Not two. (photolif = "Pixcel v2", a decoy name — dropped.)
2. **Language = all TypeScript/JS, single.** Backend Python → ported to TS (P3). Python only if a capability
   has no viable TS equivalent — *my call, flagged in this log if hit. None so far.*
3. **Front-end = React/Next EVERYWHERE** (FORK-1 resolved). The Lit chat app ports to React (P3).
4. **First slice = front door → the proven artisan flagship** + A2UI + asset substrate. Port photolif's
   breadth (routing/providers/video) to TS *after* the slice proves the architecture.
5. **The Pixcel Agent primitive (the chef)** = the keystone. Spec: `PIXCEL-AGENT-PRIMITIVE.md`.
6. **Claude Design = canonical UI.** photolif screens = origin/context only.
7. **The auto-is-default law** (agent decides by default; user can override) — model, workflow, AND
   presentation. Restore `auto` everywhere (photolif regressed to `custom`).
8. **One version-history system** across all media (image edits + pixel revisions + …).
9. **Brand colors (locked 2026-06-27)** — carried from the old design as a *deliberate* "no new hex"
   exception (in `globals.css`): app **accent = brand blue `#58a6ff`** (hover `#79b8ff`, active `#1f6feb`),
   overriding the DS Google-blue. `--pxl-brand-purple #8957e5` reserved for AI/special actions;
   `--pxl-glow-blue #3b82f6` + `--pxl-glow-purple #8b5cf6` for decorative non-chrome.
10. **CHAT SPLASH = FROZEN** (gold reference) — layout/copy/grid locked; only global token/CSS flows through.
    The greeting name comes from `useCurrentUser()` (the auth integration point), not hardcoded.

---

## 📐 Design review — the Claude Design handoff (`design-handoff/pixcel-handoff/`)
A professional design-system + spec. **It is the UI source of truth.**
- **What it is:** dark-canonical, warm-charcoal, soft Google-blue accent, frosted glass only on float
  chrome; *"the UI should feel not there."* Tokens (`--a2ui-*` / `--pxs-*`), IBM Plex Sans/Mono, the Pixel-X
  brand mark, Lucide icons. **Hard rules** in its `CLAUDE.md` (no gradients on chrome, alpha borders, focus
  halos, radii scale, no scale-pop, sentence case, no emoji) — reviewers revert breakers.
- **Canonical prototypes (React/JSX, reference-fidelity):** **Pixcel Art Studio** (the artisan — immersive
  char-map canvas + agent rail), **Image IDE - Workflow** (the most-current build: 56px nav rail · sections
  Art/Image/Video/Anim · per-workflow tool sub-rail · agent dock), **Image IDE - MVP** (leaner), **Canvas**
  scaffold. Shared 56px nav (Pixel-X top; Art=squiggle glyph; Export/Assets/Assistant pinned).
- **The tool sub-rail is workflow-dynamic** — the agent suggests a curated workflow, the user picks, that
  determines the tools. *(This is our front-door-agent-shapes-the-workflow vision, in the UI.)*
- **Art Studio integration guide** (`docs/art-studio-integration-guide.md`) is gold: it maps the prototype
  onto **this repo's real files** — *restyle* `MatrixArtStage.tsx` (green→blue, full-bleed/centered canvas,
  crop-marks, slot-meta overlay), `LiveArtisanPanel.tsx` (rail restyle + declutter), `Studio.tsx` (nav rail
  + 46px top bar + theme toggle) — **keep ALL the live-art-store / SSE / canvas wiring; change only look.**
  Token swap first (DS tokens become source of truth; repoint Tailwind theme; Space Grotesk → IBM Plex).
- **Maps cleanly to the plan:** this IS P4 (the unified shell) + the first-slice art-studio restyle. The
  nav sections (Art/Image/Video/Anim) = the surfaces; the agent dock = the front-door agent; "Open in
  Studio" = the chat→studio handoff.

---

## 🗂 Migration backlog — verdict map (from the photolif analysis + the handoff)
Per major part: **PORT** (TS, mostly mechanical) · **RECREATE** (re-pattern as agent, not brittle workflow)
· **REFACTOR** (keep, adapt) · **TRASH**. (Detail to deepen with a part-by-part scan when you're back.)
- `a2ui-agent/llm_providers.py`, `pxc/*` routing/providers/pipelines (Python) → **PORT → TS** (P3, after slice).
- The 8×8 routing / two-gate decision tree → **RECREATE** as the image-router *specialist agent* (oracle,
  not a Python tree) — keep the registry + provider list as DATA.
- `libs/a2ui-core` (the A2UI protocol, already TS) → **PORT directly** (framework-agnostic; the crown jewel).
- `apps/a2ui-chat` Lit renderer + ~35 components → **RECREATE in React** *(pending FORK-1)* using the Claude
  Design prototypes as the target.
- `libs/pxs-core` (photolif's, advanced) → **REFACTOR** into the tracked `packages/pxs-core` (P0; data model
  identical; reconcile 2 defaults).
- The artisan (`packages/pxs-studio` live-jobs + prompts) → **KEEP, restyle only** (the integration guide).
- `content_styles/`, `model_briefs/`, the registry, recipes → **PORT as DATA** (context/recipes, not code).
- `training_store.py` / `training_data.db` (~1.16 GB) → **REFACTOR** (the training corpus; TS store later).
- The legacy React prototype (`apps/frontend`), the React A2UI demo (`apps/a2ui-demo`) → **TRASH/archive**.

---

## How I'm proceeding (autonomous, no hard code)
Writing specs + this log only. Next artifact: `PIXCEL-AGENT-PRIMITIVE.md` (the P1 chef spec). I will not
write hard-to-change code or commit to FORK-1 until you confirm.
