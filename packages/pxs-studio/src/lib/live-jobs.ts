import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import os from 'os';
import type { PXSFrame } from '../store/pxs-store';
import { charMapToFrame, LIVE_REVIEW_SCHEMA, type CharMap } from './pxs-frame-schema';
import { frameToPngBase64 } from './render-frame';
import {
  liveArtistSystemPrompt,
  liveArtistUserMessage,
  liveAuditorSystemPrompt,
  liveAuditorUserMessage,
  liveResumeUserMessage,
} from './ai-art-system-prompt';

/**
 * SERVER-SIDE LIVE JOB RUNNER (in-memory).
 *
 * The sculptor cascade takes 20–30+ minutes (eyes-open gestures + phase-gated reviews), which
 * exceeds any single HTTP request window. So the cascade runs DETACHED here: the route starts a
 * job and returns immediately; the job keeps running in the Node process; the client polls its
 * status. In-memory is intentional for now (works on a single local/self-hosted dev server) —
 * a DynamoDB persistence layer can be added later without touching the cascade. The artist core
 * (the cascade itself) is unchanged from the immutable design.
 */

const DEFAULT_MODEL = 'claude-opus-4-8';
const EFFORT = 'high';
const MAX_GESTURES = 200;
const BACKGROUND = '#0d1117';
const MAX_TOTAL_REVIEWS = 40; // global safety against endless recall/steamroller churn

const PHASES: { key: string; bar: string; reviewCap: number }[] = [
  { key: 'shape', reviewCap: 3, bar: 'the overall SILHOUETTE, build, proportions and posture of the whole figure, and that the silhouette already reads as the subject. Detail and color depth do NOT matter yet.' },
  { key: 'elements', reviewCap: 3, bar: 'the MAJOR distinct parts are placed, shaped and balanced within the silhouette (for a creature: head, limbs, wings, tail as clear shapes) — not their fine detail.' },
  { key: 'refine', reviewCap: 3, bar: 'the shapes are tightened with correct proportions and real FORM — a darker shadow shade and a lighter highlight — and the figure is clean and cohesive.' },
  { key: 'detail', reviewCap: 3, bar: 'the granular, identity-defining details are present (eyes, teeth, scales, etc.), added on top of shapes that were already approved.' },
  // POLISH/QA are STEAMROLLER phases: a methodical full top-to-bottom sweep; approve ONLY on a
  // complete clean pass (zero blemishes). A higher cap lets the sweep restart-on-fix and converge.
  { key: 'polish', reviewCap: 6, bar: 'final finesse only — crisp highlights, clean edges, the "icing." Review it like a STEAMROLLER: scan the whole image methodically top-to-bottom, left-to-right, at a careful pace; approve ONLY on a complete clean pass with ZERO blemishes. Any blemish → list it; the next review restarts the full sweep. No foundational changes here.' },
  { key: 'qa', reviewCap: 6, bar: 'a final STEAMROLLER step-back: sweep the whole finished piece top-to-bottom — everything coheres and instantly reads as the subject (the child test), full form, clean, no blemishes. Approve only on a clean pass at a 96%+ standard.' },
];

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
  description: 'Apply ONE gesture: a small set of cell edits (a stroke / one feature\'s worth). Use "." as the char to ERASE a cell back to background. After each gesture you SEE the updated canvas.',
  input_schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      note: { type: 'string', description: 'One short phrase: what this gesture does.' },
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

const REVIEW_TOOL = {
  name: 'request_review',
  description: 'Ask the independent art director to judge the CURRENT phase. Approved → that phase locks and you advance to the next, finer phase. Not approved → you get specific fixes and stay in this phase.',
  input_schema: { type: 'object', additionalProperties: false, properties: {}, required: [] },
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

/** Reconstruct an editable Canvas (grid + palette) from a saved dense frame — for RESUME. */
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
 * COST CONTROL: the model only needs to SEE the CURRENT canvas. Before each call we strip the
 * render image + full char-map from every PRIOR gesture's tool_result (collapsing it to a
 * one-line note), keeping only the LATEST render in context. Eyes-open is preserved; per-gesture
 * input stops climbing (old base64 images are the dominant, redundant cost). The char-map of the
 * latest gesture fully encodes the state, so nothing is lost.
 */
function pruneForSend(messages: Anthropic.MessageParam[]): Anthropic.MessageParam[] {
  let lastImgIdx = -1;
  messages.forEach((m, i) => {
    if (m.role === 'user' && Array.isArray(m.content)) {
      for (const block of m.content as any[]) {
        if (block.type === 'tool_result' && Array.isArray(block.content) && block.content.some((b: any) => b.type === 'image')) lastImgIdx = i;
      }
    }
  });
  return messages.map((m, i) => {
    if (i === lastImgIdx || m.role !== 'user' || !Array.isArray(m.content)) return m;
    const content = (m.content as any[]).map((block: any) => {
      if (block.type === 'tool_result' && Array.isArray(block.content)) {
        const txt = block.content.find((b: any) => b.type === 'text');
        const firstLine = txt ? String(txt.text).split('\n')[0] : 'canvas updated';
        return { ...block, content: `${firstLine} [earlier render omitted — see current canvas below]` };
      }
      return block;
    });
    return { ...m, content } as Anthropic.MessageParam;
  });
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

interface Verdict {
  approved: boolean;
  issues: string[];
  recall: boolean;
  recallPhase: string;
}

async function audit(
  client: Anthropic,
  model: string,
  subject: string,
  frame: PXSFrame,
  phase: { key: string; bar: string },
  progress: string[]
): Promise<Verdict> {
  try {
    const png = frameToPngBase64(frame);
    const res = await withRetry(() =>
      client.messages.create({
        model,
        max_tokens: 6000,
        thinking: { type: 'adaptive', display: 'summarized' },
        output_config: { effort: 'high', format: { type: 'json_schema', schema: LIVE_REVIEW_SCHEMA } },
        system: liveAuditorSystemPrompt,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/png', data: png } },
              { type: 'text', text: liveAuditorUserMessage(subject, frame.cols, frame.rows, phase.key, phase.bar, progress) },
            ],
          },
        ],
      } as any)
    );
    const text = (res.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('');
    const parsed = JSON.parse(text);
    return {
      approved: !!parsed.approved,
      issues: Array.isArray(parsed.issues) ? parsed.issues.slice(0, 5) : [],
      recall: !!parsed.recall,
      recallPhase: typeof parsed.recallPhase === 'string' ? parsed.recallPhase : '',
    };
  } catch {
    return { approved: true, issues: [], recall: false, recallPhase: '' };
  }
}

export interface LiveJob {
  id: string;
  prompt: string;
  size: number;
  model: string;
  status: 'running' | 'done' | 'error' | 'paused' | 'cancelled';
  control?: 'pause' | 'cancel'; // a signal the cascade checks between gestures
  phase: string;
  phaseIndex: number;
  gestures: number;
  statusMessage: string;
  liveThinking: string; // the artist's current streamed reasoning (for the "watch it think" UI)
  feed: { kind: 'phase' | 'gesture' | 'review' | 'recall' | 'done' | 'user'; text: string; gesture?: number; phase?: string; approved?: boolean }[];
  pendingFeedback?: string[]; // live user feedback queued to inject into the next artist turn
  critiques: { phase: string; approved: boolean; issues: string[]; recall?: boolean; recallPhase?: string }[];
  latestFrame?: PXSFrame;
  frames: PXSFrame[]; // every gesture frame (for the progression view)
  frame?: PXSFrame; // final
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

// Disk persistence — jobs survive server reloads/crashes AND become resumable. In-memory is the
// hot path; disk is the durable fallback. (tmpdir for now; a DynamoDB layer slots in later.)
const JOB_DIR = path.join(os.tmpdir(), 'pxs-live-jobs');
function persist(job: LiveJob): void {
  try {
    fs.mkdirSync(JOB_DIR, { recursive: true });
    const { frames, ...snap } = job; // omit the heavy per-gesture history; latestFrame is enough
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
    // A job read from disk is no longer actively running in this process.
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
    phase: opts.resumePhase || 'setup',
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
  const resume = opts.resumeFrame ? { frame: opts.resumeFrame, phaseKey: opts.resumePhase || 'detail' } : undefined;
  void runCascade(job, opts.apiKey, resume);
  return id;
}

async function runCascade(
  job: LiveJob,
  apiKey: string,
  resume?: { frame: PXSFrame; phaseKey: string }
): Promise<void> {
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
    const messages: Anthropic.MessageParam[] = [];
    let canvas: Canvas | null = null;
    let phaseIdx = 0;
    let reviewsThisPhase = 0;
    let totalReviews = 0;
    const progress: string[] = []; // provisionally-approved phases (recall can reopen any)

    if (resume) {
      // Returning to an unfinished piece: re-seed the canvas from the saved frame and continue.
      canvas = frameToCanvas(resume.frame, job.title || prompt);
      const ri = PHASES.findIndex((p) => p.key === resume.phaseKey);
      phaseIdx = ri >= 0 ? ri : 3; // default to DETAIL
      const f0 = canvasToFrame(canvas);
      job.latestFrame = f0;
      job.frames.push(f0);
      job.phase = PHASES[phaseIdx].key;
      const paletteStr = Object.entries(canvas.palette).filter(([k]) => k !== '.').map(([k, v]) => `${k}=${v}`).join(', ');
      pushFeed({ kind: 'phase', text: `RESUMED → ${PHASES[phaseIdx].key.toUpperCase()}`, phase: PHASES[phaseIdx].key });
      messages.push({
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/png', data: frameToPngBase64(f0) } },
          { type: 'text', text: liveResumeUserMessage(prompt, canvas.cols, canvas.rows, paletteStr, PHASES[phaseIdx].key, PHASES[phaseIdx].bar, asciiView(canvas)) },
        ],
      });
    } else {
      messages.push({ role: 'user', content: liveArtistUserMessage(prompt, job.size) });
    }

    for (let turn = 0; turn < MAX_GESTURES + 30; turn++) {
      // Honor pause/cancel signals between gestures (can't interrupt an in-flight call).
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
      // Inject any live user feedback into the upcoming artist turn (human in the loop).
      if (job.pendingFeedback && job.pendingFeedback.length) {
        const fb = job.pendingFeedback.join(' ');
        job.pendingFeedback = [];
        const note = `\n\n⚡ LIVE FEEDBACK FROM THE USER — incorporate this now (it overrides earlier intent if it conflicts): ${fb}`;
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
        system: liveArtistSystemPrompt,
        tools: [SETUP_TOOL, PAINT_TOOL, REVIEW_TOOL],
        messages: pruneForSend(messages),
      };
      const msg = await withRetry(async () => {
        const s = client.messages.stream(params as any);
        job.liveThinking = '';
        const cap = (d: string) => {
          job.liveThinking = (job.liveThinking + d).slice(-1800);
          job.updatedAt = Date.now();
        };
        (s as any).on('thinking', cap);
        s.on('text', cap);
        return s.finalMessage();
      });
      messages.push({ role: 'assistant', content: msg.content });

      const tool = msg.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
      if (!tool) {
        messages.push({ role: 'user', content: 'Use setup, paint, or request_review to work on the canvas.' });
        continue;
      }

      if (tool.name === 'setup') {
        if (canvas) {
          messages.push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: tool.id, content: 'Canvas already exists (resumed) — do not call setup. Continue with paint / request_review.' }] });
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
        job.phase = 'shape';
        job.statusMessage = `Canvas ${cols}×${rows} — phase 1: SHAPE`;
        pushFeed({ kind: 'phase', text: 'SHAPE — blocking in the silhouette', phase: 'shape' });
        messages.push({
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: tool.id,
              content: `Canvas ready: ${cols}×${rows}, all background. Palette: ${Object.entries(palette).filter(([k]) => k !== '.').map(([k, v]) => `${k}=${v}`).join(', ')}.\n\nYou are in PHASE 1 — SHAPE. Bar: ${PHASES[0].bar}\nBlock in the whole figure's silhouette in gestures, then call request_review.`,
            },
          ],
        });
        continue;
      }

      if (tool.name === 'request_review') {
        if (!canvas) {
          messages.push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: tool.id, content: 'Nothing painted yet — call setup first.' }] });
          continue;
        }
        const phase = PHASES[phaseIdx];
        job.statusMessage = `Art director reviewing — ${phase.key.toUpperCase()}…`;
        touch();
        const v = await audit(client, model, prompt, canvasToFrame(canvas), phase, progress);
        reviewsThisPhase++;
        totalReviews++;
        job.critiques.push({ phase: phase.key, approved: v.approved, issues: v.issues, recall: v.recall, recallPhase: v.recallPhase });
        pushFeed({
          kind: v.recall ? 'recall' : 'review',
          text: v.recall
            ? `recall → ${v.recallPhase}: ${v.issues[0] || ''}`
            : v.approved
            ? `${phase.key} approved ✓`
            : v.issues[0] || 'needs fixes',
          phase: phase.key,
          approved: v.approved,
        });

        // RECALL: a foundational earlier aspect is revealed wrong — go back and fix it first.
        if (v.recall && totalReviews < MAX_TOTAL_REVIEWS) {
          const idx = PHASES.findIndex((p) => p.key === v.recallPhase);
          if (idx >= 0 && idx < phaseIdx) {
            phaseIdx = idx;
            reviewsThisPhase = 0;
            job.phase = PHASES[idx].key;
            job.statusMessage = `RECALL → ${PHASES[idx].key.toUpperCase()} (fixing foundation)`;
            touch();
            messages.push({
              role: 'user',
              content: [
                {
                  type: 'tool_result',
                  tool_use_id: tool.id,
                  content: `RECALL — adding later work revealed a foundational problem in ${PHASES[idx].key.toUpperCase()}. Fix it now (repaint/erase freely):\n- ${v.issues.join('\n- ')}\nThen continue forward and request_review.`,
                },
              ],
            });
            continue;
          }
        }

        const forceAdvance = reviewsThisPhase >= phase.reviewCap || totalReviews >= MAX_TOTAL_REVIEWS;
        if (v.approved || forceAdvance) {
          progress.push(v.approved ? `${phase.key} ✓` : `${phase.key} (advanced under guidance)`);
          phaseIdx++;
          reviewsThisPhase = 0;
          if (phaseIdx >= PHASES.length) break;
          const next = PHASES[phaseIdx];
          job.phase = next.key;
          job.statusMessage = `${phase.key.toUpperCase()} approved → ${next.key.toUpperCase()}`;
          pushFeed({ kind: 'phase', text: next.key.toUpperCase(), phase: next.key });
          const carry = v.issues.length ? `\nCarry forward: ${v.issues.join('; ')}.` : '';
          messages.push({
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: tool.id,
                content:
                  (v.approved
                    ? `✓ ${phase.key.toUpperCase()} approved (provisional — fine to build on; may be revisited if a later layer reveals a problem).`
                    : `Moving on from ${phase.key.toUpperCase()} after several rounds.`) +
                  `\n\nNow focus — ${next.key.toUpperCase()}. Bar: ${next.bar}${carry}\nWork it in gestures, then request_review.`,
              },
            ],
          });
          continue;
        }

        messages.push({
          role: 'user',
          content: [{ type: 'tool_result', tool_use_id: tool.id, content: `${phase.key.toUpperCase()} not there yet. Fix these (most foundational first), then request_review:\n- ${v.issues.join('\n- ')}` }],
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
        job.phase = PHASES[phaseIdx].key;
        job.statusMessage = `Gesture ${job.gestures} — ${PHASES[phaseIdx].key.toUpperCase()}: ${input.note ?? ''}`;
        pushFeed({ kind: 'gesture', text: input.note ?? 'gesture', gesture: job.gestures, phase: PHASES[phaseIdx].key });

        const png = frameToPngBase64(frame);
        const overBudget = job.gestures >= MAX_GESTURES;
        const phase = PHASES[phaseIdx];
        const text =
          `Gesture ${job.gestures} (phase: ${phase.key.toUpperCase()}): applied ${applied} edit(s)${issues.length ? `; skipped — ${issues.join('; ')}` : ''}.\n` +
          `Canvas now (${canvas.cols}×${canvas.rows}). Exact char-map:\n${asciiView(canvas)}\n\n` +
          `LOOK at the rendered image. Keep sculpting THIS phase (shape loosely → refine → erase the misses). When this phase's bar is met, call request_review.` +
          (overBudget ? `\n\nNOTE: you have used many gestures; converge and request_review.` : '');

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
    }

    if (!canvas) {
      job.status = 'error';
      job.error = 'The artist never set up a canvas.';
      touch();
      return;
    }
    const frame = canvasToFrame(canvas);
    job.frame = frame;
    job.latestFrame = frame;
    job.title = canvas.title;
    job.palette = Object.entries(canvas.palette).filter(([k]) => k !== '.').map(([, v]) => v);
    job.cells = frame.cells.length;
    job.durationMs = Date.now() - job.startedAt;
    job.status = 'done';
    job.statusMessage = 'Done';
    pushFeed({ kind: 'done', text: 'Finished — QA passed' });
  } catch (err) {
    job.status = 'error';
    job.error = err instanceof Error ? err.message : 'Generation failed';
    touch();
    persist(job);
  }
}
