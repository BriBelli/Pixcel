# Live Artisan — System & UI Integration Spec

> A precise, self-contained description of Pixcel's "Live Artisan" agentic art system — its
> agent topology, the autonomous loop, deep-thinking config, job lifecycle, the API surface, and
> the **exact data/event model a GUI consumes**. Written to be shared with another LLM that is
> designing the IDE GUI. Companion lore: `AGENTIC-ARTISAN-THESIS.md`.

---

## TL;DR (the pattern in one paragraph)

A piece is made by an **autonomous artist agent** (Claude Opus 4.8, deep "thinking" on, high
effort) that paints on a **persistent, erasable canvas one gesture at a time**, and **sees its
own rendered work after every gesture** (vision-in-the-loop — never composes blind). It works
**coarse → fine through fixed phases** (shape → elements → refine → detail → polish → QA), and
an **independent art-director agent** (a separate, fresh-eyes model call) **gates each phase**,
can **recall** an earlier phase if drift appears, and holds a **96% bar** at QA. The whole run
executes **detached on the server** (no request timeout), is **checkpointed to disk** (so it
survives crashes and is **resumable**), and can be **paused / resumed / cancelled** mid-run. The
GUI **polls the job** and renders the canvas animating, a phase tracker, the artist's live
thinking, and a "studio feed" of the artist↔director conversation.

---

## 1. Agent topology (two roles, not one)

| Role | Model call | Job | Sees |
|---|---|---|---|
| **Artist (the hand)** | one ongoing multi-turn tool-use conversation | sets up the canvas, paints gestures, asks for review | its own rendered canvas (image) + the exact char-map, after every gesture |
| **Art Director (the eye)** | a **separate, stateless** model call per review | judges the current phase, approves / requests fixes / recalls | a fresh render of the current canvas only (no artist context) |

The split exists for ONE reason: **uncommitted perception.** The artist rationalizes its own
drift; a fresh critic doesn't. They do not share memory — only messages. (See the thesis's
single-vs-multi-agent section.)

---

## 2. The autonomous loop

```
start → SETUP (declare canvas size + palette)
      → for each PHASE in [shape, elements, refine, detail, polish, qa]:
           repeat:
             artist PAINTs a gesture  (a few cells; "." erases)         ← eyes-open
             server renders canvas → returns image + char-map to artist
           until artist calls REQUEST_REVIEW
           art director judges THIS phase →
             approved  → lock (provisional) + advance to next phase
             not approved → artist keeps fixing this phase
             RECALL → jump back to an earlier phase to fix a foundation
      → QA approved (96%+) → DONE
```

Key properties:
- **Eyes-open / gesture-based.** The atomic unit is a small *gesture* (a stroke / one feature's
  worth), not the whole image and not one cell. `"."` erases (pencil, not pen).
- **Phases are an ORDER, not locks.** Approvals are **provisional** — the canvas stays fully
  mutable; a later phase can **recall** an earlier one (e.g. "the body is mis-proportioned").
  This is liquid, diffusion-like convergence, not a one-way ratchet.
- **Steamroller polish.** POLISH and QA are reviewed as a methodical full sweep; approve only on
  a clean pass; any blemish restarts the sweep.
- **Safety rails.** A per-phase review cap (force-advance after N to avoid deadlock), a global
  review cap, and a max-gesture cap.

### Artist tools (Anthropic tool-use / function calling, JSON-schema args)
- `setup({ title, cols, rows, palette })` — once. `palette` = `{ "<char>": "#rrggbb" }`; `"."` = background.
- `paint({ note?, edits: [{ x, y, c }] })` — one gesture. `c` is a palette char or `"."` (erase).
- `request_review({})` — ask the art director to judge the current phase.

### Art-director output (structured output / JSON schema)
`{ approved: bool, issues: string[], recall: bool, recallPhase: string }`

---

## 3. Deep thinking (the quality lever)

Both agents run **Claude Opus 4.8** with:
- `thinking: { type: "adaptive" }` (extended reasoning, model decides depth),
- `output_config: { effort: "high" }` (max reasoning tier).

Reasoning *is* the craft — it is never throttled for speed (latency is solved by detached
execution + UI, not by dumbing down the model). Each gesture/review is a full high-effort call,
so runs take minutes (simple ~5–10 min; complex 48² ~20–40 min).

### I/O efficiency
The artist emits a **char-map** (1 char/cell, `"."`=empty), not verbose per-cell JSON — ~10×
cheaper and **legible** (the model and a human can read the grid as ASCII). The server expands
it to a dense frame. Prior renders are **pruned** from context (only the latest image kept) so
input tokens stay flat across a long run.

---

## 4. Lifecycle, persistence & control

- **Detached:** `POST` starts a background job and returns a `jobId` immediately; the cascade
  runs in the server process (no HTTP-request time limit). The client **polls** for status.
- **Statuses:** `running | paused | cancelled | done | error`.
- **Persistence:** the job is **checkpointed to disk on every event** → it survives server
  restarts and is **resumable**. (In-memory hot path + disk fallback; a DB layer can replace
  disk later.)
- **Resume:** re-seed a fresh job **from a saved frame** at a given phase — works even if the
  original run's context is gone (e.g. after a crash or payment failure). "Artist returns to an
  unfinished sculpture."
- **Pause / Cancel:** a control signal the loop checks **between gestures** (cannot interrupt an
  in-flight model call — takes effect at the next gesture, ~30s). Pause = checkpoint + stop
  (resumable). Cancel = stop.

---

## 5. API surface (`/api/live-art`)

**Start:** `POST { prompt, size, model }` → `{ jobId }`
**Resume:** `POST { resume: jobId }` *or* `POST { resumeFrame: PXSFrame, resumePhase }` → `{ jobId, resumed: true }`
**Control:** `POST { control: "pause" | "cancel", id }` → `{ ok, action }`
**Poll status:** `GET ?id=<jobId>` → the job (without the heavy `frames[]`; includes `latestFrame`)
**Full (history):** `GET ?id=<jobId>&full=1` → the job **with** `frames[]`

`size` ∈ 8–64 (16/24/32 are the sweet spot; 48/64 are slower/costlier). `model` defaults to
`claude-opus-4-8`.

---

## 6. Data model the GUI consumes

```ts
// What GET ?id returns (poll this ~every 2s while running)
interface LiveJob {
  id: string;
  prompt: string;
  size: number;
  model: string;
  status: 'running' | 'paused' | 'cancelled' | 'done' | 'error';
  phase: 'setup' | 'shape' | 'elements' | 'refine' | 'detail' | 'polish' | 'qa';
  gestures: number;             // count of strokes so far
  statusMessage: string;        // human one-liner ("Gesture 14 — REFINE: shading the wing")
  liveThinking: string;         // the artist's CURRENT streamed reasoning (rolling ~1.8k chars)
  feed: FeedItem[];             // the studio conversation timeline (see below)
  critiques: { phase, approved, issues: string[], recall?, recallPhase? }[];
  latestFrame?: PXSFrame;       // the CURRENT canvas — render this (animates as it changes)
  frame?: PXSFrame;             // the FINAL canvas (when done)
  title?: string; palette?: string[]; cells?: number; durationMs?: number; error?: string;
  startedAt: number; updatedAt: number;
}

interface FeedItem {
  kind: 'phase' | 'gesture' | 'review' | 'recall' | 'done';
  text: string;                 // e.g. "SHAPE — blocking in the silhouette", "shading the wing",
                                //      "shape approved ✓", "recall → shape: torso too small"
  gesture?: number; phase?: string; approved?: boolean;
}

interface PXSFrame { cols: number; rows: number; cells: { x; y; color: string; opacity: 1 }[]; }
// dense: exactly cols*rows cells, row-major, one solid lowercase-hex color per cell.
```

---

## 7. What the IDE GUI should render & control (the UI contract)

**Render (from each poll):**
- **Canvas** — paint `latestFrame` (1px/cell, nearest-neighbor upscaled, pixelated). It changes
  every poll → it *animates* as the artist works. Use `frames[]` (full) for scrub/replay.
- **Phase tracker** — the 6 phases; highlight `phase`; mark earlier ones done. (Recalls move it
  backward — show that.)
- **Live thinking** — stream `liveThinking` (the "watch it think" panel).
- **Studio feed** — render `feed[]` as a chat/timeline: phase markers, gesture notes (artist),
  and review verdicts (director, color by `approved`), recalls highlighted.
- **Status** — `statusMessage`, `gestures`, elapsed (`Date.now()-startedAt`), `status` badge.

**Control (POST):** Start (prompt/size/model) · **Pause / Resume / Cancel** · Save (persist
`latestFrame`/`frame`) · Resume-from-saved.

**UX principle:** always-moving — never a static spinner. The canvas animating + thinking
streaming + feed scrolling = the experience (and the value).

---

## 8. On MCP (honest)

**The current system does NOT use MCP.** It uses the **Anthropic Messages API** directly:
multi-turn **tool use** (function calling with JSON-schema args) for the artist, **vision**
(image blocks fed back in-loop), **structured outputs** for the director, **adaptive thinking +
effort** for depth, and a **custom detached job runner** for lifecycle/persistence.

**How MCP *would* map** if you go that route later: the artist's tools (`paint`, `render`,
`request_review`) become an **MCP server**; the art director can be an MCP tool or a sub-agent;
the job runner/persistence can sit behind MCP resources. MCP buys interop (any MCP-capable
client can drive the same tools) — but it is **orchestration around the same core**, not a
change to the loop. Don't let a GUI/LLM assume MCP is present; it isn't (yet).

**Hard capability requirements** for whatever model runs this (see `MODEL-REQUIREMENTS.md`):
vision input, real reasoning/effort, schema-constrained tool calls, **and the combination
multi-turn** (image fed back inside a tool loop). Missing any → it can't run the full loop.

---

## 9. Concepts applied (thesis → implementation)

| Concept | In this system |
|---|---|
| Reasoning > generation | char-map reasoning on a grid; never a one-shot image |
| Eyes-open (not blind) | render every gesture → feed image back → fix what it sees |
| Reasoning is the quality | Opus 4.8, adaptive thinking, `effort: high`, never throttled |
| Subtract machinery | no best-of-N, no upscaling, no exemplars; one loop |
| Keep-best / no regress | provisional approvals + recall; canvas always mutable |
| True fidelity | paint natively at target resolution |
| Immutable core, orchestrate around | detached runner, persistence, controls — core untouched |
| Latency is UX, not a quality knob | detached + poll + always-moving UI |
| Verify vs ground truth | the "child test"; QA at 96% by an independent eye |
