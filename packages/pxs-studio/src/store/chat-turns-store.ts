'use client';

import { create } from 'zustand';
import { DEV_USER_ID } from '../lib/db/models';
import type { Interaction } from '../lib/db/models';

/** localStorage key holding the active thread id so a reload can restore the conversation. */
const THREAD_STORAGE_KEY = 'pxs-chat-thread';

/**
 * THE CHAT TURNS STORE — Slice 1 of the chat-orchestrator front door.
 *
 * Mirrors gen-jobs-store's proven shape: `send(prompt)` POSTs to /api/chat-turn, reads the
 * NDJSON stream (reader.read() + TextDecoder + '\n'-split + JSON.parse), and reduces the events
 * into a ChatTurn view-model. It holds an ARRAY of turns so the conversation is continuous —
 * each `send` appends a new turn (carrying the prior turns as history for coherence).
 *
 * This is the chat path ONLY — it never touches the art engine. Real classify/route into
 * Pixcel Studio vs an image model lands in later slices.
 */

/** The stub A2UI options block the route emits after the text (Slice 1). */
export interface A2UIOptionsBlock {
  kind: 'options';
  title: string;
  options: { id: string; label: string }[];
}

export type ChatTurnStatus = 'thinking' | 'streaming' | 'done' | 'error';

export interface ChatTurn {
  id: string;
  userPrompt: string;
  status: ChatTurnStatus;
  statusMessage: string;
  text: string;
  a2ui: A2UIOptionsBlock | null;
  suggestions: string[];
  error?: string;
  createdAt: number;
  /** The persisted Interaction id this turn maps to — captured from the `done` event (streaming)
   *  or from the Interaction on `loadThread`. Present once the turn is stored; drives delete. */
  interactionId?: string;
}

interface ChatTurnsState {
  turns: ChatTurn[];
  /** The active thread id — captured from the `done` event, persisted to localStorage. */
  threadId: string | null;
  /** Send a prompt — appends a new turn and streams its response. Returns the new turn id. */
  send: (prompt: string) => string;
  /** Restore a persisted conversation from the SQLite store (reload/reopen hydration). */
  loadThread: (threadId: string) => Promise<void>;
  /** Soft-delete a persisted turn by its interaction id (audit-preserving; NO spend). */
  deleteTurn: (interactionId: string) => Promise<void>;
  /** Clear the whole conversation (turns + thread id + stored key). */
  reset: () => void;
}

export const useChatTurnsStore = create<ChatTurnsState>((set, get) => {
  const patch = (id: string, updates: Partial<ChatTurn>) =>
    set((s) => ({ turns: s.turns.map((t) => (t.id === id ? { ...t, ...updates } : t)) }));

  async function run(id: string, prompt: string) {
    // Carry the COMPLETED prior turns as history so follow-ups stay coherent. (The just-added
    // turn is excluded — its assistant text doesn't exist yet.)
    const history = get()
      .turns.filter((t) => t.id !== id && t.status === 'done' && t.text.trim())
      .flatMap((t) => [
        { role: 'user' as const, content: t.userPrompt },
        { role: 'assistant' as const, content: t.text },
      ]);

    try {
      const res = await fetch('/api/chat-turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, history, thread_id: get().threadId ?? undefined }),
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        patch(id, { status: 'error', error: err.error || `HTTP ${res.status}`, statusMessage: '' });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.trim()) continue;
          let evt: any;
          try {
            evt = JSON.parse(line);
          } catch {
            continue;
          }
          if (evt.type === 'status') {
            patch(id, { statusMessage: evt.message || '' });
          } else if (evt.type === 'text') {
            // First text delta flips the turn from 'thinking' to 'streaming'.
            set((s) => ({
              turns: s.turns.map((t) =>
                t.id === id
                  ? { ...t, status: 'streaming', text: t.text + (evt.delta || '') }
                  : t
              ),
            }));
          } else if (evt.type === 'a2ui') {
            patch(id, { a2ui: evt.block });
          } else if (evt.type === 'suggestions') {
            patch(id, { suggestions: Array.isArray(evt.items) ? evt.items : [] });
          } else if (evt.type === 'done') {
            patch(id, {
              status: 'done',
              statusMessage: '',
              // Capture the persisted Interaction id so this turn can be deleted later.
              ...(typeof evt.interaction_id === 'string' && evt.interaction_id
                ? { interactionId: evt.interaction_id }
                : {}),
            });
            // Capture the thread id so follow-ups (and reloads) target the SAME thread. The route
            // creates a thread when none is supplied and returns it here.
            if (typeof evt.thread_id === 'string' && evt.thread_id) {
              set({ threadId: evt.thread_id });
              if (typeof window !== 'undefined') {
                try {
                  window.localStorage.setItem(THREAD_STORAGE_KEY, evt.thread_id);
                } catch {
                  /* storage may be unavailable (private mode) — non-fatal */
                }
              }
            }
          } else if (evt.type === 'error') {
            patch(id, { status: 'error', error: evt.message, statusMessage: '' });
          }
        }
      }

      // Stream ended without an explicit done/error — close it out gracefully.
      if (get().turns.find((t) => t.id === id)?.status !== 'done') {
        const t = get().turns.find((tt) => tt.id === id);
        if (t && t.status !== 'error') {
          patch(id, { status: t.text.trim() ? 'done' : 'error', error: t.text.trim() ? undefined : 'No response.', statusMessage: '' });
        }
      }
    } catch (err) {
      patch(id, {
        status: 'error',
        error: err instanceof Error ? err.message : 'Network error',
        statusMessage: '',
      });
    }
  }

  return {
    turns: [],
    threadId: null,
    send: (prompt) => {
      const clean = prompt.trim();
      const id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `turn-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      set((s) => ({
        turns: [
          ...s.turns,
          {
            id,
            userPrompt: clean,
            status: 'thinking',
            statusMessage: 'Thinking…',
            text: '',
            a2ui: null,
            suggestions: [],
            createdAt: Date.now(),
          },
        ],
      }));
      // Fire and forget — the turn lives in the store, streamed in the background.
      void run(id, clean);
      return id;
    },
    loadThread: async (threadId) => {
      // Restore a persisted conversation from the SQLite store. Read-only; on any failure we
      // leave the store empty and warn (a fresh conversation) rather than throwing.
      try {
        const params = new URLSearchParams({
          thread_id: threadId,
          user_id: DEV_USER_ID,
        });
        const res = await fetch(`/api/chat-history?${params.toString()}`);
        if (!res.ok) {
          console.warn(`[chat-turns] loadThread failed: HTTP ${res.status}`);
          return;
        }
        const data: { interactions?: Interaction[] } = await res.json();
        const interactions = Array.isArray(data.interactions) ? data.interactions : [];

        // Map each persisted Interaction → a completed ChatTurn (ascending by created_at — the
        // query already sorts asc; keep the order it returns).
        const turns: ChatTurn[] = interactions.map((it) => {
          const a2ui = it.response?.a2ui as A2UIOptionsBlock | null;
          return {
            id: it.id,
            userPrompt: it.prompt?.text ?? '',
            status: 'done',
            statusMessage: '',
            text: it.response?.text ?? '',
            a2ui: a2ui && a2ui.kind === 'options' ? a2ui : null,
            suggestions: [],
            createdAt: it.created_at,
            interactionId: it.id,
          };
        });

        set({ turns, threadId });
      } catch (err) {
        console.warn('[chat-turns] loadThread error (leaving conversation empty):', err);
      }
    },
    deleteTurn: async (interactionId) => {
      // Audit-preserving SOFT delete: the route flips the interaction to 'deleted' behind the
      // Repository port (NO spend, no model). On success we resync from the DB (so the deleted
      // turn drops), or optimistically remove it if there's no thread yet. On failure: warn only.
      try {
        const res = await fetch('/api/chat-mutate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'delete',
            thread_id: get().threadId ?? undefined,
            interaction_id: interactionId,
          }),
        });
        if (!res.ok) {
          console.warn(`[chat-turns] deleteTurn failed: HTTP ${res.status}`);
          return;
        }
        const threadId = get().threadId;
        if (threadId) {
          await get().loadThread(threadId);
        } else {
          set((s) => ({ turns: s.turns.filter((t) => t.interactionId !== interactionId) }));
        }
      } catch (err) {
        console.warn('[chat-turns] deleteTurn error (leaving conversation as-is):', err);
      }
    },
    reset: () => {
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.removeItem(THREAD_STORAGE_KEY);
        } catch {
          /* non-fatal */
        }
      }
      set({ turns: [], threadId: null });
    },
  };
});
