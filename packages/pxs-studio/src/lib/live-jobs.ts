import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import os from 'os';
import type { PXSFrame } from '../store/pxs-store';
import { frameToPngBase64 } from './render-frame';
import { artistLoop, judgeBest, paletteOf, DRAW_EFFORT, DEFAULT_MODEL } from './artisan-loop';
import { liveArtistSystemPrompt, liveArtistUserMessage } from './ai-art-system-prompt';

/**
 * SERVER-SIDE LIVE JOB RUNNER (in-memory + disk).
 *
 * Live Studio runs the SAME immutable artisan loop as the Quick route (lib/artisan-loop.ts) —
 * reason → draw the WHOLE piece → see the render → fix → keep the best — just DETACHED so it
 * survives the HTTP request window and the user can watch each draft resolve, give live
 * feedback, and pause/resume. This file is pure orchestration AROUND the core (per the thesis):
 * it adapts the loop's `emit` events into LiveJob state, checkpoints to disk, and never touches
 * how the artist reasons. The old gesture-by-gesture + 6-phase-auditor cascade was deleted —
 * it cost ~60–240 model calls for a result the whole-frame loop produces in ~5–7.
 */

// How many look-and-fix passes after the first draft (total drafts ≈ this + 1). Holistic
// whole-frame reasoning converges in a handful of passes; more is wasted spend.
function refinePasses(size: number): number {
  return size >= 48 ? 5 : size >= 32 ? 4 : 3;
}

const RESUME_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ#@$%&*+=';
const BACKGROUND = '#0d1117';

/** Reconstruct a char-map text + palette from a saved dense frame — to re-seed the artist on resume. */
function frameToCharMapText(frame: PXSFrame): { ascii: string; paletteStr: string } {
  const inv: Record<string, string> = {};
  let ci = 0;
  const rows: string[][] = Array.from({ length: frame.rows }, () =>
    Array.from({ length: frame.cols }, () => '.')
  );
  for (const c of frame.cells) {
    const color = (c.color || BACKGROUND).toLowerCase();
    if (color === BACKGROUND) continue;
    if (!(color in inv)) inv[color] = RESUME_CHARS[ci++] || '?';
    if (c.y >= 0 && c.y < frame.rows && c.x >= 0 && c.x < frame.cols) rows[c.y][c.x] = inv[color];
  }
  const header = '   ' + Array.from({ length: frame.cols }, (_, x) => (x % 10).toString()).join('');
  const ascii = `${header}\n${rows.map((r, y) => `${String(y).padStart(2, ' ')} ${r.join('')}`).join('\n')}`;
  const paletteStr = Object.entries(inv).map(([hex, ch]) => `${ch}=${hex}`).join(', ');
  return { ascii, paletteStr };
}

export interface LiveJob {
  id: string;
  prompt: string;
  size: number;
  model: string;
  status: 'running' | 'done' | 'error' | 'paused' | 'cancelled';
  control?: 'pause' | 'cancel'; // a signal the loop checks between drafts
  phase: string; // current activity: draw | look | judge | done
  phaseIndex: number;
  gestures: number; // number of drafts produced (kept name for client compat)
  statusMessage: string;
  liveThinking: string; // the artist's current streamed reasoning (for the "watch it think" UI)
  feed: { kind: 'phase' | 'gesture' | 'review' | 'recall' | 'done' | 'user'; text: string; gesture?: number; phase?: string; approved?: boolean }[];
  pendingFeedback?: string[]; // live user feedback queued to inject into the next draft
  critiques: { phase: string; approved: boolean; issues: string[] }[];
  latestFrame?: PXSFrame;
  frames: PXSFrame[]; // every draft frame (for the progression view)
  frame?: PXSFrame; // final (best)
  title?: string;
  palette?: string[];
  cells?: number;
  durationMs?: number;
  error?: string;
  startedAt: number;
  updatedAt: number;
}

// Module-level store. Survives across requests in a single Node process (local/self-hosted).
const jobs = new Map<string, LiveJob>();

// Disk persistence — jobs survive server reloads/crashes AND become resumable.
const JOB_DIR = path.join(os.tmpdir(), 'pxs-live-jobs');
function persist(job: LiveJob): void {
  try {
    fs.mkdirSync(JOB_DIR, { recursive: true });
    const { frames, ...snap } = job; // omit the heavy per-draft history; latestFrame is enough
    fs.writeFileSync(path.join(JOB_DIR, `${job.id}.json`), JSON.stringify(snap));
  } catch {
    /* best-effort */
  }
}
function loadJobFromDisk(id: string): LiveJob | null {
  try {
    const p = path.join(JOB_DIR, `${id}.json`);
    if (!fs.existsSync(p)) return null;
    const snap = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (snap.status === 'running') snap.status = 'error', (snap.error = 'interrupted (server restarted) — resumable');
    return { ...snap, frames: [] } as LiveJob;
  } catch {
    return null;
  }
}

export function getLiveJob(id: string): LiveJob | null {
  return jobs.get(id) ?? loadJobFromDisk(id);
}

/** Signal a running job to pause (checkpoint + stop, resumable) or cancel. */
export function controlLiveJob(id: string, action: 'pause' | 'cancel'): boolean {
  const job = jobs.get(id);
  if (!job || job.status !== 'running') return false;
  job.control = action;
  job.statusMessage = action === 'pause' ? 'Pausing…' : 'Cancelling…';
  return true;
}

/** Inject live user feedback into a running job — the human art director, mid-creation. */
export function feedbackLiveJob(id: string, text: string): boolean {
  const job = jobs.get(id);
  if (!job || job.status !== 'running' || !text.trim()) return false;
  (job.pendingFeedback ??= []).push(text.trim());
  job.feed.push({ kind: 'user', text: text.trim() });
  if (job.feed.length > 140) job.feed.shift();
  job.updatedAt = Date.now();
  return true;
}

export function startLiveJob(opts: {
  prompt: string;
  size: number;
  model: string;
  apiKey: string;
  resumeFrame?: PXSFrame;
  resumePhase?: string;
  title?: string;
}): string {
  const id = (globalThis.crypto as Crypto).randomUUID();
  const job: LiveJob = {
    id,
    prompt: opts.prompt,
    size: opts.size,
    model: opts.model || DEFAULT_MODEL,
    status: 'running',
    phase: 'draw',
    phaseIndex: 0,
    gestures: 0,
    statusMessage: opts.resumeFrame ? 'Resuming…' : 'Drawing…',
    liveThinking: '',
    feed: [],
    critiques: [],
    frames: [],
    title: opts.title,
    startedAt: Date.now(),
    updatedAt: Date.now(),
  };
  jobs.set(id, job);
  void runArtisan(job, opts.apiKey, opts.resumeFrame);
  return id;
}

async function runArtisan(job: LiveJob, apiKey: string, resumeFrame?: PXSFrame): Promise<void> {
  const client = new Anthropic({ apiKey });
  const prompt = job.prompt;
  const model = job.model;
  const touch = () => {
    job.updatedAt = Date.now();
  };
  const pushFeed = (e: LiveJob['feed'][number]) => {
    job.feed.push(e);
    if (job.feed.length > 140) job.feed.shift();
    touch();
    persist(job); // checkpoint on every significant event → durable + resumable
  };

  try {
    // Seed the loop. Fresh start: a plain instruction. Resume: re-seed the saved draft (image +
    // exact char-map) so the artist continues refining the real piece instead of starting over.
    let firstUserContent: any;
    let seedFrames: PXSFrame[] | undefined;
    if (resumeFrame) {
      const { ascii, paletteStr } = frameToCharMapText(resumeFrame);
      job.latestFrame = resumeFrame;
      job.frames.push(resumeFrame);
      seedFrames = [resumeFrame];
      pushFeed({ kind: 'phase', text: 'RESUMED — refining', phase: 'draw' });
      firstUserContent = [
        { type: 'image', source: { type: 'base64', media_type: 'image/png', data: frameToPngBase64(resumeFrame) } },
        {
          type: 'text',
          text: `You are RESUMING a work-in-progress pixel piece of "${prompt}" on a ${resumeFrame.cols}x${resumeFrame.rows} canvas. Above is the current render; its exact char-map (palette: ${paletteStr}, "." = background) is:\n${ascii}\n\nKeep the SAME ${resumeFrame.cols}x${resumeFrame.rows} size. Call submit_art with an improved, COMPLETE char-map that fixes what you see, and refine until it's genuinely production-ready.`,
        },
      ];
    } else {
      firstUserContent = [{ type: 'text', text: liveArtistUserMessage(prompt, job.size) }];
    }

    const drafts = await artistLoop({
      client,
      model,
      system: liveArtistSystemPrompt,
      firstUserContent,
      maxDrafts: refinePasses(job.size),
      effort: DRAW_EFFORT,
      seedFrames,
      emit: {
        shouldStop: () => job.control === 'pause' || job.control === 'cancel',
        thinking: (delta) => {
          job.liveThinking = (job.liveThinking + delta).slice(-1800);
          job.updatedAt = Date.now();
        },
        status: (phase, message) => {
          job.phase = phase === 'review' ? 'look' : phase;
          job.statusMessage = message;
          touch();
        },
        iteration: (n, frame) => {
          job.gestures = n + 1;
          job.latestFrame = frame;
          job.frames.push(frame);
          job.phase = 'draw';
          job.statusMessage = `Draft ${n + 1}`;
          pushFeed({ kind: 'gesture', text: `draft ${n + 1} — ${(frame as any).title ?? 'sketch'}`, gesture: n + 1, phase: 'draw' });
        },
        drainFeedback: () => {
          if (!job.pendingFeedback?.length) return null;
          const fb = job.pendingFeedback.join(' ');
          job.pendingFeedback = [];
          return fb;
        },
      },
    });

    // Honor a pause/cancel that landed between drafts.
    if (job.control === 'cancel') {
      job.status = 'cancelled';
      job.statusMessage = 'Cancelled';
      pushFeed({ kind: 'done', text: 'Cancelled by user' });
      return;
    }
    if (job.control === 'pause') {
      job.status = 'paused';
      job.statusMessage = 'Paused — resumable';
      pushFeed({ kind: 'done', text: 'Paused — resumable' });
      return;
    }

    if (!drafts.length) {
      job.status = 'error';
      job.error = 'The artist did not produce a valid frame.';
      touch();
      persist(job);
      return;
    }

    // KEEP-BEST: render every draft, let an art director pick the strongest. Never ship a
    // regression just because it was the latest pass.
    job.phase = 'judge';
    job.statusMessage = 'Keeping the best version…';
    pushFeed({ kind: 'review', text: 'choosing the best draft', approved: true });
    const best = await judgeBest(client, model, prompt, drafts);

    job.frame = best;
    job.latestFrame = best;
    job.title = (best as any).title || job.title || prompt.slice(0, 40);
    job.palette = paletteOf(best.cells);
    job.cells = best.cells.length;
    job.phase = 'done';
    job.durationMs = Date.now() - job.startedAt;
    job.status = 'done';
    job.statusMessage = 'Done';
    pushFeed({ kind: 'done', text: 'Finished — kept the best draft' });
  } catch (err) {
    job.status = 'error';
    job.error = err instanceof Error ? err.message : 'Generation failed';
    touch();
    persist(job);
  }
}
