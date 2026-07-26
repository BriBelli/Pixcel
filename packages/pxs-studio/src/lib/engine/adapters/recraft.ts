/**
 * Recraft adapter — the vector / SVG / brand specialist (recraft-v3).
 *
 * Implements the ImageExecutor seam over Recraft's images API (raw fetch; reads RECRAFT_API_KEY).
 * One image per call → N images = N parallel calls, each tile streamed on completion. Output is a
 * hosted URL. Endpoint/model strings are current-as-seeded (confirmed in the doc-lookup pass).
 */

import {
  registerExecutor,
  type GenEvent,
  type GenImage,
  type GenErrorReason,
  type GenRequest,
  type ImageExecutor,
} from '../executor';
import { reasonForStatus } from './_util';

const API_MODEL: Record<string, string> = { 'recraft-v3': 'recraftv3' };

/** Recraft's supported sizes, mapped from our aspect ratios. */
const SIZE_FOR: Record<string, string> = {
  '1:1': '1024x1024',
  '16:9': '1536x1024',
  '3:2': '1536x1024',
  '9:16': '1024x1536',
  '2:3': '1024x1536',
};
const sizeFor = (ar?: string): string => (ar && SIZE_FOR[ar]) || '1024x1024';

const COST_PER_IMAGE = 0.04;

class RecraftExecutor implements ImageExecutor {
  readonly provider = 'recraft' as const;

  isConfigured(): boolean {
    return !!process.env.RECRAFT_API_KEY;
  }

  private async one(req: GenRequest, key: string): Promise<{ image?: GenImage; error?: GenErrorReason }> {
    const model = API_MODEL[req.modelId] ?? 'recraftv3';
    let res: Response;
    try {
      res = await fetch('https://external.api.recraft.ai/v1/images/generations', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: req.prompt, model, size: sizeFor(req.aspectRatio) }),
      });
    } catch {
      return { error: 'transport' };
    }
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      if (detail) console.warn(`[recraft] ${res.status}: ${detail.slice(0, 300)}`);
      return { error: reasonForStatus(res.status) };
    }
    const data = (await res.json().catch(() => null)) as { data?: Array<{ url?: string; b64_json?: string }> } | null;
    const d = data?.data?.[0];
    const url = d?.url ?? (d?.b64_json ? `data:image/png;base64,${d.b64_json}` : null);
    return url ? { image: { url } } : { error: 'unknown' };
  }

  async *generate(req: GenRequest): AsyncIterable<GenEvent> {
    const key = process.env.RECRAFT_API_KEY;
    if (!key) {
      yield { type: 'error', reason: 'no_key' };
      return;
    }

    const n = Math.max(1, req.n);
    const tagged = Array.from({ length: n }, (_, i) => this.one(req, key).then((r) => ({ i, r })));
    const pending = new Map(tagged.map((p, i) => [i, p]));

    const images: GenImage[] = [];
    let firstError: GenErrorReason | undefined;
    let index = 0;

    while (pending.size > 0) {
      const { i, r } = await Promise.race(pending.values());
      pending.delete(i);
      if (r.image) {
        images.push(r.image);
        yield { type: 'tile', image: r.image, index: index++ };
      } else if (r.error && !firstError) {
        firstError = r.error;
      }
    }

    if (images.length === 0) {
      yield { type: 'error', reason: firstError ?? 'unknown' };
      return;
    }
    yield { type: 'done', images, costUsd: Number((COST_PER_IMAGE * images.length).toFixed(3)) };
  }
}

registerExecutor(new RecraftExecutor());

export { RecraftExecutor };
