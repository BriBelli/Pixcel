'use client';

/* ─────────────────────────────────────────────────────────────────────────────
 * StreamingCursor — a blinking block caret at the TAIL of streaming text.
 *
 * This is NOT a typewriter reveal: the text still arrives as deltas from the
 * store; this cursor just blinks at the end while `status === 'streaming'` to
 * signal live output. The block is a pure CSS box (NOT the `▍` glyph) so it can
 * never render as a missing-glyph "tofu" square in any font. Opacity keyframe
 * only (no scale-pop, no bounce), token color, sized to the text line.
 * ───────────────────────────────────────────────────────────────────────────── */

const CSS = `
@keyframes pxc-caret-blink { 0%, 45% { opacity: 1; } 55%, 100% { opacity: 0; } }
.pxc-caret {
  display: inline-block; width: 0.5em; height: 1.05em; margin-left: 2px;
  vertical-align: text-bottom; border-radius: 1px; background: var(--a2ui-accent);
  animation: pxc-caret-blink 1s steps(1, end) infinite;
}
`;

export function StreamingCursor() {
  return (
    <>
      <style>{CSS}</style>
      <span className="pxc-caret" aria-hidden="true" />
    </>
  );
}

export default StreamingCursor;
