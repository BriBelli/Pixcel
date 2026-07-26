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
### Video
- **Kling 3.0 Pro (Replicate)** (`kling-3-pro`) — Strong motion + character consistency, image-to-video start frames. Route action + dance + expressive motion. _[tier 2 · needs-research · ≤10s, 720p/1080p]_
- **Seedance 2.0 (Replicate)** (`seedance-2`) — Fast, stylized, multi-shot sequences. Route quick iterations + stylized looks. _[tier 2 · needs-research · ≤10s, 480p/720p/1080p]_

### Audio
- **MusicGen (Replicate)** (`musicgen`) — Open music + SFX generation, fast + cheap. Route quick beds, loops, and sound effects. _[tier 1 · needs-research · music/sfx, ≤30s]_

_Live connection health is tracked separately in `state/health.json` (not here — this file is durable
knowledge, not runtime state)._
