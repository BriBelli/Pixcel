# Pixcel AI Gallery — in-app generation pipeline

The **Pixcel AI** panel (right side of the Studio) brings the Claude-Code generation
experience into the app: describe a piece, watch it think and draw, and get a validated
`PXSFrame` saved to the **Art** gallery. It is the [Agentic Artisan thesis](AGENTIC-ARTISAN-THESIS.md)
applied to pixel art (and runs the [Pixcel Method](PIXCEL-METHOD.md) for the art rules).

> This pipeline replaced an earlier two-phase (design → serialize → blind critique → revise)
> and a coarse-to-fine "anchored cascade" approach. Both were removed — they added brittleness
> without quality. See the thesis doc for *why*. What's documented below is the current,
> deliberately small core.

## The core: one autonomous artisan loop

```
reason (max effort) → draw at the TRUE resolution → render to a real PNG
→ SEE it via vision → judge against the bar → fix what it saw → keep the BEST draft
↑________________________ repeat until the model says it's done __________________________↑
```

No exemplars, no coarse foundation, no upscaling, no best-of-N. Pure max reasoning + a
perception loop. This is the immutable core (`route.ts`); everything else is orchestration
around it.

Key properties (and the thesis principle each embodies):
- **Max reasoning** — Opus 4.8 `high` effort + adaptive thinking. *(reasoning is the quality)*
- **Perception, not introspection** — each draft is rendered to a PNG and shown back to the
  model **as an image**; it critiques with its eyes. *(blindfold off)*
- **True fidelity** — designs natively at the requested size (16²–64²), never a downscaled
  proxy. *(true fidelity)*
- **Keep-best** — every valid draft is kept; a vision judge ships the best, never blindly the
  last, so a regressing refine can't be shipped. *(keep-best, never regress)*
- **Compact char-map I/O** — the model submits a char-map (1 char/cell, `.` = background), not
  verbose per-cell JSON; the server expands it to a dense `PXSFrame`. ~10× lighter, ~4×
  faster, and what unlocks 48²/64². *(strip redundant representations)*

## Flow

```
AiChatPanel (client)
  │  start() → gen-jobs-store (async, runs in the background)
  │  POST /api/generate-art   { prompt, size, model }
  ▼
src/app/api/generate-art/route.ts   (Node runtime, holds ANTHROPIC_API_KEY)
  │
  │  artistLoop():  for each draft —
  │    • client.messages.stream() with the artist system prompt, submit_art tool
  │      (input = CHARMAP_SCHEMA), thinking adaptive, output_config.effort = high
  │    • validateCharMap() the tool input → on failure, re-prompt with exact errors
  │    • charMapToFrame() → dense PXSFrame
  │    • render to PNG (render-frame.ts) and feed it BACK to the model as an image
  │    • the model judges with its eyes and either submits an improved draft or says DONE
  │  judgeBest():  a vision art-director picks the strongest draft (keep-best)
  │
  ▼ streams newline-delimited JSON events:
     { type:'status',     phase, message }
     { type:'plan_delta', text }                 // streamed reasoning/design
     { type:'iteration',  n, frame }             // a draft (dense, expanded)
     { type:'frame',      frame, title, palette, cells, model, durationMs, warning? }
     { type:'error',      message }
```

## Async generation (orchestration around the core)

Generation takes minutes (you can't rush art), so it runs **off the request/UI critical
path**:

- `store/gen-jobs-store.ts` — a module-level store that owns each job's lifecycle independent
  of the panel. `start()` returns immediately; events stream into job state; on completion the
  piece is added to the persisted gallery + a toast fires.
- The panel is a **view** over that store: start a piece, then close the panel / switch tabs /
  keep editing / run several at once. The header `✦ AI` button shows a live running count.
- **Limitation:** in-flight jobs don't survive a full page reload (they live in the browser);
  finished pieces do (persisted gallery). True reload-survival → a server-side job queue
  (future; natural home for DynamoDB).

## Key modules

| File | Role |
|---|---|
| `src/app/api/generate-art/route.ts` | The artist loop + keep-best. `runtime='nodejs'`, `maxDuration` high. The immutable core. |
| `src/lib/pxs-frame-schema.ts` | `CHARMAP_SCHEMA` + `validateCharMap()` + `charMapToFrame()` (compact I/O), and `validateFrame()` (the dense Pixcel Method checklist). Single source. |
| `src/lib/ai-art-system-prompt.ts` | The method + rubric as the artist system prompt. No exemplar images (principle 5); the char-map reference in-prompt is a *format* guide, not an output to copy. |
| `src/lib/render-frame.ts` / `png-encode.ts` | Rasterize a `PXSFrame` to a base64 PNG so the model can SEE its work. |
| `src/store/gen-jobs-store.ts` | Async job lifecycle (runs around the core). |
| `src/components/AiChatPanel.tsx` | Right-side panel; a view over the job store. |
| `src/components/FramePreview.tsx` | Canvas that paints a `PXSFrame` scaled-to-fit (chat + gallery thumbnails). |
| `src/store/gallery-store.ts` | Local-first persisted gallery: `userPieces`, `favorites`, `hidden`. |

## Resolutions

16² / 24² / 32² are the sweet spot (fully refined, fast). 48² is the practical fully-refined
ceiling today. 64² is reachable (the char-map makes it fit the token budget) but the full
refine loop can exceed the request time limit — true refined 64²+ wants the server-side job
queue (no request-duration cap).

## Setup

```bash
# packages/pxs-studio/.env.local
ANTHROPIC_API_KEY=sk-ant-...
```

The route returns a clear 500 if the key is missing. Default model `claude-opus-4-8`; the
panel can request another model per message.

## Extending

- **Art rules / palette:** edit `ai-art-system-prompt.ts` (rubric/principles, *not* example
  outputs to imitate).
- **Validation:** edit `validateCharMap()` / `validateFrame()` in `pxs-frame-schema.ts`.
- **Higher res / reload-survival / DynamoDB:** add a **server-side job queue** around the core
  (the core itself stays untouched — that's the rule).
