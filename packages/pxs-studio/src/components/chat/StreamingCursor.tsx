'use client';

/* ─────────────────────────────────────────────────────────────────────────────
 * StreamingCursor — a blinking block caret (▍) at the TAIL of streaming text.
 *
 * This is NOT a typewriter reveal: the text still arrives as deltas from the
 * store; this cursor just blinks at the end while `status === 'streaming'` to
 * signal live output. Opacity keyframe only (no scale-pop, no bounce), token
 * color. The caller renders it inline, right after the streamed text.
 * ───────────────────────────────────────────────────────────────────────────── */

const CSS = `
@keyframes pxc-caret-blink { 0%, 45% { opacity: 1; } 55%, 100% { opacity: 0; } }
.pxc-caret {
  display: inline-block; margin-left: 1px; color: var(--a2ui-accent);
  animation: pxc-caret-blink 1s steps(1, end) infinite;
}
`;

export function StreamingCursor() {
  return (
    <>
      <style>{CSS}</style>
      <span className="pxc-caret" aria-hidden="true">
        ▍
      </span>
    </>
  );
}

export default StreamingCursor;
