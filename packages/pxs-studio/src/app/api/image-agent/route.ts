import Anthropic from '@anthropic-ai/sdk';
import { runImageAgent } from '../../../lib/agents/image-agent';
import type { EpistemicFrame } from '../../../lib/agents/epistemic-frame';
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
 * THE IMAGE-AGENT TURN — the workspace's dedicated leg (Option A).
 *
 * Once the Operator has TRANSFERRED into the Image workspace, follow-up turns talk STRAIGHT to the
 * Image agent — no Operator re-diagnosis, no double spend. The workspace posts the active Epistemic
 * Frame + the user's instruction (+ any attached references); the Image agent re-plans and renders.
 *
 * Same NDJSON event contract as the transfer leg (agent_start · agent_text · a2ui · image ·
 * gen_done · gen_error · done | error), so the chat-turns store reduces both with one reducer.
 * SPEND: the Image agent's brain + realized image cost are metered against the user's hard cap.
 */

interface HistoryMsg {
  role: 'user' | 'assistant';
  content: string;
}

type Send = (obj: unknown) => void;

function newId(prefix: string): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

interface PostedFrame {
  goal?: string;
  subject?: string;
  medium?: 'image' | 'video';
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: 'ANTHROPIC_API_KEY is not set. Add it to packages/pxs-studio/.env.local' },
      { status: 500 }
    );
  }

  let body: {
    prompt?: string;
    frame?: PostedFrame;
    history?: HistoryMsg[];
    references?: string[];
    thread_id?: string;
    user_id?: string;
    section?: string;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const prompt = (body.prompt ?? '').trim();
  if (!prompt) return Response.json({ error: 'prompt is required' }, { status: 400 });

  // The active workflow frame (from the transfer). Goal is required to run the Image agent.
  const goal = (body.frame?.goal ?? '').trim();
  if (!goal) return Response.json({ error: 'frame.goal is required (no active image workflow)' }, { status: 400 });
  const medium: 'image' | 'video' = body.frame?.medium === 'video' ? 'video' : 'image';
  const subject = (body.frame?.subject ?? '').trim() || undefined;
  const section = ((body.section ?? 'image').trim() || 'image').toLowerCase();
  const references = Array.isArray(body.references)
    ? body.references.filter((r): r is string => typeof r === 'string' && r.trim().length > 0)
    : [];

  const userId = (body.user_id ?? '').trim() || DEV_USER_ID;
  const db = await getDb();
  const living = createLivingContext(db);

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
  let remainingUsd = 2.0;
  try {
    const cap = await checkCap(db, userId);
    remainingUsd = cap.remaining_usd;
    if (!cap.allowed) {
      const encoder = new TextEncoder();
      const blocked = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(JSON.stringify({ type: 'error', message: 'Usage cap reached' }) + '\n'));
          controller.close();
        },
      });
      return new Response(blocked, {
        headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' },
      });
    }
  } catch (err) {
    console.warn('[image-agent] cap check failed, continuing:', err);
  }

  // Ensure a Thread exists (the workspace should already have one from the chat; be safe).
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
        title: goal.slice(0, 40),
      };
      await db.put(thread);
    }
  } catch (err) {
    console.warn('[image-agent] thread ensure failed:', err);
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
    model: 'claude-opus-4-8',
    prompt: { text: prompt },
    response: { text: '', tokens_used: 0, a2ui: null, a2ui_version: A2UI_VERSION },
  };
  living.append(interaction);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send: Send = (obj) => controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));

      let agentText = '';
      let agentInTok = 0;
      let agentOutTok = 0;
      let genCostTotal = 0;
      let emittedBlock:
        | { kind: 'references'; modelLabel: string; maxReferences: number; supports: string[]; recommend: string[]; note?: string }
        | null = null;

      try {
        send({ type: 'status', phase: 'thinking', message: 'Thinking…' });

        // NOTE: the frame is BOUNDED (paths/intent, never inline content) — assertFrameBudget caps
        // it at ~500 tokens. Reference image DATA URLs are big payloads, so they ride ALONGSIDE the
        // frame via the turn (straight to the generation adapter), never inside frame.assetRefs.
        const frame: EpistemicFrame = {
          goal,
          subject,
          medium,
          section,
          budgetUsd: remainingUsd,
          count: 2,
        };

        for await (const ev of runImageAgent(frame, { userMessage: prompt, history, references })) {
          if (ev.type === 'agent_usage') {
            agentInTok += ev.inputTokens;
            agentOutTok += ev.outputTokens;
          } else if (ev.type === 'agent_text') {
            agentText += ev.delta;
            send(ev);
          } else if (ev.type === 'agent_a2ui') {
            emittedBlock = ev.block;
            send({ type: 'a2ui', block: ev.block });
          } else if (ev.type === 'gen_notice') {
            send({ type: 'notice', message: ev.message });
          } else if (ev.type === 'gen_done') {
            genCostTotal = ev.costUsd;
            send(ev);
          } else {
            send(ev); // agent_start · image · gen_error
          }
        }

        // ── PERSIST + METER (best-effort; never breaks the stream) ──
        try {
          await db.update('interaction', interactionId, {
            prompt: { text: prompt },
            response: {
              text: agentText,
              tokens_used: agentOutTok,
              a2ui: emittedBlock,
              a2ui_version: A2UI_VERSION,
            },
          } as Partial<Interaction>);
          await recordUsage(db, {
            user_id: userId,
            interaction_id: interactionId,
            input_tokens: agentInTok,
            output_tokens: agentOutTok,
            gen_cost_usd: genCostTotal,
          });
        } catch (err) {
          console.warn('[image-agent] persist/usage failed (stream unaffected):', err);
        }

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
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
