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
 * MOMENTS — stills pinned INSIDE the shot at a chosen second. With only an opening and a closing
 * frame, anything pinned to the end is the state the clip stops in: a flame there is a flame the shot
 * cuts away from mid-pop. A moment at 2s lets it flare and settle before the clip ends.
 *
 * It says which kind you are getting. FLUX.3 takes moments as a real parameter (EXACT); other models
 * get the still as a reference with the timing asked for in words (REQUESTED). A guarantee and a
 * polite request must never look the same, or the user cannot tell why a moment was ignored.
 * ───────────────────────────────────────────────────────────────────────────── */

import { useRef, useState } from 'react';
import { Icon } from '../ui';
import { validateFrames, type FramePlan, type ShotFrame, type FrameSlot } from '../../lib/engine/shot-frames';

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
/* MOMENTS — the shot as a ruler. Click anywhere on it to pin a still at that second. */
.pxf-moments { display: flex; flex-direction: column; gap: 8px; }
.pxf-mhead { display: flex; align-items: center; gap: 8px; }
.pxf-kind { font-size: 10px; letter-spacing: 0.05em; text-transform: uppercase; padding: 1px 6px; border-radius: 6px;
  border: 1px solid var(--pxs-border-subtle, var(--a2ui-border)); color: var(--a2ui-text-tertiary); }
.pxf-kind[data-native='true'] { color: var(--a2ui-accent); border-color: var(--a2ui-accent); }
.pxf-ruler { position: relative; height: 54px; border-radius: 8px; cursor: crosshair;
  background: var(--a2ui-bg-secondary); border: 1px solid var(--pxs-border-subtle, var(--a2ui-border)); }
.pxf-ruler[data-off='true'] { cursor: not-allowed; opacity: 0.55; }
.pxf-tick { position: absolute; bottom: 0; width: 1px; height: 7px; background: var(--a2ui-border-default); }
.pxf-ticklbl { position: absolute; bottom: 8px; transform: translateX(-50%); font-size: 9px;
  color: var(--a2ui-text-tertiary); font-variant-numeric: tabular-nums; pointer-events: none; }
.pxf-hover { position: absolute; top: 0; bottom: 0; width: 1px; background: var(--a2ui-accent); opacity: 0.6; pointer-events: none; }
.pxf-pin { position: absolute; top: 4px; width: 40px; height: 24px; transform: translateX(-50%); border-radius: 4px;
  overflow: hidden; border: 1px solid var(--a2ui-accent); background: #000; pointer-events: none; }
.pxf-pin[data-end='true'] { border-color: var(--a2ui-text-tertiary); opacity: 0.7; }
.pxf-pin img { width: 100%; height: 100%; object-fit: cover; display: block; }
.pxf-mlist { display: flex; flex-direction: column; gap: 6px; }
.pxf-mrow { display: flex; align-items: center; gap: 8px; font-size: var(--a2ui-text-xs); color: var(--a2ui-text-secondary); }
.pxf-mthumb { width: 44px; height: 25px; border-radius: 4px; overflow: hidden; flex-shrink: 0;
  border: 1px solid var(--pxs-border-subtle, var(--a2ui-border)); }
.pxf-mthumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.pxf-time { width: 62px; padding: 3px 6px; border-radius: 6px; font: inherit; font-variant-numeric: tabular-nums;
  background: var(--a2ui-bg-secondary); color: var(--a2ui-text-primary); border: 1px solid var(--pxs-border-subtle, var(--a2ui-border)); }
.pxf-mx { margin-left: auto; background: none; border: none; cursor: pointer; color: var(--a2ui-text-tertiary); display: flex; }
.pxf-mx:hover { color: var(--a2ui-text-primary); }
.pxf-bad { font-size: var(--a2ui-text-xs); color: var(--a2ui-warning, #d29922); line-height: 1.45; }
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
  /** The second a clicked-but-not-yet-chosen moment will land on. */
  const pendingAt = useRef<number>(0);
  const [hoverAt, setHoverAt] = useState<number | null>(null);
  const native = plan.midShotKeyframes.native;
  // Rejections are SHOWN, never silently dropped — a moment the model will ignore must say why.
  const check = validateFrames(plan, frames, durationSec);
  const rejectedWhy = new Map(check.rejected.map((r) => [r.frame.url + (r.frame.atSec ?? ''), r.reason]));

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
          const atSec =
            slot === 'start' ? 0 : slot === 'end' ? durationSec : slot === 'key' ? pendingAt.current : undefined;
          onChange([...frames, { slot, url, ...(atSec != null ? { atSec } : {}) }]);
        };
        reader.readAsDataURL(file);
      });
  };

  const remove = (url: string) => onChange(frames.filter((f) => f.url !== url));

  /** Seconds, snapped to the quarter — finer than a viewer can see in a cut, coarse enough to aim. */
  const snap = (t: number) => Math.round(t * 4) / 4;
  const secAt = (el: HTMLDivElement, clientX: number) => {
    const r = el.getBoundingClientRect();
    return snap(Math.min(1, Math.max(0, (clientX - r.left) / r.width)) * durationSec);
  };
  const keyOffer = offer('key');
  const moments = at('key').slice().sort((a, b) => (a.atSec ?? 0) - (b.atSec ?? 0));
  const keyFull = moments.length >= keyOffer.capacity;
  const keyOff = keyOffer.capacity === 0;

  const pinMomentAt = (t: number) => {
    if (keyOff || keyFull) return;
    // The two ends already have slots; a click at the very edge means "near", not "on".
    pendingAt.current = Math.min(Math.max(t, 0.25), Math.max(0.25, durationSec - 0.25));
    pick('key');
  };
  const retime = (url: string, t: number) =>
    onChange(frames.map((f) => (f.slot === 'key' && f.url === url ? { ...f, atSec: snap(t) } : f)));
  const ticks = Array.from({ length: Math.floor(durationSec) + 1 }, (_, i) => i);

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

      {/* MOMENTS — click the ruler at a second to pin a still there. */}
      <div className="pxf-moments">
        <div className="pxf-mhead">
          <span className="pxf-slot-label">
            {keyOffer.label} <span className="pxf-slot-at">· {moments.length}/{keyOffer.capacity}</span>
          </span>
          {!keyOff ? (
            <span
              className="pxf-kind"
              data-native={native}
              title={native ? 'Sent as a real parameter — the shot passes through this still.' : 'Asked for in the prompt — the model may or may not land it.'}
            >
              {native ? 'Exact' : 'Requested'}
            </span>
          ) : null}
        </div>
        <div
          className="pxf-ruler"
          data-off={keyOff || keyFull}
          title={keyOff ? keyOffer.unavailable : keyFull ? `${keyOffer.capacity} moments is the most ${plan.modelLabel} takes.` : 'Click a second to pin a still there'}
          onMouseMove={(e) => setHoverAt(secAt(e.currentTarget, e.clientX))}
          onMouseLeave={() => setHoverAt(null)}
          onClick={(e) => pinMomentAt(secAt(e.currentTarget, e.clientX))}
        >
          {ticks.map((t) => (
            <span key={t}>
              <span className="pxf-tick" style={{ left: `${(t / durationSec) * 100}%` }} />
              {t % (durationSec > 12 ? 2 : 1) === 0 ? (
                <span className="pxf-ticklbl" style={{ left: `${(t / durationSec) * 100}%` }}>{t}s</span>
              ) : null}
            </span>
          ))}
          {/* The two ends, faintly — so the moments read as BETWEEN them. */}
          {at('start')[0] ? (
            <span className="pxf-pin" data-end="true" style={{ left: '0%', transform: 'none' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={at('start')[0]!.url} alt="opening" />
            </span>
          ) : null}
          {at('end')[0] ? (
            <span className="pxf-pin" data-end="true" style={{ left: '100%', transform: 'translateX(-100%)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={at('end')[0]!.url} alt="closing" />
            </span>
          ) : null}
          {moments.map((m) => (
            <span key={m.url} className="pxf-pin" style={{ left: `${((m.atSec ?? 0) / durationSec) * 100}%` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.url} alt={`moment at ${m.atSec}s`} />
            </span>
          ))}
          {hoverAt != null && !keyOff && !keyFull ? (
            <span className="pxf-hover" style={{ left: `${(hoverAt / durationSec) * 100}%` }} />
          ) : null}
        </div>

        {moments.length > 0 ? (
          <div className="pxf-mlist">
            {moments.map((m) => {
              const bad = rejectedWhy.get(m.url + (m.atSec ?? ''));
              return (
                <div key={m.url}>
                  <div className="pxf-mrow">
                    <span className="pxf-mthumb">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.url} alt="moment" />
                    </span>
                    <span>at</span>
                    <input
                      className="pxf-time"
                      type="number"
                      min={0.25}
                      max={durationSec}
                      step={0.25}
                      value={m.atSec ?? 0}
                      onChange={(e) => retime(m.url, Number(e.target.value))}
                      aria-label="Moment time in seconds"
                    />
                    <span>s</span>
                    <button type="button" className="pxf-mx" onClick={() => remove(m.url)} aria-label="Remove moment">
                      <Icon name="x" size={12} />
                    </button>
                  </div>
                  {bad ? <div className="pxf-bad">{bad}</div> : null}
                </div>
              );
            })}
          </div>
        ) : !keyOff ? (
          <div className="pxf-why">
            Click the ruler to pin a still at that second — e.g. the flame at 2s, so it flares and settles before the cut.
          </div>
        ) : (
          <div className="pxf-why">{keyOffer.unavailable}</div>
        )}
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
        {!native && plan.midShotKeyframes.technique ? ` ${plan.midShotKeyframes.technique}` : ''}
      </div>
    </div>
  );
}

export default FrameTimeline;
