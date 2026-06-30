'use client';

/* ─────────────────────────────────────────────────────────────────────────────
 * ChatView — the chat-orchestrator front door (Slice 1).
 *
 * The splash prompt now lands HERE (the Pixcel Agent conversation), rendered ABOVE the
 * persistent <DigitalWall> (z-0) so the same LED-wall backdrop continues behind the chat.
 * It renders the streamed conversation: a user bubble, then the assistant turn — a loading
 * indicator (from status) → streamed text → the stub A2UI options block (tasteful buttons,
 * NOT a general renderer yet) → follow-up suggestion chips. A composer at the bottom (reusing
 * the LandingPage prompt-bar tokens) sends follow-up turns.
 *
 * Slice 1 wires the bones only: the option buttons + suggestion chips just feed the composer /
 * send a follow-up. Real routing into Pixcel Studio vs an image model comes in later slices.
 * ───────────────────────────────────────────────────────────────────────────── */

import { useCallback, useEffect, useRef, useState } from 'react';
import NavRail from './NavRail';
import DigitalWall from './DigitalWall';
import { RES } from '../lib/resolutions';
import { useChatTurnsStore, type ChatTurn } from '../store/chat-turns-store';

interface Props {
  /** The prompt typed on the splash (front door). Auto-sent once on mount. */
  initialPrompt?: string;
  /** Enter the full Studio (the art IDE) — e.g. from a nav item or an option choice. */
  onEnterStudio: (prompt?: string) => void;
  /** Back to the splash. */
  onHome?: () => void;
}

const CHAT_CSS = `
  .pxc-root { background: var(--a2ui-bg-app); color: var(--a2ui-text-primary); font-family: var(--a2ui-font-family); -webkit-font-smoothing: antialiased; }
  .pxc-root ::selection { background: var(--a2ui-accent-subtle); }
  .pxc-promptbar { background: var(--a2ui-bg-input); border: 1px solid var(--a2ui-border-default); transition: border-color var(--a2ui-transition-fast), box-shadow var(--a2ui-transition-fast); }
  .pxc-promptbar:focus-within { border-color: var(--a2ui-accent); box-shadow: 0 0 0 3px var(--a2ui-accent-subtle); }
  .pxc-input { background: transparent; color: var(--a2ui-text-primary); }
  .pxc-input::placeholder { color: var(--a2ui-text-tertiary); }
  .pxc-send { background: var(--a2ui-accent); color: var(--a2ui-text-inverse); border-radius: 9999px; transition: background var(--a2ui-transition-fast); }
  .pxc-send:hover { background: var(--a2ui-accent-hover); }
  .pxc-send:disabled { opacity: 0.45; cursor: default; }
  /* user bubble */
  .pxc-user { background: var(--a2ui-accent); color: var(--a2ui-text-inverse); border-radius: var(--a2ui-radius-lg); }
  /* assistant surface */
  .pxc-assistant { color: var(--a2ui-text-primary); }
  /* a2ui option button */
  .pxc-option { background: var(--a2ui-bg-secondary); border: 1px solid var(--a2ui-border-default); color: var(--a2ui-text-primary); border-radius: var(--a2ui-radius-md); transition: border-color var(--a2ui-transition-fast), background var(--a2ui-transition-fast); }
  .pxc-option:hover { border-color: var(--a2ui-accent); background: var(--a2ui-bg-hover); }
  /* suggestion chip */
  .pxc-chip { background: transparent; border: 1px solid var(--a2ui-border-subtle); color: var(--a2ui-text-secondary); border-radius: var(--a2ui-radius-full); transition: border-color var(--a2ui-transition-fast), color var(--a2ui-transition-fast); }
  .pxc-chip:hover { border-color: var(--a2ui-border-strong); color: var(--a2ui-text-primary); }
  .pxc-panel { background: var(--a2ui-bg-secondary); border: 1px solid var(--a2ui-border-subtle); border-radius: var(--a2ui-radius-lg); }
  @keyframes pxc-blink { 0%, 80%, 100% { opacity: 0.25; } 40% { opacity: 1; } }
  .pxc-dot { animation: pxc-blink 1.2s infinite both; }
`;

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1" aria-label="thinking">
      <span className="pxc-dot inline-block w-1.5 h-1.5 rounded-full" style={{ background: 'var(--a2ui-text-tertiary)' }} />
      <span className="pxc-dot inline-block w-1.5 h-1.5 rounded-full" style={{ background: 'var(--a2ui-text-tertiary)', animationDelay: '0.15s' }} />
      <span className="pxc-dot inline-block w-1.5 h-1.5 rounded-full" style={{ background: 'var(--a2ui-text-tertiary)', animationDelay: '0.3s' }} />
    </span>
  );
}

function TurnBlock({
  turn,
  onOption,
  onSuggestion,
}: {
  turn: ChatTurn;
  onOption: (id: string, label: string) => void;
  onSuggestion: (text: string) => void;
}) {
  return (
    <div className="space-y-3">
      {/* User bubble — right aligned */}
      <div className="flex justify-end">
        <div className="pxc-user max-w-[80%] px-3.5 py-2 text-[15px] leading-relaxed">
          {turn.userPrompt}
        </div>
      </div>

      {/* Assistant turn */}
      <div className="pxc-assistant max-w-[88%]">
        {turn.status === 'thinking' && !turn.text ? (
          <div className="flex items-center gap-2 text-[14px]" style={{ color: 'var(--a2ui-text-tertiary)' }}>
            <TypingDots />
            <span>{turn.statusMessage || 'Thinking…'}</span>
          </div>
        ) : turn.status === 'error' ? (
          <div className="text-[14px]" style={{ color: 'var(--a2ui-error)' }}>
            {turn.error || 'Something went wrong.'}
          </div>
        ) : (
          <>
            {turn.text && (
              <div className="text-[15px] leading-relaxed whitespace-pre-wrap">{turn.text}</div>
            )}

            {/* Stub A2UI options block — tasteful buttons (not a general renderer). */}
            {turn.a2ui && turn.a2ui.kind === 'options' && (
              <div className="pxc-panel mt-3 p-3">
                <div className="text-[13px] font-semibold mb-2" style={{ color: 'var(--a2ui-text-secondary)' }}>
                  {turn.a2ui.title}
                </div>
                <div className="flex flex-wrap gap-2">
                  {turn.a2ui.options.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => onOption(o.id, o.label)}
                      className="pxc-option px-3 py-1.5 text-[13px] font-medium"
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Follow-up suggestions — trailing chips. */}
            {turn.suggestions.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {turn.suggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onSuggestion(s)}
                    className="pxc-chip px-3 py-1 text-[12px]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function ChatView({ initialPrompt, onEnterStudio, onHome }: Props) {
  const turns = useChatTurnsStore((s) => s.turns);
  const send = useChatTurnsStore((s) => s.send);

  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentInitial = useRef(false);

  // Fire the splash prompt once (the front door → first chat turn).
  useEffect(() => {
    if (sentInitial.current) return;
    const p = initialPrompt?.trim();
    if (p) {
      sentInitial.current = true;
      send(p);
    }
  }, [initialPrompt, send]);

  // Keep the conversation scrolled to the latest as it streams in.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns]);

  const submit = useCallback(
    (text: string) => {
      const t = text.trim();
      if (!t) return;
      send(t);
      setDraft('');
    },
    [send]
  );

  // Slice 1: option choices that pick a medium enter the full Studio; "more guidance"/unknown
  // simply continues the chat. Suggestions feed a follow-up turn.
  const handleOption = useCallback(
    (id: string, label: string) => {
      if (id === 'pixcel' || id === 'image' || id === 'both') {
        const lastPrompt = [...turns].reverse().find((t) => t.userPrompt)?.userPrompt;
        onEnterStudio(lastPrompt);
      } else {
        submit(label);
      }
    },
    [turns, onEnterStudio, submit]
  );

  return (
    <div className="pxc-root flex h-screen overflow-hidden">
      <style>{CHAT_CSS}</style>

      <NavRail
        activeSection="chat"
        onHome={onHome ?? (() => {})}
        onSection={() => onEnterStudio()}
        onUtility={() => onEnterStudio()}
      />

      <div className="relative flex-1 flex flex-col min-w-0">
        {/* z-0 — the persistent Pixcel digital wall, BEHIND the chat (same backdrop as the splash). */}
        <div className="pointer-events-none absolute inset-0 z-0">
          <DigitalWall className="absolute inset-0 h-full w-full" pixels={RES.retro} logoScale={0.25} intensity={0.1} />
        </div>

        {/* z-10 — the chat, floating above the wall. */}
        <div className="relative z-10 flex-1 flex flex-col min-h-0">
          {/* Scrollable conversation */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-2xl px-6 py-8 space-y-6">
              {turns.length === 0 && (
                <div className="text-center text-[14px] pt-16" style={{ color: 'var(--a2ui-text-tertiary)' }}>
                  Ask me what you want to make.
                </div>
              )}
              {turns.map((t) => (
                <TurnBlock key={t.id} turn={t} onOption={handleOption} onSuggestion={submit} />
              ))}
            </div>
          </div>

          {/* Composer — reuses the splash prompt-bar styling/tokens. */}
          <div className="shrink-0 px-6 pb-6 pt-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit(draft);
              }}
              className="pxc-promptbar mx-auto flex w-full max-w-2xl items-center gap-2 rounded-full px-3.5 py-2.5"
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Ask me anything…"
                className="pxc-input min-w-0 flex-1 text-[15px] outline-none"
              />
              <button
                type="submit"
                disabled={!draft.trim()}
                className="pxc-send flex h-9 w-9 items-center justify-center shrink-0"
                title="Send"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
