'use client';

/* ─────────────────────────────────────────────────────────────────────────────
 * Markdown — renders assistant chat text as markdown (react-markdown + GFM).
 *
 * The store hands us plain `text`; the model speaks markdown (**bold**, lists,
 * `code`, links, headings). This wrapper parses it and styles each element with
 * TOKENS ONLY — matching the chat's type scale (--a2ui-text-lg body), compact
 * and calm (a chat turn, not a document): consecutive blocks breathe but the
 * FIRST block has no top gap (`:first-child { margin-top: 0 }`) and the LAST has
 * no bottom gap, so the streaming cursor sits right after the final line.
 *
 * Re-parses on every streaming delta — cheap for short chat text, and it lives
 * inside the stable `.pxc-assistant-text` wrapper so the entrance animation
 * never replays per delta.
 * ───────────────────────────────────────────────────────────────────────────── */

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const CSS = `
.pxc-md > :first-child { margin-top: 0; }
.pxc-md > :last-child  { margin-bottom: 0; }

.pxc-md p {
  margin: var(--a2ui-space-3) 0;
  font-size: var(--a2ui-text-lg);
  line-height: var(--a2ui-leading-relaxed);
  color: var(--a2ui-text-primary);
}
.pxc-md strong { font-weight: var(--a2ui-font-semibold); }
.pxc-md em     { font-style: italic; }

.pxc-md ul, .pxc-md ol {
  margin: var(--a2ui-space-3) 0;
  padding-left: var(--a2ui-space-6);
  font-size: var(--a2ui-text-lg);
  line-height: var(--a2ui-leading-relaxed);
  color: var(--a2ui-text-primary);
}
.pxc-md ul { list-style: disc; }
.pxc-md ol { list-style: decimal; }
.pxc-md li { margin: var(--a2ui-space-1) 0; }
.pxc-md li > ul, .pxc-md li > ol { margin: var(--a2ui-space-1) 0; }

.pxc-md code {
  font-family: var(--a2ui-font-mono);
  font-size: 0.9em;
  background: var(--a2ui-bg-secondary);
  border-radius: var(--a2ui-radius-sm);
  padding: 1px var(--a2ui-space-1);
}
.pxc-md pre {
  margin: var(--a2ui-space-3) 0;
  background: var(--a2ui-bg-secondary);
  border-radius: var(--a2ui-radius-md);
  padding: var(--a2ui-space-3);
  overflow-x: auto;
}
.pxc-md pre code {
  display: block;
  background: none;
  border-radius: 0;
  padding: 0;
  font-size: var(--a2ui-text-md);
  line-height: var(--a2ui-leading-normal);
  color: var(--a2ui-text-primary);
  white-space: pre;
}

.pxc-md a {
  color: var(--a2ui-accent);
  text-decoration: none;
}
.pxc-md a:hover { text-decoration: underline; }

.pxc-md h1, .pxc-md h2, .pxc-md h3 {
  margin: var(--a2ui-space-4) 0 var(--a2ui-space-2);
  font-weight: var(--a2ui-font-semibold);
  line-height: var(--a2ui-leading-tight);
  color: var(--a2ui-text-primary);
}
.pxc-md h1 { font-size: var(--a2ui-text-xl); }
.pxc-md h2 { font-size: var(--a2ui-text-lg); }
.pxc-md h3 { font-size: var(--a2ui-text-md); color: var(--a2ui-text-secondary); }
`;

export interface MarkdownProps {
  /** The assistant markdown text to render. */
  children: string;
}

/**
 * Render assistant chat text as tokens-styled markdown. Wrap the streamed
 * `text` — it stays inside the caller's stable animated wrapper so the
 * entrance animation is not restarted by streaming re-renders.
 */
export function Markdown({ children }: MarkdownProps) {
  return (
    <div className="pxc-md">
      <style>{CSS}</style>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" />
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

export default Markdown;
