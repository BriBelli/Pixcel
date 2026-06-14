import Anthropic from '@anthropic-ai/sdk';
import type { PXSFrame, PXSCell } from '../../../store/pxs-store';
import { PXS_FRAME_SCHEMA, validateFrame } from '../../../lib/pxs-frame-schema';
import { artistSystemPrompt, artistUserMessage } from '../../../lib/ai-art-system-prompt';
import { frameToPngBase64 } from '../../../lib/render-frame';

export const runtime = 'nodejs';
export const maxDuration = 800;

const DEFAULT_MODEL = 'claude-opus-4-8';
const ALLOWED_MODELS = new Set(['claude-opus-4-8', 'claude-sonnet-4-6', 'claude-haiku-4-5']);

// How a human artist works: reason HARD about the silhouette, draw at the real resolution,
// look at the render, and fix — keeping the best draft. Quality lives in the reasoning
// (max effort), full-resolution design, and the see-and-fix loop. No exemplars: showing a
// reference makes the model COPY (derivative, capped ceiling); pure reasoning invents
// original, more creative art. Latency is a UX problem (run async), not a reason to throttle
// the reasoning.
const DRAW_EFFORT = 'high';
const DRAW_DRAFTS_SMALL = 2; // 16²/24²: draw → see → fix
const DRAW_DRAFTS_LARGE = 3; // 32²: one more look-and-fix pass

const SUBMIT_TOOL = {
  name: 'submit_art',
  description:
    'Submit your current pixel-art frame. It will be rendered to a real image and shown back to you so you can judge and refine it.',
  input_schema: PXS_FRAME_SCHEMA,
};

/** Structured-output schema for the best-of-N art-director pick. */
const BEST_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: { best: { type: 'integer' }, reason: { type: 'string' } },
  required: ['best', 'reason'],
} as const;

function paletteOf(cells: PXSCell[]): string[] {
  const seen = new Set<string>();
  for (const c of cells) if (c.color !== '#0d1117') seen.add(c.color);
  return [...seen].slice(0, 10);
}

type Send = (obj: unknown) => void;

interface LoopOpts {
  client: Anthropic;
  model: string;
  system: string;
  firstUserContent: any;
  maxDrafts: number;
  send: Send;
  quiet: boolean;
  stage: string;
  nOffset: number;
  effort: string;
}

/**
 * One artist OODA loop: draw → render → SEE → judge → refine. Returns EVERY valid draft it
 * produced (not just the last) so the caller can keep-best and never ship a regression.
 */
async function artistLoop(opts: LoopOpts): Promise<PXSFrame[]> {
  const { client, model, system, firstUserContent, maxDrafts, send, quiet, stage, nOffset, effort } = opts;
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: firstUserContent }];
  const valids: PXSFrame[] = [];
  let draftN = 0;

  for (let turn = 0; turn <= maxDrafts; turn++) {
    if (!quiet)
      send({ type: 'status', phase: stage, message: draftN === 0 ? 'Drawing…' : 'Refining…' });

    const params = {
      model,
      max_tokens: 64000,
      thinking: { type: 'adaptive', display: 'summarized' },
      output_config: { effort },
      system,
      tools: [SUBMIT_TOOL],
      messages,
    };
    const s = client.messages.stream(params as any);
    if (!quiet) {
      (s as any).on('thinking', (d: string) => send({ type: 'plan_delta', text: d }));
      s.on('text', (d) => send({ type: 'plan_delta', text: d }));
    }
    const msg = await s.finalMessage();
    messages.push({ role: 'assistant', content: msg.content });

    const toolUse = msg.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === 'submit_art'
    );
    if (!toolUse) break; // DONE — no tool call

    const candidate = toolUse.input as PXSFrame;
    const v = validateFrame(candidate);
    if (!quiet) send({ type: 'iteration', n: nOffset + draftN, frame: candidate });

    if (!v.ok) {
      messages.push({
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: `That frame is invalid: ${v.errors.slice(0, 6).join('; ')}. Fix exactly these and call submit_art again.`,
          },
        ],
      });
      draftN++;
      continue;
    }

    valids.push(candidate);
    draftN++;
    if (turn === maxDrafts) break;

    const png = frameToPngBase64(candidate);
    if (!quiet) send({ type: 'status', phase: 'review', message: 'Looking at the render…' });
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
              text: `Here is your rendered ${candidate.cols}x${candidate.rows} draft. Judge it honestly against the bar — instantly recognizable, full figure, crisp, clean? If genuinely production-ready, reply with the single word DONE and make no tool call. Otherwise call submit_art again, improving exactly what you see.`,
            },
          ],
        },
      ],
    });
  }
  return valids;
}

/** Best-of-N: render all candidates, show them to an art director, return the chosen one. */
async function judgeBest(
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

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: 'ANTHROPIC_API_KEY is not set. Add it to packages/pxs-studio/.env.local' },
      { status: 500 }
    );
  }

  let body: { prompt?: string; size?: number; model?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const prompt = (body.prompt ?? '').trim();
  if (!prompt) return Response.json({ error: 'prompt is required' }, { status: 400 });

  const size = Math.min(32, Math.max(8, Math.round(body.size ?? 16)));
  const model = body.model && ALLOWED_MODELS.has(body.model) ? body.model : DEFAULT_MODEL;

  const client = new Anthropic({ apiKey });
  const encoder = new TextEncoder();
  const startedAt = Date.now();

  const stream = new ReadableStream({
    async start(controller) {
      const send: Send = (obj) =>
        controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));

      try {
        let frame: PXSFrame | null = null;

        // Work the way a human artist does: reason HARD about the silhouette, draw at the
        // REAL requested resolution, look at the render, and fix — keeping the best draft
        // (keep-best, so a worse pass can never be shipped). No exemplars, no coarse
        // foundation: pure max reasoning at full resolution is what produces original,
        // creative, crisp art.
        send({ type: 'status', phase: 'draw', message: `Drawing at ${size}×${size}…` });
        const drafts = await artistLoop({
          client,
          model,
          system: artistSystemPrompt,
          firstUserContent: [{ type: 'text', text: artistUserMessage(prompt, size) }],
          maxDrafts: size >= 32 ? DRAW_DRAFTS_LARGE : DRAW_DRAFTS_SMALL,
          send,
          quiet: false,
          stage: 'draw',
          nOffset: 0,
          effort: DRAW_EFFORT,
        });
        if (!drafts.length) {
          send({ type: 'error', message: 'The artist did not produce a valid frame.' });
          controller.close();
          return;
        }
        send({ type: 'status', phase: 'review', message: 'Keeping the best version…' });
        frame = await judgeBest(client, model, prompt, drafts);

        if (!frame) {
          send({ type: 'error', message: 'No valid frame produced.' });
          controller.close();
          return;
        }

        const title =
          (frame as any).title || (frame.metadata as any)?.title || prompt.slice(0, 40);
        const clean: PXSFrame = {
          cols: frame.cols,
          rows: frame.rows,
          cells: frame.cells.map((c) => ({ x: c.x, y: c.y, color: c.color, opacity: 1 })),
          metadata: { title, prompt, author: 'ai-composer', model },
        };

        send({
          type: 'frame',
          frame: clean,
          title,
          palette: paletteOf(clean.cells),
          cells: clean.cells.length,
          model,
          durationMs: Date.now() - startedAt,
        });
        controller.close();
      } catch (err) {
        const message =
          err instanceof Anthropic.APIError
            ? `Claude API error ${err.status}: ${err.message}`
            : err instanceof Error
              ? err.message
              : 'Unknown error';
        send({ type: 'error', message });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
