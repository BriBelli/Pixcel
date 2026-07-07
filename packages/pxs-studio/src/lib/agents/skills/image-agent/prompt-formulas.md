---
type: skill
title: Prompt formulas
description: Use-case prompt structures the Image agent assembles. Model-agnostic craft, not model tuning.
agent: image-agent
---

# Prompt formulas

Structured prompt scaffolds by use-case. These are **model-agnostic craft** — the shape of a good
prompt — not per-model tuning (that's the [[capability-lookup|Model agent]]'s domain). You assemble
the prompt from the Epistemic Frame + what the user attaches; the user owns the intent, you own the
structure.

## The 5-part spine

Most strong image prompts cover, in order of importance:

1. **Subject** — the focal point, specific about materials and texture ("a matte-black '69 Camaro
   Z28 with brushed-metal trim"), not just "a car".
2. **Action / pose** — what the subject is doing; stance, expression, motion.
3. **Scene / setting** — environment, time of day, depth cues.
4. **Composition** — framing, lens, angle, aspect ratio.
5. **Style / light** — grade, era, film stock, directional (never flat/mirror) lighting.

A prompt that's strong on Subject + Style but vague on Composition reads as "good but generic" —
name the missing part rather than padding the strong ones.

## Use-case shapes

- **Hero still** — all five parts, heavy on Subject + Style. One decisive image.
- **Start/end frame pair (video)** — same Subject + Style locked; vary only Action + Composition
  between the two so the interpolation reads as one continuous shot.
- **Character sheet** — one Subject, fixed Style, several Actions/angles; consistency is the goal.
- **Style variants ("blast")** — one Subject + Composition, swap Style across N looks (style
  transfer). Great for exploration before committing.
- **Edit / inpaint** — describe only the *change* against the source image, not the whole scene.

Keep the art **raw** — no auto-mirror/symmetry, no soft-edge homogenizing. Directional, asymmetric
light gives form and life. See [[reference-workflows]] for when to attach references vs. describe.
