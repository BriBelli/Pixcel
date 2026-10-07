/**
 * ASSEMBLY — turning a sequence of clips into one scene.
 *
 * Chaining produces N clips in order. Until now that is where it stopped: three files sitting in a
 * gallery, with nothing to join them and no way to get them out. You could generate, but you could
 * not finish — which is the difference between a tool that makes clips and one that makes films.
 *
 * Uses fal's hosted ffmpeg (`ffmpeg-api/merge-videos`), the same service already proven here for
 * last-frame extraction. No local ffmpeg, no new dependency.
 *
 * THE CONSTRAINT THAT SHAPES THIS FILE: fal fetches the videos itself, and our clips live at
 * /api/media/... — a url only this machine can resolve. The provider's own url expires, which is the
 * whole reason we take the bytes in the first place, so assembly cannot lean on it either. So we
 * UPLOAD each clip to fal's storage first and merge from there. That round trip is the price of
 * owning our media, and it is the right trade: a scene you can assemble next month beats one you
 * could only assemble in the hour after rendering.
 */

const POLL_MS = 2000;
const MAX_WAIT_MS = 10 * 60 * 1000;

export interface AssembledScene {
  url: string;
  durationSec?: number;
  width?: number;
  height?: number;
  fps?: number;
  bytes?: number;
}

interface Submitted {
  status_url?: string;
  response_url?: string;
}

/**
 * Put bytes somewhere fal can reach, and return that public url.
 *
 * Returns null rather than throwing — a clip that cannot be uploaded should degrade into a clear
 * message about THAT clip, not an exception that loses the whole assembly.
 */
async function uploadToFal(bytes: Uint8Array, fileName: string, contentType: string, key: string): Promise<string | null> {
  try {
    const init = await fetch('https://rest.alpha.fal.ai/storage/upload/initiate?storage_type=fal-cdn-v3', {
      method: 'POST',
      headers: { Authorization: `Key ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content_type: contentType, file_name: fileName }),
    });
    if (!init.ok) return null;
    const { upload_url, file_url } = (await init.json()) as { upload_url?: string; file_url?: string };
    if (!upload_url || !file_url) return null;
    const put = await fetch(upload_url, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: new Uint8Array(bytes),
    });
    return put.ok ? file_url : null;
  } catch {
    return null;
  }
}

/** Make a clip reachable by fal: an https url passes through, our own bytes get uploaded. */
export async function reachableVideoUrl(
  source: { url: string; bytes?: Uint8Array; fileName?: string },
  key: string,
): Promise<string | null> {
  // Already public — fal can fetch it directly, so skip the upload entirely.
  if (/^https?:\/\//i.test(source.url) && !source.url.startsWith('/')) return source.url;
  if (!source.bytes) return null;
  return uploadToFal(source.bytes, source.fileName ?? 'clip.mp4', 'video/mp4', key);
}

/**
 * Join clips, in order, into one video.
 *
 * Never throws: returns `{ scene: null, reason }` so a failed assembly reports WHY — the clips it
 * was made from are untouched and the user can try again.
 */
export async function mergeVideos(videoUrls: string[]): Promise<{ scene: AssembledScene | null; reason?: string }> {
  const key = process.env.FAL_API_KEY;
  if (!key) return { scene: null, reason: 'no FAL_API_KEY — assembly is unavailable' };
  if (videoUrls.length === 0) return { scene: null, reason: 'nothing to assemble' };
  if (videoUrls.length === 1) {
    // One clip IS the scene. Paying for a merge that changes nothing would be a waste and a
    // re-encode, so it passes straight through.
    return { scene: { url: videoUrls[0]! } };
  }

  const headers = { Authorization: `Key ${key}`, 'Content-Type': 'application/json' };
  let submitted: Submitted | null = null;
  try {
    const res = await fetch('https://queue.fal.run/fal-ai/ffmpeg-api/merge-videos', {
      method: 'POST',
      headers,
      body: JSON.stringify({ video_urls: videoUrls }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { scene: null, reason: `merge returned ${res.status}: ${body.slice(0, 160)}` };
    }
    submitted = (await res.json().catch(() => null)) as Submitted | null;
  } catch (err) {
    return { scene: null, reason: err instanceof Error ? err.message : 'merge transport error' };
  }
  if (!submitted?.status_url) return { scene: null, reason: 'merge returned no job handle' };

  const started = Date.now();
  for (;;) {
    if (Date.now() - started > MAX_WAIT_MS) return { scene: null, reason: 'merge timed out' };
    await new Promise((r) => setTimeout(r, POLL_MS));
    try {
      const res = await fetch(submitted.status_url, { headers: { Authorization: `Key ${key}` } });
      if (!res.ok) {
        if (res.status >= 500) continue;
        return { scene: null, reason: `merge status ${res.status}` };
      }
      const status = (await res.json().catch(() => null)) as { status?: string } | null;
      if (status?.status === 'COMPLETED') break;
      if (status?.status === 'IN_QUEUE' || status?.status === 'IN_PROGRESS') continue;
      return { scene: null, reason: `merge reported ${status?.status ?? 'an unknown state'}` };
    } catch {
      continue; // a dropped poll is not a failed merge
    }
  }

  try {
    const url = submitted.response_url ?? submitted.status_url.replace(/\/status$/, '');
    const res = await fetch(url, { headers: { Authorization: `Key ${key}` } });
    const body = await res.text().catch(() => '');
    if (!res.ok) return { scene: null, reason: `merge result ${res.status}: ${body.slice(0, 160)}` };
    const json = JSON.parse(body) as {
      video?: { url?: string; file_size?: number };
      metadata?: { total_duration?: number; final_fps?: number; final_width?: number; final_height?: number };
    };
    if (!json.video?.url) return { scene: null, reason: 'merge completed but returned no video' };
    return {
      scene: {
        url: json.video.url,
        bytes: json.video.file_size,
        durationSec: json.metadata?.total_duration,
        fps: json.metadata?.final_fps,
        width: json.metadata?.final_width,
        height: json.metadata?.final_height,
      },
    };
  } catch (err) {
    return { scene: null, reason: err instanceof Error ? err.message : 'merge result unreadable' };
  }
}
