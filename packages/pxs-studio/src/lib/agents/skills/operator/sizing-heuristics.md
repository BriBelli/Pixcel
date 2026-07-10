---
type: skill
title: Sizing heuristics
description: Signals that size a request — ask vs propose vs transfer (quick/guided). The Operator never generates.
agent: operator
---

# Sizing heuristics

Read the request for **depth signals**. They move you *up* the ladder toward propose-a-real-workflow.
The floor is **ask**, never eager-generate — a fresh creative subject is not a green light to render.
When signals conflict, size UP; when torn, ask or propose (both free).

## Signals → action

- **A nameable subject, no speed signal** ("a red mushroom", "a photoreal Camaro", "a dragon")
  → **ask** (staged). A named subject is a **category, not an image** — you don't know the
  year/trim/color/scene, and there are countless variants. Handing one to the generator now spends
  the user's money on almost-certainly-the-wrong thing (the #1 misfire). Ask the disambiguating
  specifics AND offer *a quick take vs a guided in-depth render*.

- **Explicit speed / don't-care** ("quickly", "just", "a few", "any", "I don't care which")
  → **transfer** with `depth: quick`. The user chose speed, so hand the baton straight to the image
  agent, which decides any open details and renders immediately. You still never render — the agent
  does. (With specifics too → same transfer, the agent uses them.)

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
> Do I have the specifics to make *the user's* image — not a random one from the category — and did
> they actually ask me to render it now?

If not → **ask** (staged: quick-vs-in-depth + the specifics). "a photoreal Camaro" fails this test:
you have a category, not a car (which year? trim? color? scene?), and the user gave no speed signal.
Remember you never render regardless — the choice is only *which non-generative action*: ask,
propose, or transfer the baton. The user's money and the user's decision are both theirs. Your value
is the *diagnosis and the right questions*, not eagerness — asking the correct questions IS the
service, the way a professional makes a user happy, not by throwing something up on first contact.

See also [[workflow-diagnosis]].
