'use client';

import { create } from 'zustand';
import type { PXSFrame } from './pxs-store';
import { useGalleryStore } from './gallery-store';
import { toastManager } from '../components/Toast';

/**
 * ASYNC GENERATION — orchestration AROUND the immutable artist core.
 *
 * Generation takes minutes (you can't rush art). This store owns each job's lifecycle at the
 * MODULE level, independent of the chat panel: start a piece, then close the panel / switch
 * tabs / keep editing — the job keeps running and lands in the Art gallery (with a toast) when
 * it finishes. It never touches /api/generate-art's logic; it just runs the request and fans
 * the streamed events into job state. (In-flight jobs do not survive a full page reload —
 * finished pieces do, via the persisted gallery store.)
 */

export interface GenDraft {
  n: number;
  frame: PXSFrame;
  approved?: boolean;
  issues?: string[];
}

export type GenJobStatus = 'running' | 'done' | 'error';

export interface GenJob {
  id: string;
  prompt: string;
  size: number;
  model: string;
  state: GenJobStatus;
  plan: string;
  status: string;
  drafts: GenDraft[];
  frame?: PXSFrame;
  title?: string;
  palette?: string[];
  cells?: number;
  durationMs?: number;
  warning?: string;
  error?: string;
  createdAt: number;
}

interface GenJobsState {
  jobs: GenJob[];
  /** Kick off a generation. Returns the job id immediately; the work runs in the background. */
  start: (opts: { prompt: string; size: number; model: string }) => string;
  /** Remove a single job card from the list (does not affect a saved gallery piece). */
  dismiss: (id: string) => void;
  /** Number of jobs still generating. */
  runningCount: () => number;
}

export const useGenJobsStore = create<GenJobsState>((set, get) => {
  const patch = (id: string, updates: Partial<GenJob>) =>
    set((s) => ({ jobs: s.jobs.map((j) => (j.id === id ? { ...j, ...updates } : j)) }));

  async function run(id: string, prompt: string, size: number, model: string) {
    try {
      const res = await fetch('/api/generate-art', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, size, model }),
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        patch(id, { state: 'error', error: err.error || `HTTP ${res.status}` });
        toastManager.error(`"${prompt}" failed`);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.trim()) continue;
          let evt: any;
          try {
            evt = JSON.parse(line);
          } catch {
            continue;
          }
          if (evt.type === 'plan_delta') {
            set((s) => ({
              jobs: s.jobs.map((j) => (j.id === id ? { ...j, plan: j.plan + evt.text } : j)),
            }));
          } else if (evt.type === 'status') {
            patch(id, { status: evt.message });
          } else if (evt.type === 'iteration') {
            set((s) => ({
              jobs: s.jobs.map((j) =>
                j.id === id
                  ? {
                      ...j,
                      drafts: j.drafts.some((d) => d.n === evt.n)
                        ? j.drafts
                        : [...j.drafts, { n: evt.n, frame: evt.frame }],
                    }
                  : j
              ),
            }));
          } else if (evt.type === 'critique') {
            set((s) => ({
              jobs: s.jobs.map((j) =>
                j.id === id
                  ? {
                      ...j,
                      drafts: j.drafts.map((d) =>
                        d.n === evt.n ? { ...d, approved: evt.approved, issues: evt.issues } : d
                      ),
                    }
                  : j
              ),
            }));
          } else if (evt.type === 'frame') {
            patch(id, {
              state: 'done',
              status: '',
              frame: evt.frame,
              title: evt.title,
              palette: evt.palette,
              cells: evt.cells,
              model: evt.model,
              durationMs: evt.durationMs,
              warning: evt.warning,
            });
            // Land it in the Art gallery (persisted) — the async payoff.
            useGalleryStore.getState().addPiece({
              id: crypto.randomUUID(),
              title: evt.title,
              prompt,
              promptBy: 'human',
              composedBy: 'ai-composer',
              frame: evt.frame,
              createdAt: Date.now(),
              model: evt.model,
            });
            toastManager.success(`Created "${evt.title}" — in your Art gallery`);
          } else if (evt.type === 'error') {
            patch(id, { state: 'error', error: evt.message });
            toastManager.error(`"${prompt}" failed`);
          }
        }
      }
      // Stream ended without a frame/error event.
      if (get().jobs.find((j) => j.id === id)?.state === 'running') {
        patch(id, { state: 'error', error: 'Generation ended without a result.' });
      }
    } catch (err) {
      patch(id, { state: 'error', error: err instanceof Error ? err.message : 'Network error' });
      toastManager.error(`"${prompt}" failed`);
    }
  }

  return {
    jobs: [],
    start: ({ prompt, size, model }) => {
      const id = crypto.randomUUID();
      set((s) => ({
        jobs: [
          ...s.jobs,
          {
            id,
            prompt,
            size,
            model,
            state: 'running',
            plan: '',
            status: 'Starting…',
            drafts: [],
            createdAt: Date.now(),
          },
        ],
      }));
      // Fire and forget — the job lives in the store, not in any component.
      void run(id, prompt, size, model);
      return id;
    },
    dismiss: (id) => set((s) => ({ jobs: s.jobs.filter((j) => j.id !== id) })),
    runningCount: () => get().jobs.filter((j) => j.state === 'running').length,
  };
});
