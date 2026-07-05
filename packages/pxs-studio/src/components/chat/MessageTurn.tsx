'use client';

/* ─────────────────────────────────────────────────────────────────────────────
 * MessageTurn — one full conversation turn, composed on the PR-2 primitives.
 *
 *   • the user message (right-aligned bubble)
 *   • the assistant block:
 *       - AssistantHeader (model badge — the agent speaks AS "Opus 4.8")
 *       - PlanRows while thinking (pre-text only; collapses once text streams)
 *       - the streamed `text` + a blinking block StreamingCursor while streaming
 *       - the stub A2UI options block → Button primitives inside a Card
 *       - SuggestionsRow (Chip primitives) + SourcesRow (empty scaffold)
 *       - the error state
 *
 * Replaces the old inline TurnBlock. Tokens-only, sentence case, no scale-pop.
 * ───────────────────────────────────────────────────────────────────────────── */

import type { ChatTurn } from '../../store/chat-turns-store';
import { Button, Card } from '../ui';
import { MessageActions } from './MessageActions';
import { PlanRows, type PlanStep } from './PlanRows';
import { StreamingCursor } from './StreamingCursor';
import { SuggestionsRow } from './SuggestionsRow';
import { SourcesRow } from './SourcesRow';

export interface MessageTurnProps {
  turn: ChatTurn;
  onOption: (id: string, label: string) => void;
  onSuggestion: (text: string) => void;
  /** Copy this turn's assistant text to the clipboard (every done turn). */
  onCopy: () => void;
  /** Re-run the model for this turn (LAST done turn only) — SPENDS a model call. */
  onRegenerate?: () => void;
  /** Soft-delete this turn (LAST done, persisted turn only). */
  onDelete?: () => void;
}

/** Map the single `status` phase into one plan row (extends to many later). */
function planForTurn(turn: ChatTurn): PlanStep[] {
  const label = turn.statusMessage || 'Thinking';
  const state = turn.status === 'thinking' ? 'active' : 'done';
  return [{ label, state }];
}

/* ─────────────────────────────────────────────────────────────────────────────
 * SSE reveal choreography — the entrance "performance" of a streaming turn.
 *
 * Layered, one easing curve (--a2ui-ease-entrance = cubic-bezier(0.22,1,0.36,1)):
 *   turn root fades + rises in ONCE on mount → text fades in when it first
 *   appears → the a2ui Card reveals UNDER the text (delayed) → suggestions.
 *
 * CORRECTNESS: every animated element is STABLE across streaming re-renders —
 * the turn root is keyed by id upstream (ChatView), the text wrapper stays
 * mounted while its text content grows, the Card/SuggestionsRow mount once when
 * their data arrives. A CSS `animation` on a stable element fires once on mount
 * and does NOT restart when React reconciles new text into the same node, so
 * these never replay per delta. (No animation is placed on the live text run
 * itself — only on its stable wrapper.) translateY only, no scale/bounce.
 * ───────────────────────────────────────────────────────────────────────────── */
const CSS = `
@keyframes pxc-turn-in {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes pxc-text-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes pxc-a2ui-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

.pxc-turn {
  animation: pxc-turn-in 320ms var(--a2ui-ease-entrance) both;
  position: relative;
}
/* Footer actions — hidden until the turn is hovered/focused, then eased in (calm, no scale).
   The meta (duration + timestamp) always shows; only the action buttons reveal. */
.pxc-actions {
  opacity: 0;
  transition: opacity var(--a2ui-transition-fast);
}
.pxc-turn:hover .pxc-actions,
.pxc-turn:focus-within .pxc-actions {
  opacity: 1;
}
/* Touch / narrow viewports have no hover — keep the actions always visible. */
@media (max-width: 480px) {
  .pxc-actions { opacity: 1; }
}
.pxc-user-bubble {
  max-width: 80%;
  padding: var(--a2ui-space-2) var(--a2ui-space-4);
  background: var(--a2ui-accent); color: var(--a2ui-text-inverse);
  border-radius: var(--a2ui-radius-lg);
  font-size: var(--a2ui-text-lg); line-height: var(--a2ui-leading-normal);
  white-space: pre-wrap; word-break: break-word;
}
.pxc-assistant-text {
  font-size: var(--a2ui-text-lg); line-height: var(--a2ui-leading-relaxed);
  color: var(--a2ui-text-primary); white-space: pre-wrap; word-break: break-word;
  animation: pxc-text-in 260ms var(--a2ui-ease-entrance) both;
}
.pxc-a2ui-reveal {
  animation: pxc-a2ui-in 420ms var(--a2ui-ease-entrance) 140ms both;
}
.pxc-a2ui-title {
  font-size: var(--a2ui-text-sm); font-weight: var(--a2ui-font-semibold);
  color: var(--a2ui-text-secondary); margin-bottom: var(--a2ui-space-3);
}
.pxc-turn-error {
  font-size: var(--a2ui-text-md); color: var(--a2ui-error);
}
@media (prefers-reduced-motion: reduce) {
  .pxc-turn, .pxc-assistant-text, .pxc-a2ui-reveal { animation: none; }
}
`;

export function MessageTurn({
  turn,
  onOption,
  onSuggestion,
  onCopy,
  onRegenerate,
  onDelete,
}: MessageTurnProps) {
  const thinking = turn.status === 'thinking' && !turn.text;
  const streaming = turn.status === 'streaming';
  const done = turn.status === 'done';

  return (
    <div
      className="pxc-turn"
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--a2ui-space-3)' }}
    >
      <style>{CSS}</style>

      {/* User message — right aligned */}
      {turn.userPrompt && (
        <div className="flex justify-end">
          <div className="pxc-user-bubble">{turn.userPrompt}</div>
        </div>
      )}

      {/* Assistant block — no top header; the model badge lives in the footer meta
          (MessageActions), photolif-style. */}
      <div style={{ maxWidth: '100%' }}>
        {turn.status === 'error' ? (
          <div className="pxc-turn-error">{turn.error || 'Something went wrong.'}</div>
        ) : thinking ? (
          <PlanRows steps={planForTurn(turn)} />
        ) : (
          <>
            {turn.text && (
              <div className="pxc-assistant-text">
                {turn.text}
                {streaming && <StreamingCursor />}
              </div>
            )}

            {/* Stub A2UI options block — Button primitives inside a Card (not the general renderer). */}
            {turn.a2ui && turn.a2ui.kind === 'options' && (
              <Card className="pxc-a2ui-reveal" style={{ marginTop: 'var(--a2ui-space-4)' }}>
                <div className="pxc-a2ui-title">{turn.a2ui.title}</div>
                <div className="flex flex-wrap" style={{ gap: 'var(--a2ui-space-2)' }}>
                  {turn.a2ui.options.map((o) => (
                    <Button
                      key={o.id}
                      variant="secondary"
                      size="sm"
                      type="button"
                      onClick={() => onOption(o.id, o.label)}
                    >
                      {o.label}
                    </Button>
                  ))}
                </div>
              </Card>
            )}

            <SuggestionsRow suggestions={turn.suggestions} onSelect={onSuggestion} />
            <SourcesRow />

            {/* Footer meta + action bar — DONE turns only (never while thinking/streaming/error). */}
            {done && (
              <MessageActions
                createdAt={turn.createdAt}
                durationMs={turn.durationMs}
                text={turn.text}
                onCopy={onCopy}
                onRegenerate={onRegenerate}
                onDelete={onDelete}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default MessageTurn;
