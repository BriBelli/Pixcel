# The Pixcel Method (the "gospel")

> Small pixel art is a **structured-data problem, not an image-generation problem.**
> This document is the canonical source of truth for how Pixcel generates art. Both the
> in-app generator ([AI-GALLERY.md](AI-GALLERY.md)) and the `/pixcel-art` authoring skill
> derive from it.

## The core insight: complexity, not resolution

The dial that determines whether AI-made pixel art looks good is **structural
complexity**, not pixel count.

- A 16×16 dog (256 cells) and a 128×128 smiley (16,384 cells) both work — the smiley is
  *big but simple* (mostly uniform fills).
- A photorealistic car at the same resolution fails — it is *similar size but mostly
  unique, interdependent color decisions*, plus gradients and reflections.

Two consequences:

1. **Big ≠ hard.** Uniform-region art scales to thousands of cells. High-information art
   does not, no matter the resolution.
2. **"Stay Pure" (one flat color per cell) is a feature, not a limit** — it *is* the
   pixel-art aesthetic. It also keeps output valid for hardware targets (LED displays).

## Why this beats quantize / one-shot

The common failure modes — and why they produce mush:

- **Quantize a generated raster.** Naive downscaling averages every pixel equally. It has
  no notion of "this feature must survive," so the dog's snout dies with everything else.
- **One-shot dump cells.** Asking a model for raw pixels with no design step drifts —
  miscounts, lost silhouette, no deliberate feature budget.

Neither *decides* anything. The method below makes the model decide.

## The method: design → budget → place → validate

1. **Design before placement.** Sketch a **char-map** first — one row per `y`, one
   character per `x` — and treat it as the design surface. This is where the silhouette is
   reasoned out, cheaply, before any JSON exists.
2. **Budget features.** At the target size, ask *which features must survive* and spend
   pixels on them. Exaggerate the few cues that trigger recognition (floppy ears + cream
   muzzle + nose = "dog"). Low-res pixel art is **subtraction done well**.
3. **Place semantically.** Knowing it's a dog, place pixels to fire that recognition —
   snout over cheek. A quantizer can't prioritize because it doesn't understand the subject.
4. **Validate.** Every frame must be **dense** and **pure** (see checklist). Catch drift
   mechanically, then regenerate against the specific errors.

None of this needs a bigger model. It's framing, not capability.

## The data model

```
PXSFrame = { cols, rows, cells: PXSCell[], metadata? }
PXSCell  = { x, y, color, opacity }   // color "#rrggbb" lowercase; opacity 1
```

- **Dense**: every cell present exactly once, including background. 16×16 → 256 cells;
  32×32 → 1024.
- **Row-major**: `y` outer, `x` inner — `(0,0),(1,0)…(cols-1,0),(0,1)…`.
- **Pure**: exactly one solid color per cell. No gradients, no multi-color cells.

## Palette conventions

- Background: `#0d1117` (the studio's dark canvas) for empty cells, unless the subject
  needs otherwise (e.g. a sunset scene).
- Optional grounding shadow one shade up: `#161b22`.
- Pick a deliberate 3–6 color palette. Give shapes a base color + one darker shade for
  shadow/outline so they read at small sizes. Lowercase hex.

## Validation checklist (what `validateFrame` enforces)

- `cells.length === cols * rows`
- no duplicate `(x,y)`, no missing `(x,y)`
- every `color` matches `^#[0-9a-f]{6}$`
- every `opacity === 1` (Stay Pure)
- `cols`/`rows` within sane bounds (8–64 for hand/AI composition)

## Two paths (pick by the subject)

| Path | Use for | Tool |
|---|---|---|
| **Hand-compose** (model authors cells via this method) | original, small, iconic, flat — dog, mushroom, logo, smiley | the in-app generator + `/pixcel-art` skill |
| **Image-import quantizer** | photographic / high-detail *from a reference* — the Lamborghini | `ImageHelpers.loadImage()` → `image.worker` → WASM (already in the repo) |

The trap is asking the hand-compose path to do the quantizer's job. Match the path to the
subject.
