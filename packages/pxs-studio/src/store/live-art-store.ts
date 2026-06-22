'use client';

import { create } from 'zustand';
import type { PXSFrame } from './pxs-store';
import { useGalleryStore } from './gallery-store';
import { useCenterStage } from './center-stage-store';
import { toastManager } from '../components/Toast';

/**
 * LIVE ART STORE — owns the live-artisan job lifecycle on the client so the running piece can
 * be shown on the MAIN canvas (center easel) while the right panel is just controls + chat.
 * The streaming tail lives here (not in a component), so the drawing keeps updating even if the
 * panel is closed or switched to Quick mode.
 */

export interface LiveFeedItem {
  kind: 'phase' | 'gesture' | 'review' | 'recall' | 'done' | 'user';
  text: string;
  gesture?: number;
  phase?: string;
  approved?: boolean;
}
export interface LiveJob {
  status: 'running' | 'done' | 'error' | 'paused' | 'cancelled';
  stage: string; // vision | shape | polish | qa | done
  phase: string; // mirror of stage (back-compat)
  brief?: string; // the committed VISION design brief (shown read-only)
  stagesPassed: string[];
  gestures: number; // passes painted
  statusMessage: string;
  liveThinking: string;
  feed: LiveFeedItem[];
  critiques: { phase: string; approved: boolean }[];
  latestFrame?: PXSFrame;
  frame?: PXSFrame;
  title?: string;
  cells?: number;
  durationMs?: number;
  tokensIn?: number;
  tokensOut?: number;
  costUsd?: number;
  error?: string;
}

/** One contract event (docs/PIXCEL-LIVE-SSE.md). */
interface LiveEvent {
  type: string;
  [k: string]: any;
}

/** Fold one contract event into the running view-model (the reducer keyed by `type`). */
function reduceEvent(prev: LiveJob | null, e: LiveEvent): LiveJob {
  const j: LiveJob = prev
    ? { ...prev, feed: prev.feed, stagesPassed: prev.stagesPassed, critiques: prev.critiques }
    : { status: 'running', stage: 'vision', phase: 'vision', stagesPassed: [], gestures: 0, statusMessage: 'Starting…', liveThinking: '', feed: [], critiques: [] };
  const pushFeed = (f: LiveFeedItem) => {
    j.feed = [...j.feed, f];
    if (j.feed.length > 200) j.feed = j.feed.slice(-200);
  };
  if (typeof e.costUsd === 'number') j.costUsd = e.costUsd;
  switch (e.type) {
    case 'job.started':
      return { ...j, status: 'running', stage: 'vision', phase: 'vision', statusMessage: 'Designing the vision…' };
    case 'cost.update':
      j.tokensIn = e.tokensIn ?? j.tokensIn;
      j.tokensOut = e.tokensOut ?? j.tokensOut;
      return j;
    case 'thinking.delta':
      j.liveThinking = e.text ?? '';
      return j;
    case 'vision.start':
      j.statusMessage = 'Designing the vision…';
      return j;
    case 'vision.committed':
      j.brief = e.brief ?? j.brief;
      pushFeed({ kind: 'phase', text: 'VISION committed — design locked', phase: 'vision' });
      return j;
    case 'stage.enter':
      j.stage = j.phase = e.stage;
      j.statusMessage = `${String(e.stage).toUpperCase()} — ${e.goal ?? ''}`;
      pushFeed({ kind: 'phase', text: `${String(e.stage).toUpperCase()} — ${e.goal ?? ''}`, phase: e.stage });
      return j;
    case 'pass.start':
      j.statusMessage = `Painting pass ${e.pass}${e.note ? ` — ${e.note}` : ''}…`;
      return j;
    case 'pass.done':
      j.gestures = e.pass ?? j.gestures + 1;
      if (e.frame) j.latestFrame = e.frame;
      j.statusMessage = `Pass ${e.pass}${e.note ? ` — ${e.note}` : ''}`;
      pushFeed({ kind: 'gesture', text: e.note || 'pass', gesture: e.pass, phase: e.stage });
      return j;
    case 'audit.start':
      j.statusMessage = `Art director reviewing the ${e.stage} phase…`;
      return j;
    case 'audit.verdict':
      j.critiques = [...j.critiques, { phase: e.stage, approved: !!e.approved }];
      pushFeed({ kind: 'review', text: e.approved ? `${String(e.stage).toUpperCase()} approved` : (e.issues || []).join('; '), approved: !!e.approved, phase: e.stage });
      return j;
    case 'stage.approved':
      j.stagesPassed = j.stagesPassed.includes(e.stage) ? j.stagesPassed : [...j.stagesPassed, e.stage];
      if (e.frame) j.latestFrame = e.frame;
      pushFeed({ kind: 'phase', text: `${String(e.stage).toUpperCase()} approved ✓ — locked`, phase: e.stage });
      return j;
    case 'keepbest.shipped':
      if (e.frame) j.latestFrame = e.frame;
      pushFeed({ kind: 'recall', text: `shipped the last approved state (${e.fromStage}) — ${e.reason}` });
      return j;
    case 'feedback.injected':
      return j; // the user's line is already shown locally on send
    case 'job.done':
      j.status = 'done';
      j.stage = j.phase = 'done';
      if (e.frame) { j.frame = e.frame; j.latestFrame = e.frame; j.cells = e.frame.cells?.length; }
      j.gestures = e.passes ?? j.gestures;
      j.durationMs = e.durationMs ?? j.durationMs;
      j.statusMessage = 'Done';
      pushFeed({ kind: 'done', text: 'Finished' });
      return j;
    case 'job.paused':
      j.status = 'paused';
      j.statusMessage = 'Paused — resumable';
      pushFeed({ kind: 'done', text: 'Paused — resumable' });
      return j;
    case 'job.cancelled':
      j.status = 'cancelled';
      j.statusMessage = 'Cancelled';
      pushFeed({ kind: 'done', text: 'Cancelled by user' });
      return j;
    case 'job.error':
      j.status = 'error';
      j.error = e.message ?? 'Generation failed';
      return j;
    default:
      return j;
  }
}

interface LiveArtState {
  jobId: string | null;
  job: LiveJob | null;
  startedAt: number;
  start: (o: { prompt: string; size: number; model: string }) => Promise<void>;
  resume: () => Promise<void>;
  control: (a: 'pause' | 'cancel') => Promise<void>;
  feedback: (text: string) => Promise<void>;
  clear: () => void;
}

/** Flatten a studio feed into readable transcript lines (saved with the piece). */
export function feedToTranscript(feed: LiveFeedItem[]): string[] {
  return (feed || []).map((f) => {
    if (f.kind === 'user') return `you → ${f.text}`;
    if (f.kind === 'phase') return `◆ ${f.text}`;
    if (f.kind === 'gesture') return `✎ g${f.gesture} ${f.text}`;
    if (f.kind === 'recall') return `↩ ${f.text}`;
    if (f.kind === 'done') return `✓ ${f.text}`;
    return `👁 ${f.approved ? '✓ ' : ''}${f.text}`; // review
  });
}

async function post(body: unknown): Promise<any> {
  const r = await fetch('/api/live-art', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return r.json();
}

export const useLiveArtStore = create<LiveArtState>((set, get) => {
  let savedFor: string | null = null;

  async function finalize(id: string) {
    if (savedFor === id) return;
    savedFor = id;
    try {
      const r = await fetch(`/api/live-art?id=${id}&full=1`);
      const jf = await r.json();
      const frame = jf.frame || jf.latestFrame;
      if (frame) {
        useGalleryStore.getState().addPiece({
          id: crypto.randomUUID(),
          title: jf.title || 'Live piece',
          prompt: jf.prompt || 'live piece',
          promptBy: 'human',
          composedBy: 'ai-composer',
          frame,
          createdAt: Date.now(),
          model: jf.model,
          session: { mode: 'sculpt', transcript: feedToTranscript(jf.feed || []) },
        });
        toastManager.success(`Created "${jf.title || 'piece'}" — in your Art gallery`);
      }
    } catch {
      /* ignore */
    }
  }

  /** Push the current view-model to the store + the center easel. */
  function applyJob(j: LiveJob) {
    set({ job: j });
    const f = j.latestFrame || j.frame || null;
    const stageLabel = j.stage && j.stage !== 'done' ? j.stage.toUpperCase() : '';
    useCenterStage.getState().set({
      active: true,
      mode: 'sculpt',
      frame: f,
      status: j.status,
      phase: j.phase,
      gestures: j.gestures,
      shimmer: !f,
      label: j.status === 'done' ? 'done' : j.gestures ? `${stageLabel ? stageLabel + ' · ' : ''}pass ${j.gestures}` : (j.statusMessage || 'painting…'),
      thinking: j.liveThinking || '',
      feed: j.feed || [],
    });
  }

  /**
   * Tail the detached job over a single streaming connection (NDJSON contract events,
   * docs/PIXCEL-LIVE-SSE.md). Each line is one event; a reducer keyed by `type` folds the stream
   * into the view-model (canvas from pass.done.frame, banner from stage.enter/approved, feed from
   * audit.verdict, think pane from thinking.delta, cost from cost.update). A fresh connection
   * replays from seq 0, so the reducer rebuilds the view; the job runs detached, so closing this
   * stream never stops it — we just reconnect to catch up. Idempotent on `frame`.
   */
  async function streamTail(id: string) {
    if (get().jobId !== id) return;
    let view: LiveJob | null = null; // fresh accumulation per connection (replay rebuilds it)
    try {
      const res = await fetch(`/api/live-art?id=${id}&stream=1`);
      if (!res.body) throw new Error('no stream body');
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() || '';
        for (const line of lines) {
          if (!line.trim()) continue;
          let ev: LiveEvent;
          try {
            ev = JSON.parse(line);
          } catch {
            continue;
          }
          if (get().jobId !== id) return; // user moved on
          view = reduceEvent(view, ev);
          applyJob(view);
          if (view.status === 'done') {
            await finalize(id);
            return;
          }
          if (view.status === 'error' || view.status === 'paused' || view.status === 'cancelled') return;
        }
      }
    } catch {
      /* stream dropped — reconnect below */
    }
    // Ended without a terminal status (server restart / dropped connection): reconnect to catch up.
    if (get().jobId === id && (get().job?.status ?? 'running') === 'running') {
      setTimeout(() => streamTail(id), 1000);
    }
  }

  return {
    jobId: null,
    job: null,
    startedAt: 0,
    start: async ({ prompt, size, model }) => {
      const j = await post({ prompt, size, model });
      if (j.jobId) {
        savedFor = null;
        set({ jobId: j.jobId, job: null, startedAt: Date.now() });
        useCenterStage.getState().set({ active: true, mode: 'sculpt', frame: null, status: 'running', shimmer: true, label: 'setting up…' });
        streamTail(j.jobId);
      } else {
        toastManager.error(j.error || 'Could not start the artist');
      }
    },
    resume: async () => {
      const id = get().jobId;
      if (!id) return;
      const j = await post({ resume: id });
      if (j.jobId) {
        savedFor = null;
        set({ jobId: j.jobId, startedAt: Date.now() });
        streamTail(j.jobId);
        toastManager.success('Resuming where it left off');
      } else {
        toastManager.error(j.error || 'Could not resume');
      }
    },
    control: async (a) => {
      const id = get().jobId;
      if (id) await post({ control: a, id });
    },
    feedback: async (text) => {
      const id = get().jobId;
      const t = text.trim();
      if (!id || !t) return;
      const j = await post({ feedback: t, id });
      if (j.ok) toastManager.success('Feedback sent — the artist will fold it in');
      else toastManager.error('Could not send (the run may have ended)');
    },
    clear: () => {
      set({ jobId: null, job: null, startedAt: 0 });
      useCenterStage.getState().clear();
    },
  };
});
