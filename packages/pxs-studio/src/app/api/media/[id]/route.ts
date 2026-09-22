import { readMedia } from '../../../../lib/db/media-store';

export const runtime = 'nodejs';

/**
 * GET /api/media/:id — serve a stored creation's bytes.
 *
 * This is the url that lives in an asset row once it has been ingested, replacing the provider CDN
 * link that used to be there and used to expire. Ids are content-addressed, so the bytes behind one
 * can never change: safe to cache forever.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const media = await readMedia(id);
  if (!media) return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(media.bytes), {
    headers: {
      'Content-Type': media.contentType,
      'Content-Length': String(media.bytes.byteLength),
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
