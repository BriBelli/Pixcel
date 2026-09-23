/**
 * fal — IMAGE adapter.
 *
 * fal was wired for video only (Seedance, Kling, Happy Horse) while the roster has always declared
 * it `['image', 'video']`, so the Image picker simply had no fal option and FLUX was reachable only
 * through Replicate. That was an accident of what got built first, not a decision: fal is a
 * universal host exactly like Replicate, serving Qwen Image, Stable Diffusion 3.5 and the FLUX line
 * on the same queue API this file speaks.
 *
 * SHAPE: fal is endpoint-per-model. `fal-ai/qwen-image-max/text-to-image` and its `/edit` sibling
 * are different urls rather than one endpoint with a mode flag, so the model id carries BOTH the
 * base path and how to reach its edit variant. When references are attached we switch paths, which
 * is the same endpoint-per-task rule the video adapter follows.
 *
 * ASYNC: the queue is the same submit → poll → collect loop as fal-video. Images are much faster
 * than clips, so the ceiling is minutes rather than tens of minutes, but the loop is identical
 * because fal is identical — an image job can still sit in a queue.
 */

import { registerExecutor, type GenEvent, type GenErrorReason, type GenRequest, type ImageExecutor } from '../executor';

/** fal's own endpoint ids, per registry model. The registry `id` is ours; these are theirs. */
interface FalImageEndpoint {
  /** Text-to-image path. */
  generate: string;
  /** Image-to-image / edit path, when the model has one. Absent → references are not supported. */
  edit?: string;
  /** (low, high) USD per image, for the cost report. */
  costUsd: [number, number];
  /** The parameter this endpoint reads references from — they are not uniform across fal models. */
  referenceParam?: string;
  /** True when that parameter takes a LIST; false when it takes a single url. */
  referencesAreList?: boolean;
}

/**
 * Endpoint map. Deliberately small and high-end: the pantry principle is that budget/superseded
 * models pollute the fan-out, so this carries the models worth fanning to, not fal's whole catalog.
 * The Model agent discovers and researches the rest — this is the bootstrap floor.
 */
const ENDPOINTS: Record<string, FalImageEndpoint> = {
  'qwen-image-max': {
    generate: 'fal-ai/qwen-image-max/text-to-image',
    edit: 'fal-ai/qwen-image-max/edit',
    costUsd: [0.03, 0.06],
    referenceParam: 'image_urls',
    referencesAreList: true,
  },
  'qwen-image-3': {
    generate: 'alibaba/qwen-image-3/text-to-image',
    edit: 'alibaba/qwen-image-3/edit',
    costUsd: [0.02, 0.05],
    referenceParam: 'image_urls',
    referencesAreList: true,
  },
  'sd-3.5-large': {
    generate: 'fal-ai/stable-diffusion-v35-large',
    costUsd: [0.02, 0.04],
  },
};

/** Map our registry id → fal endpoint. Unknown ids are not guessed at. */
export function falEndpointFor(modelId: string): FalImageEndpoint | undefined {
  return ENDPOINTS[modelId];
}

const POLL_MS = 1200;
const MAX_WAIT_MS = 4 * 60 * 1000;

function statusFrom(code: number): GenErrorReason {
  if (code === 401 || code === 403) return 'no_key';
  if (code === 429) return 'rate_limited';
  if (code === 422 || code === 400) return 'bad_request';
  if (code >= 500) return 'transport';
  return 'unknown';
}

/** fal states a billing lock (and much else) in plain language — pass its own sentence through. */
function providerMessage(body: string): string | undefined {
  try {
    const j = JSON.parse(body) as { detail?: unknown; error?: unknown; message?: unknown };
    for (const v of [j.detail, j.error, j.message]) {
      if (typeof v === 'string' && v.trim()) return v.trim();
      if (Array.isArray(v) && typeof v[0] === 'object' && v[0] && 'msg' in v[0]) {
        return String((v[0] as { msg: unknown }).msg);
      }
    }
  } catch {
    /* not JSON */
  }
  return body.slice(0, 200) || undefined;
}

/** fal accepts `image_size` as a named enum or {width,height}; map our ratios onto its names. */
function imageSize(aspectRatio?: string): string {
  switch (aspectRatio) {
    case '16:9':
      return 'landscape_16_9';
    case '9:16':
      return 'portrait_16_9';
    case '4:3':
      return 'landscape_4_3';
    case '3:4':
      return 'portrait_4_3';
    case '1:1':
    default:
      return 'square_hd';
  }
}

interface Submitted {
  request_id?: string;
  status_url?: string;
  response_url?: string;
}
interface JobStatus {
  status?: string;
  queue_position?: number;
}
interface JobResult {
  images?: { url?: string; width?: number; height?: number }[];
  seed?: number;
}

class FalImageExecutor implements ImageExecutor {
  readonly provider = 'fal' as const;

  isConfigured(): boolean {
    return !!process.env.FAL_API_KEY;
  }

  async *generate(req: GenRequest): AsyncIterable<GenEvent> {
    const key = process.env.FAL_API_KEY;
    if (!key) {
      yield { type: 'error', reason: 'no_key' };
      return;
    }
    const endpoint = falEndpointFor(req.modelId);
    if (!endpoint) {
      yield { type: 'error', reason: 'bad_request', detail: `no fal endpoint for ${req.modelId}` };
      return;
    }

    const refs = (req.references ?? []).filter(Boolean);
    // References switch the ENDPOINT, not a flag — and a model with no edit path cannot take them.
    // Saying so beats silently dropping the reference and charging for a picture that ignored it.
    if (refs.length > 0 && !endpoint.edit) {
      yield {
        type: 'error',
        reason: 'bad_request',
        detail: `${req.modelId} on fal has no edit endpoint — it cannot take reference images`,
      };
      return;
    }
    const path = refs.length > 0 && endpoint.edit ? endpoint.edit : endpoint.generate;

    const input: Record<string, unknown> = {
      prompt: req.prompt,
      // fal batches natively via num_images on these endpoints.
      num_images: Math.max(1, req.n),
      image_size: imageSize(req.aspectRatio),
    };
    if (refs.length > 0 && endpoint.referenceParam) {
      input[endpoint.referenceParam] = endpoint.referencesAreList ? refs : refs[0];
    }

    const headers = { Authorization: `Key ${key}`, 'Content-Type': 'application/json' };

    // 1. SUBMIT.
    let submitted: Submitted | null = null;
    try {
      const res = await fetch(`https://queue.fal.run/${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        console.warn(`[fal-image] ${path} ${res.status}: ${body.slice(0, 300)}`);
        yield { type: 'error', reason: statusFrom(res.status), detail: providerMessage(body) };
        return;
      }
      submitted = (await res.json().catch(() => null)) as Submitted | null;
    } catch {
      yield { type: 'error', reason: 'transport' };
      return;
    }
    if (!submitted?.status_url) {
      yield { type: 'error', reason: 'unknown', detail: 'fal accepted the job but returned no handle' };
      return;
    }

    // 2. POLL.
    const started = Date.now();
    for (;;) {
      if (Date.now() - started > MAX_WAIT_MS) {
        yield { type: 'error', reason: 'timeout', detail: `no result after ${Math.round(MAX_WAIT_MS / 60000)} minutes` };
        return;
      }
      await new Promise((r) => setTimeout(r, POLL_MS));

      let status: JobStatus | null = null;
      try {
        const res = await fetch(submitted.status_url, { headers: { Authorization: `Key ${key}` } });
        if (!res.ok) {
          if (res.status >= 500) continue; // a transient status blip is not a failed render
          yield { type: 'error', reason: statusFrom(res.status) };
          return;
        }
        status = (await res.json().catch(() => null)) as JobStatus | null;
      } catch {
        continue; // keep polling through a dropped connection
      }

      const state = status?.status ?? '';
      if (state === 'COMPLETED') break;
      if (state === 'IN_QUEUE' || state === 'IN_PROGRESS') continue;

      // A failed job knows why, and the reason lives on the response endpoint.
      const detail = await this.failureDetail(submitted.response_url, key);
      console.warn(`[fal-image] ${path} job ${state || 'failed'}: ${detail || '(no detail)'}`);
      yield {
        type: 'error',
        reason: /moderat|safety|nsfw|policy/i.test(detail) ? 'moderated' : 'unknown',
        detail: detail || `fal reported status ${state || 'unknown'}`,
      };
      return;
    }

    // 3. COLLECT.
    let result: JobResult | null = null;
    try {
      const url = submitted.response_url ?? submitted.status_url.replace(/\/status$/, '');
      const res = await fetch(url, { headers: { Authorization: `Key ${key}` } });
      const body = await res.text().catch(() => '');
      if (!res.ok) {
        // fal reports a validation failure as a COMPLETED job whose RESULT body carries the 422.
        // Reading only the status would call this a success with no images.
        yield { type: 'error', reason: statusFrom(res.status), detail: providerMessage(body) };
        return;
      }
      result = JSON.parse(body) as JobResult;
    } catch {
      yield { type: 'error', reason: 'transport' };
      return;
    }

    const images = (result?.images ?? [])
      .map((img) => img?.url)
      .filter((u): u is string => typeof u === 'string' && u.length > 0)
      .map((url) => ({ url, seed: result?.seed }));

    if (images.length === 0) {
      yield { type: 'error', reason: 'unknown', detail: 'fal completed the job but returned no images' };
      return;
    }
    for (let i = 0; i < images.length; i++) yield { type: 'tile', image: images[i]!, index: i };
    yield {
      type: 'done',
      images,
      costUsd: Number((endpoint.costUsd[1] * images.length).toFixed(3)),
    };
  }

  /** Ask the response endpoint WHY a job failed — the status alone never says. */
  private async failureDetail(responseUrl: string | undefined, key: string): Promise<string> {
    if (!responseUrl) return '';
    try {
      const res = await fetch(responseUrl, { headers: { Authorization: `Key ${key}` } });
      return providerMessage(await res.text().catch(() => '')) ?? '';
    } catch {
      return '';
    }
  }
}

registerExecutor(new FalImageExecutor());

export { FalImageExecutor };
