'use client';

/* ─────────────────────────────────────────────────────────────────────────────
 * ChatView — the chat-orchestrator front door (PR-4a: design-true shell).
 *
 * The splash prompt lands HERE (the Pixcel Agent conversation), rendered ABOVE the
 * persistent <DigitalWall> (z-0) so the same LED-wall backdrop continues behind the
 * chat. Each turn is composed on the PR-2 primitives via <MessageTurn>: the user
 * bubble, the assistant identity badge ("Opus 4.8"), the pre-text plan rows, the
 * streamed text + a blinking block cursor, the stub A2UI options (Button/Card), and
 * follow-up suggestion chips. A <Composer> at the bottom sends follow-up turns.
 *
 * Rebuilt to the Claude Design standard (PR-4a): the bespoke CHAT_CSS promptbar /
 * option / chip / user-bubble rules are gone — everything routes through the
 * tokens-only primitives. The chat column is HARD-CAPPED at --a2ui-chat-max-width
 * (rule #8, never full-bleed); the wall stays full-bleed behind at z-0.
 *
 * PR-4a wires the bones only: option choices that pick a medium enter the full
 * Studio; other choices / suggestions continue the chat. DB persistence + edit /
 * delete / regenerate land in PR-4b.
 * ───────────────────────────────────────────────────────────────────────────── */

import { useCallback, useEffect, useRef, useState } from 'react';
import NavRail from './NavRail';
import DigitalWall from './DigitalWall';
import { RES } from '../lib/resolutions';
import { useChatTurnsStore } from '../store/chat-turns-store';
import { Composer } from './ui';
import { MessageTurn } from './chat/MessageTurn';

interface Props {
  /** The prompt typed on the splash (front door). Auto-sent once on mount. */
  initialPrompt?: string;
  /** Enter the full Studio (the art IDE) — e.g. from a nav item or an option choice. */
  onEnterStudio: (prompt?: string) => void;
  /** Back to the splash. */
  onHome?: () => void;
}

const ROOT_CSS = `
.pxc-root { background: var(--a2ui-bg-app); color: var(--a2ui-text-primary);
  font-family: var(--a2ui-font-family); -webkit-font-smoothing: antialiased; }
.pxc-root ::selection { background: var(--a2ui-accent-subtle); }
`;

/** The chat column cap (rule #8 — capped, never full-bleed). */
const COLUMN_STYLE = { maxWidth: 'var(--a2ui-chat-max-width)' } as const;

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

  // PR-4a: option choices that pick a medium enter the full Studio; "more guidance" /
  // unknown simply continues the chat. Suggestions feed a follow-up turn.
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
      <style>{ROOT_CSS}</style>

      <NavRail
        activeSection="chat"
        onHome={onHome ?? (() => {})}
        onSection={() => onEnterStudio()}
        onUtility={() => onEnterStudio()}
      />

      <div className="relative flex-1 flex flex-col min-w-0">
        {/* z-0 — the persistent Pixcel digital wall, full-bleed BEHIND the chat. */}
        <div className="pointer-events-none absolute inset-0 z-0">
          <DigitalWall className="absolute inset-0 h-full w-full" pixels={RES.retro} logoScale={0.25} intensity={0.1} />
        </div>

        {/* z-10 — the chat, floating above the wall, column-capped. */}
        <div className="relative z-10 flex-1 flex flex-col min-h-0">
          {/* Scrollable conversation */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full px-6 py-8" style={COLUMN_STYLE}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--a2ui-space-6)' }}>
                {turns.map((t) => (
                  <MessageTurn key={t.id} turn={t} onOption={handleOption} onSuggestion={submit} />
                ))}
              </div>
            </div>
          </div>

          {/* Composer — the PR-2 primitive, column-capped to match the conversation. */}
          <div className="shrink-0 px-6 pb-6 pt-2">
            <div className="mx-auto w-full" style={COLUMN_STYLE}>
              <Composer value={draft} onChange={setDraft} onSubmit={submit} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
