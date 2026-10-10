/**
 * SHOT FRAMES — what you can pin to a shot, and where, for the model that will render it.
 *
 * A shot has positions in time. A start frame it opens on, an end frame it lands on, and references
 * that guide the whole clip without occupying a moment. The engine has supported all of this since
 * the video seam was built; none of it was ever reachable, so the Video tab could only make clips
 * from text.
 *
 * The hard part is honesty. Tools demo "drop an image at 4.2 seconds", but NONE of the models wired
 * here accept an arbitrary keyframe at an arbitrary time — Seedance takes a start and an end,
 * Kling takes a start, Happy Horse takes a start plus references. Offering a timeline that implies
 * otherwise would be the same lie as a prompt score that measured typing: a surface promising a
 * capability the thing behind it does not have.
 *
 * So the timeline renders THE SELECTED MODEL'S real slots, says plainly what it cannot do, and names
 * the technique when one exists (chained segments for mid-shot keyframes). Pure + deterministic.
 */

import type { MediaModel } from './media-registry';

/** Where a pinned image sits in a shot. */
/**
 * Where a still sits in a shot. `key` is a MOMENT inside it — "this, at 2.4s" — which is what lets an
 * event happen partway through and resolve before the clip ends, instead of being the state the clip
 * stops in.
 */
export type FrameSlot = 'start' | 'end' | 'key' | 'reference';

export interface ShotFrame {
  slot: FrameSlot;
  url: string;
  /** Seconds into the shot: 0 for `start`, the duration for `end`, the chosen moment for `key`. Absent for references. */
  atSec?: number;
}

/** One offered slot on the timeline, with the truth about whether it can be filled. */
export interface SlotOffer {
  slot: FrameSlot;
  label: string;
  /** How many images this slot takes. 0 = the model does not offer it. */
  capacity: number;
  /** Why it is unavailable, when capacity is 0 — never a silently missing control. */
  unavailable?: string;
  hint: string;
}

export interface FramePlan {
  modelId: string;
  modelLabel: string;
  offers: SlotOffer[];
  /** True when start AND end are both available — the model can interpolate between two stills. */
  supportsInterpolation: boolean;
  /**
   * Mid-shot keyframes at arbitrary times. No wired model accepts these directly; when start and end
   * both exist they can be approximated by chaining segments, which is a WORKFLOW we would run, not
   * a parameter we would pass. Stated so the UI never implies a control that does not exist.
   */
  /**
   * Frames at a CHOSEN MOMENT, not just an opening and a closing still.
   *
   * This was hardcoded `supported: false` for every model — true when written, and a hand-typed
   * claim about what models cannot do, which is the kind of assertion that rots silently. FLUX.3
   * takes a list of stills each pinned to a frame index, so it is now read from the registry.
   *
   * When a model has no native support the honest answer is not "impossible": the image can be
   * attached as a reference and the timing ASKED FOR in the prompt. That is a request, not a
   * guarantee, and `native` is what tells the two apart.
   */
  midShotKeyframes: {
    supported: boolean;
    /** True only when the model takes frames at an index. False = the prompt-addressed fallback. */
    native: boolean;
    /** How many stills it accepts, when native. */
    max?: number;
    /** Frames per second — what turns a timestamp into the index the API wants. */
    fps?: number;
    technique?: string;
    why: string;
  };
}

/** What the model's own registry record says it accepts. */
export function planFrames(model: MediaModel): FramePlan {
  const v = model.video;
  const refCap = v?.maxReferenceImages ?? 0;
  const motion = new Set(v?.motion ?? []);

  // A start frame is the 'image-to-video' capability; an end frame is 'keyframe' interpolation.
  const kf = v?.keyframes;
  const startCap = motion.has('image-to-video') || motion.has('keyframe') ? 1 : 0;
  const endCap = motion.has('keyframe') ? 1 : 0;

  const offers: SlotOffer[] = [
    {
      slot: 'start',
      label: 'Opening frame',
      capacity: startCap,
      unavailable: startCap === 0 ? `${model.label} generates from text only — it cannot open on an image.` : undefined,
      hint: 'The still the shot begins on.',
    },
    {
      slot: 'end',
      label: 'Closing frame',
      capacity: endCap,
      unavailable:
        endCap === 0
          ? `${model.label} has no end-frame control — it decides where the shot lands.`
          : undefined,
      hint: 'The still the shot lands on. With an opening frame, the model animates between them.',
    },
    {
      slot: 'key',
      label: 'Moments',
      // NATIVE: the model's own keyframe list, less the two ends (which travel in the same list).
      // ASKED-FOR: the still rides as a reference, so it shares the reference budget.
      capacity: kf ? Math.max(0, kf.max - 2) : Math.min(refCap, 4),
      unavailable: !kf && refCap === 0
        ? `${model.label} takes no keyframes and no references, so a moment cannot be pinned — try FLUX.3 Video.`
        : undefined,
      hint: kf
        ? 'A still the shot passes THROUGH at a chosen second — exact, not approximate.'
        : 'A still the shot is ASKED to reach at a chosen second. A request the model may honour, not a guarantee.',
    },
    {
      slot: 'reference',
      label: 'References',
      capacity: refCap,
      unavailable: refCap === 0 ? `${model.label} takes no reference images.` : undefined,
      hint: 'Character, style or objects to hold across the whole shot — not a moment in it.',
    },
  ];

  const supportsInterpolation = startCap > 0 && endCap > 0;

  return {
    modelId: model.id,
    modelLabel: model.label,
    offers,
    supportsInterpolation,
    midShotKeyframes: kf
      ? {
          supported: true,
          native: true,
          max: kf.max,
          fps: kf.fps,
          why: `${model.label} takes up to ${kf.max} stills, each pinned to a moment in the shot — so an event can happen partway through and resolve before the clip ends.`,
        }
      : {
          // NOT "impossible" — just not guaranteed. The image can ride along as a reference with the
          // timing asked for in words, which some models honour and none promise.
          supported: true,
          native: false,
          technique:
            'Attach the still as a reference and ask for its timing in the prompt ("the exhaust flares at 0:02, settled by 0:03"). The model may honour it; it is a request, not a parameter.',
          why: supportsInterpolation
            ? `${model.label} interpolates between an opening and closing frame but takes no frame at a chosen time, so mid-shot timing has to be asked for in words.`
            : `${model.label} takes no keyframes at all, so mid-shot timing has to be asked for in words.`,
        },
  };
}

export interface FrameValidation {
  ok: boolean;
  /** Frames that will actually be sent. */
  accepted: ShotFrame[];
  /** Frames that cannot be sent, each with the reason — never dropped silently. */
  rejected: { frame: ShotFrame; reason: string }[];
}

/** Check pinned frames against what the model offers, keeping every rejection explained. */
export function validateFrames(plan: FramePlan, frames: ShotFrame[], durationSec?: number): FrameValidation {
  const accepted: ShotFrame[] = [];
  const rejected: FrameValidation['rejected'] = [];
  const used: Record<FrameSlot, number> = { start: 0, end: 0, key: 0, reference: 0 };
  const hasOpening = frames.some((f) => f.slot === 'start');

  for (const f of frames) {
    if (f.slot === 'key') {
      const t = f.atSec ?? -1;
      // A moment at 0 is the opening frame and one at the end is the closing frame — they have slots.
      if (!(t > 0) || (durationSec != null && t >= durationSec)) {
        rejected.push({
          frame: f,
          reason:
            durationSec != null && t >= durationSec
              ? `This moment (${t}s) falls after the shot ends at ${durationSec}s — move it earlier or lengthen the shot.`
              : 'A moment needs a time inside the shot — after 0s and before the end.',
        });
        continue;
      }
      // The asked-for route sends moments as REFERENCES, and the image-to-video endpoint an opening
      // frame needs takes none. Dropping them silently would charge for a shot that ignored them.
      if (!plan.midShotKeyframes.native && hasOpening) {
        rejected.push({
          frame: f,
          reason: `${plan.modelLabel} can't combine an opening frame with timed moments. Remove one, or use FLUX.3 Video, which takes both.`,
        });
        continue;
      }
    }
    const offer = plan.offers.find((o) => o.slot === f.slot);
    if (!offer || offer.capacity === 0) {
      rejected.push({ frame: f, reason: offer?.unavailable ?? `${plan.modelLabel} has no ${f.slot} slot.` });
      continue;
    }
    if (used[f.slot] >= offer.capacity) {
      rejected.push({
        frame: f,
        reason: `${offer.label} takes ${offer.capacity} image${offer.capacity === 1 ? '' : 's'} on ${plan.modelLabel}.`,
      });
      continue;
    }
    used[f.slot]++;
    accepted.push(f);
  }
  return { ok: rejected.length === 0, accepted, rejected };
}

/** Turn pinned frames into the request fields the video seam already understands. */
export function framesToRequest(frames: ShotFrame[]): {
  startFrame?: string;
  endFrame?: string;
  keyframes?: { url: string; atSec: number }[];
  references?: string[];
} {
  const start = frames.find((f) => f.slot === 'start')?.url;
  const end = frames.find((f) => f.slot === 'end')?.url;
  const references = frames.filter((f) => f.slot === 'reference').map((f) => f.url);
  const keyframes = frames
    .filter((f) => f.slot === 'key' && typeof f.atSec === 'number')
    .map((f) => ({ url: f.url, atSec: f.atSec as number }))
    .sort((a, b) => a.atSec - b.atSec);
  return {
    ...(start ? { startFrame: start } : {}),
    ...(end ? { endFrame: end } : {}),
    ...(keyframes.length > 0 ? { keyframes } : {}),
    ...(references.length > 0 ? { references } : {}),
  };
}
