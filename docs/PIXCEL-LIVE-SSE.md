# Pixcel Live — the Autonomous Artisan SSE Event Contract

> **For the UI.** This is the **event stream the live art show consumes** as the autonomous statue
> engine paints a piece. It defines every event the pipeline emits, grouped by stage, with payloads
> and examples — so the UI can render the live experience (and the Matrix reveal — see
> [MATRIX-LIVE-SHOW.md](MATRIX-LIVE-SHOW.md)).
>
> **Status:** the engine is proven headless (`packages/pxs-studio/art-engine/painter.mjs`); this is the
> **contract to wire in Milestone 3** (the product port into `lib/live-jobs.ts` + the stream route).
> Event *names/payloads* below are the target; today's `live-art` route emits a subset from the old
> per-stroke design. Build the UI to this contract.

## Transport
Not literal `EventSource`/`text/event-stream` — it's **NDJSON over a `fetch` `ReadableStream`** (one
JSON object per line), tailed from the detached in-memory job:
```
GET /api/live-art?id=<jobId>&stream=1   →   {"type":"...", ...}\n  {"type":"...", ...}\n  ...
```
Each line is one event: `{ type: string, ...payload }`. Disconnecting stops the *tail*, not the job —
reopen to catch up. The heavy `frames[]` history is omitted; the current `frame` ships only when it
changes. Every event also carries the running `costUsd` so the UI can show live spend.

## The 5 canonical stages (what the pipeline does)
| stage | what it does | the rule that makes it work |
|---|---|---|
| **VISION** | commits the iconic design **brief** before any pixel | stable target → **no foundation gamble** |
| **SHAPE** | blocks masses + form only, **defers fine detail** | get the **form *loved*** before detailing |
| **POLISH** | completes details **on top** of the locked shape | auditor **accepts the shape** + judges at **read-level** → **no eye churn** |
| **QA** | whole-piece **read-level** sweep (no pixel-peeping) | ship at the **96% bar**, don't chase 100% |
| **keep-best** | ships the **last *approved* state** | **never** ship a churned/regressed pass |

---

## Event catalog (grouped by stage)

### Lifecycle (cross-cutting)
| `type` | when | payload | note |
|---|---|---|---|
| `job.started` | run begins | `{ id, subject, size, model, costCapUsd }` | open the live panel |
| `cost.update` | as tokens accrue (any call) | `{ costUsd, tokensIn, tokensOut }` | live spend meter |
| `thinking.delta` | model reasoning streams | `{ stage, text }` | the "watch it think" pane (append) |
| `job.done` | final approval (or cap) | `{ frame, passes, stagesPassed, costUsd, durationMs }` | the finished piece |
| `job.paused` / `job.cancelled` | human control | `{ reason }` | resumable |
| `job.error` | failure | `{ message }` | |

```json
{"type":"job.started","id":"a1b2","subject":"an owl","size":32,"model":"claude-opus-4-8","costCapUsd":3}
{"type":"cost.update","costUsd":0.34,"tokensIn":21450,"tokensOut":1980}
```

### 1 · VISION  *(the Michelangelo step — commit the design)*
| `type` | when | payload |
|---|---|---|
| `vision.start` | designing begins | `{}` |
| `vision.thinking` | designer reasoning streams | `{ text }` *(or use `thinking.delta` with `stage:"vision"`)* |
| `vision.committed` | brief is fixed | `{ brief: string, palette: [{char,hex,role}] }` |

```json
{"type":"vision.start"}
{"type":"vision.committed","brief":"Front-facing owl, perched... two huge cream-ringed eyes...","palette":[{"char":"b","hex":"#8a5a2b","role":"base"},{"char":"w","hex":"#f2e2c2","role":"belly/disc"}]}
```
**UI:** flash/show the committed brief — it's the "intent" the whole reveal builds toward.

### 2–4 · SHAPE / POLISH / QA  *(same shape, distinguished by `stage`)*
These three stages share one event vocabulary — switch on `stage: "shape" | "polish" | "qa"`.

| `type` | when | payload | UI use |
|---|---|---|---|
| `stage.enter` | a stage starts | `{ stage, goal }` | phase banner / change the reveal mode |
| `pass.start` | a drawer pass begins | `{ stage, pass, note? }` | "painting…" |
| **`pass.delta`** | **rows/cells stream in as the model writes the char-map** | `{ stage, pass, cells:[{x,y,c}] }` *(incremental)* | **THE live paint reveal — the Matrix stream** |
| `pass.done` | a pass finished + rendered | `{ stage, pass, frame, cellsApplied, note }` | update the canvas to the rendered pass |
| `audit.start` | the auditor reviews | `{ stage }` | "art director reviewing…" |
| `audit.verdict` | verdict returned | `{ stage, approved:boolean, issues:string[], pass }` | show approve ✓ / the specific fixes |
| `stage.approved` | stage passes → **locked** | `{ stage, frame }` | lock animation; advance |

```json
{"type":"stage.enter","stage":"shape","goal":"block the whole figure, defer detail"}
{"type":"pass.start","stage":"shape","pass":1,"note":"block owl egg-shape + ear tufts"}
{"type":"pass.delta","stage":"shape","pass":1,"cells":[{"x":12,"y":3,"c":"b"},{"x":13,"y":3,"c":"b"}]}
{"type":"pass.done","stage":"shape","pass":1,"cellsApplied":288,"note":"block owl egg-shape + ear tufts","frame":{"cols":32,"rows":32,"cells":[...]}}
{"type":"audit.verdict","stage":"shape","approved":false,"pass":1,"issues":["No perch — owl floats; add a branch + talons","Belly is a flat blob; defer? no — it's a shape mass, add it"]}
{"type":"stage.approved","stage":"shape","frame":{...}}
```
**Key for the reveal:** `pass.delta` is the heartbeat — each batch of `cells` is the model literally
painting. Stream them onto the canvas in arrival order = the live "watch it paint." `audit.verdict`
is the *drama* (reject → fix → approve). `stage.approved` is the satisfying "lock" beat.

> **POLISH nuance the UI can lean into:** on `stage:"polish"`, the shape is *locked* — deltas are
> small, *interior* touches (eyes, texture) **on top**. Visually: the silhouette stops moving; detail
> "crystallizes" inward.
> **QA nuance:** `stage:"qa"` is a *steamroller read-level* sweep — usually `audit.verdict approved:true`
> fast, or one tiny `issues` fix. Visually: a scan-line sweep confirming the piece.

### 5 · keep-best
| `type` | when | payload | note |
|---|---|---|---|
| `keepbest.snapshot` | a stage is approved | `{ stage, frame }` | the engine remembers this as a safe state |
| `keepbest.shipped` | run ends *without* final approval (cap/budget) | `{ frame, fromStage, reason }` | it shipped the last **approved** state, not the churned latest |

```json
{"type":"keepbest.snapshot","stage":"polish","frame":{...}}
{"type":"keepbest.shipped","fromStage":"polish","reason":"qa hit pass cap","frame":{...}}
```
**UI:** `keepbest.shipped` is rare but honest — surface "shipped the best clean version" rather than a
silent swap.

### Human-in-the-loop (optional, controlled-passes mode)
| `type` | when | payload |
|---|---|---|
| `feedback.injected` | user feedback folded mid-run | `{ text, atStage }` |
| `awaiting.input` | engine pauses for approve/redirect | `{ frame, stage }` |

---

## Minimal happy-path sequence (one clean owl)
```
job.started → vision.start → vision.committed
 → stage.enter(shape) → pass.start/delta*/done (×3) → audit.verdict(✓) → stage.approved(shape) → keepbest.snapshot
 → stage.enter(polish) → pass.start/delta*/done (×1–2) → audit.verdict(✓) → stage.approved(polish) → keepbest.snapshot
 → stage.enter(qa) → audit.start → audit.verdict(✓) → stage.approved(qa)
 → job.done
```
(interleaved throughout: `cost.update`, `thinking.delta`)

## UI build notes
- **One reducer keyed by `type`** drives all panels: canvas (from `pass.delta` + `pass.done.frame`),
  phase banner (`stage.enter`/`stage.approved`), critique feed (`audit.verdict`), think pane
  (`thinking.delta`), cost meter (`cost.update`).
- **Render the canvas from `pass.delta` cells** for the live feel; reconcile to `pass.done.frame` (the
  ground-truth render) when each pass lands.
- **`audit.verdict.issues`** is gold for UX — show the art director's specific notes; it's the
  human-legible "why it's still working."
- Everything is **idempotent on `frame`** — if you miss deltas (reconnect), the next `pass.done.frame`
  resyncs you.
