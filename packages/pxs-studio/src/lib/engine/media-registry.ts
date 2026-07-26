/**
 * THE MEDIA REGISTRY — the UNION layer over the model stack (Brian's approved shape).
 *
 * One registry, `MEDIA_MODELS`, where every entry declares `modalities` + per-modality criteria.
 * Image / Video / Audio are DERIVED views (`modelsForModality`). A multi-modality model auto-shows in
 * each of its buckets (double-bucketing). "DM / Digital Media" is NOT a fourth store — it's the DERIVED
 * multimodal view (`omniModels`): the models that render more than one modality (the unified renderers).
 *
 * CONSTRUCTIVE, NOT DESTRUCTIVE: the working IMAGE registry (`model-registry.ts` / `IMAGE_MODELS`) is
 * untouched — this layer WRAPS it. The image path keeps running exactly as it did; this adds Video,
 * Audio, and the union surface on top. `IMAGE_MODELS` stays the source of truth for image criteria.
 *
 * SELF-MAINTAINING: video/audio/omni entries below are a SEED (Codex model landscape, 2026-07-26),
 * marked `sourceRefreshedAt` + `needsResearch` where the specifics need live confirmation. The Model
 * agent's refresh (staleness.ts / model-refresh.ts) is what keeps them current — never hardcoded truth
 * (that's how photolif died). Criteria depth here is deliberately PRAGMATIC, not a photolif mega-schema.
 */

import { PROVIDERS, registryTag, type Modality } from './provider-roster';
import { IMAGE_MODELS, type ImageModel, type PromptFormula } from './model-registry';

// ── Per-modality criteria ────────────────────────────────────────────────────

/** Video-model criteria — the essentials the agent routes + builds prompts on. */
export interface VideoCriteria {
  /** Longest single clip, seconds. */
  maxDurationSec: number;
  /** Output resolutions offered (e.g. '720p', '1080p'). */
  resolutions: string[];
  /** NATIVE synced audio in ONE render pass — the "one renderer / audio = timing substrate" flag. */
  nativeAudio: boolean;
  /** How motion is directed. */
  motion: ('text' | 'keyframe' | 'image-to-video' | 'camera-path')[];
  /** Named camera moves the model honors (pan / tilt / dolly / tracking / orbit …). */
  cameraControls: string[];
  /** Reference images accepted (start frame / character / style), if any. */
  maxReferenceImages?: number;
  /** (low, high) USD per second of output — the spend band. */
  costPerSecondUsd?: [number, number];
  /** The prompt formula this model rewards (scene / subject / camera / motion / style parts). */
  promptFormula?: PromptFormula;
}

/** Audio-model criteria — music / speech / sfx generation. */
export interface AudioCriteria {
  /** What it generates. */
  kind: ('music' | 'speech' | 'sfx')[];
  maxDurationSec: number;
  /** Named controls (genre, mood, tempo, key, voice, bpm …). */
  controls: string[];
  costPerMinuteUsd?: [number, number];
  promptFormula?: PromptFormula;
}

/**
 * A model in the union registry. Common fields + `modalities` + the per-modality criteria blocks that
 * apply. For an image-capable model, `image` embeds the full existing `ImageModel` (reuse, no reshape).
 */
export interface MediaModel {
  id: string;
  label: string;
  /** Roster provider id (google / openai / replicate / …) — bridges to `provider-roster.ts`. */
  provider: string;
  envKey: string;
  /** Every modality this model can produce — the double-bucketing driver. */
  modalities: Modality[];
  /** 1 budget/fast · 2 mid · 3 flagship. */
  tier: 1 | 2 | 3;
  brief: string;
  sourceRefreshedAt: string;
  /** Registry knowledge only — excluded from spend until confirmed live. */
  preview?: boolean;
  /** Discovered/seeded but not yet researched — the agent must confirm before routing. Reversible. */
  needsResearch?: boolean;
  /** The provider's own model id (adapter string) when it differs from `id`. */
  providerModelId?: string;
  /** Per-modality criteria — present for each modality in `modalities`. */
  image?: ImageModel;
  video?: VideoCriteria;
  audio?: AudioCriteria;
}

// ── Wrap the existing IMAGE registry (untouched) into the union ───────────────

/** Reverse the roster's registryTag (image models are tagged 'gemini'; the roster id is 'google'). */
function rosterIdForTag(tag: string): string {
  return PROVIDERS.find((p) => registryTag(p) === tag)?.id ?? tag;
}

const IMAGE_AS_MEDIA: MediaModel[] = IMAGE_MODELS.map((m) => ({
  id: m.id,
  label: m.label,
  provider: rosterIdForTag(m.provider),
  envKey: m.envKey,
  modalities: ['image'],
  tier: m.tier,
  brief: m.brief,
  sourceRefreshedAt: m.sourceRefreshedAt,
  preview: m.preview,
  needsResearch: m.needsResearch,
  providerModelId: m.providerModelId,
  image: m,
}));

// ── SEED: Video · Audio · Omni (agent-maintained; see file header) ────────────

const SEEDED = '2026-07-26';

/** Video-part prompt formula the router surfaces in the Video builder (scene → style). */
const VIDEO_FORMULA: PromptFormula = {
  parts: [
    { id: 'scene', label: 'Scene', guidance: 'What happens and where — the shot in one clear beat.', weight: 3 },
    { id: 'subject', label: 'Subject', guidance: 'The focal subject — materials, wardrobe, distinguishing detail.', weight: 2 },
    { id: 'camera', label: 'Camera', guidance: 'Shot size, angle, lens, and the move (push-in, tracking, orbit).', weight: 2 },
    { id: 'motion', label: 'Motion', guidance: 'How subjects and the world move — pace, direction, physics.', weight: 2 },
    { id: 'style', label: 'Style', guidance: 'Lighting, palette, film stock, mood.', weight: 1.5 },
  ],
  assembly: 'One cinematic sentence per shot, camera + motion explicit.',
};

const VIDEO_MODELS: MediaModel[] = [
  {
    id: 'veo-3.1', label: 'Veo 3.1 (Google)', provider: 'google', envKey: 'GEMINI_API_KEY',
    modalities: ['video'], tier: 3, sourceRefreshedAt: SEEDED, needsResearch: true,
    brief: 'Google flagship video — strong physics + prompt adherence, NATIVE synced audio in one pass (the unified renderer). Route hero shots and dialogue.',
    video: { maxDurationSec: 8, resolutions: ['720p', '1080p'], nativeAudio: true, motion: ['text', 'image-to-video', 'camera-path'], cameraControls: ['pan', 'tilt', 'dolly', 'tracking', 'orbit'], maxReferenceImages: 3, costPerSecondUsd: [0.15, 0.5], promptFormula: VIDEO_FORMULA },
  },
  {
    id: 'sora-2', label: 'Sora 2 (OpenAI)', provider: 'openai', envKey: 'OPENAI_API_KEY',
    modalities: ['video'], tier: 3, sourceRefreshedAt: SEEDED, needsResearch: true,
    brief: 'OpenAI cinematic video — long-form coherence, physical realism, strong world simulation. Route narrative sequences.',
    video: { maxDurationSec: 20, resolutions: ['720p', '1080p'], nativeAudio: true, motion: ['text', 'image-to-video'], cameraControls: ['pan', 'tilt', 'dolly', 'tracking'], maxReferenceImages: 1, costPerSecondUsd: [0.1, 0.5], promptFormula: VIDEO_FORMULA },
  },
  {
    id: 'kling-3-pro', label: 'Kling 3.0 Pro (Replicate)', provider: 'replicate', envKey: 'REPLICATE_API_TOKEN',
    modalities: ['video'], tier: 2, sourceRefreshedAt: SEEDED, needsResearch: true,
    brief: 'Strong motion + character consistency, image-to-video start frames. Route action + dance + expressive motion.',
    video: { maxDurationSec: 10, resolutions: ['720p', '1080p'], nativeAudio: false, motion: ['text', 'image-to-video', 'keyframe'], cameraControls: ['pan', 'tilt', 'dolly', 'zoom'], maxReferenceImages: 1, costPerSecondUsd: [0.05, 0.2], promptFormula: VIDEO_FORMULA },
  },
  {
    id: 'seedance-2', label: 'Seedance 2.0 (Replicate)', provider: 'replicate', envKey: 'REPLICATE_API_TOKEN',
    modalities: ['video'], tier: 2, sourceRefreshedAt: SEEDED, needsResearch: true,
    brief: 'Fast, stylized, multi-shot sequences. Route quick iterations + stylized looks.',
    video: { maxDurationSec: 10, resolutions: ['480p', '720p', '1080p'], nativeAudio: false, motion: ['text', 'image-to-video'], cameraControls: ['pan', 'tracking'], maxReferenceImages: 1, costPerSecondUsd: [0.03, 0.12], promptFormula: VIDEO_FORMULA },
  },
];

const AUDIO_FORMULA: PromptFormula = {
  parts: [
    { id: 'kind', label: 'Kind', guidance: 'Music, speech, or SFX — and the role (score, stinger, ambience).', weight: 2 },
    { id: 'mood', label: 'Mood', guidance: 'Emotion + energy — the feeling the cue carries.', weight: 2 },
    { id: 'detail', label: 'Detail', guidance: 'Instrumentation / voice / tempo / key, and what it should NOT include.', weight: 2 },
  ],
  assembly: 'A short brief: kind, mood, then instrumentation/tempo.',
};

const AUDIO_MODELS: MediaModel[] = [
  {
    id: 'lyria-2', label: 'Lyria 2 (Google)', provider: 'google', envKey: 'GEMINI_API_KEY',
    modalities: ['audio'], tier: 3, sourceRefreshedAt: SEEDED, needsResearch: true,
    brief: 'Google music generation — high-fidelity instrumental + song scoring. Route film score + music beds.',
    audio: { kind: ['music'], maxDurationSec: 120, controls: ['genre', 'mood', 'tempo', 'key', 'instrumentation'], costPerMinuteUsd: [0.05, 0.3], promptFormula: AUDIO_FORMULA },
  },
  {
    id: 'musicgen', label: 'MusicGen (Replicate)', provider: 'replicate', envKey: 'REPLICATE_API_TOKEN',
    modalities: ['audio'], tier: 1, sourceRefreshedAt: SEEDED, needsResearch: true,
    brief: 'Open music + SFX generation, fast + cheap. Route quick beds, loops, and sound effects.',
    audio: { kind: ['music', 'sfx'], maxDurationSec: 30, controls: ['genre', 'mood', 'tempo'], costPerMinuteUsd: [0.01, 0.05], promptFormula: AUDIO_FORMULA },
  },
];

/** OMNI / DM — genuine multi-output models. These populate the DERIVED `omniModels()` view AND each of
 *  their per-modality buckets. Seeded conservatively (needsResearch) — the agent confirms real span. */
const OMNI_MODELS: MediaModel[] = [
  {
    id: 'gemini-omni', label: 'Gemini Omni (Google)', provider: 'google', envKey: 'GEMINI_API_KEY',
    modalities: ['image', 'audio'], tier: 3, sourceRefreshedAt: SEEDED, needsResearch: true,
    brief: 'Native multimodal — interleaved image + audio in one context (the unified renderer). Confirm live span before routing; today a reasoning-forward Omni exemplar.',
    audio: { kind: ['speech', 'sfx'], maxDurationSec: 60, controls: ['voice', 'mood', 'pacing'], promptFormula: AUDIO_FORMULA },
  },
];

// ── The union + derived views ─────────────────────────────────────────────────

/** The whole union: wrapped image models + seeded video/audio/omni. ONE registry. */
export const MEDIA_MODELS: MediaModel[] = [
  ...IMAGE_AS_MEDIA,
  ...VIDEO_MODELS,
  ...AUDIO_MODELS,
  ...OMNI_MODELS,
];

/** All media models. */
export function mediaModels(): MediaModel[] {
  return MEDIA_MODELS;
}

/** DERIVED bucket for a modality — an Omni model appears in each of its buckets (double-bucketing). */
export function modelsForModality(modality: Modality): MediaModel[] {
  return MEDIA_MODELS.filter((m) => m.modalities.includes(modality));
}

/** The DM / Digital-Media view — DERIVED: models that render more than one modality (unified renderers).
 *  Not a separate registry; just the multimodal slice of the union. */
export function omniModels(): MediaModel[] {
  return MEDIA_MODELS.filter((m) => m.modalities.length > 1);
}

/** Models a given roster provider offers (for the per-provider knowledge shards). */
export function mediaModelsForProvider(providerId: string): MediaModel[] {
  return MEDIA_MODELS.filter((m) => m.provider === providerId);
}

/** Look up a media model by id. */
export function getMediaModel(id: string): MediaModel | undefined {
  return MEDIA_MODELS.find((m) => m.id === id);
}

/** The four browsable surfaces + their counts (Image / Video / Audio / DM). Convenience for reports. */
export function modalitySurfaces(): { modality: Modality | 'dm'; label: string; count: number }[] {
  return [
    { modality: 'image', label: 'Image', count: modelsForModality('image').length },
    { modality: 'video', label: 'Video', count: modelsForModality('video').length },
    { modality: 'audio', label: 'Audio', count: modelsForModality('audio').length },
    { modality: 'dm', label: 'Digital Media (Omni)', count: omniModels().length },
  ];
}
