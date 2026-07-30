/**
 * The three project verbs (OBJECT-MODEL-HANDOFF §2 / build-order §6.4).
 *
 *   Duplicate       Project → Project   (cloned_from_thread_id)   — a full independent copy
 *   Save as template Project → Recipe    (source_thread_id)        — extract the reusable method
 *   Open as project  Asset  → Project    (seeded_from + refs)      — THE one that matters
 *
 * Breadcrumbs, never sync channels (§8): cloned_from_thread_id / seeded_from record provenance only —
 * there is no merge-back. A duplicate diverges the instant it's made; a template instantiation is its
 * own thing. All operate on the current Repository (SQLite/memory today, DynamoDB later — same port).
 */

import type { Repository } from './repository';
import type { Thread, Interaction, Asset, Prompt } from './models';
import { draftBirthFields } from './project-promotion';

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** The [SLOT] variable names a recipe exposes (the Character Reference Sheet template's slots). */
function extractVariables(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(/\[([^\]\n]{1,60})\]/g)) out.add(m[1].trim());
  return [...out];
}

/**
 * DUPLICATE (Save As) — Project → Project. A full independent copy: the thread + every active
 * interaction + every active asset, with all internal edges (interaction_id, reference_asset_ids[],
 * parent_asset_id, parent_interaction_id) REWIRED to the new ids so the clone is self-contained and
 * shares nothing with the source. Born saved (it carries its copied assets). Returns the new thread id.
 */
export async function duplicateThread(
  repo: Repository,
  userId: string,
  threadId: string,
  now: number,
): Promise<string | null> {
  const src = (await repo.get('thread', threadId)) as Thread | null;
  if (!src) return null;
  const newThreadId = newId('thread');

  const clone: Thread = {
    ...src,
    id: newThreadId,
    title: `${(src.title ?? 'Untitled').slice(0, 72)} (copy)`,
    created_at: now,
    updated_at: now,
    status: 'active',
    retention: 'saved',
    promoted_at: now,
    expires_at: undefined,
    cloned_from_thread_id: threadId,
    seeded_from: undefined,
  };
  await repo.put(clone);

  // Remap interactions (build the id map first so parent_interaction_id can be rewired).
  const { items: interactions } = await repo.query({
    category: 'interaction',
    user_id: userId,
    filter: { thread_id: threadId, status: 'active' },
  });
  const interMap = new Map<string, string>();
  for (const it of interactions as Interaction[]) interMap.set(it.id, newId('interaction'));
  for (const it of interactions as Interaction[]) {
    await repo.put<Interaction>({
      ...it,
      id: interMap.get(it.id)!,
      thread_id: newThreadId,
      created_at: now,
      updated_at: now,
      parent_interaction_id: it.parent_interaction_id ? interMap.get(it.parent_interaction_id) : undefined,
    });
  }

  // Remap assets (interaction_id + reference_asset_ids[] + parent_asset_id → new ids).
  const { items: assets } = await repo.query({
    category: 'asset',
    user_id: userId,
    filter: { thread_id: threadId, status: 'active' },
  });
  const assetMap = new Map<string, string>();
  for (const a of assets as Asset[]) assetMap.set(a.id, newId('asset'));
  for (const a of assets as Asset[]) {
    await repo.put<Asset>({
      ...a,
      id: assetMap.get(a.id)!,
      thread_id: newThreadId,
      interaction_id: a.interaction_id ? interMap.get(a.interaction_id) ?? a.interaction_id : a.interaction_id,
      created_at: now,
      updated_at: now,
      reference_asset_ids: a.reference_asset_ids?.map((r) => assetMap.get(r) ?? r),
      parent_asset_id: a.parent_asset_id ? assetMap.get(a.parent_asset_id) ?? a.parent_asset_id : undefined,
    });
  }
  return newThreadId;
}

/**
 * SAVE AS TEMPLATE — Project → Recipe (Prompt). Extracts the project's freshest recipe text (the latest
 * generated asset's prompt, else the latest interaction's prompt) into a NAMED, reusable Prompt with its
 * [SLOT] variables detected. `source_thread_id` records the origin. Returns the new prompt id, or null
 * if the project has no recipe text to extract.
 */
export async function saveThreadAsRecipe(
  repo: Repository,
  userId: string,
  threadId: string,
  now: number,
): Promise<string | null> {
  const src = (await repo.get('thread', threadId)) as Thread | null;
  if (!src) return null;

  let text = '';
  const { items: assets } = await repo.query({
    category: 'asset',
    user_id: userId,
    filter: { thread_id: threadId, status: 'active' },
  });
  const withPrompt = (assets as Asset[])
    .filter((a) => typeof a.prompt === 'string' && a.prompt.trim())
    .sort((a, b) => b.created_at - a.created_at);
  if (withPrompt[0]?.prompt) text = withPrompt[0].prompt;
  if (!text) {
    const { items: inters } = await repo.query({
      category: 'interaction',
      user_id: userId,
      filter: { thread_id: threadId, status: 'active' },
    });
    text = (inters as Interaction[]).sort((a, b) => b.created_at - a.created_at)[0]?.prompt?.text ?? '';
  }
  if (!text.trim()) return null;

  const promptId = newId('prompt');
  await repo.put<Prompt>({
    id: promptId,
    user_id: userId,
    category: 'prompt',
    status: 'active',
    created_at: now,
    updated_at: now,
    name: `${(src.title ?? 'Untitled').slice(0, 60)} recipe`,
    text,
    source_thread_id: threadId,
    variables: extractVariables(text),
  });
  return promptId;
}

/**
 * OPEN AS PROJECT — Asset → Project (the verb that matters, §2). Creates a NEW draft project seeded from
 * the asset that rehydrates THE RECIPE and THE REFERENCES, not just the pixels: it copies the asset's
 * originating interaction (its builder `a2ui` + prompt) and the reference assets that produced it into
 * the new project, so `loadThread` reconstructs the builder + the attached references. `seeded_from`
 * points at the asset. Born a draft (it renders its own asset later). Returns the new thread id.
 */
export async function openAssetAsProject(
  repo: Repository,
  userId: string,
  assetId: string,
  now: number,
): Promise<string | null> {
  const asset = (await repo.get('asset', assetId)) as Asset | null;
  if (!asset) return null;
  const newThreadId = newId('thread');
  const newInteractionId = newId('interaction');

  const origin = asset.interaction_id
    ? ((await repo.get('interaction', asset.interaction_id)) as Interaction | null)
    : null;

  await repo.put<Thread>({
    id: newThreadId,
    user_id: userId,
    category: 'thread',
    status: 'active',
    created_at: now,
    updated_at: now,
    title: asset.title?.trim() || asset.prompt?.slice(0, 40) || 'From asset',
    seeded_from: { kind: 'asset', id: assetId },
    ...draftBirthFields(now),
  });

  // Seed interaction — carries the RECIPE (prompt + builder a2ui) faithfully from the origin.
  await repo.put<Interaction>({
    id: newInteractionId,
    user_id: userId,
    category: 'interaction',
    status: 'active',
    created_at: now,
    updated_at: now,
    thread_id: newThreadId,
    model: origin?.model ?? asset.model ?? '',
    prompt: { text: origin?.prompt?.text ?? asset.prompt ?? '' },
    response: origin?.response
      ? { ...origin.response, text: '', tokens_used: 0 }
      : { text: '', tokens_used: 0, a2ui: null, a2ui_version: '' },
  });

  // Rehydrate the REFERENCES — copy the asset's reference assets in as upload assets on the seed
  // interaction (loadThread maps upload assets → the turn's userImages / attached refs).
  const refIds = asset.reference_asset_ids ?? [];
  for (let i = 0; i < refIds.length; i++) {
    const ref = (await repo.get('asset', refIds[i])) as Asset | null;
    if (!ref) continue;
    await repo.put<Asset>({
      id: newId('asset'),
      user_id: userId,
      category: 'asset',
      status: 'active',
      created_at: now,
      updated_at: now,
      kind: 'image',
      source: 'upload',
      retention: 'ephemeral',
      thread_id: newThreadId,
      interaction_id: newInteractionId,
      url: ref.url,
      index: i,
    });
  }
  return newThreadId;
}
