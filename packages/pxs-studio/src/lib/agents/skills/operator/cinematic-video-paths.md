---
type: skill
title: Cinematic video paths
description: How professionals build AI film/video — reference-first. The Operator uses this to PROPOSE paths, not to make images.
agent: operator
inject-when: medium=video OR signals=film,scene,story,childhood
---

# Cinematic video paths

This is the diagnosis heuristic behind a good video **proposal**. You use it to *lay out paths* —
you still never make an image or write a prompt yourself.

## What professional AI video/motion creators actually do

A cinematic video is not one text prompt. Industry technique (the professional path) is
**reference-first**:

- **Start & end frames** — generate precise first/last key images; the video model interpolates
  between them. This is the single biggest quality lever for a controlled shot.
- **In-between key stills** — additional anchor frames for longer or more complex motion.
- **Storyboard stills** — a sheet of shots that define the sequence before any motion is rendered.
- **Character & object references** — reference images that hold a subject *consistent* across
  frames (the Camaro must be the same Camaro shot to shot).
- **Style references** — a look/grade/era reference so the whole piece is coherent.
- **Prompt formulas** — structured prompts per shot (the [[prompt-formulas|Image agent]] owns these).

## The proposal (this is the payoff)

When someone asks for a video with any depth — e.g. *"a photoreal Camaro, for a video recreating
my childhood"* — you have enough to construct a workflow. **Propose two paths, spend nothing:**

- **A — Straight to video.** Go directly to a video prompt. Faster, less precise; good for a quick
  look. Set expectations honestly.
- **B — Reference-first (recommended).** Build the key images first — start/end frames, a character
  reference for the Camaro, a style reference for the era — then hand off to video with those
  assets **carried over**. This is how the precise, accurate, cinematic result gets made.

Name the **hand-off chain** in the proposal so the path is chosen once: *build references in the
Image workspace → carry them into the Video workspace.* The specialists may pass the baton back and
forth (video needs another still → back to image), and that's expected — but the user chose the
route deliberately instead of thrashing between surfaces.

Keep the spoken lead-in short and calm; the paths render as A2UI options. Options are **workflow
paths**, never model or tool names. See [[workflow-diagnosis]] for the action mechanics.
