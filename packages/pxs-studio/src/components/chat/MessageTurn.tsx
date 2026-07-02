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
import { AssistantHeader } from './AssistantHeader';
import { PlanRows, type PlanStep } from './PlanRows';
import { StreamingCursor } from './StreamingCursor';
import { SuggestionsRow } from './SuggestionsRow';
import { SourcesRow } from './SourcesRow';

export interface MessageTurnProps {
  turn: ChatTurn;
  onOption: (id: string, label: string) => void;
  onSuggestion: (text: string) => void;
}

/** Map the single `status` phase into one plan row (extends to many later). */
function planForTurn(turn: ChatTurn): PlanStep[] {
  const label = turn.statusMessage || 'Thinking';
  const state = turn.status === 'thinking' ? 'active' : 'done';
  return [{ label, state }];
}

const CSS = `
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
}
.pxc-a2ui-title {
  font-size: var(--a2ui-text-sm); font-weight: var(--a2ui-font-semibold);
  color: var(--a2ui-text-secondary); margin-bottom: var(--a2ui-space-3);
}
.pxc-turn-error {
  font-size: var(--a2ui-text-md); color: var(--a2ui-error);
}
`;

export function MessageTurn({ turn, onOption, onSuggestion }: MessageTurnProps) {
  const thinking = turn.status === 'thinking' && !turn.text;
  const streaming = turn.status === 'streaming';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--a2ui-space-3)' }}>
      <style>{CSS}</style>

      {/* User message — right aligned */}
      {turn.userPrompt && (
        <div className="flex justify-end">
          <div className="pxc-user-bubble">{turn.userPrompt}</div>
        </div>
      )}

      {/* Assistant block */}
      <div style={{ maxWidth: '100%' }}>
        <AssistantHeader />

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
              <Card style={{ marginTop: 'var(--a2ui-space-4)' }}>
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
          </>
        )}
      </div>
    </div>
  );
}

export default MessageTurn;
