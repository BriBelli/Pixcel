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
  phase: string;
  gestures: number;
  statusMessage: string;
  liveThinking: string;
  feed: LiveFeedItem[];
  critiques: { phase: string; approved: boolean }[];
  latestFrame?: PXSFrame;
  frame?: PXSFrame;
  title?: string;
  cells?: number;
  durationMs?: number;
  error?: string;
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

  /** Push one job snapshot to the store + the center easel. */
  function applyJob(jIn: LiveJob) {
    // The tail omits the heavy frame on metadata-only ticks (e.g. while thinking) — keep the last.
    const prev = get().job;
    const j: LiveJob = jIn.latestFrame ? jIn : { ...jIn, latestFrame: prev?.latestFrame };
    set({ job: j });
    const f = j.latestFrame || j.frame || null;
    useCenterStage.getState().set({
      active: true,
      mode: 'sculpt',
      frame: f,
      status: j.status,
      phase: j.phase,
      gestures: j.gestures,
      shimmer: !f,
      label: j.status === 'done' ? 'done' : j.gestures ? `draft ${j.gestures}` : (j.statusMessage || 'drawing…'),
      thinking: j.liveThinking || '',
      feed: j.feed || [],
    });
  }

  /**
   * Tail the detached job over a single streaming connection (SSE-style ndjson). The server
   * pushes a snapshot whenever the job changes — including the partial frame painted ROW BY ROW
   * as the model writes the char-map, so the easel shows a real live scan-line reveal. The job
   * runs detached, so closing this stream never stops it; we just reconnect to catch up.
   */
  async function streamTail(id: string) {
    if (get().jobId !== id) return;
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
          let j: LiveJob & { error?: string };
          try {
            j = JSON.parse(line);
          } catch {
            continue;
          }
          if (get().jobId !== id) return; // user moved on
          if ((j as any).error) continue;
          applyJob(j);
          if (j.status === 'done') {
            await finalize(id);
            return;
          }
          if (j.status === 'error' || j.status === 'paused' || j.status === 'cancelled') return;
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
