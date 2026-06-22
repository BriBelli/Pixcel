import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import os from 'os';
import type { PXSFrame } from '../store/pxs-store';
import { charMapToFrame, type CharMap } from './pxs-frame-schema';
import { frameToPngBase64 } from './render-frame';
import { DEFAULT_MODEL, DRAW_EFFORT } from './artisan-loop';
import {
  statueVisionSystemPrompt,
  statueVisionUserMessage,
  STATUE_VISION_SCHEMA,
  statueHotPotatoSystemPrompt,
  STATUE_TURN_SCHEMA,
  statueFirstDrawUserMessage,
  statueTurnUserMessage,
} from './ai-art-system-prompt';

/**
 * SERVER-SIDE LIVE JOB RUNNER — THE QUALITY ENGINE (the hot-potato model; docs/PLAN-QUALITY-ENGINE.md).
 *
 * Why this replaced the per-phase drawer+auditor: the old engine shipped a "tennis player" holding a
 * BALLOON instead of a racket — and every phase APPROVED it. That was an EVALUATION failure (a judge
 * coupled to the making rationalizes its own work), not a scheduling one. The fix is structural:
 *
 *   VISION       — commit a FEASIBLE, fit-to-size design BRIEF + palette + a complexity estimate
 *                  (the complexity sets a cost CEILING, a seatbelt — not the quality bar).
 *   HOT-POTATO   — ONE capable artist loops, FRESH EYES every pass: it sees ONLY {brief + the current
 *                  render} (never the build history), JUDGES the canvas cold, and if it isn't done it
 *                  applies the highest-value FIX itself as a BATCH of edits (the editor IS the drawer —
 *                  collapsing the prescribe→execute gap). Approve → ship.
 *   REDESIGN     — if the design can't read at this size, re-VISION simpler instead of grinding a blob.
 *   keep-best    — ship the last APPROVED state, never a churned pass.
 *
 * Preserved from the M2 win: BATCHED passes (NEVER per-stroke calls — that was the ~80-round dragon),
 * READ-level / object-identity judging (not sub-pixel nitpicking), keep-best, NO exemplars, full
 * effort, true-scale perception, and watchability (the batched passes stream over SSE).
 *
 * The job runs DETACHED so it survives the request window; the client tails the contract events
 * (docs/PIXCEL-LIVE-SSE.md) over the stream endpoint and watches each pass land. Pause/cancel/resume/
 * live-feedback wrap AROUND the engine. Every run is captured as a trajectory for the own-model (Option 3).
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

// ---- THE COMPLEXITY CEILINGS — a cost SEATBELT, NOT a target (docs/PLAN-ADAPTIVE-BUDGET.md). The
// VISION step estimates complexity (independent of the fixed 32² size); that maps to a max number of
// hot-potato passes before we ship keep-best. `done` is quality-driven (the fresh-eyes turn approves);
// this ceiling only bounds runaway. The complex/advanced tiers flag `forum` for the optional final
// gate (added in the leverage order once the core holds). ----
type Complexity = 'simple' | 'moderate' | 'complex' | 'advanced';
interface Ceiling {
  passes: number; // max hot-potato passes (incl. the opening block-in)
  forum: boolean; // run the second-LLM/consensus final gate on hard pieces
}
const CEILINGS: Record<Complexity, Ceiling> = {
  simple: { passes: 4, forum: false },
  moderate: { passes: 6, forum: false },
  complex: { passes: 9, forum: true },
  advanced: { passes: 12, forum: true },
};
const MAX_REDESIGNS = 2; // re-VISION simpler at most this many times before committing to refine
// After this many fix passes without an approval the engine applies CONVERGENCE PRESSURE: the turn is
// almost certainly chasing internal detail that can't render at this size (the tennis-racket grind), so
// we force a drastic simplify-or-redesign instead of letting it churn to the ceiling.
const CONVERGE_PRESSURE_AT = 3;

// Char pool for auto-assigning a symbol when a turn introduces a brand-new #rrggbb color mid-fix.
const PAINT_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ#@$%&*+=';
function nextPaintChar(palette: Record<string, string>): string | null {
  for (const ch of PAINT_CHARS) if (!(ch in palette)) return ch;
  return null;
}

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
const HEX_RE = /^#[0-9a-f]{6}$/;
/**
 * Apply ONE batched pass of cell edits to the canvas in place (the hot-potato fix = the pass = the
 * debounce; NEVER per-stroke). A `c` may be a palette char, "." to erase, or a raw #rrggbb hex — a
 * hex maps to its existing palette char or auto-registers a new one, so a fresh-eyes turn is never
 * dead-ended for want of a shade the committed palette didn't pre-declare. Out-of-bounds / unknown
 * symbols are skipped and reported. Returns the cells actually applied (for the SSE pass.delta).
 */
function applyEdits(
  canvas: Canvas,
  edits: { x: number; y: number; c: string }[]
): { applied: { x: number; y: number; c: string }[]; issues: string[] } {
  const applied: { x: number; y: number; c: string }[] = [];
  const issues: string[] = [];
  for (const e of edits || []) {
    if (!Number.isInteger(e.x) || !Number.isInteger(e.y) || e.x < 0 || e.x >= canvas.cols || e.y < 0 || e.y >= canvas.rows) {
      if (issues.length < 4) issues.push(`(${e.x},${e.y}) out of bounds`);
      continue;
    }
    let c = String(e.c);
    if (c !== '.' && !(c in canvas.palette)) {
      const lc = c.toLowerCase();
      if (HEX_RE.test(lc)) {
        let ch = Object.keys(canvas.palette).find((k) => canvas.palette[k] === lc);
        if (!ch) {
          const fresh = nextPaintChar(canvas.palette);
          if (!fresh) { if (issues.length < 4) issues.push(`palette full — dropped ${lc}`); continue; }
          canvas.palette[fresh] = lc;
          ch = fresh;
        }
        c = ch;
      } else {
        if (issues.length < 4) issues.push(`char "${c}" not in palette`);
        continue;
      }
    }
    canvas.grid[e.y][e.x] = c;
    applied.push({ x: e.x, y: e.y, c });
  }
  return { applied, issues };
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
  complexity?: string; // simple | moderate | complex | advanced — VISION's estimate → the pass CEILING
  subjectClass?: string; // (legacy) iconic | figure | action | scene
  auditChecks?: string[]; // (legacy) subject-specific must-verify items
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

  // ---- VISION (the Michelangelo step) — commit a FEASIBLE design + palette + complexity. Structured
  // output so the engine OWNS the palette (no setup tool) and gets the complexity ceiling. Pass
  // `simplerThan` to RE-VISION simpler when a design proved infeasible at this size. ----
  type Vision = { brief: string; palette: { char: string; hex: string; role: string }[]; complexity: Complexity };
  const designVision = async (simplerThan?: string): Promise<Vision> => {
    const msg = await withRetry(async () => {
      const s = client.messages.stream({
        model,
        max_tokens: 4000,
        thinking: { type: 'adaptive', display: 'summarized' },
        output_config: { effort: 'high', format: { type: 'json_schema', schema: STATUE_VISION_SCHEMA } },
        system: statueVisionSystemPrompt(size, simplerThan),
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
    const raw = msg.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map((b) => b.text).join('');
    const p = JSON.parse(raw);
    const palette = Array.isArray(p.palette) ? p.palette : [];
    const complexity: Complexity = (['simple', 'moderate', 'complex', 'advanced'] as const).includes(p.complexity) ? p.complexity : 'moderate';
    return { brief: String(p.brief || '').trim(), palette, complexity };
  };

  // ---- ONE fresh-eyes hot-potato turn: judge the CURRENT render COLD against {brief}, then either
  // approve or apply the highest-value FIX itself (structured output: {approved, flaw, redesign,
  // edits}). FRESH context every call (no message history) — that freshness IS the hot-potato. ----
  const turnSystem = statueHotPotatoSystemPrompt(size);
  type Turn = { approved: boolean; flaw: string; redesign: boolean; edits: { x: number; y: number; c: string }[] };
  const callTurn = async (content: any): Promise<Turn> => {
    const msg = await withRetry(async () => {
      const s = client.messages.stream({
        model,
        max_tokens: 32000,
        thinking: { type: 'adaptive', display: 'summarized' },
        output_config: { effort: EFFORT, format: { type: 'json_schema', schema: STATUE_TURN_SCHEMA } },
        system: [{ type: 'text', text: turnSystem, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content }],
      } as any);
      job.liveThinking = '';
      const cap = (d: string) => { job.liveThinking = (job.liveThinking + d).slice(-4000); job.updatedAt = Date.now(); };
      (s as any).on('thinking', cap);
      s.on('text', cap);
      return s.finalMessage();
    });
    accrue((msg as any).usage || {});
    emitCost();
    const raw = msg.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map((b) => b.text).join('');
    try {
      const p = JSON.parse(raw);
      return { approved: !!p.approved, flaw: String(p.flaw || ''), redesign: !!p.redesign, edits: Array.isArray(p.edits) ? p.edits : [] };
    } catch {
      return { approved: false, flaw: '(unparseable turn — retrying)', redesign: false, edits: [] };
    }
  };

  // Build the working canvas from the committed VISION palette (the engine owns it — no setup tool).
  const buildCanvas = (pal: Vision['palette'], title: string): Canvas => {
    const palette: Record<string, string> = { '.': BACKGROUND };
    for (const e of pal) {
      const ch = String(e.char || '').slice(0, 1);
      const hex = String(e.hex || '').toLowerCase();
      if (ch && ch !== '.' && HEX_RE.test(hex)) palette[ch] = hex;
    }
    return { title, cols: size, rows: size, palette, grid: blankGrid(size, size) };
  };
  const paletteStr = (c: Canvas): string =>
    Object.entries(c.palette).filter(([k]) => k !== '.').map(([k, v]) => `${k}=${v}`).join(', ');

  // ---- trajectory accumulation (Option-3 training data) ----
  const traj: any = { id: job.id, subject, size, model, passes: [], audits: [] };

  try {
    emit('job.started', { id: job.id, subject, size, model, costCapUsd: job.costCapUsd });

    let canvas: Canvas;
    let brief = job.brief || '';
    let complexity: Complexity = 'moderate';
    let bestCanvas: Canvas | null = null; // the last APPROVED snapshot (keep-best)
    let finished = false;
    let redesigns = 0;

    if (resumeFrame) {
      // RESUME: the saved frame IS the work-in-progress; re-enter the hot-potato loop on it (the
      // fresh-eyes turn judges + fixes from here). Complexity unknown → the moderate ceiling.
      canvas = frameToCanvas(resumeFrame, job.title || subject);
      brief = job.brief || `(resumed work-in-progress of "${subject}" — finish it to the committed Pixcel standard, fresh eyes each pass)`;
      job.brief = brief;
      traj.spec = brief;
      traj.resumed = true;
      const f0 = canvasToFrame(canvas);
      job.latestFrame = f0;
      job.frames.push(f0);
      job.stage = job.phase = 'refine';
      emit('vision.committed', { brief });
      emit('stage.enter', { stage: 'refine', goal: 'finish the piece — fresh-eyes judge + fix each pass' });
    } else {
      // VISION — commit the feasible, fit-to-size design + palette + complexity.
      job.stage = job.phase = 'vision';
      job.statusMessage = 'Designing the vision…';
      emit('vision.start', {});
      const v = await designVision();
      brief = v.brief;
      complexity = v.complexity;
      job.brief = brief;
      job.complexity = complexity;
      traj.spec = brief;
      traj.complexity = complexity;
      traj.palette = v.palette;
      canvas = buildCanvas(v.palette, subject);
      job.title = canvas.title;
      emit('vision.committed', { brief, palette: v.palette, complexity });
      job.stage = job.phase = 'refine';
      job.statusMessage = 'Blocking in the composition…';
      emit('stage.enter', { stage: 'refine', goal: `hot-potato — fresh-eyes judge + fix each pass (complexity: ${complexity})` });
    }

    const maxPasses = CEILINGS[complexity].passes;

    // ---- THE HOT-POTATO LOOP: a "pass" = one batched fresh-eyes turn (the debounce — NEVER per
    // stroke). Each turn sees ONLY {brief + current render}. Approve → ship; else apply the fix; the
    // ceiling is a cost seatbelt, not the stop condition. ----
    let pass = 0;
    let fixPasses = 0; // fix passes since the last (re)design — drives CONVERGENCE PRESSURE
    while (pass < maxPasses) {
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

      const blank = canvas.grid.every((row) => row.every((c) => c === '.'));

      // Live user feedback (human in the loop) folds into THIS turn's fresh context as a floor.
      let feedbackLine = '';
      if (job.pendingFeedback && job.pendingFeedback.length) {
        const fb = job.pendingFeedback.join(' ');
        job.pendingFeedback = [];
        emit('feedback.injected', { text: fb, atStage: job.stage });
        feedbackLine = `\n\n⚡ LIVE FEEDBACK FROM THE USER — fold this in now and treat it as a FLOOR to build past (it overrides earlier intent if it conflicts): ${fb}`;
      }

      let content: any;
      if (blank) {
        // Opening pass — block the whole committed design onto the blank canvas (no render to show).
        job.statusMessage = 'Blocking in the composition…';
        emit('pass.start', { stage: 'refine', pass: job.gestures + 1, note: 'block-in' });
        content = [{ type: 'text', text: statueFirstDrawUserMessage(subject, size, brief, paletteStr(canvas)) + feedbackLine }];
      } else {
        // Fresh-eyes turn — judge the current render cold, then approve or fix. After several fix
        // passes without converging, add CONVERGENCE PRESSURE: it's almost certainly chasing detail
        // that can't render at this size, so force a decisive simplify-or-redesign (kills the grind).
        const pressureLine = fixPasses >= CONVERGE_PRESSURE_AT
          ? `\n\n⚠ CONVERGENCE PRESSURE — this piece has been reworked ${fixPasses} times without clearing the bar. You are almost certainly chasing internal detail that CANNOT render at ${size}². STOP refining the same way. THIS pass: take any element that still won't read and REPLACE it with its SIMPLEST solid iconic form (e.g. a racket = a solid oval/round head + a straight handle joined to the hand — NO internal strings), then judge it on SHAPE alone — if the shape reads, APPROVE. If the piece as a WHOLE genuinely cannot read at this size, set redesign:true. Do NOT produce another near-identical rework.`
          : '';
        job.statusMessage = fixPasses >= CONVERGE_PRESSURE_AT ? 'Forcing convergence…' : 'Fresh-eyes review…';
        emit('pass.start', { stage: 'refine', pass: job.gestures + 1 });
        content = [
          { type: 'image', source: { type: 'base64', media_type: 'image/png', data: frameToPngBase64(canvasToFrame(canvas)) } },
          { type: 'text', text: statueTurnUserMessage(subject, size, brief, paletteStr(canvas)) + feedbackLine + pressureLine },
        ];
      }

      const turn = await callTurn(content);
      pass++;

      // REDESIGN escape — the design can't read at this size → re-VISION simpler (not on resume; bounded).
      if (turn.redesign && !resumeFrame && redesigns < MAX_REDESIGNS) {
        redesigns++;
        emit('audit.verdict', { stage: 'refine', approved: false, issues: [`REDESIGN (too complex for ${size}²): ${turn.flaw}`], pass: job.gestures });
        traj.audits.push({ stage: 'redesign', afterPass: job.gestures, approved: false, issues: [turn.flaw] });
        job.statusMessage = 'Re-visioning simpler…';
        const v = await designVision(brief);
        brief = v.brief;
        complexity = v.complexity;
        job.brief = brief;
        job.complexity = complexity;
        traj.spec = brief;
        canvas = buildCanvas(v.palette, subject);
        bestCanvas = null;
        fixPasses = 0; // fresh design → reset the convergence-pressure counter
        emit('vision.committed', { brief, palette: v.palette, complexity });
        emit('stage.enter', { stage: 'refine', goal: `re-visioned simpler (complexity: ${complexity})` });
        continue; // next pass redraws the simpler design from a blank canvas
      }

      // APPROVED → converged. (A blank first draw can't be approved — it has nothing to read.)
      if (turn.approved && !blank) {
        bestCanvas = cloneCanvas(canvas); // keep-best: the approved state
        job.stagesPassed.push('refine');
        const approvedFrame = canvasToFrame(canvas);
        job.critiques.push({ phase: 'refine', approved: true });
        job.audits.push({ stage: 'refine', pass: job.gestures, approved: true, issues: [] });
        traj.audits.push({ stage: 'refine', afterPass: job.gestures, approved: true, issues: [] });
        emit('audit.verdict', { stage: 'refine', approved: true, issues: [], pass: job.gestures });
        emit('stage.approved', { stage: 'refine', frame: approvedFrame });
        emit('keepbest.snapshot', { stage: 'refine', frame: approvedFrame });
        finished = true;
        break;
      }

      // Otherwise the turn APPLIES the highest-value fix — the batched edits ARE this pass (the
      // judgment → critique feed; the fix → canvas reveal). This is the hot-potato fix in one call.
      const { applied, issues } = applyEdits(canvas, turn.edits);
      if (!blank) fixPasses++; // a real refinement (not the opening block-in) → counts toward pressure
      job.gestures++;
      const frame = canvasToFrame(canvas);
      job.latestFrame = frame;
      job.frames.push(frame);
      const note = turn.flaw || (blank ? 'block-in' : 'refine');
      job.statusMessage = `Pass ${job.gestures} — ${note}`;
      job.critiques.push({ phase: 'refine', approved: false });
      job.audits.push({ stage: 'refine', pass: job.gestures, approved: false, issues: [note] });
      traj.audits.push({ stage: 'refine', afterPass: job.gestures, approved: false, issues: [note] });
      traj.passes.push({ pass: job.gestures, stage: 'refine', note, applied: applied.length, skipped: issues, costUsd: +(job.costUsd ?? 0).toFixed(3) });
      // The flaw it named (the JUDGMENT) → critique feed; the batch (the FIX) → the live reveal.
      emit('audit.verdict', { stage: 'refine', approved: false, issues: [note], pass: job.gestures });
      emit('pass.delta', { stage: 'refine', pass: job.gestures, cells: applied });
      emit('pass.done', { stage: 'refine', pass: job.gestures, cellsApplied: applied.length, note, frame });
    }

    // keep-best ship: a clean approve ships `canvas` as-is; hitting the ceiling/cost cap WITHOUT an
    // approval ships the last APPROVED snapshot if we have one, else the most-refined latest (honest:
    // it never formally cleared the bar). We break on approve, so we never churn PAST an approval.
    let shippedFrom: string | null = null;
    if (!finished) {
      const reason = (job.costUsd ?? 0) >= job.costCapUsd ? 'cost cap reached' : 'pass ceiling reached';
      if (bestCanvas) {
        canvas = bestCanvas;
        shippedFrom = 'last approved';
      } else {
        shippedFrom = 'most-refined (never formally approved)';
      }
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

    traj.final = { title: canvas.title, passes: job.gestures, complexity, redesigns, finished, shippedFrom, costUsd: +(job.costUsd ?? 0).toFixed(3), durationMs: job.durationMs, frame };
    writeTrajectory(job, traj);

    emit('job.done', { frame, passes: job.gestures, stagesPassed: job.stagesPassed, costUsd: +(job.costUsd ?? 0).toFixed(3), durationMs: job.durationMs });
  } catch (err) {
    job.status = 'error';
    job.error = err instanceof Error ? err.message : 'Generation failed';
    emit('job.error', { message: job.error });
  }
}
