'use client';

/* ─────────────────────────────────────────────────────────────────────────────
 * PromptGuidePanel — the workspace's dedicated CONTROLS region (PR-9, slots-not-screens).
 *
 * The Image agent's grounded capability card (what the chosen model supports + which references
 * to attach) used to render inline in the chat scroll, where it was cramped in the 400px pane and
 * scrolled out of reach as the conversation grew. Slots-not-screens: the code owns a set of dumb
 * regions and routes each A2UI block to the region its `surface` names. Blocks tagged
 * 'controls' land HERE — a persistent panel pinned to the top of the workspace pane, above the
 * conversation, so the guide for the CURRENT pass stays put while you talk to the agent.
 *
 * This is the seam the fuller Prompt Guide grows into (prompt formulas, era/lighting knobs, model
 * card). The panel is a code-owned slot; the agent fills it via A2UI. Collapsible so the pane can
 * yield its height back to the conversation on demand.
 * ───────────────────────────────────────────────────────────────────────────── */

import { useState } from 'react';
import { Icon } from '../ui';
import { ReferencesBlock } from './ReferencesBlock';
import type { A2UIReferencesBlock } from '../../store/chat-turns-store';

export interface PromptGuidePanelProps {
  /** The latest 'controls'-surface block in the conversation (the model/reference guide). */
  block: A2UIReferencesBlock;
}

const CSS = `
.pxc-guide {
  flex-shrink: 0;
  border-bottom: 1px solid var(--a2ui-border-subtle);
  background: var(--a2ui-bg-app);
}
.pxc-guide-head {
  display: flex; align-items: center; gap: var(--a2ui-space-2); width: 100%;
  padding: var(--a2ui-space-3) var(--a2ui-space-4);
  background: none; border: none; cursor: pointer; text-align: left;
  color: var(--a2ui-text-secondary); font-family: var(--a2ui-font-family);
}
.pxc-guide-head > svg:first-child { color: var(--pxs-accent-text); flex-shrink: 0; }
.pxc-guide-title {
  font-size: var(--a2ui-text-xs); text-transform: uppercase; letter-spacing: 0.05em;
  font-weight: var(--a2ui-font-semibold); color: var(--a2ui-text-secondary);
}
.pxc-guide-chevron { margin-left: auto; color: var(--a2ui-text-tertiary); transition: transform var(--a2ui-transition-fast); }
.pxc-guide-chevron.is-collapsed { transform: rotate(-90deg); }
.pxc-guide-body { padding: 0 var(--a2ui-space-4) var(--a2ui-space-4); }
`;

export function PromptGuidePanel({ block }: PromptGuidePanelProps) {
  // The panel itself is open by default — this pane region exists to SHOW the guide. Collapsing it
  // hands the height back to the conversation (its home is the workspace, not the chat scroll).
  const [open, setOpen] = useState(true);

  return (
    <div className="pxc-guide">
      <style>{CSS}</style>
      <button
        type="button"
        className="pxc-guide-head"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <Icon name="sparkles" size={15} />
        <span className="pxc-guide-title">Prompt guide</span>
        <Icon name="chevron-down" size={15} className={`pxc-guide-chevron${open ? '' : ' is-collapsed'}`} />
      </button>
      {open && (
        <div className="pxc-guide-body">
          <ReferencesBlock block={block} defaultOpen />
        </div>
      )}
    </div>
  );
}

export default PromptGuidePanel;
