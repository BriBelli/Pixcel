---
provider: fal
label: "fal"
modalities: [image, video]
status: dropped
envKey: FAL_API_KEY
registryTag: fal
docsUrl: https://fal.ai/models
---

# fal

Dropped unless specifically required (avoid juggling). NOTE: the current image registry still routes Flux via fal — re-activate or migrate those routes to Replicate/BFL before removing.

## What the agent knows
- **Modalities:** image, video
- **Roster status:** dropped
- **Docs (refresh source):** https://fal.ai/models

## Models
### Image
- **FLUX1.1 Pro (fal)** (`flux-1.1-pro`) — Black Forest Labs FLUX1.1 Pro via fal. Fast, photoreal, huge style range at a flat ~$0.05/image. The default workhorse for rich illustrated / photoreal looks. Weak at in-image text and has no real edit path — route text/edits to gpt-image-1. _[tier 3 · refs 1, 6 aspect ratios]_
- **FLUX.1 dev (fal)** (`flux-dev`) — The cheap, fast FLUX for wide exploration and big fan-outs (~$0.01/image). Quality is a notch under Pro; ideal for "show me 8 directions" before committing to a flagship render. _[tier 1 · refs 1, 5 aspect ratios]_

_Live connection health is tracked separately in `state/health.json` (not here — this file is durable
knowledge, not runtime state)._
