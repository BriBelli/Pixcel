'use client';

/* ─────────────────────────────────────────────────────────────────────────────
 * MessageTurn — one conversation turn, ported faithfully from photolif's
 * `a2ui-chat-message` (apps/a2ui-chat) into React on our token primitives.
 *
 * Layout (photolif .message):
 *   [avatar 32px]  [content column]          ← assistant: avatar LEFT
 *   [content column]  [avatar 32px]          ← user: row-reverse
 *
 *   • assistant avatar = the Pixcel-X mark on a bland token circle (NOT a rainbow
 *     gradient) — the agent's identity is the avatar, there is no top badge line.
 *   • assistant content: markdown text (white-space: normal, tight em rhythm) →
 *     streaming cursor → the a2ui options card → footer meta (model badge +
 *     duration + timestamp + hover actions) → sources → arrow followups.
 *   • user content: the accent bubble (right-aligned) + a timestamp meta.
 *
 * Tokens-only, sentence case, no scale-pop, one entrance curve
 * (--a2ui-ease-entrance = cubic-bezier(0.22,1,0.36,1)).
 * ───────────────────────────────────────────────────────────────────────────── */

import type { ChatTurn } from '../../store/chat-turns-store';
import { Avatar, PixcelMark } from '../ui';
import { OptionsBlock } from './OptionsBlock';
import { MessageActions } from './MessageActions';
import { ThinkingIndicator } from './ThinkingIndicator';
import { StreamingCursor } from './StreamingCursor';
import { Markdown } from './Markdown';
import { SuggestionsRow } from './SuggestionsRow';
import { SourcesRow } from './SourcesRow';

export interface MessageTurnProps {
  turn: ChatTurn;
  /** Show the assistant action-bar footer (copy · regenerate · feedback). Default true. */
  showActions?: boolean;
  onOption: (id: string, label: string) => void;
  onSuggestion: (text: string) => void;
  /** Copy this turn's assistant text to the clipboard (every done turn). */
  onCopy: () => void;
  /** Re-run the model for this turn (LAST done turn only) — SPENDS a model call. */
  onRegenerate?: () => void;
  /** Soft-delete this turn (LAST done, persisted turn only). */
  onDelete?: () => void;
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Entrance choreography — photolif's messageIn / contentFadeIn / metaFadeIn.
 * The message root rises + fades in ONCE on mount (a CSS animation on a stable,
 * id-keyed node fires once and never replays as React reconciles streaming text).
 * The a2ui card + followups fade in under the text on the same curve, delayed.
 * ───────────────────────────────────────────────────────────────────────────── */
const CSS = `
@keyframes pxc-msg-in {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes pxc-a2ui-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

.pxc-msg {
  display: flex;
  gap: var(--a2ui-space-3);
  animation: pxc-msg-in 300ms var(--a2ui-ease-entrance) both;
}
.pxc-msg.user { flex-direction: row-reverse; }

/* Avatar — 32px token circle. Assistant: Pixcel-X on a bland elevated surface,
   X tinted with the brand token (no rainbow). User: the shared Avatar primitive. */
.pxc-avatar {
  width: 32px; height: 32px; flex-shrink: 0;
  border-radius: var(--a2ui-radius-full);
  display: flex; align-items: center; justify-content: center;
}
.pxc-avatar.assistant {
  background: var(--a2ui-bg-elevated);
  color: var(--pxs-accent-text);
}

.pxc-content { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.pxc-msg.user .pxc-content { align-items: flex-end; }

.pxc-user-bubble {
  max-width: min(600px, 100%);
  padding: var(--a2ui-space-3) var(--a2ui-space-4);
  background: var(--a2ui-accent); color: var(--a2ui-text-inverse);
  border-radius: var(--a2ui-radius-xl);
  border-bottom-right-radius: var(--a2ui-radius-sm);
  line-height: var(--a2ui-leading-normal);
  white-space: pre-wrap; word-break: break-word;
}
.pxc-user-meta {
  margin-top: var(--a2ui-space-1);
  font-size: var(--a2ui-text-xs); color: var(--a2ui-text-tertiary);
}

.pxc-assistant-text {
  white-space: normal; word-break: break-word;
  color: var(--a2ui-text-primary);
  line-height: var(--a2ui-leading-relaxed);
  padding: var(--a2ui-space-1) 0;
}

/* Footer actions — hidden until the turn is hovered/focused, then eased in. */
.pxc-actions { opacity: 0; transition: opacity var(--a2ui-transition-fast); }
.pxc-msg:hover .pxc-actions,
.pxc-msg:focus-within .pxc-actions { opacity: 1; }
@media (max-width: 480px) { .pxc-actions { opacity: 1; } }

.pxc-a2ui-reveal { animation: pxc-a2ui-in 420ms var(--a2ui-ease-entrance) 140ms both; }
.pxc-choosing-reveal { animation: pxc-a2ui-in 300ms var(--a2ui-ease-entrance) both; }
.pxc-turn-error { font-size: var(--a2ui-text-md); color: var(--a2ui-error); }

@media (prefers-reduced-motion: reduce) {
  .pxc-msg, .pxc-a2ui-reveal, .pxc-choosing-reveal { animation: none; }
}
`;

/** Short local wall-clock stamp ("06:03 PM") for the user meta. */
function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function MessageTurn({
  turn,
  showActions = true,
  onOption,
  onSuggestion,
  onCopy,
  onRegenerate,
  onDelete,
}: MessageTurnProps) {
  const thinking = turn.status === 'thinking' && !turn.text;
  const streaming = turn.status === 'streaming';
  const done = turn.status === 'done';

  // POST-text "choosing" phase — a compact inline reel shown briefly after the text
  // while the classify pass runs, replaced by the options/suggestions reveal on arrival.
  const choosingStep = turn.steps.find((s) => s.id === 'choosing');
  const optionsArrived =
    (turn.a2ui && turn.a2ui.kind === 'options') || turn.suggestions.length > 0;
  const showChoosing = !done && !!turn.text && choosingStep?.state === 'active' && !optionsArrived;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--a2ui-space-4)' }}>
      <style>{CSS}</style>

      {/* USER row — avatar RIGHT (row-reverse), accent bubble, timestamp meta. */}
      {turn.userPrompt && (
        <div className="pxc-msg user">
          <Avatar size={32} />
          <div className="pxc-content">
            <div className="pxc-user-bubble">{turn.userPrompt}</div>
            <div className="pxc-user-meta">{formatTime(turn.createdAt)}</div>
          </div>
        </div>
      )}

      {/* ASSISTANT row — Pixcel-X avatar LEFT, content column. */}
      <div className="pxc-msg assistant">
        <div className="pxc-avatar assistant" aria-hidden="true">
          <PixcelMark size={18} />
        </div>
        <div className="pxc-content">
          {turn.status === 'error' ? (
          <div className="pxc-turn-error">{turn.error || 'Something went wrong.'}</div>
        ) : thinking ? (
          <ThinkingIndicator message={turn.statusMessage} steps={turn.steps} />
        ) : (
          <>
            {turn.text && (
              <div className="pxc-assistant-text">
                <Markdown>{turn.text}</Markdown>
                {streaming && <StreamingCursor />}
              </div>
            )}

            {showChoosing && choosingStep && (
              <div className="pxc-choosing-reveal" style={{ marginTop: 'var(--a2ui-space-2)' }}>
                <ThinkingIndicator steps={[choosingStep]} />
              </div>
            )}

            {/* A2UI options block — a stacked radio (single) / checkbox (multiple) choice group. */}
            {turn.a2ui && turn.a2ui.kind === 'options' && (
              <div className="pxc-a2ui-reveal" style={{ marginTop: 'var(--a2ui-space-4)' }}>
                <OptionsBlock block={turn.a2ui} onSubmit={onOption} />
              </div>
            )}

            {/* Footer meta + actions — DONE turns only, when the Action bar setting is on. */}
            {done && showActions && (
              <MessageActions
                createdAt={turn.createdAt}
                durationMs={turn.durationMs}
                text={turn.text}
                onCopy={onCopy}
                onRegenerate={onRegenerate}
                onDelete={onDelete}
              />
            )}

            <SourcesRow sources={turn.sources} />
            <SuggestionsRow suggestions={turn.suggestions} onSelect={onSuggestion} />
          </>
        )}
        </div>
      </div>
    </div>
  );
}

export default MessageTurn;
