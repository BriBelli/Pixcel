'use client';

/* ─────────────────────────────────────────────────────────────────────────────
 * ImageStage — the CENTER canvas of the Image (and Video) workspace.
 *
 * This is the surface the Operator's TRANSFER lands on: the specialist's generated
 * images shown LARGE on a calm stage (not buried inline in the chat column), with
 * the conversation continuing in the right pane. It is what makes a transfer feel
 * like entering a workflow instead of hitting a dead-end.
 *
 * Tokens-only, Claude Design gospel: no gradient on chrome (the one allowed gradient
 * is the per-tile hover overlay, §6), no scale-pop, calm empty state. Newest images
 * first; a pulsing placeholder while the specialist is still generating.
 * ───────────────────────────────────────────────────────────────────────────── */

import { Icon } from '../ui';
import { GreetingHero } from '../GreetingHero';

export interface StageImage {
  url: string;
  modelLabel: string;
  index: number;
  turnId: string;
}

interface ImageStageProps {
  images: StageImage[];
  generating: boolean;
  medium: 'image' | 'video';
  /** The active workflow's subject/goal — personalizes the empty state to the in-state context
   *  (consult-first framing) instead of a generic placeholder. */
  contextLabel?: string;
}

const CSS = `
.pxc-stage { background: var(--a2ui-bg-app); }

.pxc-stage-scroll { flex: 1; overflow-y: auto; padding: var(--a2ui-space-8) var(--a2ui-space-6); }
.pxc-stage-grid {
  display: grid; gap: var(--a2ui-space-4);
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
}
.pxc-stage-tile {
  position: relative; aspect-ratio: 1 / 1; overflow: hidden;
  border-radius: var(--a2ui-radius-lg); background: var(--a2ui-bg-tertiary);
  box-shadow: 0 0 0 1px var(--pxs-border-subtle);
  transition: box-shadow var(--a2ui-transition-fast);
}
.pxc-stage-tile:hover { box-shadow: 0 0 0 1px var(--a2ui-border-default); }
.pxc-stage-tile img { width: 100%; height: 100%; object-fit: cover; display: block; }
.pxc-stage-overlay {
  position: absolute; inset: 0;
  display: flex; align-items: flex-end; justify-content: flex-end; gap: var(--a2ui-space-2);
  padding: var(--a2ui-space-3);
  background: linear-gradient(180deg, transparent 45%, rgba(0,0,0,0.6) 100%);
  opacity: 0; transition: opacity var(--a2ui-transition-fast);
}
.pxc-stage-tile:hover .pxc-stage-overlay, .pxc-stage-tile:focus-within .pxc-stage-overlay { opacity: 1; }
.pxc-stage-action {
  display: inline-flex; align-items: center; gap: 5px; height: 30px; padding: 0 11px;
  border-radius: var(--a2ui-radius-md);
  border: 1px solid var(--pxs-glass-border); background: var(--a2ui-glass-dark);
  backdrop-filter: blur(8px);
  color: var(--a2ui-text-primary); font-size: var(--a2ui-text-sm);
  font-family: var(--a2ui-font-family); text-decoration: none; cursor: pointer;
  transition: background var(--a2ui-transition-fast);
}
.pxc-stage-action:hover { background: var(--a2ui-bg-elevated); }
.pxc-stage-badge {
  position: absolute; left: 8px; bottom: 8px;
  padding: 2px 8px; border-radius: var(--a2ui-radius-full);
  font-size: var(--a2ui-text-xs); color: var(--a2ui-text-primary);
  background: var(--a2ui-glass-dark); backdrop-filter: blur(8px);
  border: 1px solid var(--pxs-glass-border);
}
.pxc-stage-pending {
  display: flex; align-items: center; justify-content: center;
  color: var(--a2ui-text-tertiary); font-size: var(--a2ui-text-sm);
  aspect-ratio: 1 / 1; border-radius: var(--a2ui-radius-lg);
  background: var(--a2ui-bg-tertiary); box-shadow: 0 0 0 1px var(--pxs-border-subtle);
  animation: pxc-stage-pulse 1.4s ease-in-out infinite;
}
@keyframes pxc-stage-pulse { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }

/* Empty state — the mockup's clean full-bleed canvas: the shared <GreetingHero> lockup invites the
   first prompt (the workflow carousel is a later slice). Calm, no glyph, no marketing. The title +
   subtitle type lives in GreetingHero so it stays identical to the chat splash. */
.pxc-stage-empty {
  flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: var(--a2ui-space-2); padding: var(--a2ui-space-8); text-align: center;
}

@media (prefers-reduced-motion: reduce) { .pxc-stage-pending { animation: none; } }
`;

/** "a car" / "an owl" / "the dragon" → "car" / "owl" / "dragon" so "shape your {subject}" reads right. */
function cleanSubject(s: string): string {
  return s.replace(/^\s*(a|an|the)\s+/i, '').trim() || s.trim();
}

export function ImageStage({ images, generating, medium, contextLabel }: ImageStageProps) {
  const isVideo = medium === 'video';
  const label = isVideo ? 'video' : 'image';
  const hasContent = images.length > 0 || generating;
  const ctx = contextLabel?.trim();

  return (
    <div className="pxc-stage relative flex-1 flex flex-col min-w-0 min-h-0">
      <style>{CSS}</style>

      {hasContent ? (
        <div className="pxc-stage-scroll">
          <div className="pxc-stage-grid">
            {generating && <div className="pxc-stage-pending">Generating…</div>}
            {images.map((img) => (
              <div key={`${img.turnId}-${img.index}`} className="pxc-stage-tile">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={img.modelLabel || 'generated image'} />
                <div className="pxc-stage-overlay">
                  <a
                    className="pxc-stage-action"
                    href={img.url}
                    download={`pixcel-${img.index + 1}.png`}
                    title="Download"
                  >
                    <Icon name="download" size={14} /> Download
                  </a>
                </div>
                {img.modelLabel && <span className="pxc-stage-badge">{img.modelLabel}</span>}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="pxc-stage-empty">
          {ctx ? (
            <GreetingHero
              size="compact"
              title={`Let’s shape your ${cleanSubject(ctx)}.`}
              subtitle="Shape it in the panel on the right — tune the parts, tap the chips, then Render. Your images land here."
            />
          ) : (
            <GreetingHero
              size="compact"
              title={`What ${label}(s) do you want to create?`}
              subtitle={
                isVideo
                  ? 'e.g. a slow push-in on a rain-soaked neon street, cinematic'
                  : 'e.g. a rain-soaked neon portrait at dusk, cinematic'
              }
            />
          )}
        </div>
      )}
    </div>
  );
}

export default ImageStage;
