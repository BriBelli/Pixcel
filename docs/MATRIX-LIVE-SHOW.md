# The Matrix Live Show — ideas for the watchable artisan experience

> Brian's vision: *"show the char-map generating left-to-right from ground zero, Matrix-style,
> evolving into the final art — an epic display."* This is the **gold** of Pixcel Live. Here are my
> ideas, grounded in how the engine actually works (driven by the real SSE stream in
> [PIXCEL-LIVE-SSE.md](PIXCEL-LIVE-SSE.md) — **never** synthetic tweening).

## The core motif: code → art
The art *is* a **color-key grid** (the char-map: `b`→brown, `w`→white…). That's the Matrix conceit
made literal: **the glyphs are the "code," and they resolve into the picture.** The screen starts as
raining/flickering color-key characters on the dark canvas (`#0d1117`), and as the model emits each
cell (`pass.delta`), that cell **locks** from a flickering glyph into its solid color — the code
crystallizing into art, exactly as the AI writes it.

## Five concrete directions (compose freely)

**1. Glyph-rain → lock (the literal Matrix).** Every not-yet-painted cell shows a fast-cycling random
palette glyph (green-tinted, Matrix-style, or in the piece's own palette). Each `pass.delta` cell
*locks*: glyph → its real color, with a brief flash. The reveal order is the model's *actual* writing
order, so it reads as the AI "typing" the image into existence. Ground zero (all rain) → final art.

**2. Phase-staged reveal (the build arc).** The visual mode shifts with `stage.enter`:
- **VISION** — the committed brief types out (a flash of *intent*) over the dark canvas.
- **SHAPE** — big blocky masses rain/lock in fast; the silhouette emerges.
- **POLISH** — the silhouette *freezes*; detail glyphs crystallize *inward* (eyes, texture) on top.
- **QA** — a single bright **scan-line sweeps** top→bottom-left→right (the steamroller), confirming.
- **DONE** — a settle/bloom; the piece sits, clean.
The phase transitions are the *beats* — each feels different, so the viewer feels the sculpture forming.

**3. The art director as a character (the drama).** `audit.verdict` is the tension. On a reject, the
flagged regions pulse red with the art director's note ("owl floats — add a perch"); the drawer
"responds" and the fix locks in; on approve, a green ✓ + a lock-click. The *back-and-forth* is the
story — it's not a loading bar, it's a craftsman being critiqued and answering.

**4. Split stage — the easel + the mind.** Canvas center (the reveal); a side rail streaming the
**artist's thoughts** (`thinking.delta`) and the **brief**; a bottom **critique feed**
(`audit.verdict` notes) + a live **cost/phase** chip. The viewer watches *what* and *why* at once —
that's the "real artist at work" feeling.

**5. Scanline / CRT skin (optional flavor).** A subtle CRT/scanline + glow over the grid sells the
"generating in real time" vibe; the locking cells get a 1-frame highlight. Keep it tasteful — the art
is the star.

## Non-negotiable: it's REAL, not faked
The reveal is **driven entirely by `pass.delta`** (the model's actual cell stream) — *no synthetic
diff-tweening*. The "rain" is just the placeholder for *not-yet-emitted* cells; the *locking* is the
real generation. This is the difference between an honest "watch the AI paint" and a fake animation —
and it's cheap (pure client-side rendering off the stream, **zero extra API cost**).

## Feasibility notes (for the UI)
- Render the grid on a **canvas/WebGL** overlay (32² = 1024 cells, trivial); the rain is a per-cell
  glyph cycle until that cell's `pass.delta` arrives, then lock to color.
- Drive off the **one reducer** in [PIXCEL-LIVE-SSE.md](PIXCEL-LIVE-SSE.md); reconcile to
  `pass.done.frame` per pass so a reconnect resyncs cleanly.
- **Small grids reveal fast** (a 32² SHAPE pass is ~hundreds of cells in seconds) — so lean on the
  *thinking stream* + the *critique drama* + the *phase beats* to give the show duration and meaning,
  not just raw speed. Pacing/easing on the lock animation makes a fast stream feel deliberate.
- Higher-res / controlled-passes modes (future) give longer, richer shows — the same machinery scales.

## The one-liner
**Ground zero of raining color-keys → the AI types the masses in → the shape locks → details
crystallize inward → a scan-line QA sweep → the finished piece blooms.** All from the real stream.
