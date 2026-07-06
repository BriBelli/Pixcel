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

/* Spacing ported verbatim from photolif's `markdownStyles` (services/markdown.ts):
 * TIGHT, em-based rhythm — 0.5em between paragraphs, 0.25em list gaps — so a chat
 * turn reads as one calm block, not a double-spaced document. The FIRST block has
 * no top gap, the LAST no bottom gap (cursor sits right after the final line). */
const CSS = `
.pxc-md { font-size: var(--a2ui-text-lg); color: var(--a2ui-text-primary); }
.pxc-md > :first-child { margin-top: 0; }
.pxc-md > :last-child  { margin-bottom: 0; }

.pxc-md p {
  margin: 0 0 0.5em 0;
  line-height: var(--a2ui-leading-relaxed);
}
.pxc-md strong, .pxc-md b { font-weight: var(--a2ui-font-semibold); color: var(--a2ui-text-primary); }
.pxc-md em, .pxc-md i    { font-style: italic; }

.pxc-md ul, .pxc-md ol {
  margin: 0.25em 0;
  padding-left: 1.5em;
}
.pxc-md ul { list-style: disc; }
.pxc-md ol { list-style: decimal; }
.pxc-md li { margin-bottom: 0.25em; line-height: var(--a2ui-leading-relaxed); }
.pxc-md li > ul, .pxc-md li > ol { margin: 0.25em 0; }

.pxc-md code {
  font-family: var(--a2ui-font-mono);
  font-size: 0.875em;
  background: var(--a2ui-bg-tertiary);
  border-radius: var(--a2ui-radius-sm);
  padding: 0.15em 0.4em;
}
.pxc-md pre {
  margin: 0.5em 0;
  background: var(--a2ui-bg-tertiary);
  border-radius: var(--a2ui-radius-md);
  padding: var(--a2ui-space-3);
  overflow-x: auto;
}
.pxc-md pre code {
  display: block;
  background: none;
  border-radius: 0;
  padding: 0;
  font-size: 0.85em;
  line-height: 1.5;
  color: var(--a2ui-text-primary);
  white-space: pre;
}

.pxc-md blockquote {
  margin: 0.5em 0;
  padding: 0.25em 0 0.25em 1em;
  border-left: 3px solid var(--a2ui-border-strong);
  color: var(--a2ui-text-secondary);
  font-style: italic;
}

.pxc-md a { color: var(--a2ui-accent); text-decoration: none; }
.pxc-md a:hover { text-decoration: underline; }

.pxc-md h1, .pxc-md h2, .pxc-md h3, .pxc-md h4 {
  margin: 0.75em 0 0.25em 0;
  font-weight: var(--a2ui-font-semibold);
  line-height: var(--a2ui-leading-tight);
  color: var(--a2ui-text-primary);
}
.pxc-md h1:first-child, .pxc-md h2:first-child, .pxc-md h3:first-child { margin-top: 0; }
.pxc-md h1 { font-size: var(--a2ui-text-xl); }
.pxc-md h2 { font-size: var(--a2ui-text-lg); }
.pxc-md h3 { font-size: var(--a2ui-text-md); }
.pxc-md h4 { font-size: var(--a2ui-text-sm); }
.pxc-md hr { border: none; border-top: 1px solid var(--a2ui-border-default); margin: 0.75em 0; }

.pxc-md table {
  width: 100%; border-collapse: collapse; margin: 0.5em 0;
  font-size: var(--a2ui-text-sm); line-height: 1.5;
}
.pxc-md thead { border-bottom: 2px solid var(--a2ui-border-default); }
.pxc-md th { text-align: left; font-weight: var(--a2ui-font-semibold); color: var(--a2ui-text-primary); padding: 0.5em 0.75em; white-space: nowrap; }
.pxc-md td { padding: 0.5em 0.75em; color: var(--a2ui-text-secondary); border-bottom: 1px solid var(--a2ui-border-subtle); }
.pxc-md tbody tr:last-child td { border-bottom: none; }
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
