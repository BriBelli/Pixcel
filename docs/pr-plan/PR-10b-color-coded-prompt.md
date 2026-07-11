# PR-10b — Color-coded assembled prompt

> Part of the [Prompt Builder Studio](./PROMPT-BUILDER-STUDIO.md). The Builder produces a **prompt
> preview** that reads exactly like the reference: color-coded by formula part, comma-separated,
> click-to-edit, with an info-toggle. (Spec sharpens with reference images as we approach it.)

## Why

Shaping parts is only half of it — the user needs to *see* the assembled prompt, formatted so its
structure is legible: which words are Subject vs Action vs Style, how they comma-join into the final
string the model receives. The reference's floating card (color legend + "click colored text to
edit · chips edit in Build", toggled by the info button) is the target.

## Goal

An assembled-prompt preview that renders each formula part in its **own color**, comma/section-joined,
with an **info toggle** between plain text and the color-coded view, and **click-a-part-to-edit**
(jumps to that part in the Builder; chips still edit in the Builder). Formatting matches the formula.

## Steps (outline — refine with images)

1. Per-part **color** (from `BuilderPart.id`/palette; agent may override). One source of truth shared
   by the Builder and the preview.
2. **Assembler**: parts → the final prompt string, with the comma/section separators the models expect
   (the format is data, not hardcoded per-subject).
3. **Preview component**: plain ↔ color-coded toggle (info button; consider default-on per Brian),
   a color legend, click-colored-text → focus that part in the Builder.
4. Live-sync: editing a part (field or chips) updates the preview; the preview is a view, not a
   second source of truth.

## Out of scope

Scoring (10c), the Guide (10d), the Agent (10e). This is presentation of what 10a already assembles.

## Verify

- The assembled prompt renders color-coded + comma-separated, matching the formula; info-toggle works;
  clicking a colored span focuses that part in the Builder. `tsc` clean.
