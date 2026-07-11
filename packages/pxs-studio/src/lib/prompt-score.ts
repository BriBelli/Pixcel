/**
 * Prompt scoring — the HONEST quality score (PR-10c).
 *
 * A percentage needs criteria; the model's FORMULA is that criteria (see docs/MODEL-AGENT-KNOWLEDGE).
 * So the score measures how well each part is filled, WEIGHTED by that part's weight in the target
 * model's formula. It is a transparent heuristic (completeness + specificity), not a black box — we
 * can always say WHY a part is thin. Later the Model agent can replace the heuristic with a
 * model-aware judgement; the shape stays the same. Pure + deterministic → unit-tested.
 */

export type ScoreBand = 'thin' | 'good' | 'strong';

/** One part's current content, as the user has shaped it. */
export interface ScoredPartInput {
  id: string;
  /** The part's weight in the model's formula (heavier parts move the overall score more). */
  weight: number;
  /** The free-text value. */
  value: string;
  /** Added anchor chips. */
  anchors: string[];
}

export interface PartScore {
  id: string;
  raw: number; // 0..1
  band: ScoreBand;
}

export interface BuilderScore {
  parts: PartScore[];
  /** 0–100, weighted across parts. */
  overall: number;
  overallBand: ScoreBand;
  /** How many parts are at least 'good' (the "N/N parts" readout). */
  filled: number;
  total: number;
}

/** A single part's raw 0..1 strength: presence + specificity (word count) + an anchor bonus. */
export function scorePart(value: string, anchors: string[]): { raw: number; band: ScoreBand } {
  const text = [value, ...anchors].join(' ').trim();
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
  // ~8 descriptive words reads as a solid part; anchors add up to +0.3.
  const base = Math.min(1, words / 8) * 0.8;
  const anchorBonus = Math.min(anchors.filter((a) => a.trim()).length, 3) * 0.1;
  const raw = Math.min(1, base + anchorBonus);
  return { raw, band: bandOf(raw) };
}

/** Map a 0..1 strength onto a band. */
export function bandOf(raw: number): ScoreBand {
  if (raw < 0.4) return 'thin';
  if (raw < 0.78) return 'good';
  return 'strong';
}

/** Score the whole builder — per-part bands + a weighted overall percentage. */
export function scoreBuilder(parts: ScoredPartInput[]): BuilderScore {
  let weightSum = 0;
  let acc = 0;
  const scored: PartScore[] = parts.map((p) => {
    const { raw, band } = scorePart(p.value, p.anchors);
    const w = p.weight > 0 ? p.weight : 1;
    weightSum += w;
    acc += raw * w;
    return { id: p.id, raw, band };
  });
  const overall = weightSum > 0 ? Math.round((acc / weightSum) * 100) : 0;
  const filled = scored.filter((s) => s.band !== 'thin').length;
  return {
    parts: scored,
    overall,
    overallBand: overall < 45 ? 'thin' : overall < 75 ? 'good' : 'strong',
    filled,
    total: parts.length,
  };
}

/** Human label for the overall band ("Strong" / "Good" / "Thin"). */
export function bandLabel(band: ScoreBand): string {
  return band === 'strong' ? 'Strong' : band === 'good' ? 'Good' : 'Thin';
}
