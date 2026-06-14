# Pixcel AI Gallery — in-app generation pipeline

The **Pixcel AI** panel (right side of the Studio) reproduces the Claude-Code-style
generation experience: type a prompt, watch the design stream, get a validated `PXSFrame`
rendered on the canvas and saved to the **Art** gallery. It runs the
[Pixcel Method](PIXCEL-METHOD.md) server-side.

## Architecture: anchored progressive refinement

The pipeline is an **open agentic OODA loop** (draw → render → SEE via vision → judge →
fix → repeat), arranged as a **coarse-to-fine cascade** so identity is locked cheaply before
detail is added:

```
32² request:
  1. FOUNDATION (16²)  — best-of-N: explore N artist loops, an art director picks the
     strongest (most recognizable / crispest). Cheap to iterate → identity nailed reliably.
  2. ANCHOR + UPSCALE  — 2× nearest-neighbor upscale (upscale2x). The foundation's
     silhouette / feature positions / palette become FROZEN anchors.
  3. REFINE (32²)      — an anchored artist loop: the model sees the blocky upscale, is told
     the anchors are locked, and may only ADD detail within them (smooth edges, highlights,
     sub-features). It cannot relocate/remove features → it can't regress, only improve.

16²/24² request: a single best-of-N artist loop at that size (no upscale step).
```

Why this shape (see the conversation that produced it): a *free* high-res generation can
wander (turn a cat into a dog, drop the ears). Freezing identity at the low-res stage and
only varying *detail* at high-res collapses the part that goes wrong → **reliability by
construction**, plus crispness from the dedicated detail pass. Key knobs:
`FOUNDATION_CANDIDATES`, `FOUNDATION_DRAFTS`, `REFINE_DRAFTS` in `route.ts`.

## Flow (single artist loop)

```
AiChatPanel (client)
  │  POST /api/generate-art   { prompt, size, model }
  ▼
src/app/api/generate-art/route.ts   (Node runtime, holds ANTHROPIC_API_KEY)
  │
  │ Phase 1 — DESIGN (streamed)
  │   client.messages.stream(): system prompt = the method.
  │   Model emits a short plan + ASCII char-map. Tokens stream back as
  │   { type: 'plan_delta', text } events.
  │
  │ Phase 2 — SERIALIZE (structured output)
  │   client.messages.create({ output_config: { format: { type:'json_schema',
  │   schema: PXS_FRAME_SCHEMA } } }) — given the char-map, emit the dense PXSFrame.
  │
  │ Phase 3 — VALIDATE — validateFrame(frame)
  │   cells===cols*rows, no dups/gaps, lowercase hex, opacity 1.
  │   On failure: re-prompt Phase 2 with the exact errors, retry up to 2x.
  │
  │ Phase 4 — VISION CRITIQUE → REVISE  (the "blindfold-off" loop)
  │   render the frame to a real PNG (src/lib/render-frame.ts) and SHOW it to the model
  │   via vision. An art-director pass judges it against the rubric (identity / use of
  │   space / expression / form / cleanliness) → { approved, issues }. If not approved,
  │   the model SEES the same render + the issues and returns a revised PXSFrame. Loop up
  │   to MAX_CRITIQUE_ROUNDS. This is what prior attempts missed: the model reviews with
  │   eyes, not by reading coordinates — the blindfold stays off through the fix.
  │
  ▼ streams newline-delimited JSON events:
     { type:'status',    phase, message }
     { type:'plan_delta', text }
     { type:'iteration',  n, frame }            // a draft about to be reviewed
     { type:'critique',   n, approved, issues } // the art director's verdict
     { type:'frame',      frame, title, palette, cells, model, durationMs, warning? }
     { type:'error',      message }
```

The first two calls mirror the method's two phases: streaming the **design** gives the live
"watch it think" feel; the **serialize** call is deterministic structured output. Phase 4
is the difference-maker — the model **looks at the rendered result and fixes what it sees**,
which is how the in-app generator approaches hand-authored quality. The client renders each
`iteration` draft + its `critique` as a live "review trail," so the user watches the
look-and-fix happen.

**Latency note:** Phase 4 adds a vision call (+ a full re-serialize per revision), so big
(32²) pieces can run several minutes. `maxDuration` is set high; the design phase uses
`medium` effort at ≥24² to compensate.

## Key modules

| File | Role |
|---|---|
| `src/lib/pxs-frame-schema.ts` | `PXS_FRAME_SCHEMA` (JSON schema for structured output) + `validateFrame()` (the method's checklist). Importable by the route, scripts, tests. |
| `src/lib/ai-art-system-prompt.ts` | The method encoded as a system prompt (`designSystemPrompt`, `serializeSystemPrompt`). Derived from [PIXCEL-METHOD.md](PIXCEL-METHOD.md). |
| `src/app/api/generate-art/route.ts` | The pipeline above. `export const runtime = 'nodejs'`. |
| `src/components/AiChatPanel.tsx` | Right-side chat UI. Reads the stream, renders the design + preview, loads the frame via `applyGalleryFrame`, saves via the gallery store. |
| `src/components/FramePreview.tsx` | Small canvas that paints a `PXSFrame` scaled-to-fit (chat cards + gallery thumbnails). |
| `src/store/gallery-store.ts` | Local-first persisted store: `userPieces`, `favorites`, `hidden` + actions. |

## Persistence (local-first)

Generated pieces and heart/delete state live in `localStorage` under `pxs-ai-gallery`
(Zustand `persist`). Frames are small (16–32px); no backend required. The store is shaped
so a DynamoDB sync hook can be added later without changing the UI (see *Future*).

The **Art** tab merges built-in `GALLERY_ENTRIES` with `userPieces`, hides `hidden` ids,
and sorts `favorites` first. Deleting a *user* piece removes it; "deleting" a *built-in*
hides it (seeds are never destroyed).

## Setup

```bash
# packages/pxs-studio/.env.local
ANTHROPIC_API_KEY=sk-ant-...
```

The route returns a clear 500 if the key is missing. Default model is `claude-opus-4-8`
(streaming hides latency); the panel can request another model per message.

## Extending

- **New default size / palette:** edit `ai-art-system-prompt.ts`.
- **Tighter validation:** edit `validateFrame()` in `pxs-frame-schema.ts` (single source).
- **DynamoDB sync (future):** add a sync effect in `gallery-store.ts` that mirrors
  `addPiece`/`deletePiece` to an API route; the UI is already decoupled from storage.
- **Edit-in-chat ("add sunglasses"):** the card UI leaves room to send the current frame
  back as context for a follow-up generation.
