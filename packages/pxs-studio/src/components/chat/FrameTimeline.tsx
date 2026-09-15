'use client';

/* ─────────────────────────────────────────────────────────────────────────────
 * FrameTimeline — the shot's positions in time, and what you pin to them.
 *
 * A shot is not a picture: it opens somewhere, lands somewhere, and carries things through. The
 * engine has supported all three since the video seam was built, and none of it was reachable — so
 * the Video tab could only make clips from text, which is the difference between a text box that
 * produces video and something that understands shots.
 *
 * It renders THE SELECTED MODEL'S real slots. A slot the model does not offer is shown DISABLED with
 * the reason, not hidden: a missing control teaches nothing, while "Kling has no end-frame control —
 * it decides where the shot lands" teaches the model. Same rule as the picker's dropped models.
 *
 * And it tells the truth about mid-shot keyframes. Demos imply you can drop an image at 4.2s; no
 * wired model accepts that. The bar says so, and names the chaining technique when the model can
 * interpolate — a workflow we would run, not a parameter we could pass.
 * ───────────────────────────────────────────────────────────────────────────── */

import { useRef } from 'react';
import { Icon } from '../ui';
import type { FramePlan, ShotFrame, FrameSlot } from '../../lib/engine/shot-frames';

const CSS = `
.pxf { display: flex; flex-direction: column; gap: var(--a2ui-space-3); }
.pxf-head { display: flex; align-items: baseline; gap: var(--a2ui-space-2); }
.pxf-title { font-size: 10px; text-transform: uppercase; letter-spacing: 0.07em; font-weight: 600; color: var(--a2ui-text-tertiary); }
.pxf-dur { margin-left: auto; font-size: var(--a2ui-text-xs); color: var(--a2ui-text-tertiary); font-variant-numeric: tabular-nums; }

/* The track reads as TIME: opening on the left, closing on the right, with the shot between them. */
.pxf-track { display: grid; grid-template-columns: 1fr 1fr; gap: var(--a2ui-space-3); align-items: stretch; }
.pxf-slot { position: relative; display: flex; flex-direction: column; gap: 6px; }
.pxf-drop { position: relative; aspect-ratio: 16/9; border-radius: 10px; overflow: hidden;
  border: 1px dashed var(--pxs-border-subtle, var(--a2ui-border)); background: var(--a2ui-bg-secondary);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
  color: var(--a2ui-text-tertiary); font-size: var(--a2ui-text-xs); cursor: pointer; transition: border-color .15s ease, color .15s ease; }
.pxf-drop:hover:not([data-off='true']) { border-color: var(--a2ui-accent); color: var(--a2ui-text-primary); }
.pxf-drop[data-filled='true'] { border-style: solid; cursor: default; }
.pxf-drop[data-off='true'] { cursor: not-allowed; opacity: 0.55; }
.pxf-drop img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.pxf-x { position: absolute; top: 4px; right: 4px; width: 20px; height: 20px; border: none; border-radius: 999px;
  background: rgba(0,0,0,0.65); color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.pxf-slot-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; color: var(--a2ui-text-secondary); }
.pxf-slot-at { color: var(--a2ui-text-tertiary); font-weight: 400; letter-spacing: 0; text-transform: none; }
.pxf-why { font-size: var(--a2ui-text-xs); color: var(--a2ui-text-tertiary); line-height: 1.45; }

/* References are not a moment in the shot — they sit apart from the track on purpose. */
.pxf-refs { display: flex; flex-direction: column; gap: 6px; }
.pxf-reftray { display: flex; flex-wrap: wrap; gap: var(--a2ui-space-2); }
.pxf-ref { position: relative; width: 46px; height: 46px; border-radius: 8px; overflow: hidden;
  border: 1px solid var(--pxs-border-subtle, var(--a2ui-border)); }
.pxf-ref img { width: 100%; height: 100%; object-fit: cover; display: block; }
.pxf-addref { width: 46px; height: 46px; border-radius: 8px; border: 1px dashed var(--pxs-border-subtle, var(--a2ui-border));
  background: none; color: var(--a2ui-text-tertiary); cursor: pointer; display: flex; align-items: center; justify-content: center; }
.pxf-addref:hover { border-color: var(--a2ui-accent); color: var(--a2ui-text-primary); }
.pxf-addref:disabled { opacity: 0.4; cursor: not-allowed; }
.pxf-note { font-size: var(--a2ui-text-xs); color: var(--a2ui-text-tertiary); line-height: 1.5;
  padding-top: var(--a2ui-space-2); border-top: 1px solid var(--pxs-border-subtle, var(--a2ui-border)); }
`;

export interface FrameTimelineProps {
  plan: FramePlan;
  frames: ShotFrame[];
  durationSec: number;
  onChange: (frames: ShotFrame[]) => void;
}

export function FrameTimeline({ plan, frames, durationSec, onChange }: FrameTimelineProps) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const pendingSlot = useRef<FrameSlot>('reference');

  const offer = (slot: FrameSlot) => plan.offers.find((o) => o.slot === slot)!;
  const at = (slot: FrameSlot) => frames.filter((f) => f.slot === slot);

  const pick = (slot: FrameSlot) => {
    pendingSlot.current = slot;
    fileRef.current?.click();
  };

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    const slot = pendingSlot.current;
    const room = offer(slot).capacity - at(slot).length;
    Array.from(files)
      .slice(0, Math.max(0, room))
      .forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          const url = typeof reader.result === 'string' ? reader.result : '';
          if (!url) return;
          onChange([
            ...frames,
            { slot, url, ...(slot === 'start' ? { atSec: 0 } : slot === 'end' ? { atSec: durationSec } : {}) },
          ]);
        };
        reader.readAsDataURL(file);
      });
  };

  const remove = (url: string) => onChange(frames.filter((f) => f.url !== url));

  const positional: { slot: FrameSlot; at: string }[] = [
    { slot: 'start', at: '0s' },
    { slot: 'end', at: `${durationSec}s` },
  ];

  return (
    <div className="pxf">
      <style>{CSS}</style>
      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { onFiles(e.target.files); e.target.value = ''; }} />

      <div className="pxf-head">
        <span className="pxf-title">Frames</span>
        <span className="pxf-dur">{durationSec}s shot</span>
      </div>

      <div className="pxf-track">
        {positional.map(({ slot, at: atLabel }) => {
          const o = offer(slot);
          const filled = at(slot)[0];
          const off = o.capacity === 0;
          return (
            <div className="pxf-slot" key={slot}>
              <div className="pxf-slot-label">
                {o.label} <span className="pxf-slot-at">· {atLabel}</span>
              </div>
              <div
                className="pxf-drop"
                data-off={off}
                data-filled={!!filled}
                title={off ? o.unavailable : o.hint}
                onClick={() => !off && !filled && pick(slot)}
              >
                {filled ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={filled.url} alt={o.label} />
                    <button type="button" className="pxf-x" onClick={(e) => { e.stopPropagation(); remove(filled.url); }} aria-label={`Remove ${o.label}`}>
                      <Icon name="x" size={11} />
                    </button>
                  </>
                ) : (
                  <>
                    <Icon name={off ? 'info' : 'plus'} size={14} />
                    <span>{off ? 'Not available' : 'Pin an image'}</span>
                  </>
                )}
              </div>
              {/* A disabled control teaches nothing; the reason teaches the model. */}
              {off && <div className="pxf-why">{o.unavailable}</div>}
            </div>
          );
        })}
      </div>

      <div className="pxf-refs">
        <div className="pxf-slot-label">
          {offer('reference').label}{' '}
          <span className="pxf-slot-at">
            · {at('reference').length}/{offer('reference').capacity || 0}
          </span>
        </div>
        <div className="pxf-reftray">
          {at('reference').map((f) => (
            <span className="pxf-ref" key={f.url}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.url} alt="reference" />
              <button type="button" className="pxf-x" onClick={() => remove(f.url)} aria-label="Remove reference">
                <Icon name="x" size={11} />
              </button>
            </span>
          ))}
          <button
            type="button"
            className="pxf-addref"
            disabled={at('reference').length >= offer('reference').capacity}
            title={offer('reference').capacity === 0 ? offer('reference').unavailable : offer('reference').hint}
            onClick={() => pick('reference')}
          >
            <Icon name="plus" size={14} />
          </button>
        </div>
      </div>

      {/* The expectation demos set, answered honestly rather than left to be discovered. */}
      <div className="pxf-note">
        {plan.midShotKeyframes.why}
        {plan.midShotKeyframes.technique ? ` ${plan.midShotKeyframes.technique}` : ''}
      </div>
    </div>
  );
}

export default FrameTimeline;
