/**
 * GETTING YOUR WORK OUT.
 *
 * The app could generate images and video and offered no way to save any of it. The only download
 * buttons in the whole studio were in the legacy pixel-art tabs — so a render you had paid for could
 * be looked at and nothing else. For a tool whose output is the product, that is not a missing
 * nicety; it is the last step of the job, missing.
 *
 * Deliberately plain: fetch the bytes, hand the browser a file. No new dependency, works for both
 * our own /api/media urls and a provider url that has not expired yet.
 */

/** A filename that says what the thing IS, because "download.mp4" in a Downloads folder says nothing. */
export function suggestFilename(opts: {
  kind?: 'image' | 'video' | string;
  title?: string;
  prompt?: string;
  modelLabel?: string;
  url: string;
}): string {
  const ext = extensionFor(opts.url, opts.kind);
  // Prefer the user's own title, then the prompt's opening words — the part they would recognise.
  const base =
    (opts.title ?? '').trim() ||
    (opts.prompt ?? '').trim().split(/\s+/).slice(0, 6).join(' ') ||
    (opts.modelLabel ?? '').trim() ||
    'pixcel';
  const slug =
    base
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'pixcel';
  const stamp = new Date().toISOString().slice(0, 10);
  return `${slug}-${stamp}.${ext}`;
}

function extensionFor(url: string, kind?: string): string {
  const m = /\.([a-z0-9]{2,4})(?:\?|$)/i.exec(url);
  if (m) return m[1]!.toLowerCase();
  const data = /^data:([^;,]+)/.exec(url);
  if (data) {
    const t = data[1]!.toLowerCase();
    if (t.includes('png')) return 'png';
    if (t.includes('webp')) return 'webp';
    if (t.includes('jpeg') || t.includes('jpg')) return 'jpg';
    if (t.includes('mp4')) return 'mp4';
  }
  return kind === 'video' ? 'mp4' : 'png';
}

/**
 * Download one asset.
 *
 * Fetches into a blob rather than pointing an anchor at the url, because a cross-origin link ignores
 * the `download` attribute and opens the file in a tab instead of saving it — which looks like the
 * button is broken. Returns false on failure so the caller can say so.
 */
export async function downloadAsset(opts: {
  url: string;
  kind?: 'image' | 'video' | string;
  title?: string;
  prompt?: string;
  modelLabel?: string;
  /**
   * The asset this is. Passing it records a VERDICT: you do not download a render you think is bad,
   * so the act of taking a copy is the judgement — collected from work you were doing anyway rather
   * than from a rating widget nobody fills in.
   */
  assetId?: string;
}): Promise<boolean> {
  try {
    const res = await fetch(opts.url);
    if (!res.ok) return false;
    const blob = await res.blob();
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = suggestFilename(opts);
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Freed on the next tick — revoking immediately can cancel the download in some browsers.
    setTimeout(() => URL.revokeObjectURL(href), 1000);

    // Fire-and-forget: a verdict that fails to record must never break the download it came from.
    if (opts.assetId) {
      void fetch(`/api/assets/${opts.assetId}/kept`, { method: 'POST' }).catch(() => {});
    }
    return true;
  } catch {
    return false;
  }
}
