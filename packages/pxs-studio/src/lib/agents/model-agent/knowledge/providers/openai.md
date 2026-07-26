---
provider: openai
label: "OpenAI (GPT Image / GPT)"
modalities: [image, text]
status: active
envKey: OPENAI_API_KEY
registryTag: openai
docsUrl: https://platform.openai.com/docs/models
modelsEndpoint: https://api.openai.com/v1/models
---

# OpenAI (GPT Image / GPT)

Second primary. Best-in-class multi-subject composition + complex prompt adherence + native editing.

## What the agent knows
- **Modalities:** image, text
- **Roster status:** active
- **Docs (refresh source):** https://platform.openai.com/docs/models

## Models
### Image
- **GPT Image 1 (OpenAI)** (`gpt-image-1`) — OpenAI flagship. Best-in-class prompt adherence, in-image text, and editing (native images.edit with up to 4 references). Slower + pricier; reach for it on hero images, anything with legible text, and multi-turn edits. Native batch up to n=10. _[tier 3 · refs 4, 5 aspect ratios]_

### Video
- **Sora 2 (OpenAI)** (`sora-2`) — OpenAI cinematic video — long-form coherence, physical realism, strong world simulation. Route narrative sequences. _[tier 3 · needs-research · native-audio · ≤20s, 720p/1080p]_

_Live connection health is tracked separately in `state/health.json` (not here — this file is durable
knowledge, not runtime state)._
