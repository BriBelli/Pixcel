/**
 * The image-executor seam — the one interface every provider adapter implements.
 *
 * The coordinator NEVER calls a provider directly. It routes a request to a
 * modelId (see `routing.ts`), looks up that model's provider, and dispatches
 * through this interface. Swapping OpenAI ↔ fal ↔ gemini is a registry lookup,
 * not new coordinator code. This is what lets the "Netflix path" grow provider by
 * provider without touching the brain.
 *
 * Adapters (the code that actually calls fal / OpenAI / … and reads the API key)
 * register themselves via `registerExecutor`. No adapter is present until a real
 * one is wired with its key — `getExecutor` returns undefined for a missing/
 * unconfigured provider so the coordinator can report "no key" cleanly.
 */

import type { ImageProvider } from './model-registry';

/** A request to generate images from one model. */
export interface GenRequest {
  /** The registry model id (e.g. 'gpt-image-1'). The adapter maps it to its provider call. */
  modelId: string;
  prompt: string;
  /** How many images to produce (K). Adapters batch natively where possible, else parallelize. */
  n: number;
  aspectRatio?: string;
  /** Input images (https or data URLs) for edit / multi-reference composition. */
  references?: string[];
}

/** One produced image. */
export interface GenImage {
  /** https or data URL of the image. */
  url: string;
  seed?: number;
}

/** Normalized adapter failure reasons (mirrors photolif's AdapterError taxonomy). */
export type GenErrorReason =
  | 'no_key'
  | 'moderated'
  | 'timeout'
  | 'rate_limited'
  | 'bad_request'
  | 'transport'
  | 'unknown';

/** Streamed events from a generation — tiles arrive as they finish, then a terminal event. */
export type GenEvent =
  | { type: 'tile'; image: GenImage; index: number }
  | { type: 'done'; images: GenImage[]; costUsd: number }
  | { type: 'error'; reason: GenErrorReason; detail?: string };

/** A provider adapter. Stateless per call; construction is cheap. */
export interface ImageExecutor {
  readonly provider: ImageProvider;
  /** True when the provider's API key is present — the adapter can actually run. */
  isConfigured(): boolean;
  /** Generate images, yielding each tile as it arrives, then a `done` (or `error`). */
  generate(req: GenRequest): AsyncIterable<GenEvent>;
}

/* ── Adapter registry ──────────────────────────────────────────────────────── */

const EXECUTORS = new Map<ImageProvider, ImageExecutor>();

/** Register a provider adapter (called once at module load by each adapter). */
export function registerExecutor(executor: ImageExecutor): void {
  EXECUTORS.set(executor.provider, executor);
}

/** The adapter for a provider, or undefined if none is registered. */
export function getExecutor(provider: ImageProvider): ImageExecutor | undefined {
  return EXECUTORS.get(provider);
}

/** Providers that have a registered, key-configured adapter right now. */
export function readyProviders(): ImageProvider[] {
  return Array.from(EXECUTORS.values())
    .filter((e) => e.isConfigured())
    .map((e) => e.provider);
}
