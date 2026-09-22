/**
 * THE MEDIA STORE — where a creation's actual BYTES live.
 *
 * Until now an asset's `url` was whatever the provider handed back, and that was the whole story.
 * For OpenAI and Gemini that happens to be the bytes themselves (a `data:` url), so those survived.
 * For Replicate and fal it is a LINK on their CDN, and those links expire: Brian's FLUX renders were
 * HTTP 404 three days after he paid for them, showing as broken tiles in his own gallery. "Save"
 * did not help — the save path copies the same url, so a saved asset rotted exactly as fast.
 *
 * So durability cannot be a property of which vendor served the render. We take the bytes.
 *
 * CONTENT-ADDRESSED: the id is the sha-256 of the content, so storing the same image twice costs one
 * file, and an id can never point at bytes that changed underneath it.
 *
 * SWAPPABLE: local disk is the dev implementation, not the design. Everything goes through
 * `putMedia` / `readMedia`, so S3 (or R2) replaces the two fs calls without touching a caller —
 * constructive, not a cage.
 */

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

/** Where blobs live in dev. Sits beside the dev DB; gitignored. */
const MEDIA_DIR = process.env.PXS_MEDIA_DIR ?? join(process.cwd(), '.pxs-media');

/** Refuse absurd payloads rather than filling the disk on a bad response. Video is the large case. */
const MAX_BYTES = 256 * 1024 * 1024;

/** A provider that hangs must not hang the persist step behind it. */
const FETCH_TIMEOUT_MS = 60_000;

/** The public path an ingested asset is served from. Stable — it is written into asset rows. */
export const MEDIA_URL_PREFIX = '/api/media/';

/** Map a content type to a file extension (the store keeps the type alongside the bytes). */
const EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
};

function extFor(contentType: string): string {
  return EXT[contentType.split(';')[0]!.trim().toLowerCase()] ?? 'bin';
}

/** True for a url we already own — ingesting one again would be a pointless round trip. */
export function isStoredMedia(url: string): boolean {
  return url.startsWith(MEDIA_URL_PREFIX);
}

/**
 * Store bytes and return the id. Content-addressed, so this is idempotent: the same bytes always
 * produce the same id and are written once.
 */
export async function putMedia(bytes: Uint8Array, contentType: string): Promise<string> {
  if (bytes.byteLength === 0) throw new Error('refusing to store empty media');
  if (bytes.byteLength > MAX_BYTES) throw new Error(`media too large: ${bytes.byteLength} bytes`);
  const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 40);
  const id = `${hash}.${extFor(contentType)}`;
  await mkdir(MEDIA_DIR, { recursive: true });
  const path = join(MEDIA_DIR, id);
  // Content-addressed → identical bytes, so an existing file is already correct. Skip the rewrite.
  try {
    await stat(path);
    return id;
  } catch {
    /* not stored yet */
  }
  await writeFile(path, bytes);
  return id;
}

/** Read stored bytes back. Returns null when the id is unknown — callers render a gap, never crash. */
export async function readMedia(id: string): Promise<{ bytes: Buffer; contentType: string } | null> {
  // The id is content-addressed hex + a known extension; anything else is not ours and must never
  // reach the filesystem as a path.
  if (!/^[0-9a-f]{40}\.[a-z0-9]{2,4}$/.test(id)) return null;
  try {
    const bytes = await readFile(join(MEDIA_DIR, id));
    const ext = id.split('.').pop()!;
    const contentType = Object.entries(EXT).find(([, e]) => e === ext)?.[0] ?? 'application/octet-stream';
    return { bytes, contentType };
  } catch {
    return null;
  }
}

/** Decode a `data:` url into bytes + type. Returns null when it isn't one (or is malformed). */
function decodeDataUrl(url: string): { bytes: Uint8Array; contentType: string } | null {
  const m = /^data:([^;,]+)(;base64)?,(.*)$/s.exec(url);
  if (!m) return null;
  const [, contentType, isBase64, payload] = m;
  try {
    const bytes = isBase64
      ? new Uint8Array(Buffer.from(payload!, 'base64'))
      : new TextEncoder().encode(decodeURIComponent(payload!));
    return { bytes, contentType: contentType || 'application/octet-stream' };
  } catch {
    return null;
  }
}

/**
 * Take ownership of a piece of media, whatever form the provider delivered it in, and return the
 * url Pixcel serves it from.
 *
 * `data:` is decoded and stored (which also gets multi-megabyte base64 out of the database rows).
 * `http(s)` is downloaded. Already-ours passes straight through.
 *
 * NEVER THROWS. A failed ingest returns the ORIGINAL url with `stored: false`, because a link that
 * works today beats losing the reference entirely — the asset is still recorded, still shown, and
 * still attributable. Callers surface `stored` so a fragile asset is a known fact, not a surprise.
 */
export async function ingestMedia(
  url: string,
): Promise<{ url: string; stored: boolean; bytes?: number; reason?: string }> {
  if (!url) return { url, stored: false, reason: 'empty url' };
  if (isStoredMedia(url)) return { url, stored: true };

  const inline = decodeDataUrl(url);
  if (inline) {
    try {
      const id = await putMedia(inline.bytes, inline.contentType);
      return { url: `${MEDIA_URL_PREFIX}${id}`, stored: true, bytes: inline.bytes.byteLength };
    } catch (err) {
      return { url, stored: false, reason: err instanceof Error ? err.message : 'inline store failed' };
    }
  }

  if (!/^https?:\/\//i.test(url)) return { url, stored: false, reason: 'unsupported url scheme' };

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) return { url, stored: false, reason: `provider returned ${res.status}` };
    const contentType = res.headers.get('content-type') ?? 'application/octet-stream';
    const bytes = new Uint8Array(await res.arrayBuffer());
    const id = await putMedia(bytes, contentType);
    return { url: `${MEDIA_URL_PREFIX}${id}`, stored: true, bytes: bytes.byteLength };
  } catch (err) {
    return { url, stored: false, reason: err instanceof Error ? err.message : 'download failed' };
  }
}
