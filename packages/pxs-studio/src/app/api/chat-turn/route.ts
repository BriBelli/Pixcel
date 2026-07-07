import Anthropic from '@anthropic-ai/sdk';
import {
  CLASSIFY_SYSTEM,
  CLASSIFY_SCHEMA,
  parseClassifyResult,
  STUB_SUGGESTIONS,
} from '../../../lib/chat-classify';
import { coordinateImage } from '../../../lib/engine/coordinator';
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
 *   1) streams a quick consultative response from claude-opus-4-8 (adaptive thinking) — a natural
 *      question about the WORK (style/type/use-case), never about tools, then
 *   2) runs ONE non-streaming classify pass (also claude-opus-4-8) over the exchange, then
 *   3) emits contextual quick-pick suggestions (possible ANSWERS the user can tap), then `done`.
 *
 * There is NO tool/medium picker — the agent chooses the medium itself (a doctor asks about
 * symptoms, not which surgery). The classify yields { intent, suggestions }; STUB_SUGGESTIONS is
 * the robust fallback if the classify call throws or returns unparseable/invalid JSON.
 *
 * The event contract (emitted in THIS order, one NDJSON object per line):
 *   { type:'status', phase, message }     — initial loading/thinking status (emitted immediately)
 *   { type:'step', id, label?, status }   — honest phase steps for the thinking reel:
 *                                            'reading' start→done (bracket the streamed text),
 *                                            'choosing' start→done (bracket the classify pass)
 *   { type:'text', delta }                — model text deltas, streamed as they arrive
 *   { type:'suggestions', items }         — short list of tappable quick-pick answer strings
 *   { type:'done' }  | { type:'error', message }
 *
 * COST: two claude-opus-4-8 calls per turn — the streamed text + one non-streaming classify pass.
 * That extra classify call is the intended, deliberate spend for contextual routing.
 *
 * No art generation, no tools — pure conversation + a lightweight classify. Real routing into the
 * artisan loop / an image model comes in later slices.
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
  const db = await getDb();
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
  // `remainingUsd` is threaded into image generation so a single turn can't blow the cap.
  let remainingUsd = 2.0; // conservative per-request default if the cap check can't run
  try {
    const cap = await checkCap(db, userId);
    remainingUsd = cap.remaining_usd;
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

      // Run the image workflow for a prompt, streaming tiles, capped at the user's remaining
      // budget. Returns the realized USD cost so the caller can meter it. Shared by dispatch +
      // transfer so the two paths can't drift.
      const runImageGen = async (intent: string): Promise<number> => {
        send({ type: 'gen_start' });
        let cost = 0;
        for await (const ev of coordinateImage({ intent, needs: [], count: 2 }, { maxCostUsd: remainingUsd })) {
          if (ev.type === 'tile') {
            send({ type: 'image', url: ev.tile.image.url, modelLabel: ev.tile.modelLabel, index: ev.totalSoFar - 1 });
          } else if (ev.type === 'done') {
            cost = ev.costUsd;
          } else if (ev.type === 'error') {
            send({ type: 'gen_error', message: ev.message });
          }
        }
        send({ type: 'gen_done', costUsd: cost });
        return cost;
      };

      // Accumulate the assistant text + the a2ui snapshot so we can persist after `done`.
      let assistantText = '';
      // Guard so the first text delta marks the 'reading' step done exactly once.
      let firstToken = false;

      try {
        // 1) Loading/thinking status — emitted immediately so the UI can show a spinner.
        send({ type: 'status', phase: 'thinking', message: 'Thinking…' });
        // Honest phase 1: reading/generating — starts now, completes on the first text delta.
        send({ type: 'step', id: 'reading', label: 'Reading your request…', status: 'start' });

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
            if (!firstToken) {
              firstToken = true;
              // The model has started producing text — the reading phase is done.
              send({ type: 'step', id: 'reading', status: 'done' });
            }
            assistantText += event.delta.text;
            send({ type: 'text', delta: event.delta.text });
          }
        }
        // Surface any terminal stream error rather than silently finishing.
        const finalMessage = await llmStream.finalMessage();

        // Honest phase 2: choosing next steps — the classify pass over the exchange.
        send({ type: 'step', id: 'choosing', label: 'Choosing your next steps…', status: 'start' });

        // 3) CLASSIFY PASS — one extra non-streaming claude-opus-4-8 call over the exchange.
        //    Derives the tappable quick-pick suggestions (possible ANSWERS to the agent's
        //    question). NO tool/medium picker — the agent chooses the medium itself. On ANY
        //    failure we fall back to the stub quick-picks so a chat turn never breaks.
        let suggestionsToSend: string[] = STUB_SUGGESTIONS;
        // The A2UI block actually emitted (persisted for truthful hydrate). Question | null.
        let emittedBlock: { kind: 'question'; label: string; placeholder?: string; chips?: string[] } | null = null;
        let didRespond = false; // true once a branch has emitted its result (skip the fallback suggestions)
        // Metering accumulators — the classify call's tokens AND the realized image-gen cost must
        // ALL reach recordUsage, or the hard cap only ever gates the streamed Opus call (money bug).
        let classifyInTok = 0;
        let classifyOutTok = 0;
        let genCostTotal = 0;

        try {
          // Give the classifier the user prompt + the assistant's response text (+ brief history).
          const classifyMessages: Anthropic.MessageParam[] = [
            ...history.slice(-6).map((m) => ({ role: m.role, content: m.content })),
            {
              role: 'user' as const,
              content:
                `USER MESSAGE:\n${prompt}\n\n` +
                `ASSISTANT RESPONSE:\n${assistantText}\n\n` +
                `Classify this exchange and produce the follow-up UI JSON.`,
            },
          ];

          // Same adaptive-thinking + `as any` pattern as the streaming call; modest max_tokens
          // since the classify output is small JSON.
          // Structured output → clean JSON (no regex). Classify is simple; no thinking needed.
          const classifyParams = {
            model: MODEL,
            max_tokens: 700,
            system: CLASSIFY_SYSTEM,
            messages: classifyMessages,
            output_config: { format: { type: 'json_schema', schema: CLASSIFY_SCHEMA } },
          };
          const classifyMsg = await client.messages.create(classifyParams as any);
          // Meter this second Opus call too (previously dropped on the floor).
          classifyInTok = (classifyMsg as { usage?: { input_tokens?: number } })?.usage?.input_tokens ?? 0;
          classifyOutTok = (classifyMsg as { usage?: { output_tokens?: number } })?.usage?.output_tokens ?? 0;
          const classifyText = ((classifyMsg.content ?? []) as Array<{ type: string; text?: string }>)
            .filter((b) => b.type === 'text')
            .map((b) => b.text ?? '')
            .join('')
            .trim();

          const result = parseClassifyResult(classifyText);
          send({ type: 'step', id: 'choosing', status: 'done' });

          // The DETECTIVE's verdict → ONE of three actions.
          if (result.action === 'dispatch' && result.generationPrompt) {
            // DISPATCH the image workflow: generate + stream tiles into the chat.
            didRespond = true;
            genCostTotal = await runImageGen(result.generationPrompt);
          } else if (result.action === 'transfer' && result.frame) {
            // TRANSFER (large workflow): hand off to the Image agent. Emit the transfer signal
            // (carries the Epistemic Frame) so the client flips the nav + attributes the work to
            // the Image agent, then the Image agent runs the generation. (Slice 1: same surface;
            // the full Image IDE morph is Slice 2.)
            didRespond = true;
            // Even a VIDEO goal transfers to the IMAGE agent first — you need the images the video
            // will use (your Camaro flow). frame.medium records the ultimate goal; the target is
            // 'image' until a Video agent + a pure-video path exist.
            send({ type: 'transfer', to: 'image', frame: result.frame });
            genCostTotal = await runImageGen(result.frame.goal);
          } else if (result.action === 'ask' && result.question) {
            // ASK via the A2UI question affordance (never prose).
            didRespond = true;
            emittedBlock = {
              kind: 'question',
              label: result.question.label,
              placeholder: result.question.placeholder,
              chips: result.question.chips,
            };
            send({ type: 'a2ui', block: emittedBlock });
          } else {
            // REPLY: contextual quick-pick follow-ups.
            didRespond = true;
            suggestionsToSend = result.suggestions.length > 0 ? result.suggestions : STUB_SUGGESTIONS;
            send({ type: 'suggestions', items: suggestionsToSend });
          }
        } catch (classifyErr) {
          // Robust fallback — stub quick-picks so the turn always completes.
          console.warn('[chat-turn] classify failed, falling back to stubs:', classifyErr);
          send({ type: 'step', id: 'choosing', status: 'done' });
          if (!didRespond) send({ type: 'suggestions', items: STUB_SUGGESTIONS });
        }

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
              // Persist the A2UI block actually emitted (the question, or null). Generated images
              // aren't persisted yet — that lands with the baton/living-context record.
              a2ui: emittedBlock,
              a2ui_version: A2UI_VERSION,
            },
          } as Partial<Interaction>);
          // Meter EVERYTHING this turn spent: the streamed Opus call + the classify Opus call
          // + the realized image-generation cost — so the hard cap gates real spend.
          await recordUsage(db, {
            user_id: userId,
            interaction_id: interactionId,
            input_tokens: inputTokens + classifyInTok,
            output_tokens: outputTokens + classifyOutTok,
            gen_cost_usd: genCostTotal,
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
