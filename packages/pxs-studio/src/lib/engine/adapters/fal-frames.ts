/**
 * LAST-FRAME EXTRACTION — the primitive clip chaining is built on.
 *
 * Chaining needs each clip to open on the still the previous one ended with, which means getting a
 * frame out of an mp4. ffmpeg is not installed on this machine and making the whole feature depend
 * on a brew install is the wrong trade, so this uses fal's hosted `ffmpeg-api/extract-frame`
 * (verified live: `frame_type: "last"` returns a 1280x720 JPEG of the final frame).
 *
 * ONE CONSTRAINT WORTH KNOWING: fal fetches the video itself, so it needs a url IT can reach. Our
 * own stored clips live at /api/media/... on localhost, which fal cannot see. Extraction therefore
 * runs against the PROVIDER's url, while it is still fresh — which is exactly when chaining runs,
 * moments after the clip was produced. Durability is handled separately by ingesting the same clip
 * into our own store; the two are independent on purpose.
 */

const POLL_MS = 1000;
const MAX_WAIT_MS = 90_000;

export interface ExtractedFrame {
  url: string;
  width?: number;
  height?: number;
}

interface Submitted {
  status_url?: string;
  response_url?: string;
}

/**
 * Pull the FIRST or LAST frame out of a video.
 *
 * Returns null rather than throwing: a chain that cannot get its bridging frame should report a
 * clear stop with the clips it already produced intact, not explode mid-sequence.
 */
export async function extractFrame(
  videoUrl: string,
  which: 'first' | 'last' = 'last',
): Promise<{ frame: ExtractedFrame | null; reason?: string }> {
  const key = process.env.FAL_API_KEY;
  if (!key) return { frame: null, reason: 'no FAL_API_KEY — frame extraction is unavailable' };
  if (!/^https?:\/\//i.test(videoUrl)) {
    // The commonest way to get this wrong: handing it our own stored url, which fal cannot fetch.
    return { frame: null, reason: 'frame extraction needs a publicly reachable video url' };
  }

  const headers = { Authorization: `Key ${key}`, 'Content-Type': 'application/json' };
  let submitted: Submitted | null = null;
  try {
    const res = await fetch('https://queue.fal.run/fal-ai/ffmpeg-api/extract-frame', {
      method: 'POST',
      headers,
      body: JSON.stringify({ video_url: videoUrl, frame_type: which }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { frame: null, reason: `extract-frame returned ${res.status}: ${body.slice(0, 160)}` };
    }
    submitted = (await res.json().catch(() => null)) as Submitted | null;
  } catch (err) {
    return { frame: null, reason: err instanceof Error ? err.message : 'extract-frame transport error' };
  }
  if (!submitted?.status_url) return { frame: null, reason: 'extract-frame returned no job handle' };

  const started = Date.now();
  for (;;) {
    if (Date.now() - started > MAX_WAIT_MS) return { frame: null, reason: 'extract-frame timed out' };
    await new Promise((r) => setTimeout(r, POLL_MS));
    try {
      const res = await fetch(submitted.status_url, { headers: { Authorization: `Key ${key}` } });
      if (!res.ok) {
        if (res.status >= 500) continue;
        return { frame: null, reason: `extract-frame status ${res.status}` };
      }
      const status = (await res.json().catch(() => null)) as { status?: string } | null;
      if (status?.status === 'COMPLETED') break;
      if (status?.status === 'IN_QUEUE' || status?.status === 'IN_PROGRESS') continue;
      return { frame: null, reason: `extract-frame reported ${status?.status ?? 'an unknown state'}` };
    } catch {
      continue; // keep polling through a dropped connection
    }
  }

  try {
    const url = submitted.response_url ?? submitted.status_url.replace(/\/status$/, '');
    const res = await fetch(url, { headers: { Authorization: `Key ${key}` } });
    const body = await res.text().catch(() => '');
    if (!res.ok) return { frame: null, reason: `extract-frame result ${res.status}: ${body.slice(0, 160)}` };
    const json = JSON.parse(body) as { images?: { url?: string; width?: number; height?: number }[] };
    const img = json.images?.[0];
    if (!img?.url) return { frame: null, reason: 'extract-frame completed but returned no image' };
    return { frame: { url: img.url, width: img.width, height: img.height } };
  } catch (err) {
    return { frame: null, reason: err instanceof Error ? err.message : 'extract-frame result unreadable' };
  }
}
