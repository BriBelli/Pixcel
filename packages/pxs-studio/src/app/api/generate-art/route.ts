import Anthropic from '@anthropic-ai/sdk';
import type { PXSFrame } from '../../../store/pxs-store';
import { artistSystemPrompt, artistUserMessage } from '../../../lib/ai-art-system-prompt';
import {
  artistLoop,
  judgeBest,
  paletteOf,
  DRAW_EFFORT,
  DEFAULT_MODEL,
  ALLOWED_MODELS,
} from '../../../lib/artisan-loop';

export const runtime = 'nodejs';
export const maxDuration = 800;

// How a human artist works: reason HARD about the silhouette, draw at the real resolution,
// look at the render, and fix — keeping the best draft. Quality lives in the reasoning
// (max effort), full-resolution design, and the see-and-fix loop. The shared loop lives in
// lib/artisan-loop.ts (the immutable core); this route just adapts its emit events onto SSE.
const DRAW_DRAFTS_SMALL = 2; // 16²/24²: draw → see → fix
const DRAW_DRAFTS_LARGE = 3; // 32²: one more look-and-fix pass

type Send = (obj: unknown) => void;

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

  const size = Math.min(64, Math.max(8, Math.round(body.size ?? 16)));
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
          effort: DRAW_EFFORT,
          emit: {
            status: (phase, message) => send({ type: 'status', phase, message }),
            thinking: (text) => send({ type: 'plan_delta', text }),
            iteration: (n, frame) => send({ type: 'iteration', n, frame }),
          },
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
