/**
 * Skill loader — the Orient layer's runtime seam (server-only; uses node:fs).
 *
 * Skills are bounded OKF markdown shards under `skills/<agent>/*.md`. This module reads them and
 * selects ONLY the shards relevant to the situation, so an agent's system prompt gets its craft
 * WITHOUT dumping the whole library every turn (Context Sharding — see skills/README.md).
 *
 * Selection is heuristic today (entry section + keyword signals). A read-ahead tool the agent
 * calls mid-loop to pull a shard by path is the planned refinement; the shard files + frontmatter
 * are already shaped for it.
 */

import fs from 'node:fs';
import path from 'node:path';

/** Skills live beside this file. `process.cwd()` is the studio package root during dev/build. */
const SKILLS_DIR = path.join(process.cwd(), 'src', 'lib', 'agents', 'skills');

const cache = new Map<string, string>();

/** Read one shard by `<agent>/<name>` (no extension). Cached; returns '' if missing. */
export function loadSkill(rel: string): string {
  const hit = cache.get(rel);
  if (hit !== undefined) return hit;
  let body = '';
  try {
    const raw = fs.readFileSync(path.join(SKILLS_DIR, `${rel}.md`), 'utf8');
    body = stripFrontmatter(raw).trim();
  } catch {
    // A missing shard must never break a turn — the agent falls back to its thin role prompt.
    body = '';
  }
  cache.set(rel, body);
  return body;
}

/** Drop the leading `--- ... ---` YAML frontmatter block; keep the concept body. */
function stripFrontmatter(md: string): string {
  if (!md.startsWith('---')) return md;
  const end = md.indexOf('\n---', 3);
  return end === -1 ? md : md.slice(md.indexOf('\n', end + 1) + 1);
}

/** Join selected shards into one injectable block, labelled so the model can tell them apart. */
function compose(rels: string[]): string {
  const parts = rels.map((r) => loadSkill(r)).filter(Boolean);
  if (parts.length === 0) return '';
  return `\n\n# Your skills (Orient layer)\n\n${parts.join('\n\n---\n\n')}`;
}

/** Cheap signal test over the message + history. */
function hasSignal(text: string, words: string[]): boolean {
  const t = text.toLowerCase();
  return words.some((w) => t.includes(w));
}

/**
 * The Operator's relevant shards for this turn. Always loads diagnosis + sizing; adds the
 * cinematic-video shard when the section or the message signals video/film/story.
 */
export function operatorSkills(ctx: { section: string; text: string }): string {
  const rels = ['operator/workflow-diagnosis', 'operator/sizing-heuristics'];
  const cinematic =
    ctx.section === 'video' ||
    hasSignal(ctx.text, ['video', 'film', 'scene', 'clip', 'motion', 'animation', 'childhood', 'story', 'storyboard']);
  if (cinematic) rels.push('operator/cinematic-video-paths');
  return compose(rels);
}

/** The Image agent's craft — reference workflow + prompt formulas. */
export function imageAgentSkills(): string {
  return compose(['image-agent/reference-workflows', 'image-agent/prompt-formulas']);
}

/** The Model agent's capability-lookup craft. */
export function modelAgentSkills(): string {
  return compose(['model-agent/capability-lookup']);
}
