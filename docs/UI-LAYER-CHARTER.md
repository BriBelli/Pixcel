# Pixcel UI Layer — Charter

> The bible for building Pixcel's UI. **Design exactly like this at every step.** The **splash is the
> locked gold-reference** — walk through the rest of the app from there, in this spirit. This is
> architecture, not decoration: the UI is the agent's expression. Pair with `PIXCEL-AGENT-PRIMITIVE.md`,
> `PIXCEL-UNIFICATION-PLAN.md`, and the memory `project_living-canvas-ui`.

## 1. The core idea: the UI IS the autonomous agent
You are not building an app — you are building the **face of the Pixcel Agent**.
- The **canvas is the agent's face / brain / expression**: a full-bleed **z-0 "digital wall / LED screen /
  grid"** (the same grid feel as the splash). It is **persistent and never broken** across the entire
  experience.
- **One continuous state.** Splash → owl → chat → any workflow does **not** reload or break state. The wall
  persists; the agent manages it. The agent "notices the wall is already lit and just uses it."
- **UI components live ABOVE the wall** (higher z-index) and **swoosh / glide** in and out — morphing,
  fluent, never static. Transitions are graceful (easing `cubic-bezier(0.22,1,0.36,1)`).
- The agent is the **overseer / reviewer / communicator** through the whole experience, with access to all
  tools + workflows. The UI is how it talks back. **A2UI carries ~99% of that UI** — use it.
- **The wall is POLYMORPHIC and agent-driven.** It's not just "a canvas" — the agent makes it whatever's
  needed: a **Pixcel-art wall**, a **video wall**, a **living digital AI face / expression / animation**.
  The wall *is* the agent's presence; it shifts modes as the agent works. The agent **also drives the top
  z-layer** (which UI components appear / swoosh / glide). **BOTH layers persist across the entire user
  session** — one continuous, agent-managed state, never reloaded. (`DigitalWall` is therefore a
  mode-switchable surface, not one fixed look — idle char-sea today; pixcel/video/face modes as we build.)

## 2. Do NOT cage the agent (the statue lesson, applied to the UI)
Every constraint we forced on the artisan (exemplars, fixed context) **hurt quality**. The AI industry moves
overnight; human-maintained restrictions are a **bottleneck**, not a feature.
- **Navigation is not strict.** "Apps" are broad **categories / subjects**, not fixed screens. From the
  prompt the agent **picks a category → derives the right models/features (per the model docs) → constructs
  the workflow → builds the A2UI → presents it** when 100% ready.
- **Workflows are the chef's job.** Build the best/fastest workflow for *this* request. **One-of-a-kind
  workflows are saved (and reusable); common ones become templates / "tools."** The agent has **free will**
  to reach past existing tools — other agents, the internet, new models, live-generated workflows.
- **Tools = optional guidance, never cages.** Shape with structure + **inject context/instructions
  dynamically at deterministic points**; let the agent figure out HOW. (Same hybrid as the statue: rails
  where structure earns it, autonomy everywhere else.)

## 3. The z-index model (locked)
- **z-0 — the persistent canvas / digital wall.** Full-bleed, breathing, never interrupted. The art (and,
  if performant, a living AI reflection/animation) lives here.
- **Left nav rail** — the ONE persistent UI anchor (opens to projects / chats / categories — later).
- **Right accordion AI-chat** — appears *in a workflow* (transitions in on entry). The **splash already holds
  the prompt**, so no right panel there.
- **Floating A2UI tool panels** — on the canvas **edges**, avoiding the central focal region (**flubber**:
  the focal art owns the center; everything migrates around it).
- **The ART REGION (the flubber mechanism, kept simple).** One shared, responsive rect — the focal-art
  bounds (the "orange box") = the viewport **inset by the persistent chrome** (left nav, right AI accordion,
  top bar, + padding). The canvas **sizes + centers the art within this region**; floating panels **dock to
  the outer walls outside it**; the rect is **exposed/readable** (context) so the agent places its A2UI
  panels clear of the art, and it recomputes on resize / accordion-toggle. The art never crosses into the UI
  and the UI never crosses into the art.
- Everything above z-0 **swooshes**; the wall persists beneath.

## 4. Concrete build order
1. **Splash = a real Pixcel canvas.** Make the splash background a single large **Pixcel canvas** (digital
   LED/grid screen, z-0) — the *same persistent canvas* the studio uses — with the **Pixcel logo positioned
   inside the canvas coordinates at its current location**. The prompt bar sits at a **higher z-index** above
   it. This makes the layers visibly separate (LED-screen wall vs floating UI) and establishes the persistent
   canvas.
2. **Persistent-state transition.** Ask "owl" on the splash → the prompt bar (+ splash UI) **swooshes away**,
   the **canvas persists**, the owl generates on it, the owl-support UI **glides in**. The wall never
   reloads. (Cut 1 already routes the prompt → artisan; this adds the swoosh + the persistent-canvas
   continuity.)
3. **Photolif chat parity — then beat it.** Study photolif's chat: UI loading, **SSE streaming**, the
   **advanced content-styles pattern**, and the **python agent** (`photolif/a2ui-agent/`, `apps/a2ui-chat/`).
   Pixcel's chat must be **as good or better**, A2UI-native. Example: *"a multi-image of a banana chair with
   a cat"* → the agent **asks the prep questions** it needs (chef: models, features) → swooshes away unneeded
   UI → the wall transitions away **OR** becomes a **living AI reflection/animation** (if performant) → the
   workflow UI transitions in.

## 5. Guardrails
- **Crown jewel untouched** — the proven artisan engine (`lib/live-jobs.ts` + prompts + bonus-loop +
  keep-best). Only re-skin / re-position its containers.
- **Splash is FROZEN** — amend only on Brian's explicit say-so.
- **Canonical design** = `design-handoff/pixcel-handoff/` (the Pixcel Art Studio + Image IDE prototypes, the
  integration guide, `CLAUDE.md` hard rules, `colors_and_type.css` tokens). DS tokens + the locked brand blue
  `#58a6ff`; **no new hex**.
- The UI ties to the **agent architecture** (P1 primitive + front-door orchestrator + emergent workflows) —
  build them as one thing.

## 6. Operating model
Detailed UI polish runs in a **dedicated UI thread** (this charter is its brief). The architect thread holds
the crown jewel + plan + big workstreams (A2UI renderer, the agent cuts, P3 port) and reviews milestones.
Dispatched code agents leave changes uncommitted → reviewed (crown-jewel-untouched) → committed.
