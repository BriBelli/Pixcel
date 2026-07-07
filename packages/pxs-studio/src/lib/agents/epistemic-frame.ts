/**
 * The Epistemic Frame — the bounded world-view the Operator hands a specialist on TRANSFER.
 *
 * State-injection: the specialist reads this ("verified facts — don't re-verify") and starts at
 * DECIDE, skipping a redundant Orient. Kept SMALL and enforced (< ~500 tokens) — assets are
 * referenced by PATH, not content (read-ahead / progressive disclosure), so the frame never
 * balloons into a context dump.
 *
 * The Operator owns building this (goal / subject / medium / section / budget). The specialist
 * (Image agent) owns everything downstream — the prompt and all routing specs.
 */

export interface EpistemicFrame {
  /** Localized Scope — the whole job, one line. */
  goal: string;
  /** The core subject, if named. */
  subject?: string;
  /** The ultimate deliverable the Operator inferred. */
  medium: 'image' | 'video';
  /** The entry nav section (the Operator's prior). */
  section: string;
  /** Local Boundaries — spend ceiling for this leg (USD, the user's remaining budget). */
  budgetUsd: number;
  /** Local Boundaries — how many images to produce. */
  count: number;
  /** Pruned Ontology — asset PATHS the specialist may read on demand (never inlined content). */
  assetRefs?: string[];
}

/** Rough token estimate (~4 chars/token) for a serialized frame. */
export function frameTokenEstimate(frame: EpistemicFrame): number {
  return Math.ceil(JSON.stringify(frame).length / 4);
}

/**
 * Enforce the frame budget so the injected world-view stays bounded. Throws if the frame is too
 * large (a signal that content leaked in where a path should be). Default ceiling ~500 tokens.
 */
export function assertFrameBudget(frame: EpistemicFrame, maxTokens = 500): void {
  const est = frameTokenEstimate(frame);
  if (est > maxTokens) {
    throw new Error(`EpistemicFrame too large: ~${est} tokens > ${maxTokens} (inline content leaked? use asset PATHS)`);
  }
}
