# Pixcel — The Product Workflow (design brief for Claude)

> **Purpose.** This is the **end-to-end product workflow** for Pixcel Art Studio — the complete user
> journey, every state, decision, and transition — handed to **Claude (Design / Code)** to design the
> *entire* experience as a system, not as piecemeal control tweaks.
>
> **Division of labor:** the **intent, states, and semantics below are fixed** (they're the product).
> The **visual + interaction design is yours to craft** — layout, components, motion, naming polish, the
> IDE shell. Where something is unsolved, it's called out as an **OPEN design problem**.
>
> **Read first:** [`PIXCEL-PRODUCT.md`](PIXCEL-PRODUCT.md) (what the product IS + why). This doc is the
> **HOW the user moves through it.** *(The future platform/sister-merge is a separate direction —
> [`PLATFORM-MERGE-README.md`](PLATFORM-MERGE-README.md) — don't let it bleed into this build.)*

---

## 1. The workflow in one line
**Request → watch the autonomous artisan make it, live → keep / iterate / re-roll / edit → it's in your
assets.** A conversation with an artist, **not** a tool with buttons and sliders.

## 2. The mental model (A2UI — the thing to get right)
The user interfaces with an **autonomous artisan AGENT** through a **dynamic conversational UI** (A2UI —
the agent drives the experience). The user owns the **what** (the request, the taste, the final yes/no);
the agent owns the **how** (design, technique, iteration). So the UI is **the conversation + the window
into the agent's work** — not a control panel. Controls exist, but they are *optional refinements* around
the core loop, never the main event.

---

## 3. The workflow states (the spine)
Design each as a distinct, considered state. For each: *what the user sees · what they can do · where it
goes next.*

### A · Entry / empty
- **See:** the invitation ("Describe anything — a fox, a teapot, your logo…"), a few example prompts, the
  prompt input. Calm, inviting, zero clutter.
- **Do:** type a prompt (a single word like `owl` is enough, or a detailed brief) and send; optionally
  touch the refinements (§5). Click an example.
- **Next:** → **C (Generating)**.

### B · Composing the request *(folds into A; not a separate screen)*
- The prompt is the only required input. The **optional refinements** (Resolution, Aspect Ratio, Max
  revisions, Model) sit nearby, de-emphasized — a user never *has* to open them. Defaults are smart.

### C · Generating (live — the show)
The autonomous artisan works through the **Statue Method** (`THE-STATUE-METHOD.md`):
**VISION** (commit a design + palette) → **REFINE** (hot-potato passes: judge with fresh eyes, fix the
top flaw, keep the best) → done. Phases surface as **VISION → SHAPE → POLISH → QA**.
- **See:** the **live char-map** — cells plot onto the grid *as the agent writes them*, then resolve to
  color; a **THINKING** stream (the agent's live reasoning); the phase progress; elapsed + cost.
- **Do:** **send live feedback any time** (e.g. *"make two tentacles into arms"*) — it folds into the
  next pass. **Pause / Cancel.** It runs in the background (minutes).
- **Honest limit to design around:** within a pass the model **thinks fully, then writes** — so the
  THINKING pane leads and the grid fills after. The thinking pane IS the show during the think; don't let
  the grid read as "stuck." *(detail: `PLAN-LIVE-SHOW-V2.md`)*
- **Next:** → **D (Review)** when the artist says it's done.

### D · Review — the honesty gate *(the heart of the loop)*
The artist proposes; **the user disposes.** Nothing is saved until the user says so.
- **See:** the **RESOLVED** piece, its stats (passes · cost · cells), and the four actions.
- **Do — the four verbs (fixed semantics, §5):**
  - **Save** → into the user's art assets (gallery); re-openable to edit.
  - **Iterate** → refine **THIS** piece further (more revisions; optional steering note).
  - **Redo** → discard, **fresh re-roll** of the same prompt (a *new* design — variance curation).
  - **Cancel** → discard, stop.
  - **Chat while reviewing = refine THIS piece** (a typed note → Iterate-with-note), *not* a new piece.
- **Next:** Save → **F**; Iterate → **C** (resumes at POLISH from this frame); Redo → **C** (fresh);
  Cancel → **A**; Load to edit → **E**.

### E · Editing (manual)
- **See / Do:** the piece on the editable canvas with **paint tools** (brush, eraser, fill, color,
  select), undo/redo, zoom/pan. The autonomous flow is the default; this is the manual override for
  pixel-level control — *best of both worlds.*
- **OPEN problem:** today the canvas IS paintable (`B` brush key + a tiny color swatch + Cmd+Z) but the
  tools are **not surfaced** — a saved piece looks un-editable. **Design a clear, prominent editor
  toolbar** so "Save → load → edit" is obvious. (Capability exists: `GridCanvas` API, `selectedColor`.)
- **Next:** Save → **F**.

### F · Saved / Gallery (the art assets)
- **See:** the user's pieces + built-in heroes, with thumbnails, hearts (favorites), delete; the curated
  **bar references** (`Owl (Bar)`, `Dragon (Bar)`, `T-Rex (Bar)`) — *the quality north star.*
- **Do:** click any piece → loads on the canvas → continue editing (**E**) or use as a base.
- **Next:** → **E** (edit) or **A** (new piece).

---

## 4. The state map (transitions)
```
 A entry ──prompt──▶ C generating ──artist done──▶ D review ──Save──▶ F gallery
   ▲                    ▲   ▲                          │  │  │            │
   │                    │   └────Iterate (refine)──────┘  │  │            │
   │                    └────────Redo (fresh re-roll)─────┘  │            │
   └────Cancel──────────────────────────────────────────────┘            │
                          E editing ◀──Load to edit──(D or F)─────────────┘
   live feedback ⟲ during C   ·   chat during D = refine THIS piece
```

## 5. The vocabulary — controls & actions (fixed meanings; design the form)
**Refinements (optional, smart defaults):**
- **Resolution** — pixel count / chunkiness (16·24·32·48·64; default 32). *Not* a zoom.
- **Aspect Ratio** — canvas proportions; **Auto** default (the agent picks the best shape), or
  Landscape / Portrait / Square / Custom (Custom = exact W×H). Independent of Resolution.
- **Max revisions** — the hidden refine-pass ceiling (cost seatbelt; the agent stops on *quality*, never
  to fill it). Default auto.
- **Model** — Opus 4.8 default.
- **OPEN problem:** the Resolution / Aspect representation still needs a model that *resonates* with
  normal people (not "cells-per-pixel," not abstract tiers). See `SPEC-DIMENSIONS.md`.

**Actions:** **Save** (commit to assets) · **Iterate** (refine this) · **Redo** (re-roll fresh) ·
**Cancel** (discard) · **Load to edit** (→ manual) · **live feedback** (steer mid-run).

## 6. Realities to design around (don't fight these)
- **Quality is the product; the live show is icing.** Never let presentation imply we'd trade output
  quality for watchability. *(memory: quality-is-the-product)*
- **Variance is real.** No-exemplar reasoning means a *range* of outcomes per run (that's also why the
  art isn't homogenized). The user **curates** (Redo to re-roll, Iterate to push). Tightening the *floor*
  is the **engine's** job (the judge-strictness work), not the UI's — but the UI should make curation
  effortless (Redo/Iterate front-and-center).
- **The bar exists and is saved** — the `(Bar)` built-ins are the quality reference; surface them as the
  standard.

## 7. Design principles (carry into every screen)
1. **A2UI** — the agent drives; the UI is conversation + a window into the work, not a slider panel.
2. **Watchable** — the *making* is part of the product; the live show is a first-class surface.
3. **IDE feel** — left rail (surfaces + gallery/explorer), center (canvas / live stage / editor), right
   rail (the AI agent panel). VS Code / Cursor energy.
4. **Commission, watch, direct** — like working with a real artist, never "operating a tool."
5. **The moat is reasoned low-res** — keep the art crisp + authentic; never let it read as downsampled.

## 8. OPEN design problems (the real work for Claude)
1. **Resolution / Aspect representation** — a model people grok instantly (§5, `SPEC-DIMENSIONS.md`).
2. **Editor tools** — surface a prominent paint palette so editing is discoverable (state **E**).
3. **New-generation hygiene** — starting a fresh piece must (a) clearly **log the user's prompt** in the
   conversation and (b) **reset the canvas** (don't render the new piece over the previous one).
4. **The IDE shell** — the overall layout, navigation, and how the conversation + live stage + gallery +
   editor coexist.
5. **Multi-image output (future)** — generate N attempts → pick the best (variance-as-a-feature); a
   sister-product bring-over, design later.

## 9. Pointers
- **Product / IP:** `PIXCEL-PRODUCT.md` · **dimensions:** `SPEC-DIMENSIONS.md`
- **The engine (how the artist works):** `THE-STATUE-METHOD.md`, `lib/live-jobs.ts`
- **The live show:** `PIXCEL-LIVE-SSE.md` (event contract), `MATRIX-LIVE-SHOW.md`, `PLAN-LIVE-SHOW-V2.md`
- **Quality (why the floor varies + the fix):** `PLAN-QUALITY-ENGINE.md`
- **Future platform / sister merge:** `PLATFORM-MERGE-README.md`

## 10. The one-line truth
*Pixcel's workflow is: commission an autonomous artisan by talking to it, watch it design + paint + refine
in real time, then keep / iterate / re-roll / edit until it's right — and design the whole thing as a
conversation with an artist, not a panel of controls.*
