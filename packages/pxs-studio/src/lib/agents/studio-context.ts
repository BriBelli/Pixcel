/**
 * STUDIO CONTEXT — what the Operator should already know about YOUR studio.
 *
 * The Operator has a role prompt and craft shards and nothing else: it cannot see what you have
 * made, what you kept, or which model keeps winning. So it reasons in the abstract while you sit
 * on the specifics, and the gap gets filled by you pasting prompts in from somewhere else.
 *
 * Brian, after the fifth time: "it's like I need an agent for the agent." He was right. He had a
 * prompt that beat letterboxing, saved in a chat message, and had to go and fetch it again — the
 * studio watched him solve that problem and learned nothing from it.
 *
 * THE SIGNAL IS ALREADY HERE, UNREAD. Keeping something is a judgement: a saved asset is one you
 * decided was worth keeping, and one used as a reference or an opening frame is one you decided was
 * worth BUILDING ON — a stronger verdict still, since you staked another render on it. Those acts
 * already happen; nothing asks you to rate anything. This reads them back.
 *
 * Three facts fall out of the same signal:
 *   WHAT YOU HAVE     — the material a plan can actually use.
 *   WHAT WORKED       — the prompts behind the results you kept.
 *   WHO KEEPS WINNING — the model behind them, which is a verdict the researched scores do not have.
 *
 * Deliberately SMALL. This is injected into every Operator turn, so it is a digest, not a dump.
 */

import type { Repository } from '../db/repository';
import type { Asset } from '../db/models';

/** How many of each kind to name. Enough to plan with, short enough to read every turn. */
const MAX_ASSETS = 8;
const MAX_RECIPES = 4;

export interface StudioContext {
  /** Assets worth planning around — saved, or built upon. */
  holdings: { id: string; kind: string; label: string; aspect?: string }[];
  /** Prompts that produced something kept, with the model that produced it. */
  provenRecipes: { prompt: string; modelLabel?: string }[];
  /** Models ranked by how often their output was kept — a REVEALED preference, not a rating. */
  trusted: { modelLabel: string; kept: number }[];
}

/**
 * Labels OUR machinery produces, not a model the user chose. A bridging frame is plumbing and an
 * assembled sequence is our own output; counting either as a judgement about a model, or offering
 * them as material to plan with, is the studio admiring its own reflection.
 */
const OURS = new Set(['assembled sequence', 'bridging frame']);
const isOurs = (label?: string) => OURS.has((label ?? '').trim().toLowerCase());

/**
 * One model, however it was written down.
 *
 * 'Seedance 2.5 (ByteDance)' and 'seedance-2.5' are the label and the id of the same thing, and
 * counting them separately split one model's record in half — which is exactly the kind of quiet
 * miscount that makes a tally untrustworthy.
 */
function modelKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/[^a-z0-9.]+/g, '')
    .trim();
}

/** A short human label for an asset, from whatever it actually carries. */
function labelFor(a: Asset): string {
  const t = (a.title ?? '').trim();
  if (t) return t.slice(0, 60);
  const p = (a.prompt ?? '').trim();
  if (p) return p.split(/\s+/).slice(0, 9).join(' ').slice(0, 60);
  return a.model_label ?? a.kind;
}

/** Aspect, where we can tell — the fact that decides whether a still can open a 16:9 shot. */
function aspectFor(a: Asset): string | undefined {
  if (a.kind !== 'video') return undefined;
  return undefined; // width/height are not stored for stills yet; see the gap noted below.
}

/**
 * Read the studio back.
 *
 * Never throws — a missing context must degrade the Operator to what it is today, not break a turn.
 */
export async function readStudioContext(repo: Repository, userId: string): Promise<StudioContext> {
  const empty: StudioContext = { holdings: [], provenRecipes: [], trusted: [] };
  try {
    const { items } = await repo.query({ category: 'asset', user_id: userId, limit: 400, sort: 'desc' });
    const assets = items as Asset[];
    if (assets.length === 0) return empty;

    // KEPT = you saved it, or you built on it. Both are judgements you already made; the second is
    // the stronger one, because staking another render on something says more than filing it.
    const builtOn = new Set<string>();
    for (const a of assets) {
      for (const r of a.reference_asset_ids ?? []) builtOn.add(r);
      if (a.parent_asset_id) builtOn.add(a.parent_asset_id);
    }
    // THREE judgements, in rising order of how much they cost the user to express:
    //   downloaded — they took a copy. Costs nothing to say and nobody takes a bad one.
    //   saved      — they filed it deliberately.
    //   built on   — they staked another render on it, which is the strongest of the three.
    const kept = assets.filter((a) => (a.kept_count ?? 0) > 0 || a.retention === 'saved' || builtOn.has(a.id));

    const holdings = kept
      .filter((a) => a.status === 'active' && !isOurs(a.model_label))
      .map((a) => ({ id: a.id, kind: a.kind, label: labelFor(a), aspect: aspectFor(a) }))
      // A label that is just the kind ("image") tells a planner nothing, and a list of those reads
      // as noise that trains the Operator to skip the whole section.
      .filter((h) => h.label.toLowerCase() !== h.kind)
      .slice(0, MAX_ASSETS);

    // A prompt that produced something kept is a prompt that worked. Deduped on the opening words,
    // because near-identical takes of one idea are one lesson, not four.
    const seen = new Set<string>();
    const provenRecipes: StudioContext['provenRecipes'] = [];
    for (const a of kept) {
      if (isOurs(a.model_label)) continue;
      const p = (a.prompt ?? '').trim();
      // A BRIEF, not a name. "Lamborghini launch sequence" is 27 characters and passed a length
      // check, but it is three words — offering it as a prompt that worked would teach the Operator
      // that three words are a brief, which is the opposite of the lesson here.
      if (p.split(/\s+/).length < 8) continue;
      // A TITLE is not a prompt. An assembled scene stores its name here, and offering
      // "Lamborghini launch sequence" as a proven recipe would teach the Operator that three words
      // are a brief.
      if (p === (a.title ?? '').trim()) continue;
      const key = p.slice(0, 48).toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      provenRecipes.push({ prompt: p.slice(0, 600), modelLabel: a.model_label });
      if (provenRecipes.length >= MAX_RECIPES) break;
    }

    // WHO KEEPS WINNING. Counted from what survived, not from a rating anyone typed — which is the
    // only verdict here grounded in work the user actually chose to keep.
    const tally = new Map<string, { label: string; kept: number }>();
    for (const a of kept) {
      const m = (a.model_label ?? '').trim();
      if (!m || isOurs(m)) continue;
      const key = modelKey(m);
      if (!key) continue;
      const seenBefore = tally.get(key);
      // Keep the FULLEST spelling — 'Seedance 2.5 (ByteDance)' reads better than 'seedance-2.5'.
      tally.set(key, { label: seenBefore && seenBefore.label.length >= m.length ? seenBefore.label : m, kept: (seenBefore?.kept ?? 0) + 1 });
    }
    const trusted = [...tally.values()]
      .map((t) => ({ modelLabel: t.label, kept: t.kept }))
      .sort((a, b) => b.kept - a.kept)
      .slice(0, 4);

    return { holdings, provenRecipes, trusted };
  } catch {
    return empty;
  }
}

/**
 * Render the context for the Operator's system prompt.
 *
 * Returns '' when there is nothing to say — a new studio should not be handed empty headings, and
 * an Operator told "you have no assets" reasons worse than one told nothing.
 */
export function studioContextBrief(ctx: StudioContext): string {
  const parts: string[] = [];

  if (ctx.holdings.length > 0) {
    parts.push(
      `WHAT THEY ALREADY HAVE — plan with this material before proposing anything new; a step that ` +
        `re-makes something they are holding wastes their money and their afternoon:\n` +
        ctx.holdings.map((h) => `- [${h.kind}] ${h.label}`).join('\n'),
    );
  }

  if (ctx.provenRecipes.length > 0) {
    parts.push(
      `PROMPTS THAT WORKED HERE — these produced results this user KEPT. Reuse their phrasing when ` +
        `the task is similar, especially any constraint they had to spell out: a phrase that is in ` +
        `one of these because the model needed telling will be needed again.\n` +
        ctx.provenRecipes
          .map((r) => `- ${r.modelLabel ? `(${r.modelLabel}) ` : ''}"${r.prompt.replace(/\s+/g, ' ')}"`)
          .join('\n'),
    );
  }

  if (ctx.trusted.length > 0) {
    parts.push(
      `WHAT THEY ACTUALLY KEEP — counted from the renders they saved or built on, which is a verdict ` +
        `their own work produced rather than a score anyone typed. Weigh it ABOVE the registry's ` +
        `craft ratings when they disagree:\n` +
        ctx.trusted.map((t) => `- ${t.modelLabel}: kept ${t.kept}`).join('\n'),
    );
  }

  if (parts.length === 0) return '';
  return `\n\n── THIS STUDIO ──────────────────────────────────────────────\n${parts.join('\n\n')}\n`;
}
