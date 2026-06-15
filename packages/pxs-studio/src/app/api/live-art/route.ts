import { startLiveJob, getLiveJob } from '../../../lib/live-jobs';

// LIVE ARTISAN — detached execution. The sculptor cascade runs longer than any HTTP request,
// so POST starts a background job and returns its id immediately; GET polls the job's status.
// The cascade itself lives in lib/live-jobs.ts (the immutable artist core). In-memory store
// (single Node process) for now — a DynamoDB layer can be added later without touching this.

export const runtime = 'nodejs';

const ALLOWED_MODELS = new Set(['claude-opus-4-8', 'claude-sonnet-4-6', 'claude-haiku-4-5']);

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: 'ANTHROPIC_API_KEY is not set. Add it to packages/pxs-studio/.env.local' },
      { status: 500 }
    );
  }
  let body: { prompt?: string; size?: number; model?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const prompt = (body.prompt ?? '').trim();
  if (!prompt) return Response.json({ error: 'prompt is required' }, { status: 400 });
  const size = Math.min(64, Math.max(8, Math.round(body.size ?? 24)));
  const model = body.model && ALLOWED_MODELS.has(body.model) ? body.model : 'claude-opus-4-8';

  const id = startLiveJob({ prompt, size, model, apiKey });
  return Response.json({ jobId: id });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return Response.json({ error: 'id is required' }, { status: 400 });
  const job = getLiveJob(id);
  if (!job) return Response.json({ error: 'job not found' }, { status: 404 });

  const full = url.searchParams.get('full') === '1';
  const { frames, ...rest } = job;
  return Response.json(full ? job : { ...rest, gestureFrames: frames.length });
}
