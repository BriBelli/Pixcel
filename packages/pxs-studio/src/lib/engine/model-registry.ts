/**
 * The image-model registry — the coordinator's pantry.
 *
 * A faithful TS re-creation of photolif's `model_registry.py` field shape (label,
 * provider, env_key, tier, strengths, best_for, capability + cost + batch fields,
 * and a human `brief`), curated to a real starter catalog spanning the providers
 * we'll wire first. The coordinator's router (see `routing.ts`) selects from this
 * by capability + ranking — it is NEVER a hardcoded switch.
 *
 * SELF-RESTOCKING (roadmap P6): each record carries `sourceRefreshedAt`. A stale
 * or unknown record is what the model-maintenance agent will re-research + rewrite.
 * For now the catalog is hand-authored and dated.
 *
 * NO KEYS / NO SPEND live here — this is pure data + lookup. Provider adapters
 * (which actually call the APIs and read `env_key`) live behind the executor seam.
 */

/** A provider we can dispatch an image generation to. */
export type ImageProvider = 'openai' | 'fal' | 'gemini' | 'ideogram' | 'recraft' | 'stability' | 'replicate';

/** The capability axes a request can require and a model can satisfy. */
export type Capability =
  | 'text_in_image' // legible text rendered inside the image
  | 'editing' // edit / inpaint an input image
  | 'multi_reference' // compose from >1 reference image
  | 'photorealism'
  | 'vector' // clean vector / logo / icon output
  | 'high_resolution'
  | 'fast'
  | 'cheap';

/** How a model produces N images in one logical request. */
export type BatchStrategy = 'native' | 'parallel';

/** The 9 strength axes (0–5), mirrored from photolif's `strengths`. */
export interface ModelStrengths {
  photorealism: number;
  prompt_adherence: number;
  editing: number;
  style_versatility: number;
  text_rendering: number;
  speed: number;
  resolution: number;
  consistency: number;
  multimodal: number;
}

/** One image model the coordinator can route to. */
export interface ImageModel {
  /** Stable registry id (also the id passed to the provider adapter). */
  id: string;
  /** Human label shown in the badge / console ("FLUX1.1 Pro (fal)"). */
  label: string;
  provider: ImageProvider;
  /** The env var holding this provider's key. The adapter reads it; the registry never does. */
  envKey: string;
  /** 1 = budget/fast, 2 = mid, 3 = flagship. */
  tier: 1 | 2 | 3;
  strengths: ModelStrengths;
  /** Fast-path tags the router's Gate-1 filter matches against. */
  capabilities: Capability[];
  /** Human intents this model is a strong pick for (feeds the Gate-2 ranker's context). */
  bestFor: string[];
  supportsEditing: boolean;
  /** Total reference images the model accepts across all roles (the flat pool). */
  maxReferenceImages: number;
  /** Typed per-ROLE reference limits, for models with SEPARATE pools per role (Gemini-3-style:
   *  distinct caps for object / character / style refs). Absent → the model treats references as
   *  one flat pool of `maxReferenceImages` (any mix of roles). The Model agent reports whichever
   *  it has — never a guessed number. */
  referenceLimits?: { object: number; character: number; style: number };
  aspectRatios: string[];
  /** (low, high) USD per image — the spend band used for cost caps + the console. */
  costPerImageUsd: [number, number];
  /** Largest N the provider will produce in ONE native call (batch); parallel otherwise. */
  maxBatchN: number;
  batchStrategy: BatchStrategy;
  /** The model brief — WHY/when to pick it. This is the curated craft the router reasons over. */
  brief: string;
  /** ISO date the record was last verified (self-restocking freshness signal). */
  sourceRefreshedAt: string;
  /** Registry KNOWLEDGE only — not yet callable/available. Gate 1 drops preview models from
   *  routing (never spends on them), but the Model agent can still reason/report about them
   *  ("keeps up with the models" without breaking the working flow). Flip when it goes live. */
  preview?: boolean;
}

const REFRESHED = '2026-07-06';

/**
 * The curated starter catalog. Real model ids + provider routes; a handful across
 * providers so the router has genuine material to choose from. Extend freely —
 * this is data, and P6 will keep it fresh automatically.
 */
export const IMAGE_MODELS: ImageModel[] = [
  {
    id: 'gpt-image-1',
    label: 'GPT Image 1 (OpenAI)',
    provider: 'openai',
    envKey: 'OPENAI_API_KEY',
    tier: 3,
    strengths: { photorealism: 5, prompt_adherence: 5, editing: 5, style_versatility: 5, text_rendering: 5, speed: 2, resolution: 5, consistency: 5, multimodal: 5 },
    capabilities: ['text_in_image', 'editing', 'multi_reference', 'photorealism', 'high_resolution'],
    bestFor: ['text in image', 'editing', 'hero image', 'world knowledge', 'premium'],
    supportsEditing: true,
    maxReferenceImages: 4,
    aspectRatios: ['1:1', '16:9', '9:16', '3:2', '2:3'],
    costPerImageUsd: [0.02, 0.19],
    maxBatchN: 10,
    batchStrategy: 'native',
    brief:
      'OpenAI flagship. Best-in-class prompt adherence, in-image text, and editing (native images.edit with up to 4 references). Slower + pricier; reach for it on hero images, anything with legible text, and multi-turn edits. Native batch up to n=10.',
    sourceRefreshedAt: REFRESHED,
  },
  {
    id: 'flux-1.1-pro',
    label: 'FLUX1.1 Pro (fal)',
    provider: 'fal',
    envKey: 'FAL_API_KEY',
    tier: 3,
    strengths: { photorealism: 5, prompt_adherence: 4, editing: 2, style_versatility: 5, text_rendering: 3, speed: 4, resolution: 5, consistency: 4, multimodal: 3 },
    capabilities: ['photorealism', 'high_resolution', 'fast'],
    bestFor: ['photoreal hero', 'illustration', 'fast high quality', 'style range'],
    supportsEditing: false,
    maxReferenceImages: 1,
    aspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4', '21:9'],
    costPerImageUsd: [0.04, 0.06],
    maxBatchN: 4,
    batchStrategy: 'parallel',
    brief:
      'Black Forest Labs FLUX1.1 Pro via fal. Fast, photoreal, huge style range at a flat ~$0.05/image. The default workhorse for rich illustrated / photoreal looks. Weak at in-image text and has no real edit path — route text/edits to gpt-image-1.',
    sourceRefreshedAt: REFRESHED,
  },
  {
    id: 'flux-dev',
    label: 'FLUX.1 dev (fal)',
    provider: 'fal',
    envKey: 'FAL_API_KEY',
    tier: 1,
    strengths: { photorealism: 4, prompt_adherence: 4, editing: 1, style_versatility: 4, text_rendering: 2, speed: 5, resolution: 4, consistency: 3, multimodal: 2 },
    capabilities: ['fast', 'cheap', 'photorealism'],
    bestFor: ['drafts', 'exploration', 'cheap fan-out', 'quick previews'],
    supportsEditing: false,
    maxReferenceImages: 1,
    aspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4'],
    costPerImageUsd: [0.003, 0.01],
    maxBatchN: 4,
    batchStrategy: 'parallel',
    brief:
      'The cheap, fast FLUX for wide exploration and big fan-outs (~$0.01/image). Quality is a notch under Pro; ideal for "show me 8 directions" before committing to a flagship render.',
    sourceRefreshedAt: REFRESHED,
  },
  {
    id: 'nano-banana',
    label: 'Nano Banana (Gemini 2.5 Flash Image)',
    provider: 'gemini',
    envKey: 'GEMINI_API_KEY',
    tier: 2,
    strengths: { photorealism: 4, prompt_adherence: 5, editing: 5, style_versatility: 4, text_rendering: 4, speed: 4, resolution: 4, consistency: 5, multimodal: 5 },
    capabilities: ['editing', 'multi_reference', 'text_in_image', 'fast', 'photorealism', 'high_resolution'],
    bestFor: ['conversational editing', 'character consistency', 'multi-image compose', 'blend references'],
    supportsEditing: true,
    maxReferenceImages: 3,
    aspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4'],
    costPerImageUsd: [0.039, 0.039],
    maxBatchN: 1,
    batchStrategy: 'parallel',
    brief:
      'Google Gemini 2.5 Flash Image. Exceptional at conversational multi-image editing, character consistency, and blending several references into one scene at a flat ~$0.039. First pick for compositing and inserting a person/object into an existing scene.',
    sourceRefreshedAt: REFRESHED,
  },
  // ── Gemini 3.x image family (registry KNOWLEDGE, preview — not yet callable). TYPED per-role
  //    reference limits (object / character / style) from Google's published caps. Dropped from
  //    routing by Gate 1; flip `preview` when the provider adapter can call them. ──
  {
    id: 'gemini-3-pro-image',
    label: 'Gemini 3 Pro Image',
    provider: 'gemini',
    envKey: 'GEMINI_API_KEY',
    tier: 3,
    strengths: { photorealism: 5, prompt_adherence: 5, editing: 5, style_versatility: 5, text_rendering: 5, speed: 3, resolution: 5, consistency: 5, multimodal: 5 },
    capabilities: ['editing', 'multi_reference', 'text_in_image', 'photorealism', 'high_resolution'],
    bestFor: ['character consistency', 'style transfer', 'multi-reference compose', 'flagship quality'],
    supportsEditing: true,
    maxReferenceImages: 14,
    referenceLimits: { object: 6, character: 5, style: 3 },
    aspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3'],
    costPerImageUsd: [0.06, 0.12],
    maxBatchN: 4,
    batchStrategy: 'parallel',
    brief:
      'Gemini 3 Pro Image — the flagship of the family. Distinct reference pools: up to 6 object refs (high-fidelity), 5 character refs (consistency), and 3 style refs. First pick when a shot needs precise, typed references held together.',
    sourceRefreshedAt: REFRESHED,
    preview: true,
  },
  {
    id: 'gemini-3.1-flash-image',
    label: 'Gemini 3.1 Flash Image',
    provider: 'gemini',
    envKey: 'GEMINI_API_KEY',
    tier: 2,
    strengths: { photorealism: 4, prompt_adherence: 5, editing: 5, style_versatility: 4, text_rendering: 4, speed: 5, resolution: 4, consistency: 5, multimodal: 5 },
    capabilities: ['editing', 'multi_reference', 'text_in_image', 'fast', 'photorealism'],
    bestFor: ['fast multi-reference compose', 'character consistency', 'object insertion'],
    supportsEditing: true,
    maxReferenceImages: 14,
    referenceLimits: { object: 10, character: 4, style: 0 },
    aspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4'],
    costPerImageUsd: [0.03, 0.05],
    maxBatchN: 8,
    batchStrategy: 'parallel',
    brief:
      'Gemini 3.1 Flash Image — fast, high-multi-reference. Up to 10 object refs + 4 character refs (no dedicated style pool). Strong for compositing many objects quickly with character consistency.',
    sourceRefreshedAt: REFRESHED,
    preview: true,
  },
  {
    id: 'gemini-3.1-flash-lite-image',
    label: 'Gemini 3.1 Flash Lite Image',
    provider: 'gemini',
    envKey: 'GEMINI_API_KEY',
    tier: 1,
    strengths: { photorealism: 4, prompt_adherence: 4, editing: 3, style_versatility: 3, text_rendering: 3, speed: 5, resolution: 4, consistency: 3, multimodal: 4 },
    capabilities: ['multi_reference', 'fast', 'cheap', 'photorealism'],
    bestFor: ['cheap high-object compose', 'fast drafts', 'many object refs'],
    supportsEditing: false,
    maxReferenceImages: 14,
    referenceLimits: { object: 14, character: 0, style: 0 },
    aspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4'],
    costPerImageUsd: [0.01, 0.02],
    maxBatchN: 8,
    batchStrategy: 'parallel',
    brief:
      'Gemini 3.1 Flash Lite Image — cheapest, fastest of the family. Up to 14 object refs (no character/style pools). Best for high-object compositing on a budget; not for character consistency.',
    sourceRefreshedAt: REFRESHED,
    preview: true,
  },
  {
    id: 'ideogram-v3',
    label: 'Ideogram 3.0',
    provider: 'ideogram',
    envKey: 'IDEOGRAM_API_KEY',
    tier: 2,
    strengths: { photorealism: 4, prompt_adherence: 5, editing: 3, style_versatility: 4, text_rendering: 5, speed: 3, resolution: 4, consistency: 4, multimodal: 2 },
    capabilities: ['text_in_image', 'high_resolution'],
    bestFor: ['typography', 'posters', 'logos with text', 'signage', 'legible words'],
    supportsEditing: true,
    maxReferenceImages: 1,
    aspectRatios: ['1:1', '16:9', '9:16', '3:2', '2:3', '4:3', '3:4'],
    costPerImageUsd: [0.06, 0.09],
    maxBatchN: 1,
    batchStrategy: 'parallel',
    brief:
      'Ideogram 3.0 — the typography specialist. Best-in-class for accurate, well-kerned in-image text: posters, ads, packaging, wordmarks. Route here whenever the brief hinges on real, legible words.',
    sourceRefreshedAt: REFRESHED,
  },
  {
    id: 'recraft-v3',
    label: 'Recraft V3',
    provider: 'recraft',
    envKey: 'RECRAFT_API_KEY',
    tier: 2,
    strengths: { photorealism: 3, prompt_adherence: 4, editing: 3, style_versatility: 5, text_rendering: 4, speed: 3, resolution: 4, consistency: 4, multimodal: 2 },
    capabilities: ['vector', 'text_in_image', 'high_resolution'],
    bestFor: ['vector art', 'logos', 'icons', 'brand systems', 'flat design', 'SVG output'],
    supportsEditing: true,
    maxReferenceImages: 1,
    aspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4'],
    costPerImageUsd: [0.04, 0.08],
    maxBatchN: 1,
    batchStrategy: 'parallel',
    brief:
      'Recraft V3 — the design/vector specialist. Native SVG + brand-consistent style sets. First pick for logos, icon sets, and flat vector illustration where clean scalable output matters (ties into the vector-space scope).',
    sourceRefreshedAt: REFRESHED,
  },
];

/** Look a model up by id. Returns undefined for unknown ids. */
export function getModel(id: string): ImageModel | undefined {
  return IMAGE_MODELS.find((m) => m.id === id);
}

/** Every model that advertises ALL of the required capabilities. */
export function modelsWithCapabilities(required: Capability[]): ImageModel[] {
  if (required.length === 0) return [...IMAGE_MODELS];
  return IMAGE_MODELS.filter((m) => required.every((c) => m.capabilities.includes(c)));
}

/** The distinct env keys the current catalog depends on (for a "which keys are set?" check). */
export function requiredEnvKeys(): string[] {
  return Array.from(new Set(IMAGE_MODELS.map((m) => m.envKey)));
}
