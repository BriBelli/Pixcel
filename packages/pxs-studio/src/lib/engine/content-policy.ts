/**
 * CONTENT POLICY — what a MODEL will actually make, as a researched fact with levels.
 *
 * Pixcel is a production tool for adult creative work: TV-MA material — nudity, graphic violence,
 * drug use, hard language — is in scope, the same way it is in scope for a film studio. Which model
 * can serve that is NOT a property of the provider. Replicate and fal are universal hosts; the same
 * host serves a permissive open-weights model and a heavily-filtered commercial one. It is a
 * per-MODEL fact, it differs by KIND (a model may allow graphic violence and refuse nudity), and it
 * is a LEVEL, not a switch (GPT Image is stricter than Grok, which is stricter again than an
 * unfiltered open-weights checkpoint).
 *
 * So it lives here, on the model, researched and re-verified from the provider's own published
 * policy with provenance — exactly like reference limits and prompt formulas, and for the same
 * reason: hardcoded opinion about what a model allows is wrong the moment a provider updates its
 * terms, and it does not know it is wrong.
 *
 * WHAT THIS IS: capability matching. It routes a brief to a model whose provider PERMITS that
 * content, and reports honestly when none does. It is not a way to push content past a model's
 * safety systems — a model's filters are the provider's to enforce, and a route that lands on a
 * refusal is a routing failure, which is precisely what this data exists to prevent.
 *
 * WHAT IT IS NOT: a route to illegal material. See `PROHIBITED` — that floor sits below every level
 * here and no model is ever matched to it.
 */

/** The kinds of content providers govern SEPARATELY. Split because their ceilings differ per model. */
export type ContentAxis =
  | 'nudity' // undress, from partial to full
  | 'sexual' // sexual activity or explicitly erotic framing
  | 'violence' // physical conflict, weapons, injury
  | 'gore' // blood, mutilation, body horror
  | 'substance' // drug and alcohol use depicted
  | 'language' // profanity rendered in-image or spoken in video
  | 'likeness'; // a real, identifiable person

export const CONTENT_AXES: ContentAxis[] = [
  'nudity',
  'sexual',
  'violence',
  'gore',
  'substance',
  'language',
  'likeness',
];

/**
 * How far a model goes on one axis. ORDERED least → most permissive, so routing is a comparison.
 *
 * The levels read across every axis: `mild` is a swimsuit, a bloodless scuffle, a beer on a table;
 * `explicit` is full nudity, graphic gore, on-screen drug use.
 */
export type ContentLevel = 'blocked' | 'mild' | 'moderate' | 'explicit';

export const CONTENT_LEVELS: ContentLevel[] = ['blocked', 'mild', 'moderate', 'explicit'];

/** Numeric rank for comparison. A model serves a request when its ceiling ≥ what the brief needs. */
export function levelRank(level: ContentLevel): number {
  return CONTENT_LEVELS.indexOf(level);
}

/**
 * How we know. Research must say which — a ceiling inferred from watching a model refuse things is
 * weaker evidence than one written in the provider's acceptable-use policy, and the difference
 * matters when a route is about to spend money on a refusal.
 */
export type PolicyBasis = 'documented' | 'observed' | 'unknown';

/** One model's researched content ceilings. */
export interface ContentPolicy {
  /** Per-axis ceiling. An axis ABSENT means unresearched — never assume it is permitted. */
  limits: Partial<Record<ContentAxis, ContentLevel>>;
  basis: PolicyBasis;
  /** The policy page this was read from — the receipt. */
  sourceUrl?: string;
  /** ISO date the ceilings were last verified against that source. */
  verifiedAt?: string;
  /** One line of nuance the levels cannot carry ("artistic nudity only, no minors, no real people"). */
  notes?: string;
}

/**
 * The floor beneath every level above: material that is illegal or inherently abusive. This is not
 * the top of the scale — it is OFF the scale. No model carries a ceiling for it, no research may
 * record one, and no route may be constructed to reach it. Kept explicit so the ordered levels above
 * can never be read as "explicit means anything goes".
 */
export const PROHIBITED = [
  'sexual content involving minors',
  'sexualized depictions of real people without consent',
  'content produced to harass or defame a real person',
] as const;

/** A model with no researched policy — the honest default. Unknown is NOT permission. */
export const UNKNOWN_POLICY: ContentPolicy = { limits: {}, basis: 'unknown' };

/**
 * What a brief NEEDS on each axis. Produced by classifying the request; compared against a model's
 * ceilings to route.
 */
export type ContentDemand = Partial<Record<ContentAxis, ContentLevel>>;

/** Coerce a researched string onto the vocabulary. Unmapped → undefined (dropped, never coined). */
export function normalizeLevel(raw: unknown): ContentLevel | undefined {
  if (typeof raw !== 'string') return undefined;
  const v = raw.trim().toLowerCase();
  if ((CONTENT_LEVELS as string[]).includes(v)) return v as ContentLevel;
  // Common phrasings a provider's policy uses, mapped onto OUR nouns.
  const alias: Record<string, ContentLevel> = {
    none: 'blocked',
    no: 'blocked',
    prohibited: 'blocked',
    disallowed: 'blocked',
    never: 'blocked',
    suggestive: 'mild',
    implied: 'mild',
    mild_only: 'mild',
    limited: 'mild',
    artistic: 'moderate',
    partial: 'moderate',
    stylized: 'moderate',
    tasteful: 'moderate',
    graphic: 'explicit',
    full: 'explicit',
    unrestricted: 'explicit',
    uncensored: 'explicit',
  };
  return alias[v];
}

/** Coerce a researched axis name onto the vocabulary. Unmapped → undefined. */
export function normalizeAxis(raw: unknown): ContentAxis | undefined {
  if (typeof raw !== 'string') return undefined;
  const v = raw.trim().toLowerCase().replace(/[\s-]+/g, '_');
  if ((CONTENT_AXES as string[]).includes(v)) return v as ContentAxis;
  const alias: Record<string, ContentAxis> = {
    nsfw: 'sexual',
    adult: 'sexual',
    erotica: 'sexual',
    porn: 'sexual',
    nude: 'nudity',
    nudes: 'nudity',
    undress: 'nudity',
    blood: 'gore',
    injury: 'gore',
    weapons: 'violence',
    fighting: 'violence',
    drugs: 'substance',
    alcohol: 'substance',
    profanity: 'language',
    swearing: 'language',
    celebrity: 'likeness',
    real_person: 'likeness',
    public_figure: 'likeness',
  };
  return alias[v];
}

/** Parse a researched policy object into our shape, dropping anything unmapped. */
export function normalizeContentPolicy(raw: unknown): ContentPolicy | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, unknown>;
  const limits: Partial<Record<ContentAxis, ContentLevel>> = {};
  const rawLimits = (r.limits ?? r) as Record<string, unknown>;
  for (const [k, v] of Object.entries(rawLimits)) {
    const axis = normalizeAxis(k);
    const level = normalizeLevel(v);
    if (axis && level) limits[axis] = level;
  }
  if (Object.keys(limits).length === 0) return undefined;
  const basis = typeof r.basis === 'string' && ['documented', 'observed', 'unknown'].includes(r.basis)
    ? (r.basis as PolicyBasis)
    : 'observed';
  return {
    limits,
    basis,
    sourceUrl: typeof r.sourceUrl === 'string' ? r.sourceUrl : undefined,
    verifiedAt: typeof r.verifiedAt === 'string' ? r.verifiedAt : undefined,
    notes: typeof r.notes === 'string' ? r.notes : undefined,
  };
}

/**
 * Can this model serve what the brief needs?
 *
 * An UNRESEARCHED axis is not a yes. Routing a mature brief to a model whose policy we have never
 * read is how you pay for a refusal, so the verdict says `unknown` and the caller decides — rather
 * than this function quietly guessing in either direction.
 */
export function servesDemand(
  policy: ContentPolicy | undefined,
  demand: ContentDemand,
): { ok: boolean; unknown: ContentAxis[]; blocked: { axis: ContentAxis; ceiling: ContentLevel }[] } {
  const unknown: ContentAxis[] = [];
  const blocked: { axis: ContentAxis; ceiling: ContentLevel }[] = [];
  for (const [rawAxis, rawNeed] of Object.entries(demand)) {
    const axis = rawAxis as ContentAxis;
    const need = rawNeed as ContentLevel;
    if (levelRank(need) === 0) continue; // the brief needs nothing on this axis
    const ceiling = policy?.limits?.[axis];
    if (!ceiling) {
      unknown.push(axis);
      continue;
    }
    if (levelRank(ceiling) < levelRank(need)) blocked.push({ axis, ceiling });
  }
  return { ok: blocked.length === 0 && unknown.length === 0, unknown, blocked };
}

/** A sentence for the UI when a model is benched on content — the graceful-specialist reason. */
export function policyReason(
  label: string,
  verdict: ReturnType<typeof servesDemand>,
): string | undefined {
  if (verdict.blocked.length > 0) {
    const a = verdict.blocked.map((b) => `${b.axis} (allows ${b.ceiling})`).join(', ');
    return `${label} does not permit this content — ${a}.`;
  }
  if (verdict.unknown.length > 0) {
    return `${label}'s policy on ${verdict.unknown.join(', ')} hasn't been verified yet — not routed rather than risk a refusal you'd pay for.`;
  }
  return undefined;
}
