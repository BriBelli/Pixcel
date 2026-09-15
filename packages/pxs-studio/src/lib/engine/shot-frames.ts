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
export type FrameSlot = 'start' | 'end' | 'reference';

export interface ShotFrame {
  slot: FrameSlot;
  url: string;
  /** Seconds into the shot. Meaningful for `start` (0) and `end` (duration); absent for references. */
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
  midShotKeyframes: { supported: false; technique?: string; why: string };
}

/** What the model's own registry record says it accepts. */
export function planFrames(model: MediaModel): FramePlan {
  const v = model.video;
  const refCap = v?.maxReferenceImages ?? 0;
  const motion = new Set(v?.motion ?? []);

  // A start frame is the 'image-to-video' capability; an end frame is 'keyframe' interpolation.
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
    midShotKeyframes: {
      supported: false,
      technique: supportsInterpolation
        ? 'Split the beat into segments and chain them — each segment ends on the still the next one opens with.'
        : undefined,
      why: supportsInterpolation
        ? `${model.label} interpolates between an opening and closing frame, but takes no frame at an arbitrary time.`
        : `${model.label} takes no mid-shot keyframes.`,
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
export function validateFrames(plan: FramePlan, frames: ShotFrame[]): FrameValidation {
  const accepted: ShotFrame[] = [];
  const rejected: FrameValidation['rejected'] = [];
  const used: Record<FrameSlot, number> = { start: 0, end: 0, reference: 0 };

  for (const f of frames) {
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
  references?: string[];
} {
  const start = frames.find((f) => f.slot === 'start')?.url;
  const end = frames.find((f) => f.slot === 'end')?.url;
  const references = frames.filter((f) => f.slot === 'reference').map((f) => f.url);
  return {
    ...(start ? { startFrame: start } : {}),
    ...(end ? { endFrame: end } : {}),
    ...(references.length > 0 ? { references } : {}),
  };
}
