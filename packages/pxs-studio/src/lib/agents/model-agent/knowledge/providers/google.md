---
provider: google
label: "Google (Gemini / Veo / Imagen / Lyria)"
modalities: [image, video, audio, text]
status: active
envKey: GEMINI_API_KEY
registryTag: gemini
docsUrl: https://ai.google.dev/gemini-api/docs/models
modelsEndpoint: https://generativelanguage.googleapis.com/v1beta/models
---

# Google (Gemini / Veo / Imagen / Lyria)

The backbone. Full-suite emphasis (Codex primary directive) — Gemini image, Veo video, Omni multimodal, Lyria audio. Must not miss Google capabilities.

## What the agent knows
- **Modalities:** image, video, audio, text
- **Roster status:** active
- **Docs (refresh source):** https://ai.google.dev/gemini-api/docs/models

## Models
### Image
- **Nano Banana (Gemini 2.5 Flash Image)** (`nano-banana`) — Google Gemini 2.5 Flash Image. Exceptional at conversational multi-image editing, character consistency, and blending several references into one scene at a flat ~$0.039. First pick for compositing and inserting a person/object into an existing scene. _[tier 2 · refs 3, 5 aspect ratios]_
- **Gemini 3 Pro Image** (`gemini-3-pro-image`) — Gemini 3 Pro Image — the flagship of the family. Distinct reference pools: up to 6 object refs (high-fidelity), 5 character refs (consistency), and 3 style refs. First pick when a shot needs precise, typed references held together. _[tier 3 · preview · refs 14, 7 aspect ratios]_
- **Gemini 3.1 Flash Image** (`gemini-3.1-flash-image`) — Gemini 3.1 Flash Image — fast, high-multi-reference. Up to 10 object refs + 4 character refs (no dedicated style pool). Strong for compositing many objects quickly with character consistency. _[tier 2 · preview · refs 14, 5 aspect ratios]_
- **Gemini 3.1 Flash Lite Image** (`gemini-3.1-flash-lite-image`) — Gemini 3.1 Flash Lite Image — cheapest, fastest of the family. Up to 14 object refs (no character/style pools). Best for high-object compositing on a budget; not for character consistency. _[tier 1 · preview · refs 14, 5 aspect ratios]_
- **Gemini Omni (Google)** (`gemini-omni`) — Native multimodal — interleaved image + audio in one context (the unified renderer). Confirm live span before routing; today a reasoning-forward Omni exemplar. _[tier 3 · omni: image+audio · needs-research]_

### Video
- **Veo 3.1 (Google)** (`veo-3.1`) — Google flagship video — strong physics + prompt adherence, NATIVE synced audio in one pass (the unified renderer). Route hero shots and dialogue. _[tier 3 · needs-research · native-audio · ≤8s, 720p/1080p]_

### Audio
- **Lyria 2 (Google)** (`lyria-2`) — Google music generation — high-fidelity instrumental + song scoring. Route film score + music beds. _[tier 3 · needs-research · music, ≤120s]_
- **Gemini Omni (Google)** (`gemini-omni`) — Native multimodal — interleaved image + audio in one context (the unified renderer). Confirm live span before routing; today a reasoning-forward Omni exemplar. _[tier 3 · omni: image+audio · needs-research · speech/sfx, ≤60s]_

_Live connection health is tracked separately in `state/health.json` (not here — this file is durable
knowledge, not runtime state)._
