---
name: pixcel
description: >-
  Generate Pixcel pixel art — small, iconic pixel art authored as data (a char-map / PXSFrame),
  by REASONING about a grid, not by image generation. Use when asked to "make/draw a <subject>
  at NxN", produce pixel art, or benchmark a model's pixel-art ability. Works with no tools
  (the char-map is both the canvas and the way you "see" your work). Portable across projects
  and LLMs.
---

# Pixcel — pixel art as structured reasoning

The complete, self-contained spec is **[docs/PIXCEL-SKILL.md](../../../docs/PIXCEL-SKILL.md)** —
read it and follow it. (That file is also the paste-anywhere artifact for other LLMs/projects;
it needs no tools and no repo access.) The essentials:

- **It's reasoning, not generation.** Reason about a grid and place meaning cell by cell.
- **Design in a char-map:** `cols`×`rows`, a palette (single char → lowercase hex, `.` =
  background `#0d1117`), and a grid of equal-length row strings. Expand to a dense `PXSFrame`
  (`{cols,rows,cells:[{x,y,color,opacity:1}]}`) only if data output is requested.
- **Hard rules:** Stay Pure (one flat color per cell), dense + rectangular, 3–6 color palette
  with a shadow + highlight shade, lowercase hex.
- **Method:** identify 3–6 identity cues → budget the grid to them → place (silhouette →
  interior → shadow/highlight) → validate. Complexity, not resolution, is the difficulty.
- **The artisan loop (no tools needed):** reason hard → draw the char-map → **re-read it row
  by row as if seeing it** → critique against the rubric → fix → repeat → output only the
  final. The char-map is how you perceive your own work.
- **Rubric / ground truth:** identity-first, full-figure, expression, real form (not a flat
  blob), clean — and the test that matters: *would a 3-year-old instantly name it?*
- **Invent, don't imitate.** Reason the subject out yourself; never copy a reference.

For the full data model, the worked format example, the output contract, and the self-check
checklist, use [docs/PIXCEL-SKILL.md](../../../docs/PIXCEL-SKILL.md). The deeper "why this
works" lore is in [docs/AGENTIC-ARTISAN-THESIS.md](../../../docs/AGENTIC-ARTISAN-THESIS.md).
