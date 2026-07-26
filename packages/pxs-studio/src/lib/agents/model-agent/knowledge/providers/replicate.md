---
provider: replicate
label: "Replicate (Flux / specialty / TV-MA)"
modalities: [image, video, audio]
status: active
envKey: REPLICATE_API_TOKEN
registryTag: replicate
docsUrl: https://replicate.com/docs
modelsEndpoint: https://api.replicate.com/v1/models
---

# Replicate (Flux / specialty / TV-MA)

Access layer for Flux (dev), open-source specialty, and TV-MA / uncensored models. TV-MA routes MUST pass the spend-cap + policy gate before they are reachable.

## What the agent knows
- **Modalities:** image, video, audio
- **Roster status:** active
- **Docs (refresh source):** https://replicate.com/docs

## Models
_Populated by the registry refresh (slice 2) — the agent's current, relevant models for this provider
with per-modality criteria (capabilities, prompt formula, reference limits, native tricks)._

_Live connection health is tracked separately in `state/health.json` (not here — this file is durable
knowledge, not runtime state)._
