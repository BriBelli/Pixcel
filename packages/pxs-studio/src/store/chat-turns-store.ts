'use client';

import { create } from 'zustand';

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
}

interface ChatTurnsState {
  turns: ChatTurn[];
  /** Send a prompt — appends a new turn and streams its response. Returns the new turn id. */
  send: (prompt: string) => string;
  /** Clear the whole conversation. */
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
        body: JSON.stringify({ prompt, history }),
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
            patch(id, { status: 'done', statusMessage: '' });
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
    reset: () => set({ turns: [] }),
  };
});
