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
  subjectClass?: string; // iconic | figure | action | scene (sets review rigor)
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
  size?: number; // long-edge budget (for the rain field before dims are known)
  // ---- Matrix live-show render hints (set by the reducer off the stream) ----
  dims?: { cols: number; rows: number };
  paletteHexes?: string[];
  pendingReveal?: { x: number; y: number; color: string }[];
  revealSeq?: number;
  lastVerdict?: { approved: boolean; flaw: string };
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
      return { ...j, status: 'running', stage: 'vision', phase: 'vision', statusMessage: 'Designing the vision…', size: typeof e.size === 'number' ? e.size : j.size };
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
      if (e.subjectClass) j.subjectClass = e.subjectClass;
      if (typeof e.cols === 'number' && typeof e.rows === 'number') j.dims = { cols: e.cols, rows: e.rows };
      if (Array.isArray(e.palette)) j.paletteHexes = (e.palette as { hex?: string }[]).map((p) => p.hex || '').filter(Boolean);
      pushFeed({ kind: 'phase', text: `VISION committed — design locked${e.complexity ? ` · ${e.complexity}` : ''}${j.dims ? ` · ${j.dims.cols}×${j.dims.rows}` : ''}`, phase: 'vision' });
      return j;
    case 'stage.enter':
      j.stage = j.phase = e.stage;
      j.statusMessage = `${String(e.stage).toUpperCase()} — ${e.goal ?? ''}`;
      pushFeed({ kind: 'phase', text: `${String(e.stage).toUpperCase()} — ${e.goal ?? ''}`, phase: e.stage });
      return j;
    case 'pass.start':
      j.statusMessage = `Painting pass ${e.pass}${e.note ? ` — ${e.note}` : ''}…`;
      return j;
    case 'pass.delta':
      // The model's actual cell stream → drives the Matrix glyph→color lock (the real reveal).
      if (Array.isArray(e.cells)) {
        j.pendingReveal = e.cells as { x: number; y: number; color: string }[];
        j.revealSeq = (j.revealSeq ?? 0) + 1;
      }
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
      j.lastVerdict = { approved: !!e.approved, flaw: (e.issues || []).join('; ') };
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
  reviewing: boolean; // job finished, awaiting the HUMAN keep/reject verdict (no auto-save)
  accepted: boolean; // the human kept it → saved to the gallery
  start: (o: { prompt: string; size: number; model: string; cols?: number; rows?: number }) => Promise<void>;
  resume: () => Promise<void>;
  control: (a: 'pause' | 'cancel') => Promise<void>;
  feedback: (text: string) => Promise<void>;
  accept: () => Promise<void>;
  reject: (note?: string) => Promise<void>;
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

  /** Human KEPT it → save to the gallery (the only path that saves). Idempotent per job. */
  async function saveAccepted(id: string) {
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
        toastManager.success(`Kept "${jf.title || 'piece'}" — saved to your Art gallery`);
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
            // HONESTY GATE: do NOT auto-save or claim "hero-grade" — the artist proposes, the
            // HUMAN disposes. Surface it for keep/reject; only an explicit keep saves to the
            // gallery (and that judgment is the Option-3 training signal). See docs canon.
            set({ reviewing: true });
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
    reviewing: false,
    accepted: false,
    start: async ({ prompt, size, model, cols, rows }) => {
      const j = await post({ prompt, size, model, cols, rows });
      if (j.jobId) {
        savedFor = null;
        set({ jobId: j.jobId, job: null, startedAt: Date.now(), reviewing: false, accepted: false });
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
        set({ jobId: j.jobId, startedAt: Date.now(), reviewing: false, accepted: false });
        streamTail(j.jobId);
        toastManager.success('Resuming where it left off');
      } else {
        toastManager.error(j.error || 'Could not resume');
      }
    },
    accept: async () => {
      const id = get().jobId;
      if (!id) return;
      await saveAccepted(id);
      post({ verdict: 'keep', id }).catch(() => {}); // record the human judgment (Option-3 corpus)
      set({ reviewing: false, accepted: true });
    },
    reject: async (note?: string) => {
      const id = get().jobId;
      if (!id) return;
      post({ verdict: 'reject', id, note: note?.trim() || undefined }).catch(() => {});
      set({ reviewing: false });
      if (note && note.trim()) {
        // Push back: resume the piece and fold the redirect in as live feedback.
        const j = await post({ resume: id });
        if (j.jobId) {
          savedFor = null;
          set({ jobId: j.jobId, startedAt: Date.now(), reviewing: false, accepted: false });
          streamTail(j.jobId);
          post({ feedback: note.trim(), id: j.jobId }).catch(() => {});
          toastManager.success('Pushing back — the artist will rework it with your note');
        } else {
          toastManager.error(j.error || 'Could not reopen the piece');
        }
      } else {
        toastManager.success('Discarded — not saved');
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
      set({ jobId: null, job: null, startedAt: 0, reviewing: false, accepted: false });
      useCenterStage.getState().clear();
    },
  };
});
