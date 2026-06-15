import Anthropic from '@anthropic-ai/sdk';
import type { PXSFrame } from '../store/pxs-store';
import { charMapToFrame, LIVE_REVIEW_SCHEMA, type CharMap } from './pxs-frame-schema';
import { frameToPngBase64 } from './render-frame';
import {
  liveArtistSystemPrompt,
  liveArtistUserMessage,
  liveAuditorSystemPrompt,
  liveAuditorUserMessage,
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
  status: 'running' | 'done' | 'error';
  phase: string;
  phaseIndex: number;
  gestures: number;
  statusMessage: string;
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

export function getLiveJob(id: string): LiveJob | null {
  return jobs.get(id) ?? null;
}

export function startLiveJob(opts: { prompt: string; size: number; model: string; apiKey: string }): string {
  const id = (globalThis.crypto as Crypto).randomUUID();
  const job: LiveJob = {
    id,
    prompt: opts.prompt,
    size: opts.size,
    model: opts.model || DEFAULT_MODEL,
    status: 'running',
    phase: 'setup',
    phaseIndex: 0,
    gestures: 0,
    statusMessage: 'Planning the canvas…',
    critiques: [],
    frames: [],
    startedAt: Date.now(),
    updatedAt: Date.now(),
  };
  jobs.set(id, job);
  void runCascade(job, opts.apiKey);
  return id;
}

async function runCascade(job: LiveJob, apiKey: string): Promise<void> {
  const client = new Anthropic({ apiKey });
  const prompt = job.prompt;
  const model = job.model;
  const touch = () => {
    job.updatedAt = Date.now();
  };

  try {
    const messages: Anthropic.MessageParam[] = [{ role: 'user', content: liveArtistUserMessage(prompt, job.size) }];
    let canvas: Canvas | null = null;
    let phaseIdx = 0;
    let reviewsThisPhase = 0;
    let totalReviews = 0;
    const progress: string[] = []; // provisionally-approved phases (recall can reopen any)

    for (let turn = 0; turn < MAX_GESTURES + 30; turn++) {
      const params = {
        model,
        max_tokens: 32000,
        thinking: { type: 'adaptive', display: 'summarized' },
        output_config: { effort: EFFORT },
        system: liveArtistSystemPrompt,
        tools: [SETUP_TOOL, PAINT_TOOL, REVIEW_TOOL],
        messages: pruneForSend(messages),
      };
      const msg = await withRetry(() => client.messages.stream(params as any).finalMessage());
      messages.push({ role: 'assistant', content: msg.content });

      const tool = msg.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
      if (!tool) {
        messages.push({ role: 'user', content: 'Use setup, paint, or request_review to work on the canvas.' });
        continue;
      }

      if (tool.name === 'setup') {
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
        touch();
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
        touch();

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
          touch();
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
        touch();

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
    touch();
  } catch (err) {
    job.status = 'error';
    job.error = err instanceof Error ? err.message : 'Generation failed';
    touch();
  }
}
