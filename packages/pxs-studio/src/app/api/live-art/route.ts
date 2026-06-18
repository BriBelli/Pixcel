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

  // STREAM TAIL — the live art show. The job runs DETACHED (keeping pause/feedback/resume/
  // background); this endpoint tails its in-memory state and pushes an update whenever it
  // changes — including the partial frame painted ROW BY ROW as the model writes the char-map.
  // The browser paints exactly what's arrived: a real scan-line reveal from the real stream.
  // Disconnecting stops the tail, NOT the job — reopen to catch up. Heavy frames[] is omitted.
  if (url.searchParams.get('stream') === '1') {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));
        let lastSig = '';
        // Safety bound: a job can't outrun this (a 64² piece is minutes). ~20 min at 120ms.
        for (let tick = 0; tick < 10000; tick++) {
          if (req.signal.aborted) break;
          const job = getLiveJob(id);
          if (!job) {
            send({ error: 'job not found' });
            break;
          }
          const { frames, ...rest } = job;
          // Only push when something the client cares about actually changed; and only ship the
          // (heavy) frame when the FRAME itself changed — during thinking we send light metadata
          // and the client keeps the last frame. Keeps the stream cheap.
          const f = job.latestFrame;
          const fsig = f ? `${f.cols}x${f.rows}:${f.cells.length}:${f.cells.reduce((h, c) => (h * 31 + c.x + c.y + c.color.charCodeAt(1)) | 0, 0)}` : 'none';
          const metaSig = `${job.status}|${job.phase}|${job.gestures}|${job.statusMessage}|${job.liveThinking.length}|${job.feed.length}`;
          const sig = `${metaSig}|${fsig}`;
          if (sig !== lastSig) {
            const frameChanged = lastSig.split('|').pop() !== fsig;
            lastSig = sig;
            if (!frameChanged) delete (rest as { latestFrame?: unknown }).latestFrame;
            send(rest);
          }
          if (job.status !== 'running') break;
          await new Promise((r) => setTimeout(r, 120));
        }
        controller.close();
      },
    });
    return new Response(stream, {
      headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }

  const job = getLiveJob(id);
  if (!job) return Response.json({ error: 'job not found' }, { status: 404 });

  const full = url.searchParams.get('full') === '1';
  const { frames, ...rest } = job;
  return Response.json(full ? job : { ...rest, gestureFrames: frames.length });
}
