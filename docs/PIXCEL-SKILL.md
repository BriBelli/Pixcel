# The Pixcel Skill — Pixel Art as Structured Reasoning

> **Portable & LLM-agnostic.** Paste this whole document into any chat (Claude, GPT, Grok,
> Gemini, …) or drop it into any repo as an agent skill. It is fully self-contained — it needs
> no tools, no images, no external files. It teaches a model to produce **Pixcel art**: small,
> iconic pixel art authored as *data*.
>
> Philosophy this comes from: pixel art at small sizes is a **structured-reasoning problem,
> not an image-generation problem.** You do not "render a picture" — you *reason about a grid*
> and place meaning cell by cell. Done this way, a text model with no image tools produces art
> that a 3-year-old can instantly name. Done the other way (one-shot "draw me X"), you get
> blobs.

---

## 1. What you are making

A **Pixcel piece** is a square grid of solid-color cells. Two representations:

**A. Char-map** (how you DESIGN and what you can SEE in a text chat):
- `cols` × `rows` (square, e.g. 16×16, 24×24, 32×32).
- A **palette**: each single character → one lowercase hex color. `.` is always background.
- A **grid**: one string per row, top to bottom; one character per column. Every row is exactly
  `cols` characters long.

**B. PXSFrame JSON** (the canonical data form, optional output):
```json
{
  "cols": 16, "rows": 16, "title": "Toadstool",
  "cells": [ { "x": 0, "y": 0, "color": "#0d1117", "opacity": 1 }, ... ]
}
```
Dense: exactly `cols*rows` cells, row-major (y outer, x inner), every cell present once.

You design in **A** and (if asked) expand to **B**. A char-map expands to a PXSFrame by reading
the grid: cell `(x,y)` gets `palette[grid[y][x]]`, and `.` / unmapped → background.

---

## 2. The hard rules (non-negotiable — this is what makes it valid art, not noise)

1. **Stay Pure** — exactly **one solid color per cell**. No gradients, no anti-aliasing, no
   blended edges, no "shading inside a pixel." One char = one flat color.
2. **Dense & rectangular** — every row is exactly `cols` chars; there are exactly `rows` rows.
   No ragged lines.
3. **Deliberate small palette** — 3–6 colors. A base color, a darker shade (shadow/outline),
   and a lighter shade (highlight) so shapes read as form, not a flat blob.
4. **Background** is `.` = `#0d1117` (dark) unless the subject truly needs another backdrop
   (e.g. sky). Lowercase hex only (`#rrggbb`).
5. **Complexity, not resolution, is the difficulty.** A 16×16 can be stunning; a 64×64 can be
   garbage. Spend the grid on *meaning*.

---

## 3. The Method — design by SUBTRACTION

1. **Identify the subject's identity cues.** Name the 3–6 features that make it *instantly*
   recognizable at this size (dog = floppy ears + muzzle + nose; race car = low wedge + wheels
   + spoiler; wizard = pointed hat + beard). If you can only keep a few pixels, which ones say
   "this is X"? Those.
2. **Budget the grid to those cues.** Exaggerate the recognition triggers. Place pixels
   *semantically* — the snout matters more than the cheek. Fill the canvas; don't float a tiny
   shape in dead space.
3. **Place** — draw the char-map. Silhouette first, then interior, then a shadow + highlight
   pass for volume.
4. **Validate** against the rules and the rubric below.

## The art-direction rubric (production-ready, not merely "correct")

- **IDENTITY first** — lead with the ONE silhouette/feature that names the subject. Get that
  before any detail.
- **FULL FIGURE** over a lonely face — if the subject has a body, draw the whole thing (head +
  body + limbs + tail), using the whole canvas.
- **EXPRESSION / life** (for characters) — eyes are usually 1–2px **dark** dots (not big light
  blobs), ideally with a 1px highlight; give a mouth, cheeks. Alive, not deadpan.
- **FORM** — base + darker shadow + lighter highlight, so it reads as volume.
- **CLEAN** — symmetric where the subject is symmetric; no stray/floating pixels; no muddy
  ambiguous shapes.
- **The ground-truth test:** *would a small child instantly name it?* If not, it failed.

---

## 4. How to actually work — the artisan loop (adapted for a text chat)

You have no render tool, so **your char-map IS your render** — read it back like ASCII art.

1. **Reason first.** Write a one-line plan: the subject's identity cues and your 3–6 color
   palette. (Think hard here — this is where quality is decided.)
2. **Draw** the full char-map.
3. **SEE it.** Re-read your grid *literally*, row by row, as if looking at the image. Squint:
   does the silhouette read as the subject? Are the eyes dark dots with a gap? Is it a flat
   blob or does it have shadow + highlight? Stray pixels? Ragged rows?
4. **Fix what you saw.** Redraw the weak parts. Don't settle for "fine."
5. **Repeat 3–4** until it genuinely passes the rubric and the child test.
6. **Output** the final piece (see §5). Only the final — not every draft.

Two principles that matter most (from the method that beat months of failed attempts):
- **Reason at full depth; never rush it.** The thinking *is* the craft.
- **Invent, don't imitate.** Do not copy a reference. Reason the subject out yourself — it
  yields more original, better art than mimicking an example.

---

## 5. Output contract

Produce, in this order:
1. **One sentence** describing the composition + palette.
2. The **char-map**: the palette legend, then the grid (fenced code block, monospace).
3. If asked for data: the **PXSFrame JSON**.

**Format example — STRUCTURE ONLY. Do not imitate this art; invent your own at full quality.**
A tiny 8×8 just to show the shape of the answer:
```
palette: { ".":"#0d1117", "r":"#e23b3b", "d":"#a82a2a" }
grid:
.  .  r  r  r  r  .  .   →  "..rrrr.."
.  r  r  r  r  r  r  .   →  ".rrrrrr."
r  r  d  r  r  d  r  r   →  "rrdrrdrr"
r  r  r  r  r  r  r  r   →  "rrrrrrrr"
r  r  r  r  r  r  r  r   →  "rrrrrrrr"
.  r  r  r  r  r  r  .   →  ".rrrrrr."
.  .  r  r  r  r  .  .   →  "..rrrr.."
.  .  .  r  r  .  .  .   →  "...rr..."
```
(That's the *format*. Your real piece is a deliberate, full-quality design of the requested
subject at the requested size.)

---

## 6. Self-check before you finalize

- [ ] Every row is exactly `cols` characters; exactly `rows` rows.
- [ ] One char = one flat color (Stay Pure). 3–6 colors total.
- [ ] The dominant silhouette reads as the subject (child test).
- [ ] Full figure, fills the canvas — not a tiny shape in dead space.
- [ ] Eyes are small dark dots (with a gap); there's a mouth/expression for characters.
- [ ] There's a shadow shade and a highlight shade (form, not a flat blob).
- [ ] No stray/floating pixels; symmetric where it should be.
- [ ] Lowercase hex; `.` for background.

---

## 7. Using this to evaluate or transfer

- **Benchmark another model:** paste §1–§6 and a prompt ("a 24×24 fox"). Score the result with
  §6 and the child test. A model that one-shots a blob is solving the wrong problem; a model
  that *reasons the grid and self-critiques* will produce real art.
- **As an agent skill:** save this file in the project and have the agent read/apply it. The
  hard rules + the artisan loop are the whole job.
- **Why it works** (the deeper lore): a model produces craft when it reasons at full depth,
  works at true fidelity, *perceives its own output and fixes it*, and invents instead of
  imitating. In a text chat, the char-map is how it perceives. That is the entire trick.
