/**
 * Shared adapter helpers — reference fetching + a common HTTP→reason mapping. Kept tiny; adapters
 * stay otherwise self-contained (each owns its provider's request shape).
 */

import type { GenErrorReason } from '../executor';

/** Fetch a reference (data: or http[s]) into a Blob for multipart upload, or null on failure. */
export async function fetchAsBlob(ref: string): Promise<Blob | null> {
  try {
    if (ref.startsWith('data:')) {
      const m = /^data:([^;]+);base64,(.*)$/.exec(ref);
      if (!m) return null;
      return new Blob([Buffer.from(m[2], 'base64')], { type: m[1] });
    }
    const res = await fetch(ref);
    if (!res.ok) return null;
    return await res.blob();
  } catch {
    return null;
  }
}

/** The common HTTP-status → normalized reason mapping. Adapters override where a provider differs
 *  (e.g. Gemini's 403 = billing, not auth). */
export function reasonForStatus(status: number): GenErrorReason {
  if (status === 429) return 'rate_limited';
  if (status === 401 || status === 403) return 'no_key';
  if (status === 400 || status === 422) return 'bad_request';
  if (status >= 500) return 'transport';
  return 'unknown';
}
