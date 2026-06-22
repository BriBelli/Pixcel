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
  let brief: string | undefined;
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
    brief = prev.brief; // carry the committed VISION brief into the resumed run
  }

  if (resumeFrame) size = resumeFrame.cols;
  if (!prompt) return Response.json({ error: 'prompt is required' }, { status: 400 });

  const id = startLiveJob({ prompt, size, model, apiKey, resumeFrame, resumePhase, title, brief });
  return Response.json({ jobId: id, resumed: !!resumeFrame });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return Response.json({ error: 'id is required' }, { status: 400 });

  // STREAM TAIL — the live art show (docs/PIXCEL-LIVE-SSE.md). The job runs DETACHED (keeping
  // pause/feedback/resume/background); this endpoint tails its append-only CONTRACT EVENT LOG by
  // `seq` — one JSON event per line — so the client reducer can drive every panel (canvas from
  // pass.done.frame, phase banner from stage.enter/approved, critique feed from audit.verdict,
  // think pane from thinking.delta, cost meter from cost.update). A fresh connection replays from
  // seq 0 (catch-up); reconnecting after a drop resyncs from the next pass.done.frame.
  // Disconnecting stops the tail, NOT the job. The heavy frames[] history is never shipped.
  if (url.searchParams.get('stream') === '1') {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));
        let lastSeq = -1; // highest event seq already sent
        let lastThinkLen = -1; // last thinking length we flushed (thinking is a tail-side heartbeat)
        // Safety bound: a job can't outrun this (a 64² piece is minutes). ~33 min at 200ms.
        for (let tick = 0; tick < 10000; tick++) {
          if (req.signal.aborted) break;
          const job = getLiveJob(id);
          if (!job) {
            send({ type: 'job.error', message: 'job not found' });
            break;
          }
          // Drain any new contract events (in seq order).
          const fresh = job.events.filter((e) => e.seq > lastSeq);
          for (const ev of fresh) {
            send(ev);
            lastSeq = ev.seq;
          }
          // Reloaded-from-disk jobs lose their in-memory event log — synthesize a terminal event
          // from the snapshot so a late connection still resolves to the result.
          if (!job.events.length && job.status !== 'running' && lastSeq < 0) {
            if (job.status === 'done' && job.frame) {
              send({ type: 'vision.committed', brief: job.brief ?? '' });
              send({ type: 'job.done', frame: job.frame, passes: job.gestures, stagesPassed: job.stagesPassed ?? [], costUsd: job.costUsd ?? 0, durationMs: job.durationMs ?? 0 });
            } else if (job.status === 'error') {
              send({ type: 'job.error', message: job.error ?? 'failed' });
            } else {
              send({ type: 'job.paused', reason: job.statusMessage });
            }
            lastSeq = 0;
          }
          // Thinking heartbeat — high-frequency, NOT stored in the event log; emitted tail-side
          // from the live buffer (client replaces, not appends).
          if (job.liveThinking.length !== lastThinkLen) {
            lastThinkLen = job.liveThinking.length;
            send({ type: 'thinking.delta', stage: job.stage, text: job.liveThinking });
          }
          if (job.status !== 'running') break;
          await new Promise((r) => setTimeout(r, 200));
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
  const { frames, events, ...rest } = job;
  return Response.json(full ? { ...job, events: undefined } : { ...rest, gestureFrames: frames.length });
}
