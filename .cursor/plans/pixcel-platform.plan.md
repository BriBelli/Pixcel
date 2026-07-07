# Pixcel — Platform Plan (master)

_The design of designs. Single source of truth; focused sub-plans live beside this as `*.plan.md`._

## What we're building
An autonomous, AI-native creative platform. **One chat engine**, configured into every workflow (image, video, later more). The user says what they want; a professional **Operator** agent routes them; specialist agents run the work; real media comes back. Not another model front-end — the moat is **Orient** (below).

## The blueprint: OODA + OKF (locked)
Modern agentic AI is Boyd's **OODA loop** — Observe → Orient → Decide → Act — run at machine velocity (compress the loop faster than the environment can adapt). Pixcel is our tuned version:

| OODA | Pixcel |
|---|---|
| Observe | **Analyze** the prompt + current state |
| Orient | **Identify** — make sense in context (the decisive step) |
| Decide | **Classify** — help · ask · transfer |
| Act | **Respond** — reply · A2UI question · **Transfer** |

It is a **LOOP, never a line.** The Operator loops; each specialist loops; results feed back. Never force a fast loop into a brittle linear pipeline (the "Line vs Loop" trap).

**Orient is the moat; OKF is how we win it.** Boyd: Orient is decisive. Google's **OKF** (Open Knowledge Format — markdown + YAML `type` frontmatter, cross-linked, `index.md` + `log.md`) *solves the orientation bottleneck*: an agent reads a concept file and updates its worldview in one token pass — no scraping, no RAG spin-up. Our Orient layer = OKF concept docs:
- **models** (the Model agent's knowledge) · **living context** (active + correlated records) · **assets** (8-part backbone) · **tools-as-agents** (the registry).
- Every action appends to a `log.md` (= our status / passLog audit) so the next agent inherits full history — clean multi-agent handoff, no context loss.
- (Our memory files and these `.plan.md` files are already OKF-shaped.)

**Storage splits by data type (not either/or):**
- **OKF files = the kitchen (knowledge)** — static, authored, shared, git-versioned: model registry, tools-as-agents, playbooks, prompt formulas, craft/content-styles. The Model agent's self-restocking = rewrite a `.md`, no code deploy.
- **DB = the current orders (state)** — dynamic, per-user, high-volume, queryable: conversations, generated assets, the baton, the status-managed correlated graph. `assemble(active + correlated)` by query.
- Orient reads BOTH; DB state is rendered into the OKF shape on assembly, so the agent sees one consistent surface.
- **DEFERRED:** converting `model-registry.ts` (TS) → OKF markdown files waits until the Model agent's self-restocking maintenance is built (that's when files earn their keep). Premature now.

## The agents
- **Operator** (was primary/coordinator/detective) — the professional front door. Greets, validates, runs OODA, routes. Hospitality is the point: like a great company's operator who transfers you to exactly the right specialist. **The transfer experience IS the product.**
- **Specialists** — Image agent, Video agent — each runs its own OODA loop and works *directly* with the user during its leg.
- **Model agent** — the cross-cutting AI-models expert (a meteorologist / financial-analyst for models: image, video, general, code — every model in existence). Invoked BY a specialist; they run the OODA workflow together (specialist owns the creative workflow, Model agent owns which model + config).

## Transfer (the OODA handoff)
Product word: **Transfer** ("I'll transfer you to the Image agent"). Backend: **baton**. Three named handoff patterns:
1. **Structured schema** — the baton is a typed record (status + payload + error), never prose.
2. **State-injection** — the Operator's orientation is injected into the specialist so it SKIPS a redundant Orient ("already working your history").
3. **Session-compression** — when context fills, compress history to a handoff doc for long horizons.
Plus the **escalation boundary**: a specialist loops autonomously until a threshold (low confidence / high cost / out-of-scope) → compresses state → **hands back** to the Operator (or asks the user).

**Hand-OFF = the Epistemic Frame.** The Operator never dumps raw history into a specialist — it injects a bounded (~<500 token) world-view with three parts: **Localized Scope** (this task's target + goal), **Pruned Ontology** (only the facts this agent needs — model locks, upstream lineage, scores), **Local Boundaries** (permitted actions, output token budget). Header says "these are verified facts — don't re-verify" → the specialist starts at Decide. Three bloat-control strategies → ours:
- **Read-ahead / progressive disclosure** — inject OKF file PATHS + hashes, not content; the agent (with a file-read tool) pulls a linked doc only if its Decide phase needs it (90% of reference stays on disk — *this is why OKF-files-as-kitchen matter*).
- **Dependency pruning** — match the specialist's tags against the state graph, strip unrelated state (= our active + **correlated** filter; drop the rest).
- **State flattening** — inject condensed frontmatter as minified JSON, drop the markdown body.

**Hand-BACK = the State Transfer Contract.** The specialist never returns prose — it returns a typed, immutable **Delta State Payload** with three pillars:
- **Lineage** (what happened): specialist_id, parent_loop_id, duration.
- **Delta** (what changed): `added / mutated / deleted` — this **IS our status graph** (added = new active records, mutated = updated, `deleted` = our `→inactive` cascade).
- **Signal** (what next): status + `recommended_next_phase` + `confidence_score`.

The Operator re-Orients WITHOUT recomputing, three patterns:
- **A · Event sourcing** — apply the delta as *code* against the record graph (our append-only passLog + audit-preserving status); no LLM call.
- **B · Context masking** — inject ONLY the delta into the window, never past logs (our bounded `assemble`); saves tokens, prevents drift.
- **C · Signal short-circuit** — `recommended_next_phase` skips Observe/Orient → jump to Decide; `confidence_score` drives the escalation boundary.

Stack note: TS interfaces + our SQLite status-DB as the event store — NOT Pydantic/LangGraph/AutoGen (ignore Gemini's Python framing).

## Three routing targets
① **Chat** — answer directly, no transfer. ② **Image** — images (incl. images a video needs) → Image agent. ③ **Video** — films/shorts (requires images) → Video agent.

## A2UI + everything-is-a-chat
One engine (context + dynamic A2UI + agent brain), configured per workflow — no bespoke IDEs. Agents ask via a **formatted A2UI question** (label + text-area; chips only when the axis is known), never prose. The composer stays the user's own prompt line. Claude Design = gospel. No fluff / marketing tone — calm and direct.

## Where we are now (built + working)
- ✅ Front-door consultant chat (photolif-faithful UI).
- ✅ Image engine: registry + two-gate router + executor seam + Gemini adapter (proven live).
- ✅ Operator classify → DISPATCH generates real images in chat ("z28 camaro photo real" → 2 images, no interrogation).
- ✅ A2UI Question affordance.
- ✅ Nav focused on Image; tasteful backdrop.

## Path forward (sub-plans beside this file)
1. **Operator OODA polish** — vague ("a car") → text-area A2UI question, NO fluff; nameable → dispatch. Tune classify to the OODA + hospitality bar.
2. **Persist generation** (baton foundation) — images survive reload. → `persist-generation.plan.md`
3. **Transfer + Image IDE** — cue → transfer → nav flips to Image, shell morphs to the Image IDE, specialist already working the history, prompt pre-filled, Model agent under the Image agent.
4. **Prompt history: edit + attach + cascade.** → `prompt-history-edit.plan.md`
5. **Later** — video workflow (same shape), Prompt Guide scoring, edit/compositing, scenes/storyboards, pixel-reasoning IP re-activated as its own medium.

## Rules of engagement
- One thing at a time, visible + tested. **Loops, not lines.**
- Crown-jewel pixel engine untouched — generalize beside it.
- Meter + cap every generation; flag every API-spend step.
