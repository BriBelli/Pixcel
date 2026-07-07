'use client';

/* ─────────────────────────────────────────────────────────────────────────────
 * ReferencesBlock — the Image agent's grounded reference recommendation (A2UI).
 *
 * After a hand-off, the Image agent consults the Model agent for the capability TRUTH
 * of the model that will render (reference count, style transfer, editing) and surfaces
 * it here: what the model actually supports (never a guessed limit) + which references
 * to attach next for a precise result. This is the "attach up to N — and here's support
 * you didn't know about" moment.
 *
 * Reference UPLOAD + regenerate-with-refs is the next slice; today this is the honest
 * capability response (informational), with the attach affordance clearly staged.
 * Tokens-only, gospel-styled.
 * ───────────────────────────────────────────────────────────────────────────── */

import { Icon } from '../ui';
import type { A2UIReferencesBlock } from '../../store/chat-turns-store';

export interface ReferencesBlockProps {
  block: A2UIReferencesBlock;
}

const CSS = `
.pxc-ref {
  border: 1px solid var(--pxs-border-subtle);
  border-radius: var(--a2ui-radius-lg);
  background: var(--a2ui-bg-secondary);
  padding: var(--a2ui-space-4);
  display: flex; flex-direction: column; gap: var(--a2ui-space-3);
}
.pxc-ref-head { display: flex; align-items: center; gap: var(--a2ui-space-2); }
.pxc-ref-head > svg { color: var(--pxs-accent-text); }
.pxc-ref-title {
  font-size: var(--a2ui-text-md); font-weight: var(--a2ui-font-semibold);
  color: var(--a2ui-text-primary); line-height: var(--a2ui-leading-tight);
}
.pxc-ref-model { font-size: var(--a2ui-text-sm); color: var(--a2ui-text-tertiary); }
.pxc-ref-section-label {
  font-size: var(--a2ui-text-xs); text-transform: uppercase; letter-spacing: 0.04em;
  color: var(--a2ui-text-tertiary);
}
.pxc-ref-chips { display: flex; flex-wrap: wrap; gap: var(--a2ui-space-2); }
.pxc-ref-chip {
  display: inline-flex; align-items: center; gap: 5px; height: 26px; padding: 0 10px;
  background: var(--a2ui-bg-tertiary); border: 1px solid var(--pxs-border-subtle);
  border-radius: var(--a2ui-radius-full);
  font-size: var(--a2ui-text-sm); color: var(--a2ui-text-secondary);
}
.pxc-ref-chip > svg { color: var(--pxs-accent-text); }
.pxc-ref-recos { display: flex; flex-direction: column; gap: var(--a2ui-space-2); }
.pxc-ref-reco {
  display: flex; align-items: flex-start; gap: var(--a2ui-space-2);
  font-size: var(--a2ui-text-md); color: var(--a2ui-text-primary);
  line-height: var(--a2ui-leading-normal);
}
.pxc-ref-reco > svg { color: var(--a2ui-text-tertiary); flex-shrink: 0; margin-top: 3px; }
.pxc-ref-note {
  display: flex; align-items: center; gap: var(--a2ui-space-2);
  font-size: var(--a2ui-text-sm); color: var(--a2ui-text-tertiary);
  padding-top: var(--a2ui-space-1);
}
.pxc-ref-note > svg { flex-shrink: 0; }
`;

export function ReferencesBlock({ block }: ReferencesBlockProps) {
  return (
    <div className="pxc-ref">
      <style>{CSS}</style>

      <div className="pxc-ref-head">
        <Icon name="image" size={16} />
        <div>
          <div className="pxc-ref-title">References for a precise pass</div>
          <div className="pxc-ref-model">{block.modelLabel}</div>
        </div>
      </div>

      {block.supports.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--a2ui-space-2)' }}>
          <span className="pxc-ref-section-label">Supports</span>
          <div className="pxc-ref-chips">
            {block.supports.map((s, i) => (
              <span key={i} className="pxc-ref-chip">
                <Icon name="check" size={12} /> {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {block.recommend.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--a2ui-space-2)' }}>
          <span className="pxc-ref-section-label">Attach next</span>
          <div className="pxc-ref-recos">
            {block.recommend.map((r, i) => (
              <div key={i} className="pxc-ref-reco">
                <Icon name="arrow-right" size={14} /> {r}
              </div>
            ))}
          </div>
        </div>
      )}

      {block.note && (
        <div className="pxc-ref-note">
          <Icon name="paperclip" size={14} /> {block.note}
        </div>
      )}
    </div>
  );
}

export default ReferencesBlock;
