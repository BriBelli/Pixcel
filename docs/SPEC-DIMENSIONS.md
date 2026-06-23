# Spec — Dimensions: Aspect (canvas shape) vs Resolution (density)

> Fixes the recurring confusion: dimension controls are scattered across tabs and **conflate the canvas
> SHAPE with the pixel DENSITY**, and "Quality" is the wrong word for resolution. This is the canonical
> model for the whole app. Default behavior takes its cue from Photoshop's "new project" smarts.

## The model — TWO independent axes (NEVER conflate them)

### 1. ASPECT / canvas shape — the *frame's proportions*
- **Auto (DEFAULT)** — the **agent picks the best aspect for the subject** (a car → landscape, a tower →
  portrait, an owl → square). Like Photoshop inheriting the aspect from the clipboard: the user doesn't
  have to think about it. *(The engine already does this — VISION chooses cols/rows.)*
- **Portrait** (vertical) · **Landscape** (horizontal) · **Square** — one-tap **simplified presets**, an
  *optional* override for users who want to direct the shape.
- **Custom** — explicit W:H (advanced; rarely needed).

### 2. RESOLUTION / pixel density — how *chunky* it is (how many cells fill the frame)
- A separate slider/stepper from **low/retro → high**. This is the axis currently (badly) labeled
  **"Quality"** — rename it. Low density = chunky retro (the flagship look); higher = finer.
- Independent of aspect: a landscape can be low-density (chunky) OR high-density (fine).

**Together → cols×rows.** Aspect picks the shape; resolution picks how many cells fill it.

## The DEFAULT behavior (the whole point)
**If the user doesn't specify an aspect, the AGENT picks the best one.** Presets are an *optional*
override, not a required step. (On-line with "never override explicit user intent": Auto = the agent
decides; a preset/custom = the user decides, and the agent honors it.)

## Per surface (untangle the three tabs)
- **ART — the artisan agent (the main one):** replace the current `size buttons + Auto-size + manual W×H`
  with **Aspect** (Auto / Portrait / Landscape / Square / Custom) **+ Resolution** (the density control).
  Default = Auto aspect. This is the generation control that matters most.
- **IMAGE — upload → convert (a DIFFERENT path):** this rasterizes a photo into JSON (storage/digitize,
  NOT the artisan). Rename **"Quality" → "Resolution"**; `Photo / Vector` are *convert modes*; the
  Retro…8K + @1x/@2x/@3x are resolution/density. Keep the function, fix the names, and make clear this is
  the *convert* path, not art generation. (See the convert-vs-art line in [[feedback_low-res-moat-and-dims]].)
- **GRID — manual editor:** fixed-size presets for hand-drawing are fine; just align the labels (it's
  picking a canvas cols×rows directly).

## Naming cleanup (kill the confusion)
- ❌ "Quality" → ✅ **Resolution** (it's density, not quality).
- **Aspect** = the *shape*; **Resolution** = the *density*. Never one control for both.
- `Retro / Photo / Vector` = **convert modes** on the IMAGE tab only — not generation settings.

## Open — a CLEARER representation still needed (Brian, 2026-06-23)
Two things shipped on the ART panel: **Size + Shape are chip rows** (not dropdowns — chips read better
here), the **model label is just "Opus 4.8"** (the "· top craft (default)" was congesting noise), and the
**"Detail" complexity control was REMOVED** — its tiers (Simple/Moderate/Complex/Advanced) were dead,
meaningless dead-space; **no user knows which to pick, and Auto already nails it** (VISION estimates
complexity). Complexity is now always auto.

**But the underlying representation of Size / Resolution / Aspect is still not right.** The hard problem:
express **canvas SHAPE + a large/comfortable canvas WHILE retaining the chunky pixel resolution** in
controls a normal person groks instantly. What NOT to do: the other system's **"cells-per-pixel"** knob
(meaningless to humans). The "Detail" tiers were the same trap — abstract values nobody can rank. The
target is a representation that **resonates / maps to something common** (think Photoshop presets, or
named looks people recognize) — or it gets cut, like Detail did. **Find a better presentation BEFORE the
formal design review** — this is a product-feel problem, not just a layout one.

## One-line truth
*Aspect (Auto-by-agent, or Portrait/Landscape/Square/Custom) and Resolution (chunky→fine) are two
separate dials. Default: the agent picks the aspect; the user only touches it if they want to. And nothing
is ever called "Quality" — that word is a lie for "resolution."*
