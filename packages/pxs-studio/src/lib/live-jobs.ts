import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import os from 'os';
import type { PXSFrame } from '../store/pxs-store';
import { charMapToFrame, type CharMap } from './pxs-frame-schema';
import { frameToPngBase64 } from './render-frame';
import { DEFAULT_MODEL, DRAW_EFFORT } from './artisan-loop';
import {
  statueDrawerSystemPrompt,
  statueVisionSystemPrompt,
  statueVisionUserMessage,
  statueDrawerUserMessage,
  statueAuditSystemPrompt,
  liveResumeUserMessage,
} from './ai-art-system-prompt';

/**
 * SERVER-SIDE LIVE JOB RUNNER — THE STATUE ENGINE (M2 PROVEN, productized for M3).
 *
 * Ported from the proven reference engine (art-engine/painter.mjs). The recipe does not change:
 *   VISION  — commit the iconic design BRIEF before any pixel (ends the foundation gamble)
 *   SHAPE   — block masses + form only, DEFER fine detail (get the form *loved* first)
 *   POLISH  — complete details ON TOP of the LOCKED shape (auditor accepts the shape, judges
 *             at READ-level → no eye churn)
 *   QA      — whole-piece read-level sweep (ship at the 96% bar, don't chase 100%)
 *   keep-best — ship the last APPROVED state, never a churned/regressed pass
 *
 * The DRAWER is the eyes-open painter (the soul, preserved): it paints in coarse→fine PASSES on a
 * persistent, erasable canvas, seeing the render after every pass. The recovered cascade AUDITOR
 * gates each phase against the committed brief. No exemplars, full effort, true-scale perception.
 * Canon: docs/THE-STATUE-METHOD.md. Live event contract: docs/PIXCEL-LIVE-SSE.md.
 *
 * The job runs DETACHED so it survives the request window; the client tails the contract events
 * over the stream endpoint and watches each pass land. Pause/cancel/resume/live-feedback wrap
 * AROUND the engine. Every run is captured as a trajectory (brief + passes + audits + final) for
 * the eventual own-model (Option 3).
 */

const EFFORT = DRAW_EFFORT; // 'high' — full effort, never throttled (throttling backfires on cost AND quality)
const BACKGROUND = '#0d1117';

// Per-MTok USD pricing (input / output; cache_read is the cheap re-use of the cached prompt).
// Thinking tokens bill as output. Used to show the user the REAL running cost.
const PRICING: Record<string, { in: number; out: number; cacheRead: number }> = {
  'claude-opus-4-8': { in: 5, out: 25, cacheRead: 0.5 },
  'claude-sonnet-4-6': { in: 3, out: 15, cacheRead: 0.3 },
  'claude-haiku-4-5': { in: 1, out: 5, cacheRead: 0.1 },
};
function costUsd(model: string, u: { input: number; output: number; cacheRead: number }): number {
  const p = PRICING[model] ?? PRICING['claude-sonnet-4-6'];
  return (u.input * p.in + u.output * p.out + u.cacheRead * p.cacheRead) / 1_000_000;
}

// ---- THE STATUE PHASES (corrected; locked). SHAPE = masses/form, DEFER fine detail → POLISH =
// complete the deferred details ON TOP of the LOCKED shape (auditor ACCEPTS the shape, never
// re-opens it; judge at READ level, not sub-pixel) → QA = whole-piece read-level check. Tight
// reject caps + read-level judging = no churn, ~6 passes. ----
interface Phase {
  key: 'shape' | 'polish' | 'qa';
  cap: number;
  goal: string; // short banner for stage.enter
  drawer: string; // instruction handed to the drawer when this phase opens
  bar: string; // the bar the auditor judges this phase against
}
const PHASES: Phase[] = [
  {
    key: 'shape',
    cap: 3,
    goal: 'block the whole figure — silhouette, masses, form. Defer fine detail.',
    drawer:
      'block the whole figure — silhouette, masses, and form (base + one shadow + one highlight), filling the canvas as a deliberate FULL composition. Place features as simple BLOCKS so it reads (a plain eye blob is fine) — do NOT render fine detail yet; that is the polish phase',
    bar:
      'the masses, silhouette, form and composition are right and the figure reads as the subject in BLOCK form (features placed as simple blocks is fine). Foundational SHAPE only — do NOT demand finished eyes / texture / fine detail yet (that is polish). ORIENTATION-AGNOSTIC: a valid figure facing EITHER direction is fine — NEVER reject for facing a different way than the brief imagined (that is churn on an arbitrary choice). Approve once the SHAPE is loved.',
  },
  {
    key: 'polish',
    cap: 2,
    goal: 'shape is LOCKED — complete the deferred details on top (eyes, texture, identity).',
    drawer:
      'PHASE: POLISH — the shape is LOCKED and loved; do NOT reshape, move, or re-block anything. Look INWARD and COMPLETE the deferred details ON TOP: render the eyes properly per the brief, add texture / feather / identity touches. After each detail, re-look at THAT spot and fix it locally',
    bar:
      'ACCEPT the locked shape — do NOT re-evaluate the silhouette / composition / proportions (that is settled and loved). Judge ONLY the interior DETAIL added on top: do the eyes / texture / identity touches READ well per the brief? Approve once the details READ well.',
  },
  {
    key: 'qa',
    cap: 2,
    goal: 'whole-piece read-level sweep at the 96% hero bar.',
    drawer:
      'PHASE: QA — reply DONE to request the final read-level sweep; if the art director flags a real blemish, fix EXACTLY it with a micro edit (no reshaping), then reply DONE again',
    bar:
      'FINAL QA: step back and read the WHOLE piece at true display scale. Does it INSTANTLY read as the subject (child test), full form, clean, grounded, at the 96% hero bar? Approve on a clean READ-level pass; flag ONLY a real blemish that genuinely breaks the read.',
  },
];

const AUDIT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: { approved: { type: 'boolean' }, issues: { type: 'array', items: { type: 'string' } } },
  required: ['approved', 'issues'],
} as const;

const SETUP_TOOL = {
  name: 'setup',
  description: 'Set up the canvas ONCE before painting: title, dimensions, palette. Call first.',
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
  description:
    'Apply ONE coarse→fine PASS as a BATCH of cell edits (many cells — a whole stage like the silhouette, the shading, or the identity details), NOT one lonely cell and NOT the whole finished image blind. Use "." to ERASE. After each pass you SEE the re-rendered canvas at true scale.',
  input_schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      note: { type: 'string', description: 'one short phrase: what this pass does' },
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
function cloneCanvas(c: Canvas): Canvas {
  return { title: c.title, cols: c.cols, rows: c.rows, palette: { ...c.palette }, grid: c.grid.map((r) => [...r]) };
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
 * from cache (~10× cheaper than fresh input) instead of re-billed at full price every pass.
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

/**
 * Retry with exponential backoff + jitter — long detached jobs MUST ride out transient API
 * weather (overloaded_error / 529, 429, 5xx, network blips). Anthropic overload events can last
 * tens of seconds, so we back off 2→4→8→16→30→30s (~90s of patience) before giving up. Every
 * model call site (vision, drawer, auditor) goes through this — a single 529 should never kill a
 * run that's already cost real money and is watchable live.
 */
async function withRetry<T>(fn: () => Promise<T>, tries = 6): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i === tries - 1) break;
      const backoff = Math.min(30000, 2000 * 2 ** i) + Math.floor(Math.random() * 1000);
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
  throw lastErr;
}

/** One contract event (docs/PIXCEL-LIVE-SSE.md). Tailed by `seq` over the stream endpoint. */
export interface LiveEvent {
  seq: number;
  type: string;
  costUsd?: number;
  [k: string]: unknown;
}

export interface LiveJob {
  id: string;
  prompt: string; // the subject
  size: number;
  model: string;
  status: 'running' | 'done' | 'error' | 'paused' | 'cancelled';
  control?: 'pause' | 'cancel'; // a signal the loop checks between passes
  // Statue state
  stage: string; // vision | shape | polish | qa | done
  phase: string; // mirror of stage (back-compat with older clients)
  phaseIndex: number;
  brief?: string; // the committed VISION design brief (read-only control point in the UI)
  stagesPassed: string[];
  gestures: number; // number of passes painted
  statusMessage: string;
  liveThinking: string; // the model's current streamed reasoning (for the "watch it think" UI)
  feed: { kind: 'phase' | 'gesture' | 'review' | 'recall' | 'done' | 'user'; text: string; gesture?: number; phase?: string; approved?: boolean }[];
  events: LiveEvent[]; // append-only contract event log (omitted from disk persistence)
  pendingFeedback?: string[]; // live user feedback queued to inject into the next pass
  critiques: { phase: string; approved: boolean }[];
  audits: { stage: string; pass: number; approved: boolean; issues: string[] }[];
  latestFrame?: PXSFrame;
  frames: PXSFrame[]; // every pass frame (for the progression view; omitted from disk)
  frame?: PXSFrame; // final
  title?: string;
  palette?: string[];
  cells?: number;
  costCapUsd: number;
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
// Trajectory capture — every run saved (brief + passes + audits + final) as Option-3 training data.
const TRAJ_DIR = path.join(os.tmpdir(), 'pxs-trajectories');

function persist(job: LiveJob): void {
  try {
    fs.mkdirSync(JOB_DIR, { recursive: true });
    const { frames, events, ...snap } = job; // omit heavy per-pass history + event log
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
    if (snap.status === 'running') (snap.status = 'error'), (snap.error = 'interrupted (server restarted) — resumable');
    return { ...snap, frames: [], events: [] } as LiveJob;
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
  if (job.feed.length > 200) job.feed.shift();
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
  brief?: string;
}): string {
  const id = (globalThis.crypto as Crypto).randomUUID();
  const size = opts.size;
  // On resume, re-enter at the stage the job left off (default POLISH) — not always the start.
  const resumeStage = opts.resumeFrame
    ? (['shape', 'polish', 'qa'].includes(opts.resumePhase || '') ? (opts.resumePhase as string) : 'polish')
    : 'vision';
  const job: LiveJob = {
    id,
    prompt: opts.prompt,
    size,
    model: opts.model || DEFAULT_MODEL,
    status: 'running',
    stage: resumeStage,
    phase: resumeStage,
    phaseIndex: 0,
    brief: opts.brief,
    stagesPassed: [],
    gestures: 0,
    statusMessage: opts.resumeFrame ? 'Resuming…' : 'Designing the vision…',
    liveThinking: '',
    feed: [],
    events: [],
    critiques: [],
    audits: [],
    frames: [],
    title: opts.title,
    costCapUsd: size >= 48 ? 5 : 3,
    startedAt: Date.now(),
    updatedAt: Date.now(),
  };
  jobs.set(id, job);
  void runStatueEngine(job, opts.apiKey, opts.resumeFrame);
  return id;
}

/** Save the run trajectory (brief + passes + audits + final) for Option-3 training data. */
function writeTrajectory(job: LiveJob, traj: unknown): void {
  try {
    fs.mkdirSync(TRAJ_DIR, { recursive: true });
    fs.writeFileSync(path.join(TRAJ_DIR, `${job.id}.json`), JSON.stringify(traj, null, 2));
  } catch {
    /* best-effort */
  }
}

/**
 * Record the HUMAN's keep/reject verdict onto the run's trajectory. The honesty gate's whole
 * point: the human is the real quality gate, and that accept/reject judgment — paired with the
 * brief + passes + audits + final — is the training signal for the eventual own-model (Option 3).
 */
export function recordVerdict(id: string, verdict: 'keep' | 'reject', note?: string): boolean {
  try {
    const p = path.join(TRAJ_DIR, `${id}.json`);
    if (!fs.existsSync(p)) return false;
    const traj = JSON.parse(fs.readFileSync(p, 'utf8'));
    traj.humanVerdict = { verdict, note: note || '', at: Date.now() };
    fs.writeFileSync(p, JSON.stringify(traj, null, 2));
    return true;
  } catch {
    return false;
  }
}

async function runStatueEngine(job: LiveJob, apiKey: string, resumeFrame?: PXSFrame): Promise<void> {
  const client = new Anthropic({ apiKey });
  const subject = job.prompt;
  const model = job.model;
  const size = job.size;

  // ---- running cost accounting (drawer + auditor + vision all accrue) ----
  let accIn = 0, accCacheRead = 0, accOut = 0;
  const accrue = (u: any = {}) => {
    accIn += (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0);
    accCacheRead += u.cache_read_input_tokens || 0;
    accOut += u.output_tokens || 0;
    job.tokensIn = accIn + accCacheRead;
    job.tokensOut = accOut;
    job.costUsd = costUsd(model, { input: accIn, output: accOut, cacheRead: accCacheRead });
  };

  // ---- the contract event log + the legacy feed (kept in lockstep) ----
  let seq = 0;
  const deriveFeed = (type: string, p: Record<string, any>): LiveJob['feed'][number] | null => {
    switch (type) {
      case 'vision.committed': return { kind: 'phase', text: 'VISION committed — design locked', phase: 'vision' };
      case 'stage.enter': return { kind: 'phase', text: `${String(p.stage).toUpperCase()} — ${p.goal ?? ''}`, phase: p.stage };
      case 'pass.done': return { kind: 'gesture', text: p.note || 'pass', gesture: p.pass, phase: p.stage };
      case 'audit.verdict': return { kind: 'review', text: p.approved ? `${String(p.stage).toUpperCase()} approved` : (p.issues || []).join('; '), approved: p.approved, phase: p.stage };
      case 'stage.approved': return { kind: 'phase', text: `${String(p.stage).toUpperCase()} approved ✓ — locked`, phase: p.stage };
      case 'keepbest.shipped': return { kind: 'recall', text: `shipped the last approved state (${p.fromStage}) — ${p.reason}` };
      case 'job.done': return { kind: 'done', text: 'Finished' };
      default: return null;
    }
  };
  const emit = (type: string, payload: Record<string, any> = {}) => {
    const ev: LiveEvent = { seq: seq++, type, costUsd: +(job.costUsd ?? 0).toFixed(4), ...payload };
    job.events.push(ev);
    const f = deriveFeed(type, payload);
    if (f) {
      job.feed.push(f);
      if (job.feed.length > 200) job.feed.shift();
    }
    job.updatedAt = Date.now();
    persist(job);
  };
  const emitCost = () => emit('cost.update', { costUsd: +(job.costUsd ?? 0).toFixed(4), tokensIn: job.tokensIn ?? 0, tokensOut: job.tokensOut ?? 0 });

  // ---- a single drawer call (eyes-open; streams thinking into liveThinking) ----
  const callDrawer = async (messages: Anthropic.MessageParam[]): Promise<Anthropic.Message> => {
    const params = {
      model,
      max_tokens: 32000,
      thinking: { type: 'adaptive', display: 'summarized' },
      output_config: { effort: EFFORT },
      system: [{ type: 'text', text: statueDrawerSystemPrompt, cache_control: { type: 'ephemeral' } }],
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
    accrue((msg as any).usage || {});
    emitCost();
    return msg;
  };

  // ---- THE MICHELANGELO STEP: commit the iconic design BEFORE carving ----
  const designVision = async (): Promise<string> => {
    const msg = await withRetry(async () => {
      const s = client.messages.stream({
        model,
        max_tokens: 2000,
        thinking: { type: 'adaptive', display: 'summarized' },
        output_config: { effort: 'high' },
        system: statueVisionSystemPrompt(size),
        messages: [{ role: 'user', content: statueVisionUserMessage(subject, size) }],
      } as any);
      job.liveThinking = '';
      const cap = (d: string) => { job.liveThinking = (job.liveThinking + d).slice(-4000); job.updatedAt = Date.now(); };
      (s as any).on('thinking', cap);
      s.on('text', cap);
      return s.finalMessage();
    });
    accrue((msg as any).usage || {});
    emitCost();
    return msg.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map((b) => b.text).join('').trim();
  };

  // ---- the recovered cascade AUDITOR (independent art director; bar-anchored; read-level) ----
  const audit = async (candB64: string, phase: Phase, brief: string): Promise<{ approved: boolean; issues: string[] }> => {
    const sys = statueAuditSystemPrompt({ subject, phaseKey: phase.key, phaseBar: phase.bar, brief, size });
    const content = [
      { type: 'text', text: 'CANDIDATE (judge this for the current phase):' },
      { type: 'image', source: { type: 'base64', media_type: 'image/png', data: candB64 } },
      { type: 'text', text: 'Judge the CANDIDATE for the current phase. Return approved + the specific issues.' },
    ];
    try {
      const msg = await withRetry(async () => {
        const s = client.messages.stream({ model, max_tokens: 1500, system: sys, output_config: { format: { type: 'json_schema', schema: AUDIT_SCHEMA } }, messages: [{ role: 'user', content }] } as any);
        return s.finalMessage();
      });
      accrue((msg as any).usage || {});
      emitCost();
      const raw = msg.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map((b) => b.text).join('');
      const p = JSON.parse(raw);
      return { approved: !!p.approved, issues: Array.isArray(p.issues) ? p.issues.slice(0, 5) : [] };
    } catch (e) {
      return { approved: false, issues: [`auditor error: ${e instanceof Error ? e.message : 'unknown'}`] };
    }
  };

  // ---- trajectory accumulation (Option-3 training data) ----
  const traj: any = { id: job.id, subject, size, model, passes: [], audits: [] };

  try {
    emit('job.started', { id: job.id, subject, size, model, costCapUsd: job.costCapUsd });

    const messages: Anthropic.MessageParam[] = [];
    let canvas: Canvas | null = null;
    let phaseIdx = 0;
    let phaseRejects = 0;
    let bestCanvas: Canvas | null = null;
    let finished = false;

    if (resumeFrame) {
      // RESUME: treat the saved frame as the work-in-progress and re-enter at the stage it left
      // off (job.stage, set from the saved phase) — default POLISH if unknown.
      canvas = frameToCanvas(resumeFrame, job.title || subject);
      bestCanvas = cloneCanvas(canvas);
      const idx = PHASES.findIndex((p) => p.key === job.stage);
      phaseIdx = idx >= 0 ? idx : 1; // default polish
      job.brief = job.brief || `(resumed work-in-progress of "${subject}" — finish it to the committed Pixcel standard)`;
      traj.spec = job.brief;
      traj.resumed = true;
      const f0 = canvasToFrame(canvas);
      job.latestFrame = f0;
      job.frames.push(f0);
      const resumeKey = PHASES[phaseIdx].key;
      job.stage = job.phase = resumeKey;
      const paletteStr = Object.entries(canvas.palette).filter(([k]) => k !== '.').map(([k, v]) => `${k}=${v}`).join(', ');
      emit('vision.committed', { brief: job.brief });
      emit('stage.enter', { stage: resumeKey, goal: PHASES[phaseIdx].goal });
      messages.push({
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/png', data: frameToPngBase64(f0) } },
          { type: 'text', text: liveResumeUserMessage(subject, canvas.cols, canvas.rows, paletteStr, asciiView(canvas)) },
        ],
      });
    } else {
      // VISION — commit the iconic design brief.
      job.stage = job.phase = 'vision';
      job.statusMessage = 'Designing the vision…';
      emit('vision.start', {});
      const brief = await designVision();
      job.brief = brief;
      traj.spec = brief;
      emit('vision.committed', { brief });

      // SHAPE — open the first carving phase.
      job.stage = job.phase = 'shape';
      job.statusMessage = 'Blocking in the shape…';
      emit('stage.enter', { stage: 'shape', goal: PHASES[0].goal });
      messages.push({ role: 'user', content: statueDrawerUserMessage(subject, size, brief) });
    }

    const MAX_PASSES = size >= 48 ? 12 : 8;

    for (let turn = 0; turn < MAX_PASSES + 6; turn++) {
      if (job.control === 'cancel') {
        job.status = 'cancelled';
        job.statusMessage = 'Cancelled';
        emit('job.cancelled', { reason: 'cancelled by user' });
        return;
      }
      if (job.control === 'pause') {
        job.status = 'paused';
        job.statusMessage = 'Paused — resumable';
        emit('job.paused', { reason: 'paused by user' });
        return;
      }
      if ((job.costUsd ?? 0) >= job.costCapUsd) {
        job.statusMessage = 'Cost cap reached';
        break; // keep-best handles shipping below
      }

      // Inject any live user feedback (human in the loop) into the upcoming turn.
      if (job.pendingFeedback && job.pendingFeedback.length) {
        const fb = job.pendingFeedback.join(' ');
        job.pendingFeedback = [];
        emit('feedback.injected', { text: fb, atStage: job.stage });
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

      const msg = await callDrawer(messages);
      messages.push({ role: 'assistant', content: msg.content });
      const tool = msg.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');

      // No tool call → the drawer declares this PHASE done → the auditor reviews.
      if (!tool) {
        if (!canvas) {
          messages.push({ role: 'user', content: 'Use setup to create the canvas, then paint.' });
          continue;
        }
        const ph = PHASES[phaseIdx];
        job.statusMessage = `Art director reviewing the ${ph.key} phase…`;
        emit('audit.start', { stage: ph.key });
        const verdict = await audit(frameToPngBase64(canvasToFrame(canvas)), ph, job.brief || '');
        job.critiques.push({ phase: ph.key, approved: verdict.approved });
        job.audits.push({ stage: ph.key, pass: job.gestures, approved: verdict.approved, issues: verdict.issues });
        traj.audits.push({ stage: ph.key, afterPass: job.gestures, approved: verdict.approved, issues: verdict.issues });
        emit('audit.verdict', { stage: ph.key, approved: verdict.approved, issues: verdict.issues, pass: job.gestures });

        if (verdict.approved) {
          bestCanvas = cloneCanvas(canvas); // keep-best: snapshot every APPROVED state
          job.stagesPassed.push(ph.key);
          const approvedFrame = canvasToFrame(canvas);
          emit('stage.approved', { stage: ph.key, frame: approvedFrame });
          emit('keepbest.snapshot', { stage: ph.key, frame: approvedFrame });
          if (phaseIdx >= PHASES.length - 1) {
            finished = true;
            break;
          }
          phaseIdx++;
          phaseRejects = 0;
          const next = PHASES[phaseIdx];
          job.stage = job.phase = next.key;
          job.phaseIndex = phaseIdx;
          job.statusMessage = `${next.key} phase`;
          emit('stage.enter', { stage: next.key, goal: next.goal });
          messages.push({
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/png', data: frameToPngBase64(approvedFrame) } },
              { type: 'text', text: `✅ The ${ph.key.toUpperCase()} phase is APPROVED and LOCKED.\n\nNow → ${next.drawer}.\nWork in batches with the paint tool; reply DONE when this phase is complete.` },
            ],
          });
          continue;
        }

        // Rejected — bounded retries, then advance (read-level caps prevent churn).
        phaseRejects++;
        if (phaseRejects > ph.cap) {
          if (phaseIdx >= PHASES.length - 1) break;
          phaseIdx++;
          phaseRejects = 0;
          const next = PHASES[phaseIdx];
          job.stage = job.phase = next.key;
          job.phaseIndex = phaseIdx;
          emit('stage.enter', { stage: next.key, goal: next.goal });
          messages.push({ role: 'user', content: [{ type: 'text', text: `Moving on. Now → ${next.drawer}. Reply DONE when complete.` }] });
          continue;
        }
        messages.push({
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/png', data: frameToPngBase64(canvasToFrame(canvas)) } },
            { type: 'text', text: `ART DIRECTOR — ${ph.key.toUpperCase()} phase NOT approved. Fix exactly these, then reply DONE:\n- ${verdict.issues.join('\n- ')}` },
          ],
        });
        continue;
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
        job.title = canvas.title;
        job.statusMessage = `Canvas ${cols}×${rows} — blocking in the shape`;
        messages.push({
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: tool.id,
              content: `Canvas ready ${cols}×${rows}, all background. Palette: ${Object.entries(palette).filter(([k]) => k !== '.').map(([k, v]) => `${k}=${v}`).join(', ')}.\n\nNow PASS 1: block the WHOLE silhouette as one batch so it fills the canvas and reads at a glance.`,
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
        const ph = PHASES[phaseIdx];
        emit('pass.start', { stage: ph.key, pass: job.gestures + 1, note: input.note ?? '' });
        const issues: string[] = [];
        const appliedCells: { x: number; y: number; c: string }[] = [];
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
          appliedCells.push({ x: e.x, y: e.y, c: e.c });
        }
        job.gestures++;
        const frame = canvasToFrame(canvas);
        job.latestFrame = frame;
        job.frames.push(frame);
        job.statusMessage = `Pass ${job.gestures}${input.note ? ` — ${input.note}` : ''}`;
        traj.passes.push({ pass: job.gestures, stage: ph.key, note: input.note ?? '', applied: appliedCells.length, costUsd: +(job.costUsd ?? 0).toFixed(3) });
        // pass.delta = the heartbeat for the live reveal; pass.done.frame is the authoritative resync.
        emit('pass.delta', { stage: ph.key, pass: job.gestures, cells: appliedCells });
        emit('pass.done', { stage: ph.key, pass: job.gestures, cellsApplied: appliedCells.length, note: input.note ?? '', frame });

        const png = frameToPngBase64(frame);
        const overBudget = job.gestures >= MAX_PASSES;
        const text =
          `Pass ${job.gestures}: applied ${appliedCells.length} edit(s)${issues.length ? `; skipped — ${issues.join('; ')}` : ''}.\n` +
          `Canvas now (${canvas.cols}×${canvas.rows}):\n${asciiView(canvas)}\n\n` +
          `LOOK at the render cold, against your bar at true scale. If the silhouette is wrong, ERASE and re-block it (don't polish a wrong shape). Otherwise paint the next coarse→fine pass — fix exactly what you SEE, raise the WHOLE piece. Reply DONE only when it clears your 96% bar (don't chase 100%, don't invent flaws).` +
          (overBudget ? `\n\nNOTE: converge and finish (reply DONE) soon.` : '');
        messages.push({
          role: 'user',
          content: [{ type: 'tool_result', tool_use_id: tool.id, content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/png', data: png } },
            { type: 'text', text },
          ] }],
        });
        continue;
      }

      // Unknown tool — nudge.
      messages.push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: tool.id, content: 'Use setup or paint.' }] });
    }

    if (!canvas) {
      job.status = 'error';
      job.error = 'The artist never set up a canvas.';
      emit('job.error', { message: job.error });
      return;
    }

    // keep-best: if we did NOT finish cleanly, ship the last APPROVED state, not the churned latest.
    let shippedFrom: string | null = null;
    if (!finished && bestCanvas && bestCanvas !== canvas) {
      const reason = (job.costUsd ?? 0) >= job.costCapUsd ? 'cost cap reached' : 'pass cap reached';
      canvas = bestCanvas;
      shippedFrom = job.stagesPassed[job.stagesPassed.length - 1] || 'shape';
      job.latestFrame = canvasToFrame(canvas);
      emit('keepbest.shipped', { fromStage: shippedFrom, reason, frame: job.latestFrame });
    }

    const frame = canvasToFrame(canvas);
    job.frame = frame;
    job.latestFrame = frame;
    job.title = canvas.title;
    job.palette = Object.entries(canvas.palette).filter(([k]) => k !== '.').map(([, v]) => v);
    job.cells = frame.cells.length;
    job.stage = job.phase = 'done';
    job.durationMs = Date.now() - job.startedAt;
    job.status = 'done';
    job.statusMessage = 'Done';

    traj.final = { title: canvas.title, passes: job.gestures, stagesPassed: job.stagesPassed, shippedFrom, costUsd: +(job.costUsd ?? 0).toFixed(3), durationMs: job.durationMs, frame };
    writeTrajectory(job, traj);

    emit('job.done', { frame, passes: job.gestures, stagesPassed: job.stagesPassed, costUsd: +(job.costUsd ?? 0).toFixed(3), durationMs: job.durationMs });
  } catch (err) {
    job.status = 'error';
    job.error = err instanceof Error ? err.message : 'Generation failed';
    emit('job.error', { message: job.error });
  }
}
