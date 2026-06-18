import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import os from 'os';
import type { PXSFrame } from '../store/pxs-store';
import { charMapToFrame, type CharMap } from './pxs-frame-schema';
import { frameToPngBase64 } from './render-frame';
import { DEFAULT_MODEL, DRAW_EFFORT } from './artisan-loop';
import {
  liveArtistSystemPrompt,
  liveArtistUserMessage,
  liveResumeUserMessage,
} from './ai-art-system-prompt';

/**
 * SERVER-SIDE LIVE JOB RUNNER — the EYES-OPEN painter.
 *
 * The thesis's real unlock (docs/AGENTIC-ARTISAN-THESIS.md, principle 2 caveat): one artist on a
 * PERSISTENT, ERASABLE canvas that SEES it re-rendered after EVERY stroke and reasons about its
 * own next move — never composing blind. This is ALSO the live art show. There is NO separate
 * auditor, NO gated phases, NO recall machine, NO best-of-N (that was the machinery; this is the
 * soul). Coarse→fine emerges from the artist's own reasoning.
 *
 * The job runs DETACHED so it survives the request window; the client tails it over the SSE
 * endpoint and watches each stroke land. Pause/cancel/resume/live-feedback wrap AROUND the core.
 */

// FULL effort, never throttled — the painter reasons at the SAME depth I do when I author the
// owl/16² by hand in Claude Code. Throttling per-stroke reasoning to "keep calls cool" was the
// bug: it ships flaws it can't perceive deeply enough to catch (garbled mouths, stray cells) AND
// it costs MORE, because shallow strokes flail → more strokes → more re-sent history. Maxed
// reasoning converges in fewer, more decisive strokes: better AND cheaper. Reasoning is the craft,
// not overhead (docs/AGENTIC-ARTISAN-THESIS.md, principle 3). Shared with the whole-frame route.
const EFFORT = DRAW_EFFORT;
const MAX_GESTURES = 120; // safety cap against a runaway loop; real pieces finish well under this.
const BACKGROUND = '#0d1117';

// Per-MTok USD pricing (input / output; cache_read is the cheap re-use of the cached prompt).
// Thinking tokens bill as output. Used to show the user the REAL running cost — no more guessing.
const PRICING: Record<string, { in: number; out: number; cacheRead: number }> = {
  'claude-opus-4-8': { in: 15, out: 75, cacheRead: 1.5 },
  'claude-sonnet-4-6': { in: 3, out: 15, cacheRead: 0.3 },
  'claude-haiku-4-5': { in: 1, out: 5, cacheRead: 0.1 },
};
function costUsd(model: string, u: { input: number; output: number; cacheRead: number }): number {
  const p = PRICING[model] ?? PRICING['claude-sonnet-4-6'];
  return (u.input * p.in + u.output * p.out + u.cacheRead * p.cacheRead) / 1_000_000;
}

const SETUP_TOOL = {
  name: 'setup',
  description: 'Set up the canvas ONCE before painting: title, dimensions, and palette. Call this first.',
  input_schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      title: { type: 'string', description: 'Short 1–3 word name for the piece.' },
      cols: { type: 'integer' },
      rows: { type: 'integer' },
      palette: { type: 'object', description: 'Single-character symbol → lowercase #rrggbb. "." is reserved for background.', additionalProperties: { type: 'string' } },
    },
    required: ['title', 'cols', 'rows', 'palette'],
  },
};

const PAINT_TOOL = {
  name: 'paint',
  description: 'Apply ONE stroke: a meaningful set of cell edits (a feature/region — the head shape, an ear, a shadow pass), not a single lonely cell and not the whole image. Use "." to ERASE a cell back to background. After each stroke you SEE the updated canvas.',
  input_schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      note: { type: 'string', description: 'One short phrase: what this stroke does.' },
      edits: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: { x: { type: 'integer' }, y: { type: 'integer' }, c: { type: 'string', description: 'palette char, or "." to erase' } },
          required: ['x', 'y', 'c'],
        },
      },
    },
    required: ['edits'],
  },
};

interface Canvas {
  title: string;
  cols: number;
  rows: number;
  palette: Record<string, string>;
  grid: string[][];
}

function blankGrid(cols: number, rows: number): string[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => '.'));
}
function canvasToCharMap(c: Canvas): CharMap {
  return { title: c.title, cols: c.cols, rows: c.rows, palette: c.palette, grid: c.grid.map((r) => r.join('')) };
}
function canvasToFrame(c: Canvas): PXSFrame {
  return charMapToFrame(canvasToCharMap(c));
}
function asciiView(c: Canvas): string {
  const header = '   ' + Array.from({ length: c.cols }, (_, x) => (x % 10).toString()).join('');
  const body = c.grid.map((r, y) => `${String(y).padStart(2, ' ')} ${r.join('')}`).join('\n');
  return `${header}\n${body}`;
}

/** Reconstruct an editable Canvas from a saved dense frame — for RESUME. */
const RESUME_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ#@$%&*+=';
function frameToCanvas(frame: PXSFrame, title: string): Canvas {
  const palette: Record<string, string> = { '.': BACKGROUND };
  const inv: Record<string, string> = {};
  let ci = 0;
  const grid = blankGrid(frame.cols, frame.rows);
  for (const c of frame.cells) {
    const color = (c.color || BACKGROUND).toLowerCase();
    if (color === BACKGROUND) continue;
    if (!(color in inv)) {
      const ch = RESUME_CHARS[ci++] || '?';
      inv[color] = ch;
      palette[ch] = color;
    }
    if (c.y >= 0 && c.y < frame.rows && c.x >= 0 && c.x < frame.cols) grid[c.y][c.x] = inv[color];
  }
  return { title, cols: frame.cols, rows: frame.rows, palette, grid };
}

/**
 * COST CONTROL via PROMPT CACHING. The conversation is append-only (stable prefix), so we put a
 * rolling cache breakpoint on the last block each turn: the whole prior conversation is re-read
 * from cache (~10× cheaper than fresh input) instead of re-billed at full price every stroke.
 * This is the real cost lever — the input is dominated by re-sent history, and switching models
 * doesn't help (a cheaper model just thinks more verbosely). Caching needs a BYTE-STABLE prefix,
 * which is why we no longer rewrite/prune old messages. Returns a copy; never mutates state.
 */
function withCacheBreakpoint(messages: Anthropic.MessageParam[]): Anthropic.MessageParam[] {
  if (!messages.length) return messages;
  const out = messages.slice();
  const last = out[out.length - 1];
  if (last && Array.isArray(last.content) && last.content.length) {
    const blocks = (last.content as any[]).map((b, i) =>
      i === (last.content as any[]).length - 1 ? { ...b, cache_control: { type: 'ephemeral' } } : b
    );
    out[out.length - 1] = { ...last, content: blocks } as Anthropic.MessageParam;
  }
  return out;
}

/** Retry with backoff — long detached jobs must survive transient API/network errors. */
async function withRetry<T>(fn: () => Promise<T>, tries = 4): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
  throw lastErr;
}

export interface LiveJob {
  id: string;
  prompt: string;
  size: number;
  model: string;
  status: 'running' | 'done' | 'error' | 'paused' | 'cancelled';
  control?: 'pause' | 'cancel'; // a signal the loop checks between strokes
  phase: string; // current activity: paint | done
  phaseIndex: number;
  gestures: number; // number of strokes painted
  statusMessage: string;
  liveThinking: string; // the artist's current streamed reasoning (for the "watch it think" UI)
  feed: { kind: 'phase' | 'gesture' | 'review' | 'recall' | 'done' | 'user'; text: string; gesture?: number; phase?: string; approved?: boolean }[];
  pendingFeedback?: string[]; // live user feedback queued to inject into the next stroke
  critiques: { phase: string; approved: boolean }[];
  latestFrame?: PXSFrame;
  frames: PXSFrame[]; // every stroke frame (for the progression view)
  frame?: PXSFrame; // final
  title?: string;
  palette?: string[];
  cells?: number;
  durationMs?: number;
  tokensIn?: number; // running token + cost accounting so the user can SEE the price live
  tokensOut?: number;
  costUsd?: number;
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
    const { frames, ...snap } = job; // omit heavy per-stroke history; latestFrame is enough
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

/** Inject live user feedback into a running job — the human, mid-creation. */
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
    phase: 'paint',
    phaseIndex: 0,
    gestures: 0,
    statusMessage: opts.resumeFrame ? 'Resuming…' : 'Planning the canvas…',
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
    persist(job);
  };

  try {
    const messages: Anthropic.MessageParam[] = [];
    let canvas: Canvas | null = null;
    let accIn = 0, accCacheRead = 0, accOut = 0; // running token tally → live cost

    if (resumeFrame) {
      canvas = frameToCanvas(resumeFrame, job.title || prompt);
      const f0 = canvasToFrame(canvas);
      job.latestFrame = f0;
      job.frames.push(f0);
      const paletteStr = Object.entries(canvas.palette).filter(([k]) => k !== '.').map(([k, v]) => `${k}=${v}`).join(', ');
      pushFeed({ kind: 'phase', text: 'RESUMED — refining', phase: 'paint' });
      messages.push({
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/png', data: frameToPngBase64(f0) } },
          { type: 'text', text: liveResumeUserMessage(prompt, canvas.cols, canvas.rows, paletteStr, asciiView(canvas)) },
        ],
      });
    } else {
      messages.push({ role: 'user', content: liveArtistUserMessage(prompt, job.size) });
    }

    for (let turn = 0; turn < MAX_GESTURES + 20; turn++) {
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
      // Inject any live user feedback into the upcoming stroke (human in the loop).
      if (job.pendingFeedback && job.pendingFeedback.length) {
        const fb = job.pendingFeedback.join(' ');
        job.pendingFeedback = [];
        const note = `\n\n⚡ LIVE FEEDBACK FROM THE USER — incorporate this now (it overrides earlier intent if it conflicts), then keep raising the WHOLE piece past it: it's a FLOOR to build on, not a box to tick: ${fb}`;
        const last = messages[messages.length - 1];
        if (last && last.role === 'user' && Array.isArray(last.content)) {
          (last.content as any[]).push({ type: 'text', text: note });
        } else if (last && last.role === 'user') {
          last.content = `${String(last.content)}${note}`;
        } else {
          messages.push({ role: 'user', content: note.trim() });
        }
      }

      const params = {
        model,
        max_tokens: 32000,
        thinking: { type: 'adaptive', display: 'summarized' },
        output_config: { effort: EFFORT },
        system: [{ type: 'text', text: liveArtistSystemPrompt, cache_control: { type: 'ephemeral' } }],
        tools: [SETUP_TOOL, { ...PAINT_TOOL, cache_control: { type: 'ephemeral' } }],
        messages: withCacheBreakpoint(messages),
      };
      const msg = await withRetry(async () => {
        const s = client.messages.stream(params as any);
        job.liveThinking = '';
        const cap = (d: string) => {
          job.liveThinking = (job.liveThinking + d).slice(-4000);
          job.updatedAt = Date.now();
        };
        (s as any).on('thinking', cap);
        s.on('text', cap);
        return s.finalMessage();
      });
      messages.push({ role: 'assistant', content: msg.content });

      // Running cost — accumulate token usage so the user can SEE the price as it climbs.
      const u: any = (msg as any).usage || {};
      accIn += (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0);
      accCacheRead += u.cache_read_input_tokens || 0;
      accOut += u.output_tokens || 0;
      job.tokensIn = accIn + accCacheRead;
      job.tokensOut = accOut;
      job.costUsd = costUsd(model, { input: accIn, output: accOut, cacheRead: accCacheRead });

      const tool = msg.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');

      // No tool call → the artist has declared the piece DONE.
      if (!tool) {
        if (!canvas) {
          messages.push({ role: 'user', content: 'Use setup to create the canvas, then paint.' });
          continue;
        }
        break;
      }

      if (tool.name === 'setup') {
        if (canvas) {
          messages.push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: tool.id, content: 'Canvas already exists — do not call setup. Continue painting.' }] });
          continue;
        }
        const input = tool.input as { title: string; cols: number; rows: number; palette: Record<string, string> };
        const cols = Math.min(64, Math.max(8, Math.round(input.cols)));
        const rows = Math.min(64, Math.max(8, Math.round(input.rows)));
        const palette: Record<string, string> = { '.': BACKGROUND };
        for (const [k, v] of Object.entries(input.palette || {})) {
          if (k.length === 1 && /^#[0-9a-f]{6}$/.test(String(v).toLowerCase())) palette[k] = String(v).toLowerCase();
        }
        canvas = { title: input.title || 'piece', cols, rows, palette, grid: blankGrid(cols, rows) };
        job.statusMessage = `Canvas ${cols}×${rows} — blocking in the shape`;
        pushFeed({ kind: 'phase', text: `canvas ${cols}×${rows} — palette ready`, phase: 'paint' });
        messages.push({
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: tool.id,
              content: `Canvas ready: ${cols}×${rows}, all background. Palette: ${Object.entries(palette).filter(([k]) => k !== '.').map(([k, v]) => `${k}=${v}`).join(', ')}.\n\nNow paint, stroke by stroke. Block in the whole silhouette first, then build to detail, looking after each stroke.`,
            },
          ],
        });
        continue;
      }

      if (tool.name === 'paint') {
        if (!canvas) {
          messages.push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: tool.id, content: 'Call setup first to create the canvas.' }] });
          continue;
        }
        const input = tool.input as { note?: string; edits: { x: number; y: number; c: string }[] };
        const issues: string[] = [];
        let applied = 0;
        for (const e of input.edits || []) {
          if (!Number.isInteger(e.x) || !Number.isInteger(e.y) || e.x < 0 || e.x >= canvas.cols || e.y < 0 || e.y >= canvas.rows) {
            if (issues.length < 4) issues.push(`(${e.x},${e.y}) out of bounds`);
            continue;
          }
          if (e.c !== '.' && !(e.c in canvas.palette)) {
            if (issues.length < 4) issues.push(`char "${e.c}" not in palette`);
            continue;
          }
          canvas.grid[e.y][e.x] = e.c;
          applied++;
        }
        job.gestures++;
        const frame = canvasToFrame(canvas);
        job.latestFrame = frame;
        job.frames.push(frame);
        job.phase = 'paint';
        job.statusMessage = `Stroke ${job.gestures}${input.note ? ` — ${input.note}` : ''}`;
        pushFeed({ kind: 'gesture', text: input.note ?? 'stroke', gesture: job.gestures, phase: 'paint' });

        const png = frameToPngBase64(frame);
        const overBudget = job.gestures >= MAX_GESTURES;
        const text =
          `Stroke ${job.gestures}: applied ${applied} edit(s)${issues.length ? `; skipped — ${issues.join('; ')}` : ''}.\n` +
          `Canvas now (${canvas.cols}×${canvas.rows}). Exact char-map:\n${asciiView(canvas)}\n\n` +
          `Now LOOK at the rendered image like a stranger seeing it cold, against your bar at this true scale. Name the SINGLE biggest flaw you actually SEE right now — silhouette doesn't read as the subject / a part is detached, mis-placed or the wrong size / it's a flat blob with no shadow+highlight / it's asymmetric / muddy or stray cells / a missing identity cue — then fix EXACTLY that with your next stroke (erase freely). You may judge a flagged item a deliberate choice and keep it — the render decides, not the argument. ` +
          `Reply DONE only when it clears your 96% bar: a 3-year-old instantly names it, full figure, real form (shadow + highlight), clean and crisp — ship at the bar, don't chase 100% (better than perfect makes it worse).` +
          (overBudget ? `\n\nNOTE: you have used many strokes; converge and finish (reply DONE) soon.` : '');

        messages.push({
          role: 'user',
          content: [
            { type: 'tool_result', tool_use_id: tool.id, content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/png', data: png } },
              { type: 'text', text },
            ] },
          ],
        });
        if (overBudget) break;
        continue;
      }

      // Unknown tool — nudge.
      messages.push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: tool.id, content: 'Use setup or paint.' }] });
    }

    if (!canvas) {
      job.status = 'error';
      job.error = 'The artist never set up a canvas.';
      touch();
      persist(job);
      return;
    }
    const frame = canvasToFrame(canvas);
    job.frame = frame;
    job.latestFrame = frame;
    job.title = canvas.title;
    job.palette = Object.entries(canvas.palette).filter(([k]) => k !== '.').map(([, v]) => v);
    job.cells = frame.cells.length;
    job.phase = 'done';
    job.durationMs = Date.now() - job.startedAt;
    job.status = 'done';
    job.statusMessage = 'Done';
    pushFeed({ kind: 'done', text: 'Finished' });
  } catch (err) {
    job.status = 'error';
    job.error = err instanceof Error ? err.message : 'Generation failed';
    touch();
    persist(job);
  }
}
