# Pixcel Craft Rubric

The standard a piece must meet before it ships. These are **principles to REASON FROM** — not a
checklist to mechanically tick, and never examples to copy. The harsh-critique perception loop
(see docs/AGENTIC-ARTISAN-THESIS.md) judges each rendered draft against this rubric and keeps
fixing until it genuinely cannot find a real flaw.

Source of truth for the generator's system prompt and the `/pixcel-art` skill.

---

## 0. THE MOST CRITICAL DECISION — fit the design to the size

Made *before a single pixel*. This strategic framing choice is the highest-leverage creative act,
and the real artistry.

- **Complexity is a budget set by the grid size, not the resolution.** Decide what to depict and
  how to frame it so it READS at *this* size.
- **16²** → a bold, iconic framing: a strong crop, a simple pose, the single most
  identity-bearing view. Subtract relentlessly.
- **32²** → the full figure with real form (head + body + limbs + tail), like a character sprite.
- **48²+** → you can afford finer detail or a small scene.
- **Match subject scale to canvas.** Don't cram a complex scene into 16². Don't float one small
  element in a big 48². The fit decision is *the* decision — get it right and the rest follows;
  get it wrong and no amount of polishing saves it.

## 1. Use the whole canvas — deliberately

- **Fill the frame.** The subject occupies the canvas with intent — no large dead zones, nothing
  floating off in a corner.
- **Center / balance.** Align the subject deliberately (centered, or balanced asymmetry) — never
  accidentally off-center. Lopsided empty space reads as a mistake; balanced margin reads as
  intent.
- **Fill ≠ distort.** Reach the edges by choosing the right framing / pose / scale, then composing
  it to sit well — NEVER by stretching or warping true proportions.

## 2. Readability (the squint test)

- **Silhouette first.** The outline alone should name the subject.
- **Squint test.** With eyes half-closed, a few large light/dark masses must still read as the
  subject.
- **Exaggerate the identity feature** — the one cue that names it (a Lambo = a low sharp wedge; a
  creature = *big head reads as character*).
- **Deliberate limited palette** — a base color + one darker shade (shadow/outline) + one lighter
  shade (highlight), so shapes read at small sizes.
- **Form, not a flat blob** — build volume with solid-color shading; add depth by shadowing the
  far element (e.g. the far leg).
- **Directional light, NEVER a flat mirror.** Even a symmetric subject is lit from ONE direction —
  one side catches more light, the other falls into shadow. That asymmetric lighting *is* the form,
  depth, and life (the 3D-esque feel). Keep the STRUCTURE symmetric where the subject is (both
  eyes/headlights the same size + place), but reason the SHADING raw and directional. **NEVER perfectly
  mirror the two halves** — a perfect mirror is flat and dead and throws away the unique shadows /
  highlights that make it real. The art is RAW, not a mirror trick. (Engine guardrail: do NOT give the
  artist an auto-mirror/symmetrize tool — it would reach for it every time and homogenize the work.)
- **Clean** — no jaggies, no stray/floating cells; symmetric where the subject is symmetric.

## 3. Forbidden (incompatible with Stay Pure + hardware targets like LED displays)

- **No anti-aliasing, no dithering, no hue-shift gradients.** One solid color per cell, full
  opacity. (Generic pixel-art tutorials teach these for high-color illustration — they are WRONG
  for Pixcel's data model.)
- **No exemplar sprites to copy.** Example artifacts anchor the model and collapse diversity into
  small variations of one concept. Reason from these principles and *invent*.
  - *This bans exemplars fed to the **generator** — not user input. An input image may be the
    **subject** the artist interprets (the VISION step reads it → an original design), or be
    **mechanically digitized** to a PXSFrame (`ImageHelpers.loadImage`, no LLM). It must never be
    **style the drawer copies.** An image defines WHAT to depict or is faithfully converted — never
    HOW to draw.*

---

### Why principles, not examples or tutorials

Research and our own A/B agree: *example artifacts* homogenize output (anchoring); *craft
principles* act as scaffolding that raises quality without capping the ceiling. And most "pixel-art
best practice" (AA, dithering, hue-shifting, sub-pixel) is rendering technique for a *different*
medium — it would teach the model to fight Pixcel's pure, limited-palette, hardware-display model.
So: import the readability/composition principles, forbid the soft-edge/multi-color techniques,
and never feed example sprites.
