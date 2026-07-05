'use client';

/* ─────────────────────────────────────────────────────────────────────────────
 * MessageActions — the footer meta + action row under a DONE assistant turn.
 *
 * Layout (single flex row, margin-top --a2ui-space-2):
 *   LEFT   duration ("38.1s") + timestamp ("06:03 PM") — muted, --a2ui-text-xs.
 *   RIGHT  (margin-left:auto) the action buttons, hover-revealed by the parent
 *          .pxc-turn (see MessageTurn.tsx): thumbs-up, thumbs-down | divider |
 *          regenerate, copy, delete.
 *
 * The model badge is NOT here — it stays at the TOP in <AssistantHeader>. This is
 * the FOOTER (our adaptation of the photolif meta row).
 *
 * Presentational: feedback is LOCAL state (toggle vote), copy flashes a 1.5s
 * "copied" check, regenerate/delete are supplied by the parent only when valid.
 * Tokens-only, sentence case, no scale-pop.
 * ───────────────────────────────────────────────────────────────────────────── */

import { useCallback, useEffect, useRef, useState } from 'react';
import { IconButton } from '../ui';

export interface MessageActionsProps {
  createdAt: number;
  durationMs?: number;
  text: string;
  onCopy: () => void;
  onRegenerate?: () => void;
  onDelete?: () => void;
}

type Vote = 'up' | 'down' | null;

/** Format the response duration as "38.1s" (one decimal). */
function formatDuration(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

/** Format the turn's creation time as a short local wall-clock stamp ("06:03 PM"). */
function formatTime(createdAt: number): string {
  return new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function MessageActions({
  createdAt,
  durationMs,
  text,
  onCopy,
  onRegenerate,
  onDelete,
}: MessageActionsProps) {
  const [vote, setVote] = useState<Vote>(null);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    };
  }, []);

  const toggleVote = useCallback((next: 'up' | 'down') => {
    // TODO: POST feedback when a /api/feedback route exists — local toggle only for now.
    setVote((cur) => (cur === next ? null : next));
  }, []);

  const handleCopy = useCallback(() => {
    onCopy();
    setCopied(true);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), 1500);
  }, [onCopy]);

  return (
    <div
      className="flex items-center"
      style={{ marginTop: 'var(--a2ui-space-2)', gap: 'var(--a2ui-space-2)' }}
    >
      {/* LEFT — muted meta (duration + timestamp) */}
      <div
        className="flex items-center"
        style={{
          gap: 'var(--a2ui-space-2)',
          fontSize: 'var(--a2ui-text-xs)',
          color: 'var(--a2ui-text-tertiary)',
        }}
      >
        {durationMs != null && <span>{formatDuration(durationMs)}</span>}
        <span>{formatTime(createdAt)}</span>
      </div>

      {/* RIGHT — hover-revealed actions (reveal CSS lives on .pxc-turn) */}
      <div
        className="pxc-actions flex items-center"
        style={{ marginLeft: 'auto', gap: 'var(--a2ui-space-1)' }}
      >
        <IconButton
          icon="thumbs-up"
          variant="ghost"
          size={14}
          boxSize={26}
          active={vote === 'up'}
          label="Good response"
          onClick={() => toggleVote('up')}
        />
        <IconButton
          icon="thumbs-down"
          variant="ghost"
          size={14}
          boxSize={26}
          active={vote === 'down'}
          label="Needs improvement"
          onClick={() => toggleVote('down')}
        />

        {/* divider */}
        <span
          aria-hidden="true"
          style={{
            width: 1,
            height: 12,
            margin: '0 var(--a2ui-space-1)',
            background: 'var(--a2ui-border-subtle)',
          }}
        />

        {onRegenerate && (
          <IconButton
            icon="refresh-cw"
            variant="ghost"
            size={14}
            boxSize={26}
            label="Regenerate"
            onClick={onRegenerate}
          />
        )}
        <IconButton
          icon={copied ? 'check' : 'copy'}
          variant="ghost"
          size={14}
          boxSize={26}
          active={copied}
          label={copied ? 'Copied' : 'Copy'}
          onClick={handleCopy}
        />
        {onDelete && (
          <IconButton
            icon="trash-2"
            variant="ghost"
            size={14}
            boxSize={26}
            label="Delete"
            onClick={onDelete}
          />
        )}
      </div>
    </div>
  );
}

export default MessageActions;
