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
 *   2) runs ONE non-streaming classify pass (also claude-opus-4-8) over the exchange, then
 *   3) emits the medium options block ONLY when the classify pass says the user wants to MAKE
 *      something (contextual title), and always emits contextual follow-up suggestions, then `done`.
 *
 * Cut-2: the classify pass replaces the Slice-1 fixed STUB_A2UI / STUB_SUGGESTIONS. The stubs
 * remain as the robust fallback — if the classify call throws or returns unparseable/invalid JSON,
 * we fall back to the old behavior so a chat turn never breaks.
 *
 * The event contract (emitted in THIS order, one NDJSON object per line):
 *   { type:'status', phase, message }     — initial loading/thinking status (emitted immediately)
 *   { type:'text', delta }                — model text deltas, streamed as they arrive
 *   { type:'a2ui', block }                — the medium options block (SKIPPED for general chat)
 *   { type:'suggestions', items }         — short list of contextual follow-up suggestion strings
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

/** The four REAL medium options. Ids/labels are stable so the client + stored a2ui snapshot
 *  stay compatible; only the block `title` is contextualized per turn by the classify pass. */
const MEDIUM_OPTIONS = [
  { id: 'pixcel', label: 'Use Pixcel Studio' },
  { id: 'image', label: 'Use Image Model' },
  { id: 'both', label: 'Both' },
  { id: 'guidance', label: 'More guidance' },
] as const;

/** Build the options A2UI block with a (contextual) title, reusing the stable option set. */
function buildA2UI(title: string) {
  return { kind: 'options', title, options: MEDIUM_OPTIONS.map((o) => ({ ...o })) };
}

/** Fallback A2UI block — fixed options for "how do you want to make it?" (used when classify fails). */
const STUB_A2UI = buildA2UI('How do you want to make it?');

/** Fallback generic follow-up suggestions (used when the classify pass fails or returns nothing). */
const STUB_SUGGESTIONS = [
  'Show me a few style directions',
  'What size and shape works best?',
  'Make a simple version first',
];

/** The structured result the classify pass produces. */
interface ClassifyResult {
  /** Is the user trying to MAKE something (art/image/logo/etc.)? */
  intent: 'create' | 'chat' | 'other';
  /** Surface the medium options? (true only for a create intent). */
  showOptions: boolean;
  /** Contextual options title, e.g. "How do you want to make your dragon?" (used iff showOptions). */
  optionsTitle: string;
  /** 2–4 SHORT contextual follow-ups derived from THIS conversation. */
  suggestions: string[];
}

/** The classify system prompt — asks for ONLY JSON matching {@link ClassifyResult}. */
const CLASSIFY_SYSTEM = `You are the routing brain behind the Pixcel Agent. You are given the user's latest message, the assistant's reply, and brief prior history. Classify the exchange and produce follow-up UI.

Reply with ONLY a JSON object (no prose, no markdown, no code fences) with EXACTLY these keys:
{
  "intent": "create" | "chat" | "other",
  "showOptions": boolean,
  "optionsTitle": string,
  "suggestions": string[]
}

Rules:
- "intent" is "create" if the user is trying to MAKE something (pixel art, an image, a logo, an icon, a sprite, a design, etc.). Use "chat" for general conversation/questions, and "other" for anything that fits neither.
- "showOptions" is true ONLY when intent is "create" (they're about to pick how to make it). Otherwise false — general chat must NOT force the medium picker.
- "optionsTitle" is a short, warm, subject-specific question, e.g. "How do you want to make your dragon?". Only matters when showOptions is true; still provide a reasonable string otherwise.
- "suggestions" is an array of 2 to 4 SHORT (a few words each) follow-up prompts a user might tap next, derived from THIS specific conversation — not generic filler.

Output the JSON object and nothing else.`;

/**
 * Extract a {@link ClassifyResult} from raw model text. Tolerates stray prose / code fences by
 * grabbing the first balanced-looking JSON object. Throws on anything unparseable or invalid so
 * the caller can fall back to the stubs.
 */
function parseClassifyResult(raw: string): ClassifyResult {
  let text = raw.trim();
  // Strip a leading/trailing ```json ... ``` fence if the model added one.
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fence) text = fence[1].trim();
  // Otherwise, isolate the first {...} span.
  if (!text.startsWith('{')) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) throw new Error('no JSON object in classify output');
    text = text.slice(start, end + 1);
  }
  const obj = JSON.parse(text) as Record<string, unknown>;

  const intent = obj.intent === 'create' || obj.intent === 'chat' || obj.intent === 'other' ? obj.intent : 'other';
  const showOptions = obj.showOptions === true && intent === 'create';
  const optionsTitle =
    typeof obj.optionsTitle === 'string' && obj.optionsTitle.trim().length > 0
      ? obj.optionsTitle.trim()
      : STUB_A2UI.title;

  // Clamp to ≤4 non-empty strings.
  const suggestions = Array.isArray(obj.suggestions)
    ? obj.suggestions
        .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
        .map((s) => s.trim())
        .slice(0, 4)
    : [];

  return { intent, showOptions, optionsTitle, suggestions };
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

        // 3) CLASSIFY PASS — one extra non-streaming claude-opus-4-8 call over the exchange.
        //    Derives the a2ui + suggestions contextually. On ANY failure we fall back to the
        //    Slice-1 stubs so a chat turn never breaks (see the try/catch below).
        //    `emittedA2UI` is the a2ui snapshot we actually sent (null when no options shown) —
        //    it's what we persist so hydrate/replay stays truthful.
        let emittedA2UI: ReturnType<typeof buildA2UI> | null = null;
        let suggestionsToSend: string[] = STUB_SUGGESTIONS;

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
          const classifyParams = {
            model: MODEL,
            max_tokens: 400,
            thinking: { type: 'adaptive' },
            system: CLASSIFY_SYSTEM,
            messages: classifyMessages,
          };
          const classifyMsg = await client.messages.create(classifyParams as any);

          // Pull the text out of the (possibly thinking + text) content blocks.
          const classifyText = ((classifyMsg.content ?? []) as Array<{ type: string; text?: string }>)
            .filter((b) => b.type === 'text')
            .map((b) => b.text ?? '')
            .join('')
            .trim();

          const result = parseClassifyResult(classifyText);

          // Options: emit ONLY for a create intent; general chat must not force the picker.
          if (result.showOptions) {
            emittedA2UI = buildA2UI(result.optionsTitle);
            send({ type: 'a2ui', block: emittedA2UI });
          }

          // Suggestions: use the contextual ones, else fall back to the stub list.
          suggestionsToSend = result.suggestions.length > 0 ? result.suggestions : STUB_SUGGESTIONS;
        } catch (classifyErr) {
          // Robust fallback — restore the Slice-1 behavior so the turn always completes.
          console.warn('[chat-turn] classify failed, falling back to stubs:', classifyErr);
          emittedA2UI = STUB_A2UI;
          send({ type: 'a2ui', block: STUB_A2UI });
          suggestionsToSend = STUB_SUGGESTIONS;
        }

        // 4) The contextual (or fallback) follow-up suggestions.
        send({ type: 'suggestions', items: suggestionsToSend });

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
              // Store the a2ui that was ACTUALLY emitted (the real options block, or null when
              // no options were shown) so hydrate/replay stays truthful.
              a2ui: emittedA2UI,
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
