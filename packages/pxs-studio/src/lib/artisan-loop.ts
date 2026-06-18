import Anthropic from '@anthropic-ai/sdk';
import type { PXSFrame, PXSCell } from '../store/pxs-store';
import { CHARMAP_SCHEMA, validateCharMap, charMapToFrame, type CharMap } from './pxs-frame-schema';
import { frameToPngBase64 } from './render-frame';

/**
 * THE ARTISAN CORE (the immutable, quality-bearing unit).
 *
 * One artist OODA loop: reason HARD → draw the WHOLE piece at true resolution → render →
 * SEE the rendered image → judge it honestly → fix → repeat → keep the BEST. This is how a
 * human artist works, and it's the only thing that produces craft-quality output (see
 * docs/AGENTIC-ARTISAN-THESIS.md). Everything else — streaming, detached jobs, persistence,
 * pause/resume — is orchestration built AROUND this core, never inside it.
 *
 * Both entry points share this module: the synchronous SSE route (api/generate-art) and the
 * detached live job (lib/live-jobs). They differ only in how they ADAPT `emit` to their UI.
 */

export const DRAW_EFFORT = 'high';
export const DEFAULT_MODEL = 'claude-opus-4-8';
export const ALLOWED_MODELS = new Set(['claude-opus-4-8', 'claude-sonnet-4-6', 'claude-haiku-4-5']);

const SUBMIT_TOOL = {
  name: 'submit_art',
  description:
    'Submit your pixel-art drawing as a compact char-map: cols, rows, a palette (single-char symbol → lowercase #rrggbb), and grid (one string per row, one char per column; "." = background). It will be rendered to a real image and shown back to you so you can judge and refine it.',
  input_schema: CHARMAP_SCHEMA,
};

/** Structured-output schema for the best-of-N art-director pick. */
const BEST_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: { best: { type: 'integer' }, reason: { type: 'string' } },
  required: ['best', 'reason'],
} as const;

export function paletteOf(cells: PXSCell[]): string[] {
  const seen = new Set<string>();
  for (const c of cells) if (c.color !== '#0d1117') seen.add(c.color);
  return [...seen].slice(0, 10);
}

/** Retry with backoff — a long detached job must survive transient API/network errors. */
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

/**
 * How the loop reports progress. Each consumer adapts these to its own surface:
 * the SSE route streams them as ndjson; the live job writes them into LiveJob state.
 * `shouldStop` lets a detached job honor pause/cancel between iterations.
 */
export interface ArtisanEmit {
  status?: (phase: string, message: string) => void;
  thinking?: (delta: string) => void;
  /**
   * A PARTIAL frame, emitted ROW BY ROW as the model literally writes the char-map. This is the
   * real "watch it paint" signal — the actual generation stream, not a synthetic interpolation.
   * Fires once per new grid row during a draft; the consumer paints exactly what has arrived.
   */
  partial?: (n: number, frame: PXSFrame) => void;
  iteration?: (n: number, frame: PXSFrame) => void;
  shouldStop?: () => boolean;
  /** Optional extra text appended to the next look-and-fix turn (e.g. live user feedback). */
  drainFeedback?: () => string | null;
}

export interface LoopOpts {
  client: Anthropic;
  model: string;
  system: string;
  firstUserContent: any;
  /** Number of look-and-fix passes after the first draft (total drafts ≈ maxDrafts + 1). */
  maxDrafts: number;
  effort?: string;
  emit?: ArtisanEmit;
  /** Frames to count as candidates even if the loop produces nothing better (e.g. on resume). */
  seedFrames?: PXSFrame[];
}

/**
 * One artist loop: draw → render → SEE → judge → refine. Returns EVERY valid draft it
 * produced (plus any seedFrames) so the caller can keep-best and never ship a regression.
 */
export async function artistLoop(opts: LoopOpts): Promise<PXSFrame[]> {
  const { client, model, system, firstUserContent, maxDrafts, effort = DRAW_EFFORT, emit, seedFrames } = opts;
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: firstUserContent }];
  const valids: PXSFrame[] = seedFrames ? [...seedFrames] : [];
  let draftN = 0;

  for (let turn = 0; turn <= maxDrafts; turn++) {
    if (emit?.shouldStop?.()) break;
    emit?.status?.('draw', draftN === 0 ? 'Drawing…' : 'Refining…');

    const params = {
      model,
      max_tokens: 64000,
      thinking: { type: 'adaptive', display: 'summarized' },
      output_config: { effort },
      system,
      tools: [SUBMIT_TOOL],
      messages,
    };
    const msg = await withRetry(async () => {
      const s = client.messages.stream(params as any);
      if (emit?.thinking) {
        (s as any).on('thinking', (d: string) => emit.thinking!(d));
        s.on('text', (d) => emit.thinking!(d));
      }
      // Paint the char-map LIVE: as the model streams the submit_art tool input, the grid rows
      // arrive one at a time. Build a partial frame from the accumulating JSON snapshot and emit
      // it whenever a new row lands — a real row-by-row reveal from the actual generation.
      if (emit?.partial) {
        let lastRows = -1;
        s.on('inputJson', (_partial, snap: any) => {
          if (!snap || typeof snap.cols !== 'number' || typeof snap.rows !== 'number') return;
          const rowsSoFar = Array.isArray(snap.grid) ? snap.grid.length : 0;
          if (rowsSoFar === lastRows) return; // only on a NEW row, not every char
          lastRows = rowsSoFar;
          try {
            emit.partial!(draftN, charMapToFrame({
              cols: snap.cols,
              rows: snap.rows,
              palette: snap.palette && typeof snap.palette === 'object' ? snap.palette : {},
              grid: Array.isArray(snap.grid) ? snap.grid : [],
              title: typeof snap.title === 'string' ? snap.title : undefined,
            }));
          } catch {
            /* partial JSON mid-row — skip this tick */
          }
        });
      }
      return s.finalMessage();
    });
    messages.push({ role: 'assistant', content: msg.content });

    const toolUse = msg.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === 'submit_art'
    );
    if (!toolUse) break; // DONE — no tool call

    const charMap = toolUse.input as CharMap;
    const v = validateCharMap(charMap);

    if (!v.ok) {
      messages.push({
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: `That char-map is invalid: ${v.errors.slice(0, 6).join('; ')}. Fix exactly these and call submit_art again.`,
          },
        ],
      });
      draftN++;
      continue;
    }

    // Expand the compact char-map into the canonical dense PXSFrame the rest of the
    // pipeline consumes (render, judge, store, hardware).
    const candidate = charMapToFrame(charMap);
    emit?.iteration?.(draftN, candidate);
    valids.push(candidate);
    draftN++;
    if (turn === maxDrafts) break;

    const png = frameToPngBase64(candidate);
    emit?.status?.('review', 'Looking at the render…');
    const feedback = emit?.drainFeedback?.();
    const fbLine = feedback
      ? `\n\n⚡ LIVE FEEDBACK FROM THE USER — fold this in now (it overrides earlier intent if it conflicts): ${feedback}`
      : '';
    messages.push({
      role: 'user',
      content: [
        {
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/png', data: png } },
            {
              type: 'text',
              text: `Here is your rendered ${candidate.cols}x${candidate.rows} draft. Judge it honestly against the bar — instantly recognizable, full figure, crisp, clean? If genuinely production-ready, reply with the single word DONE and make no tool call. Otherwise call submit_art again, improving exactly what you see.${fbLine}`,
            },
          ],
        },
      ],
    });
  }
  return valids;
}

/** Best-of-N: render all candidates, show them to an art director, return the chosen one. */
export async function judgeBest(
  client: Anthropic,
  model: string,
  prompt: string,
  frames: PXSFrame[]
): Promise<PXSFrame> {
  if (frames.length <= 1) return frames[0];
  const content: any[] = [];
  frames.forEach((f, i) => {
    content.push({ type: 'text', text: `Option ${i}:` });
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: 'image/png', data: frameToPngBase64(f) },
    });
  });
  content.push({
    type: 'text',
    text: `Subject: "${prompt}". Pick the SINGLE best option. Judge by, in order: (1) instantly recognizable as the subject — the child test; (2) clean and well-formed silhouette. A simple, clean, clearly-recognizable version BEATS a more detailed but muddy or mis-shapen one. Do not reward extra detail if it makes the shape worse. Return its index in "best".`,
  });
  try {
    const s = client.messages.stream({
      model,
      max_tokens: 800,
      system:
        'You are a pixel-art art director choosing the strongest of several rendered options. Be decisive.',
      output_config: { format: { type: 'json_schema', schema: BEST_SCHEMA } },
      messages: [{ role: 'user', content }],
    } as any);
    const msg = await s.finalMessage();
    const raw = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');
    const r = JSON.parse(raw);
    const i = Math.max(0, Math.min(frames.length - 1, Number(r.best) || 0));
    return frames[i];
  } catch {
    return frames[0];
  }
}
