'use client';

/* ─────────────────────────────────────────────────────────────────────────────
 * ProposalBlock — the Operator's `propose` verdict rendered as A2UI.
 *
 * When the Operator is oriented but there's a real fork in HOW to do the work well
 * (e.g. a cinematic video: straight-to-video vs. reference-first), it presents the
 * WORKFLOW PATHS here — never tool/model names, and NO image is generated until the
 * user picks. Choosing a path submits it as the next turn, which the Operator then
 * sizes into a transfer. This is the anti-"blowing your load" valve.
 *
 * Tokens-only, gospel-styled: calm cards, no gradient on chrome, no scale-pop.
 * ───────────────────────────────────────────────────────────────────────────── */

import { Icon } from '../ui';
import type { A2UIOptionsBlock } from '../../store/chat-turns-store';

export interface ProposalBlockProps {
  block: A2UIOptionsBlock;
  /** Submit the chosen path's label as the next turn. */
  onSelect: (text: string) => void;
}

const CSS = `
.pxc-prop {
  border: 1px solid var(--pxs-border-subtle);
  border-radius: var(--a2ui-radius-lg);
  background: var(--a2ui-bg-secondary);
  padding: var(--a2ui-space-4);
  display: flex; flex-direction: column; gap: var(--a2ui-space-3);
}
.pxc-prop-head { display: flex; align-items: center; gap: var(--a2ui-space-2); }
.pxc-prop-head > svg { color: var(--pxs-accent-text); }
.pxc-prop-title {
  font-size: var(--a2ui-text-md); font-weight: var(--a2ui-font-semibold);
  color: var(--a2ui-text-primary); line-height: var(--a2ui-leading-tight);
}
.pxc-prop-opts { display: flex; flex-direction: column; gap: var(--a2ui-space-2); }
.pxc-prop-opt {
  display: flex; align-items: center; gap: var(--a2ui-space-3);
  width: 100%; text-align: left;
  padding: var(--a2ui-space-3);
  border: 1px solid var(--pxs-border-subtle); border-radius: var(--a2ui-radius-md);
  background: var(--a2ui-bg-tertiary); color: var(--a2ui-text-primary);
  cursor: pointer; font-family: var(--a2ui-font-family);
  transition: border-color var(--a2ui-transition-fast), background var(--a2ui-transition-fast);
}
.pxc-prop-opt:hover { border-color: var(--a2ui-border-default); background: var(--a2ui-bg-elevated); }
.pxc-prop-opt-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.pxc-prop-opt-label { font-size: var(--a2ui-text-md); line-height: var(--a2ui-leading-tight); }
.pxc-prop-opt-detail { font-size: var(--a2ui-text-sm); color: var(--a2ui-text-tertiary); line-height: var(--a2ui-leading-normal); }
.pxc-prop-opt-arrow { color: var(--a2ui-text-tertiary); flex-shrink: 0; transition: transform var(--a2ui-transition-fast); }
.pxc-prop-opt:hover .pxc-prop-opt-arrow { transform: translateX(2px); }
`;

export function ProposalBlock({ block, onSelect }: ProposalBlockProps) {
  return (
    <div className="pxc-prop">
      <style>{CSS}</style>

      <div className="pxc-prop-head">
        <Icon name="message-square" size={16} />
        <div className="pxc-prop-title">{block.title}</div>
      </div>

      <div className="pxc-prop-opts">
        {block.options.map((o) => (
          <button
            key={o.id}
            type="button"
            className="pxc-prop-opt"
            onClick={() => onSelect(o.label)}
          >
            <div className="pxc-prop-opt-body">
              <span className="pxc-prop-opt-label">{o.label}</span>
              {o.detail && <span className="pxc-prop-opt-detail">{o.detail}</span>}
            </div>
            <Icon name="arrow-right" size={16} className="pxc-prop-opt-arrow" />
          </button>
        ))}
      </div>
    </div>
  );
}

export default ProposalBlock;
