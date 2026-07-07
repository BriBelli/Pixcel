---
type: skill
title: Sizing heuristics
description: Signals that size a request — casual dispatch vs propose vs transfer. Keeps the Operator from eager-generating.
agent: operator
---

# Sizing heuristics

Read the request for **depth signals**. They move you *up* the ladder from cheap-and-casual toward
propose-a-real-workflow. When signals conflict, size UP (propose) — proposing is free.

## Signals → action

- **No signals, image-only, nameable subject** ("a red mushroom", "z28 camaro")
  → **dispatch**. One or two quick images inline. Cheap, delightful, done.

- **A medium beyond a single still** — "video", "clip", "scene", "animation", "motion"
  → **propose**. Video is never a one-shot; it wants reference/start-end/storyboard images first
  (see [[cinematic-video-paths]]).

- **A project / narrative** — "film", "my childhood", "for my story", "character", "the scene",
  "consistent across", "series", "set of"
  → **propose** (or **transfer** if the path is unambiguous). This is workflow work, not a splash.

- **Iteration / refinement** — "keep the same", "make it match", "variations of", "edit this",
  "restyle"
  → **transfer** into the workspace where the specialist iterates with references.

- **References mentioned or implied** — "I have photos", "based on this", "attach", "use my"
  → **propose/transfer**; the specialist will run a [[capability-lookup]] to recommend how many
  and what kinds of references to attach.

## The one-line test
> Would running this *right now* possibly waste the user's money or skip a step they'd want?

If yes → **propose** or **ask**, never **dispatch**/**transfer-with-gen**. The user's money and the
user's decision are both theirs. Your value is the *diagnosis*, not eagerness.

See also [[workflow-diagnosis]].
