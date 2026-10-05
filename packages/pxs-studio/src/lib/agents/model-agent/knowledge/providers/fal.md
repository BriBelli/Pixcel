---
provider: fal
label: "fal"
modalities: [image, video]
status: active
envKey: FAL_API_KEY
registryTag: fal
docsUrl: https://fal.ai/models
modelsEndpoint: https://fal.ai/api/models?keywords=
---

# fal

ACTIVE and primary for VIDEO: Seedance, Kling and Happy Horse all render through it, and it publishes an OpenAPI schema per endpoint (which is how several adapter bugs were caught before they shipped). It was marked "dropped" from the original roster while simultaneously being the only route to three working models — the sweep skipped it on that basis, which is why Seedance 2.5 went unnoticed. NOTE: its endpoint is a KEYWORD SEARCH, not a full listing, so it is swept per model family (see model-succession).

## What the agent knows
- **Modalities:** image, video
- **Roster status:** active
- **Docs (refresh source):** https://fal.ai/models

## Models
### Image
- **FLUX.3 (fal)** (`flux-3-pro`) — FLUX.3 — the generation after FLUX.2, reached via fal. Edit endpoint takes 1-10 reference images (>=256px/side, <=4MP each); native output 512sq to 4K; MULTI-TURN EDITS PRESERVE UNTOUCHED PIXELS, which is the capability FLUX.2 lacked when it reinterpreted an outpaint instead of extending it. Researched high confidence 2026-10-03 from fal model docs. _[tier 3 · refs 10, 14 aspect ratios]_
- **Ideogram 4.5 (fal)** (`ideogram-v4.5`) — Ideogram 4.5 — the typography specialist, two generations on from our 3.0, reachable only through fal. Edits take 1 source + up to 4 references (3 with a mask; black edits, white preserves); 1K/2K presets with high-res region editing of images up to ~24MP; prompts to 10,000 characters. Researched high confidence 2026-10-03. _[tier 3 · refs 5, 12 aspect ratios]_
- **Qwen Image Max (fal)** (`qwen-image-max`) — Qwen Image Max on fal — Alibaba's flagship image model, strong prompt adherence and in-image text, with a separate /edit endpoint for reference-driven work. Seeded 2026-09-23 from fal's live catalog; craft profile awaits the research pass. _[tier 3 · refs 4, 5 aspect ratios]_
- **Qwen Image 3 (fal)** (`qwen-image-3`) — Qwen Image 3 on fal — the generation before Max, kept as the cheaper fal route with the same edit endpoint shape. Seeded 2026-09-23 from fal's live catalog; craft profile awaits the research pass. _[tier 2 · refs 4, 5 aspect ratios]_
- **Stable Diffusion 3.5 Large (fal)** (`sd-3.5-large`) — Stable Diffusion 3.5 Large on fal — the open-weights option, text-to-image only (no edit endpoint on this route, so it takes no references). Seeded 2026-09-23 from fal's live catalog; craft profile awaits the research pass. _[tier 2 · refs 0, 5 aspect ratios]_

### Video
- **Seedance 2.5 (ByteDance)** (`seedance-2.5`) — ByteDance Seedance 2.5 — the long-form tier: clips up to 30 SECONDS (double 2.0) with a wider reference budget across images, clips and audio. Not a straight replacement for 2.0, which it beats on length but LOSES to on resolution (2.5 tops out at 1080p; 2.0 reaches 4K), so both are kept and routed by what the shot needs. Found by the succession sweep 2026-09-03, which is the first version bump this system caught itself rather than a human noticing in a browser tab. _[tier 3 · native-audio · ≤30s, 480p/720p/1080p]_
- **Seedance 2.0 (ByteDance)** (`seedance-2`) — ByteDance Seedance 2.0 (Feb 2026) — #1 on Artificial Analysis WITH audio, and the only model in the roster that reaches 4K. Rich input set: 9 images + 3 clips + 3 audio in one generation, 4-15s. KEPT ALONGSIDE 2.5 deliberately: 2.5 doubles the length but stops at 1080p, so 2.0 remains the choice whenever finish resolution matters more than runtime. Verified 2026-08-29. _[tier 3 · native-audio · ≤15s, 480p/720p/1080p/4K]_
- **Kling 3.0 (Kuaishou)** (`kling-3`) — Kling 3.0 (Feb 2026) — the STORYBOARD model: a multi-shot mode that renders 1-6 shots from one prompt (15s total) with a shared audio timeline, plus native joint audio and lip-sync across Mandarin, English, Japanese, Korean and Spanish with no separate pass. Directly serves sequence work rather than single clips. Audio adds ~$0.056/s, voice control ~$0.028/s. Verified 2026-08-29 — the earlier seed had nativeAudio FALSE, which was wrong and would have routed every dialogue shot away from it. _[tier 3 · native-audio · ≤15s, 720p/1080p]_
- **Happy Horse 1.1 (Alibaba)** (`happy-horse-1.1`) — Alibaba Happy Horse 1.1 — the 1.x line took #1 on Artificial Analysis WITHOUT audio and roughly tied #1 with it. A unified 15B transformer with joint audio-video, multilingual lip-sync and 1080p, plus a video-EDIT endpoint the rest of the roster lacks. The widest aspect range here (21:9 through 9:21). $0.14/s at 720p, $0.28/s at 1080p. Verified 2026-08-31 — the July seed had neither this model NOR its 1.0 predecessor, and we seeded 1.0 before finding 1.1 was live. _[tier 3 · native-audio · ≤15s, 720p/1080p]_

_Live connection health is tracked separately in `state/health.json` (not here — this file is durable
knowledge, not runtime state)._
