# Plan — Live Show v2: the real-time char-map + cleaner controls

> Brian's feedback after live testing: the char-map painting is "awesome and what I was looking for,"
> but it's **end-loaded** (you wait, then it shows the char-map, then quick-paints color). The target is
> the char-map **building in real-time the whole way** — grid → plotting chars → evolving → synced with
> the thinking. "We're missing the target, even bullseye on the potential — it can be so much better."

## Part A — the REAL-TIME char-map (the bullseye)

### Why it's end-loaded today
`callTurn` waits for `finalMessage()` (the model's COMPLETE output), then JSON-parses all the cells and
emits ONE `pass.delta` per pass. So cells appear in a burst at the end of each pass; during the (long)
thinking the grid just idles. The reveal is fast bursts separated by silent thinking gaps → feels like
"wait → char-map → color."

### The unlock — stream-parse the output (ONE call, no extra cost)
The model **writes the char-map cell-by-cell in its output stream**: `{"x":1,"y":2,"c":"b"},{"x":…},…`.
That JSON streams out token by token. Instead of waiting for the end, **incrementally parse the `edits`
array as it streams and emit each cell (or tiny batches) as `pass.delta` immediately** → the client
plots each cell LIVE, at the model's true writing speed. The model's output stream IS the char-map being
drawn. (This is NOT per-stroke API calls — it's one call whose *streaming output* we read live.)

**Implementation sketch (engine, `lib/live-jobs.ts` `callTurn`):**
- Today: `s.on('text', cap)` only feeds the thinking pane; cells come from `finalMessage()`.
- v2: accumulate the streaming output text; as complete `{"x":N,"y":N,"c":"…"}` objects appear inside
  `"edits":[`, emit them as incremental `pass.delta` (debounced into ~small batches for frame pacing).
- Keep `finalMessage()` + the full JSON.parse as the **source of truth** for the actual canvas (the live
  stream is display-only → LOW risk to art correctness; a parse hiccup only affects the animation).

### The journey it produces (the target)
1. **Grid forms** on `vision.committed` (real dims, a calm "ready" grid — NOT the idle rain).
2. **Thinking streams live** (the AI's visible planning — already streamed token-by-token).
3. **Char-map plots cell-by-cell** as the model writes the edits (real-time, writing order).
4. **Evolves each pass**; **color cascade** per-pass or at the end (TBD — test both).

### Honest limit (state it in the UI vibe, don't fight it)
The model THINKS first, then WRITES the cells — it can't draw a cell before deciding it. So "synced with
thinking" = thinking = the live MIND; the char-map = the live HAND that follows. Tightest possible in one
call. (True interleave would need per-cell calls = the per-stroke cost trap we killed — do NOT.)

### Pacing / polish
- Plot at the model's real arrival rate; add gentle easing so a fast burst still reads as "being drawn."
- Replace the idle green RAIN with a calm forming-grid state during thinking (rain felt like filler).
- The thinking pane is the star during think phases — make it prominent, auto-scrolling.

## Part B — cleaner keep/continue controls
Rename + behavior (`LiveArtisanPanel` + `live-art-store`):
- **Save** (was "Keep") — saves to the gallery (the only path that saves).
- **Another round** (was "Push back") — manual extra pass(es). **Optional note** = explicit feedback the
  AI folds in; **no note** = the AI does another self-evaluated pass. **Upticks the budget**: resume the
  job + extend `maxPasses` by N (e.g. +3), so "it hit 12, I want more → 15." Cost cap extends
  proportionally within the hard $30 ceiling.
- **Discard** — unchanged.
- Mechanism: today `reject(note)` already resumes + injects feedback; v2 = make a non-destructive
  "continue" that ALSO bumps `maxPasses` by N (with/without a note), and doesn't mark a rejection.

## Part C — incremental build (QUEUED experiment, quality-gated)
**Tested 2026-06-22 → REVERTED (quality dropped).** A "silhouette block-in" (lighter first pass → the
hot-potato loop builds it up in stages) was genuinely watchable (owl built silhouette → eyes/beak →
shading) AND cheap/fast (3 passes, $0.41/159s ≈ the 1-pass baseline). BUT the judge **converged early**
on a FLATTER result (no facial disc / cream belly / full shading vs the rich comprehensive baseline). Per
[[feedback_quality-is-the-product]] (quality is sacred), reverted immediately.

**The real target (next deliberate experiment): incremental build + judge pushes to FULL richness.** Keep
the staged build (watchable, cheap), but the judge must NOT approve until the piece reaches the brief's
full richness (silhouette → features → shading → facial disc → belly → details → *then* approve). Brian is
fine with the extra passes. **The catch:** pushing the judge stricter is exactly what reintroduces churn —
so tune carefully, TEST against the comprehensive baseline, and only ship if quality matches or beats it.
Comprehensive block-in stays the default until then.

## Build ownership
- **Part A (real-time char-map)** = ENGINE work (stream-parsing in `callTurn` + incremental `pass.delta`)
  → build carefully + tested (display-layer, so low art risk). The bullseye; highest value.
- **Part B (controls)** + broader UI cleanup = the **separate UI/UX focus** Brian wants (Claude Code
  driving, advisor on call). Spec above is build-ready.

*Related: docs/PIXCEL-LIVE-SSE.md (the event contract), docs/MATRIX-LIVE-SHOW.md (the original vision).*
