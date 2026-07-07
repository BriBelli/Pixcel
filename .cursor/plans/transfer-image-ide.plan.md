# Transfer + Image IDE

**Status:** Slice 1 SHIPPED as **UX only** (opener names/explains the transfer + nav flip, but the
same generation path as dispatch — NOT a real hand-off). The real architecture (separate Image
agent + Epistemic Frame + Model agent) is now specced in **[slice-2-real-transfer.plan.md](slice-2-real-transfer.plan.md)** — build from there. This file is the origin outline; trust the Slice-2 plan for the boundaries.
**Parent:** `pixcel-platform.plan.md`

## Goal
Add the **real Transfer** ALONGSIDE the quick path — the Operator SIZES the workflow (small vs large) to the user's intent, never forcing heavy on light:
- **Small (quick):** a bare nameable subject / casual "just make me a z28 camaro" → fast inline dispatch in chat, no prompt guide. KEEP THIS — it's loved and correct for casual personas. After it delivers, **gracefully OFFER escalation** via A2UI ("Want to go deeper with a custom image workflow?") — predictive default + choose-for-yourself, never forced.
- **Large (heavy):** signals of depth/project/complexity ("a video scene for my film", iteration, consistency) → **transfer** to the Image agent + Image IDE.
The Operator's Orient reads *"how deep does this person want to go."* Over-gating (forcing the heavy process on everything) is the anti-pattern (Photolif's brittle pipeline; the artisan's bonus-churn) — gate only when it earns its keep.

## Routing is SECTION-AWARE + agent-designed (Slice 2 refinement)
The entry nav SECTION is context that sets the Operator's prior:
- **Chat** = broad / from-scratch. A "video scene" from a cold prompt reasonably starts by locking a **reference image** first (best-practice video uses start/end frames, character refs, storyboards) → transfer to the Image agent — but **explain the why** ("to lock the look, let's nail the reference image, then build the video") so the user never asks "why image when I said video."
- **Video section** = the user already declared video → assume it. Route to the **video Prompt Guide**, generate from a prompt; *recommend* references, don't force an image detour.
- **Image section** = assume image.
Video best-practice is too situational to hardcode (frames vs refs vs storyboards vs direct prompt) → the agent **designs the workflow in real-time**, it is NOT a fixed route. (Slice 1's "video→image" is a fine Chat default; make it reasoned + explained.)

## Context / what exists
- Today: `route.ts` classify → `dispatch` calls `coordinateImage` inline; images render in the front-door chat. No handoff, no Image surface.
- Transfer is fully specced (`pixcel-platform.plan.md`): **Hand-off = Epistemic Frame** (bounded inject → specialist starts at Decide), **Hand-back = State Transfer Contract** (typed delta).
- Nav: `NavRail` supports an active section (`chat` / `image` / `video`). `ChatView` is the current surface. The engine (`coordinateImage`) already generates real images.
- Claude Design Image IDE mockups: `pixcel-handoff/screenshots/image-ide-*.png` (left nav Image active · center canvas · right agent panel + Prompt-Guide `Build` tab).

## Slice 1 — the Transfer FIRES (mechanism, minimal surface)
- [ ] **Operator OODA sizing** — classify decides `chat` / `ask` / **`dispatch` (small/quick)** / **`transfer` (large/heavy)**. KEEP quick dispatch. No fluff ("dream car" → gone). Vague ("a car") → A2UI **question** (text-area, no chips when two-prong). Simple nameable subject → quick dispatch; depth/project/complexity signal → transfer. (Sizing heuristic can be simple for now; tune persona/complexity detection later.)
- [ ] **Epistemic Frame (baton)** — on transfer, the Operator builds the bounded frame `{ scope(goal, subject, medium), pruned ontology(params), boundaries }` and emits a `transfer` event `{ to: 'image', frame }`.
- [ ] **Nav flip + Operator sign-off** — the Operator posts the transfer line ("I'll transfer you to the Image agent…"); nav active → `image`.
- [ ] **Image agent takes over** — a configured agent (system prompt + injected Epistemic Frame, starts at Decide). It intros in the SAME chat surface ("On your photoreal Camaro — generating a few takes"), then runs `coordinateImage` (moved out of the route into the Image agent's workflow). Images render under the Image agent.
- [ ] Verify: "photoreal camaro" → Operator transfer line → nav on Image → Image agent intro + real images.

## Slice 2 — the Image IDE surface (Claude Design)
- [ ] Morph the shell to the Image IDE: left nav (Image active) · center canvas with the **generalized image prompt** pre-filled in a prompt field · right agent panel carrying the chat history + `Agent` / `Build` tabs.
- [ ] **Model agent** (lands here) — the "everything models" specialist: knows/communicates with any model, invoked BY the Image agent, and drives the **Prompt Guide against the targeted model(s)** (part-by-part scoring is model-aware). Pull the brain out of `coordinator`/`routing` into a standalone Model agent.
- [ ] The **Build tab = Prompt Guide** (5-part structured builder) driving generation, working WITH the Model agent on the targeted models; the image-side prompt is wired to the models.
- [ ] Transition animation (nav shift + shell morph), per Claude Design easing.
- [ ] Verify: transfer lands you in the Image IDE, not the plain chat; the Prompt Guide reflects the targeted model.

## Acceptance
- Slice 1: a nameable image request **transfers** — Operator hands off, nav flips, the Image agent runs the generation (no more inline front-door dispatch). Vague requests get a clean A2UI question. No fluff.
- Slice 2: the transferred surface is the Image IDE (canvas + right agent/Prompt-Guide panel), not the front-door chat.

## Deferred (own plans)
- **Persistence** — images/baton survive reload (`persist-generation.plan.md`).
- **Hand-back** State Transfer Contract (specialist → Operator) — wire once there's a reason to return.
- OKF file layer (deferred until the Model agent needs it).
