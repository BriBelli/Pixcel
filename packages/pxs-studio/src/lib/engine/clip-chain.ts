/**
 * CLIP CHAINING — a shot per beat, each opening where the last one landed.
 *
 * THE PROBLEM IT SOLVES. Brian asked for a Lamborghini that "starts dead still, then absolutely
 * rips, flames on the upshift" and got a car that simply drives. That was not a prompt failure: no
 * video model here has a timeline. A clip is generated holistically, so "first X, then Y, then Z"
 * cannot be staged inside one render — the model averages the beats into a single motion instead of
 * sequencing them. The agent has been correctly telling him so for weeks while being unable to do
 * anything about it. This is the thing it could not do.
 *
 * THE TECHNIQUE. Render each beat as its own clip, extract the final frame, and open the next beat
 * on that still. Continuity comes from the image, not from the model remembering anything. That is
 * how the beats stay in ORDER, which is the whole point: the acceleration lands because it is its
 * own shot, not a clause competing with two others.
 *
 * WHAT IT IS NOT. Not `shots` — that is several shots inside ONE generation (Kling composes them
 * with a shared audio timeline). Chaining is N separate renders and costs N times as much, which is
 * exactly why the budget is settled for the WHOLE chain before the first frame is rendered.
 *
 * MONEY. The estimate covers every beat up front and a chain that cannot be afforded is refused
 * WHOLE. It is never silently shortened: "your budget covers 2 of your 4 beats" is a decision for
 * the person paying, not a degradation to apply on their behalf.
 *
 * PARTIAL RESULTS ARE KEPT. Each clip is handed to the caller the moment it lands, so a chain that
 * fails at beat 3 leaves beats 1 and 2 persisted and watchable. Losing paid work to a later failure
 * is the thing the whole asset layer exists to prevent.
 */

export interface ChainBeat {
  /** What happens in this beat — one clear action, not three. */
  prompt: string;
  /** Seconds for this beat. Omitted → the chain's default. */
  durationSec?: number;
}

/** One produced link in the chain. */
export interface ChainedClip {
  index: number;
  /** The provider's url — fresh, and what frame extraction must be pointed at. */
  url: string;
  /** Our durable url once ingested, when the caller ingests. */
  storedUrl?: string;
  durationSec?: number;
  hasAudio?: boolean;
  /** The still this beat OPENED on (the previous beat's last frame). Absent on beat 1. */
  openedOn?: string;
  costUsd: number;
}

export type ChainEvent =
  | { type: 'plan'; beats: number; estimatedUsd: number }
  | { type: 'beat_start'; index: number; total: number; prompt: string; openedOn?: string }
  | { type: 'clip'; clip: ChainedClip }
  | { type: 'bridging'; index: number }
  | {
      /** The chain stopped early. `produced` clips are already delivered and kept. */
      type: 'stopped';
      atBeat: number;
      reason: string;
      produced: number;
    }
  | { type: 'done'; clips: ChainedClip[]; costUsd: number };

export interface ChainDeps {
  /** Render ONE beat. Returns the clip or a reason. Injected so the chain is testable without spend. */
  renderBeat: (input: {
    prompt: string;
    durationSec: number;
    startFrame?: string;
    index: number;
  }) => Promise<{ clip: { url: string; durationSec?: number; hasAudio?: boolean } | null; costUsd: number; reason?: string }>;
  /** Pull the last frame of a clip, for the next beat to open on. */
  extractLastFrame: (videoUrl: string) => Promise<{ frame: { url: string } | null; reason?: string }>;
  /** (low, high) USD for one beat of this length — used for the whole-chain estimate. */
  estimateBeatUsd: (durationSec: number) => [number, number];
}

export interface ChainOptions {
  /** Seconds per beat when a beat does not specify. */
  defaultDurationSec?: number;
  /** The still the FIRST beat opens on, when the user pinned one. */
  startFrame?: string;
  /** Spend ceiling for the WHOLE chain. Exceeded → refused whole, never shortened. */
  budgetUsd?: number;
}

/** What a chain would cost, worst case, across every beat. Quoted before anything is rendered. */
export function estimateChain(
  beats: ChainBeat[],
  estimateBeatUsd: ChainDeps['estimateBeatUsd'],
  defaultDurationSec = 5,
): { low: number; high: number } {
  let low = 0;
  let high = 0;
  for (const b of beats) {
    const [l, h] = estimateBeatUsd(b.durationSec ?? defaultDurationSec);
    low += l;
    high += h;
  }
  return { low: Number(low.toFixed(3)), high: Number(high.toFixed(3)) };
}

/**
 * Run the chain.
 *
 * Sequential by nature — beat N+1 cannot start until beat N has produced the frame it opens on —
 * so this is slow by construction (roughly N × a single render) and the events exist to make that
 * legible rather than to hide it.
 */
export async function* runClipChain(
  beats: ChainBeat[],
  deps: ChainDeps,
  opts: ChainOptions = {},
): AsyncGenerator<ChainEvent> {
  const defaultDuration = opts.defaultDurationSec ?? 5;

  if (beats.length === 0) {
    yield { type: 'done', clips: [], costUsd: 0 };
    return;
  }

  // ── MONEY FIRST ───────────────────────────────────────────────────────────────────────────────
  // On the WORST case, and for the WHOLE chain, before a single frame is rendered. A chain half-paid
  // for is worse than a chain refused: the user has spent money and still has no sequence.
  const est = estimateChain(beats, deps.estimateBeatUsd, defaultDuration);
  if (opts.budgetUsd != null && est.high > opts.budgetUsd) {
    yield {
      type: 'stopped',
      atBeat: 0,
      reason:
        `This ${beats.length}-beat sequence needs up to $${est.high.toFixed(2)} and your remaining ` +
        `budget is $${opts.budgetUsd.toFixed(2)}. Raise the budget or use fewer beats — nothing was rendered.`,
      produced: 0,
    };
    return;
  }
  yield { type: 'plan', beats: beats.length, estimatedUsd: est.high };

  const clips: ChainedClip[] = [];
  let costUsd = 0;
  let openOn: string | undefined = opts.startFrame;

  for (let i = 0; i < beats.length; i++) {
    const beat = beats[i]!;
    const durationSec = beat.durationSec ?? defaultDuration;
    yield { type: 'beat_start', index: i, total: beats.length, prompt: beat.prompt, openedOn: openOn };

    const rendered = await deps.renderBeat({ prompt: beat.prompt, durationSec, startFrame: openOn, index: i });
    costUsd = Number((costUsd + (rendered.costUsd || 0)).toFixed(3));

    if (!rendered.clip) {
      // Everything produced so far is already delivered and kept — the chain stops, it does not
      // discard.
      yield {
        type: 'stopped',
        atBeat: i,
        reason: rendered.reason ?? `beat ${i + 1} produced no clip`,
        produced: clips.length,
      };
      yield { type: 'done', clips, costUsd };
      return;
    }

    const clip: ChainedClip = {
      index: i,
      url: rendered.clip.url,
      durationSec: rendered.clip.durationSec ?? durationSec,
      hasAudio: rendered.clip.hasAudio,
      openedOn: openOn,
      costUsd: rendered.costUsd || 0,
    };
    clips.push(clip);
    yield { type: 'clip', clip };

    // The LAST beat needs no bridging frame — asking for one would cost time and buy nothing.
    if (i === beats.length - 1) break;

    yield { type: 'bridging', index: i };
    const extracted = await deps.extractLastFrame(rendered.clip.url);
    if (!extracted.frame) {
      // Without the still there is no continuity, and rendering the next beat anyway would produce a
      // disconnected clip the user pays for and cannot use. Stop honestly instead.
      yield {
        type: 'stopped',
        atBeat: i + 1,
        reason:
          `Couldn't carry the last frame of beat ${i + 1} into beat ${i + 2}` +
          `${extracted.reason ? ` — ${extracted.reason}` : ''}. The beats already rendered are saved.`,
        produced: clips.length,
      };
      yield { type: 'done', clips, costUsd };
      return;
    }
    openOn = extracted.frame.url;
  }

  yield { type: 'done', clips, costUsd };
}
