/**
 * DB INSPECT — a dev script to SEE the persisted chat data. ZERO API/model calls: pure DB writes.
 *
 * Opens the SQLite dev DB, and if the store is EMPTY seeds one authentic demo set (thread +
 * interaction with a filled response incl. a2ui/a2ui_version + a usage row + the user record)
 * using the real models/usage helpers so the shapes match production. Then prints the resolved
 * `.db` path and the full store as pretty JSON grouped by category.
 *
 * Idempotent: running it twice does NOT re-seed (it only seeds when the store is empty). Safe to
 * run repeatedly. Run via `npm run db:inspect`.
 */

import { createSqliteRepository } from './adapters/sqlite';
import {
  A2UI_VERSION,
  type Interaction,
  type RecordCategory,
  type Thread,
} from './models';
import type { Repository } from './repository';
import { recordUsage } from './usage';

const DEMO_USER = 'dev-user';

/** The Slice-1 stub A2UI block (mirrors the chat-turn route) — an authentic stored snapshot. */
const DEMO_A2UI = {
  kind: 'options',
  title: 'How do you want to make it?',
  options: [
    { id: 'pixcel', label: 'Use Pixcel Studio' },
    { id: 'image', label: 'Use Image Model' },
    { id: 'both', label: 'Both' },
    { id: 'guidance', label: 'More guidance' },
  ],
};

/** Seed one authentic demo interaction + its usage + user record. Only called when empty. */
async function seedDemo(repo: Repository): Promise<void> {
  const now = Date.now();

  const thread: Thread = {
    id: 'thread-demo',
    user_id: DEMO_USER,
    category: 'thread',
    status: 'active',
    created_at: now,
    updated_at: now,
    title: 'Make a pixel-art dragon',
  };
  await repo.put(thread);

  const interaction: Interaction = {
    id: 'interaction-demo',
    user_id: DEMO_USER,
    category: 'interaction',
    status: 'active',
    created_at: now,
    updated_at: now,
    thread_id: thread.id,
    model: 'claude-opus-4-8',
    // INPUT tokens attributed to the prompt; OUTPUT tokens to the response (they sum to 1234).
    prompt: { text: 'Make a pixel-art dragon', tokens: 834 },
    response: {
      text: 'Great — a dragon works well as pixel art. How do you want to make it?',
      tokens_used: 400,
      a2ui: DEMO_A2UI,
      a2ui_version: A2UI_VERSION,
    },
  };
  await repo.put(interaction);

  // Real metering helper: writes a Usage row AND creates/increments the user record.
  await recordUsage(repo, {
    user_id: DEMO_USER,
    interaction_id: interaction.id,
    input_tokens: 834,
    output_tokens: 400,
  });
}

/** Read the whole store back and group records by category for a readable dump. */
async function dumpByCategory(repo: Repository): Promise<Record<string, unknown[]>> {
  const categories: RecordCategory[] = ['thread', 'interaction', 'prompt', 'usage', 'user'];
  const grouped: Record<string, unknown[]> = {};
  for (const category of categories) {
    // Query is scoped by user_id; the demo data all belongs to DEMO_USER.
    const { items } = await repo.query({ category, user_id: DEMO_USER });
    if (items.length) grouped[category] = items;
  }
  return grouped;
}

async function main(): Promise<void> {
  const repo = createSqliteRepository();
  const filePath = repo.getPath();

  // Idempotent seed: only when the store has no data for the demo user (any category).
  const before = await dumpByCategory(repo);
  const isEmpty = Object.keys(before).length === 0;
  if (isEmpty) {
    await seedDemo(repo);
    console.log('[db:inspect] store was empty → seeded demo data.');
  } else {
    console.log('[db:inspect] store already has data → NOT re-seeding (idempotent).');
  }

  const grouped = await dumpByCategory(repo);

  console.log(`\nDev DB (.db) path: ${filePath}\n`);
  console.log(JSON.stringify(grouped, null, 2));
}

main().catch((err) => {
  console.error('[db:inspect] failed:', err);
  process.exit(1);
});
