# Pixcel — Platform Plan (index)

_Sharded per the Context-Sharding discipline (one concept per file — never one giant dump).
The design lives in `concepts/`; active work lives in the `*.plan.md` sub-plans beside this file._

## What we're building
An autonomous, AI-native creative platform. **One chat engine**, configured into every workflow (image, video, later more). The user says what they want; a professional **Operator** agent routes them; specialist agents run the work; real media comes back. Not another model front-end — the moat is **Orient**.

## The design (concept shards)
- **[OODA + OKF](concepts/ooda-okf.md)** — the loop; Orient is the moat; OKF; files-vs-DB storage split.
- **[Agents + Transfer](concepts/agents-and-transfer.md)** — Operator / specialists / Model agent; hand-off (Epistemic Frame) + hand-back (State Transfer Contract).
- **[Workflow sizing + routing](concepts/workflow-sizing-and-routing.md)** — small/large, never over-gate; section-aware routing; three targets; A2UI + everything-is-a-chat.

## Where we are now (built + working)
- ✅ Front-door **Operator** chat (photolif-faithful UI) — ONE tool-use call: streams a hospitable opener, then emits its OODA verdict (ask / dispatch / transfer / reply). Orient-first on the deliverable.
- ✅ Image engine: model registry + two-gate router + provider-agnostic executor + Gemini adapter (proven live).
- ✅ **Sized** flow: casual → quick inline image in chat; deep ("Camaro for a video scene") → **real transfer** (opener names + explains it, nav flips, first reference render). Vague → a two-prong A2UI question (text-area).
- ✅ Spend fully metered + hard-capped (tokens + image cost); section prior threaded in.
- ✅ Nav focused on Image (pixel-art pulled — proprietary IP, later); tasteful backdrop.

## Active sub-plans
- **[Transfer + Image IDE](transfer-image-ide.plan.md)** — Slice 1 (sizing + real transfer) DONE; Slice 2 = morph the surface to the Claude Image IDE (canvas + Prompt Guide + Model agent).
- **[Persist generation](persist-generation.plan.md)** — images survive reload (baton foundation).
- **[Prompt-history edit](prompt-history-edit.plan.md)** — double-click edit + file attach + edit/regenerate cascade to inactive.
- Later — video workflow, Prompt Guide scoring, edit/compositing, scenes/storyboards, pixel-reasoning IP re-activated.

## Rules of engagement
- One thing at a time, visible + tested. **Loops, not lines.**
- Crown-jewel pixel engine untouched — generalize beside it.
- Meter + cap every generation; flag every API-spend step.
- Context Sharding: never dump a giant knowledge base into an agent's window — bounded, path-referenced slices.
