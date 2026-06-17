import { startLiveJob, getLiveJob, controlLiveJob, feedbackLiveJob } from '../../../lib/live-jobs';
import type { PXSFrame } from '../../../store/pxs-store';

// LIVE ARTISAN — detached execution. POST starts (or RESUMES) a background job and returns its
// id immediately; GET polls status. Cascade + persistence live in lib/live-jobs.ts. Resume:
// pass {resume: <jobId>} to continue a saved/interrupted job, or {resumeFrame, resumePhase} to
// start from any saved frame (e.g. finishing a piece that stopped at 90%).

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
  let body: {
    prompt?: string;
    size?: number;
    model?: string;
    resume?: string;
    resumeFrame?: PXSFrame;
    resumePhase?: string;
    title?: string;
    control?: 'pause' | 'cancel';
    feedback?: string;
    id?: string;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Control an in-flight job (pause = checkpoint + stop, resumable; cancel = stop).
  if (body.control && body.id) {
    const ok = controlLiveJob(body.id, body.control);
    return Response.json({ ok, action: body.control });
  }

  // Live human feedback injected into a running job.
  if (body.feedback && body.id) {
    const ok = feedbackLiveJob(body.id, body.feedback);
    return Response.json({ ok });
  }

  const model = body.model && ALLOWED_MODELS.has(body.model) ? body.model : 'claude-opus-4-8';
  let prompt = (body.prompt ?? '').trim();
  let resumeFrame = body.resumeFrame;
  let resumePhase = body.resumePhase;
  let title = body.title;
  let size = Math.min(64, Math.max(8, Math.round(body.size ?? 24)));

  // Resume a saved/interrupted job by id.
  if (body.resume) {
    const prev = getLiveJob(body.resume);
    if (!prev || !prev.latestFrame) {
      return Response.json({ error: 'no resumable job found for that id' }, { status: 404 });
    }
    resumeFrame = prev.latestFrame;
    resumePhase = resumePhase || prev.phase;
    title = title || prev.title;
    if (!prompt) prompt = prev.prompt;
    size = prev.size;
  }

  if (resumeFrame) size = resumeFrame.cols;
  if (!prompt) return Response.json({ error: 'prompt is required' }, { status: 400 });

  const id = startLiveJob({ prompt, size, model, apiKey, resumeFrame, resumePhase, title });
  return Response.json({ jobId: id, resumed: !!resumeFrame });
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
