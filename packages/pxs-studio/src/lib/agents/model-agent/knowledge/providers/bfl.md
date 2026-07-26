---
provider: bfl
label: "Black Forest Labs (Flux direct)"
modalities: [image]
status: dropped
envKey: BFL_API_KEY
registryTag: bfl
docsUrl: https://docs.bfl.ml/quick_start/introduction
---

# Black Forest Labs (Flux direct)

DROPPED (Brian, 2026-07-26, reversible) — no direct BFL key; Flux is reached via Replicate (the fallback provider for gaps outside the direct-company APIs). Flip to experimental/active + add BFL_API_KEY to wire direct.

## What the agent knows
- **Modalities:** image
- **Roster status:** dropped
- **Docs (refresh source):** https://docs.bfl.ml/quick_start/introduction

## Models
_Populated by the registry refresh (slice 2) — the agent's current, relevant models for this provider
with per-modality criteria (capabilities, prompt formula, reference limits, native tricks)._

_Live connection health is tracked separately in `state/health.json` (not here — this file is durable
knowledge, not runtime state)._
