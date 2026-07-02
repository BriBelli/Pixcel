import Anthropic from '@anthropic-ai/sdk';
import { chatOrchestratorSystemPrompt } from '../../../lib/chat-orchestrator-prompt';
import {
  A2UI_VERSION,
  checkCap,
  createLivingContext,
  DEV_USER_ID,
  getDb,
  recordUsage,
  type Interaction,
  type Thread,
} from '../../../lib/db';

export const runtime = 'nodejs';
export const maxDuration = 120;

/**
 * THE STREAMED CHAT TURN — Slice 1 of the chat-orchestrator front door.
 *
 * This is a PARALLEL path to the art engine: the splash prompt now lands here (the Pixcel Agent
 * conversation), NOT straight into the artisan loop. It mirrors api/generate-art's proven SSE
 * structure (nodejs runtime, NDJSON ReadableStream, env-key check) but instead of drawing, it:
 *   1) streams a quick high-level support response from claude-opus-4-8 (adaptive thinking), then
 *   2) emits ONE stub A2UI options block ("how do you want to make it?"), then
 *   3) emits a few follow-up suggestion strings, then `done`.
 *
 * The event contract (emitted in THIS order, one NDJSON object per line):
 *   { type:'status', phase, message }     — initial loading/thinking status (emitted immediately)
 *   { type:'text', delta }                — model text deltas, streamed as they arrive
 *   { type:'a2ui', block }                — ONE stub options block (after the text)
 *   { type:'suggestions', items }         — short list of follow-up suggestion strings
 *   { type:'done' }  | { type:'error', message }
 *
 * No art generation, no tools — pure conversation. Real classify/route comes in later slices.
 */

const MODEL = 'claude-opus-4-8';

interface HistoryMsg {
  role: 'user' | 'assistant';
  content: string;
}

type Send = (obj: unknown) => void;

/** Generate an addressable id for a persisted record. */
function newId(prefix: string): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** The Slice-1 stub A2UI block — fixed options for "how do you want to make it?". */
const STUB_A2UI = {
  kind: 'options',
  title: 'How do you want to make it?',
  options: [
    { id: 'pixcel', label: 'Use Pixcel Studio' },
    { id: 'image', label: 'Use Image Model' },
    { id: 'both', label: 'Both' },
    { id: 'guidance', label: 'More guidance' },
  ],
};

/** Slice-1 generic follow-up suggestions (later slices derive these from the subject). */
const STUB_SUGGESTIONS = [
  'Show me a few style directions',
  'What size and shape works best?',
  'Make a simple version first',
];

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: 'ANTHROPIC_API_KEY is not set. Add it to packages/pxs-studio/.env.local' },
      { status: 500 }
    );
  }

  let body: { prompt?: string; history?: HistoryMsg[]; thread_id?: string; user_id?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const prompt = (body.prompt ?? '').trim();
  if (!prompt) return Response.json({ error: 'prompt is required' }, { status: 400 });

  // ── PR-3 persistence wiring (memory-first / DB-async; never breaks the stream) ──
  const userId = (body.user_id ?? '').trim() || DEV_USER_ID;
  const db = getDb();
  const living = createLivingContext(db);

  // Carry prior turns so follow-ups are coherent. Keep only valid alternating text turns.
  const history: HistoryMsg[] = Array.isArray(body.history)
    ? body.history
        .filter(
          (m): m is HistoryMsg =>
            !!m &&
            (m.role === 'user' || m.role === 'assistant') &&
            typeof m.content === 'string' &&
            m.content.trim().length > 0
        )
        .slice(-20)
    : [];

  // ── HARD SPEND GATE ──────────────────────────────────────────────────────────
  // Check the user's running total vs their hard cap BEFORE any model call. If they're
  // over, emit an error and close the stream WITHOUT spending a token. This is the gate.
  try {
    const cap = await checkCap(db, userId);
    if (!cap.allowed) {
      const encoder = new TextEncoder();
      const blocked = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(JSON.stringify({ type: 'error', message: 'Usage cap reached' }) + '\n')
          );
          controller.close();
        },
      });
      return new Response(blocked, {
        headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' },
      });
    }
  } catch (err) {
    // Cap check failure must not block chat (persistence is best-effort) — log + continue.
    console.warn('[chat-turn] cap check failed, continuing:', err);
  }

  // Ensure a Thread exists (create if missing/not found; title = first ~40 chars of the prompt),
  // then insert the Interaction as `active` via the living-context append (memory-first, async).
  const now = Date.now();
  let threadId = (body.thread_id ?? '').trim();
  try {
    const existing = threadId ? await db.get('thread', threadId) : null;
    if (!existing) {
      threadId = threadId || newId('thread');
      const thread: Thread = {
        id: threadId,
        user_id: userId,
        category: 'thread',
        status: 'active',
        created_at: now,
        updated_at: now,
        title: prompt.slice(0, 40),
      };
      await db.put(thread);
    }
  } catch (err) {
    console.warn('[chat-turn] thread ensure failed:', err);
    threadId = threadId || newId('thread');
  }

  const interactionId = newId('interaction');
  const interaction: Interaction = {
    id: interactionId,
    user_id: userId,
    category: 'interaction',
    status: 'active',
    created_at: now,
    updated_at: now,
    thread_id: threadId,
    model: MODEL,
    prompt: { text: prompt },
    response: { text: '', tokens_used: 0, a2ui: null, a2ui_version: A2UI_VERSION },
  };
  // Memory-first append — don't block the stream on the DB write.
  living.append(interaction);

  const client = new Anthropic({ apiKey });
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send: Send = (obj) =>
        controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));

      // Accumulate the assistant text + the a2ui snapshot so we can persist after `done`.
      let assistantText = '';

      try {
        // 1) Loading/thinking status — emitted immediately so the UI can show a spinner.
        send({ type: 'status', phase: 'thinking', message: 'Thinking…' });

        // 2) Stream the quick high-level support response. Streaming + adaptive thinking is the
        //    claude-opus-4-8 pattern (see lib/artisan-loop.ts): iterate content_block_delta →
        //    text_delta and forward each text chunk.
        const messages: Anthropic.MessageParam[] = [
          ...history.map((m) => ({ role: m.role, content: m.content })),
          { role: 'user' as const, content: prompt },
        ];

        // Cast params as any at the call site (the installed SDK's request types lag adaptive
        // thinking) — the SAME pattern the artisan core uses; see lib/artisan-loop.ts.
        const params = {
          model: MODEL,
          max_tokens: 2048,
          thinking: { type: 'adaptive', display: 'summarized' },
          system: chatOrchestratorSystemPrompt,
          messages,
        };
        const llmStream = client.messages.stream(params as any);

        for await (const event of llmStream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta' &&
            event.delta.text
          ) {
            assistantText += event.delta.text;
            send({ type: 'text', delta: event.delta.text });
          }
        }
        // Surface any terminal stream error rather than silently finishing.
        const finalMessage = await llmStream.finalMessage();

        // 3) After the text: ONE stub A2UI options block (the front-door choice).
        send({ type: 'a2ui', block: STUB_A2UI });

        // 4) A short list of follow-up suggestions.
        send({ type: 'suggestions', items: STUB_SUGGESTIONS });

        // ── PERSIST THE COMPLETED TURN (best-effort; never breaks the stream) ──
        // Update the interaction's response + record usage. Any failure only warns.
        try {
          const usage = finalMessage?.usage;
          const inputTokens = usage?.input_tokens ?? 0;
          // TODO: adaptive thinking may split output across fields; input/output_tokens is the
          // best available signal from the current SDK. Estimate 0 if usage is absent.
          const outputTokens = usage?.output_tokens ?? 0;

          // Attribute tokens to their side of the exchange: INPUT tokens belong to the prompt,
          // OUTPUT tokens to the response. recordUsage still meters both (no double-count).
          await db.update('interaction', interactionId, {
            prompt: { text: prompt, tokens: inputTokens },
            response: {
              text: assistantText,
              tokens_used: outputTokens,
              a2ui: STUB_A2UI,
              a2ui_version: A2UI_VERSION,
            },
          } as Partial<Interaction>);
          await recordUsage(db, {
            user_id: userId,
            interaction_id: interactionId,
            input_tokens: inputTokens,
            output_tokens: outputTokens,
          });
        } catch (err) {
          console.warn('[chat-turn] persist/usage failed (stream unaffected):', err);
        }

        // Emit the addressable ids so the client can edit/delete the turn later.
        send({ type: 'done', thread_id: threadId, interaction_id: interactionId });
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
