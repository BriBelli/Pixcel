/**
 * USAGE — metering + the hard-cap gate (Decision 3).
 *
 * `recordUsage` writes a per-interaction Usage row AND increments the running totals on the
 * user record (creating it lazily). `checkCap` is the spend gate: allowed while spent < cap.
 * Cost math uses the Opus 4.8 pricing constants from models.ts.
 *
 * Pure TS — no React/Next/DOM — so it runs under `node:test`.
 */

import {
  INPUT_USD_PER_TOKEN,
  OUTPUT_USD_PER_TOKEN,
  type Usage,
  type UserRecord,
} from './models';
import type { Repository } from './repository';

/** Default hard spend cap, USD, when a user record is created. */
export const DEFAULT_HARD_CAP_USD = 5;

/** Opus 4.8 cost for a given token split, USD. */
export function costUsd(input_tokens: number, output_tokens: number): number {
  return input_tokens * INPUT_USD_PER_TOKEN + output_tokens * OUTPUT_USD_PER_TOKEN;
}

function newId(prefix: string): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Fetch the user record, creating it (with the default cap) if missing. */
async function ensureUserRecord(repo: Repository, user_id: string): Promise<UserRecord> {
  const existing = (await repo.get('user', user_id)) as UserRecord | null;
  if (existing) return existing;
  const now = Date.now();
  const record: UserRecord = {
    id: user_id,
    user_id,
    category: 'user',
    status: 'active',
    created_at: now,
    updated_at: now,
    running_input_tokens: 0,
    running_output_tokens: 0,
    running_cost_usd: 0,
    hard_cap_usd: DEFAULT_HARD_CAP_USD,
  };
  return repo.put(record);
}

/**
 * Write a Usage row for an interaction and increment the user's running totals.
 * Creates the user record if it doesn't exist yet.
 */
export async function recordUsage(
  repo: Repository,
  args: {
    user_id: string;
    interaction_id: string;
    input_tokens: number;
    output_tokens: number;
  }
): Promise<Usage> {
  const { user_id, interaction_id, input_tokens, output_tokens } = args;
  const cost_usd = costUsd(input_tokens, output_tokens);
  const now = Date.now();

  const usage: Usage = {
    id: newId('usage'),
    user_id,
    category: 'usage',
    status: 'active',
    created_at: now,
    updated_at: now,
    interaction_id,
    input_tokens,
    output_tokens,
    cost_usd,
  };
  await repo.put(usage);

  const user = await ensureUserRecord(repo, user_id);
  await repo.update('user', user.id, {
    running_input_tokens: user.running_input_tokens + input_tokens,
    running_output_tokens: user.running_output_tokens + output_tokens,
    running_cost_usd: user.running_cost_usd + cost_usd,
  } as Partial<UserRecord>);

  return usage;
}

/** The spend gate: allowed while running spend is strictly below the hard cap. */
export async function checkCap(
  repo: Repository,
  user_id: string
): Promise<{ allowed: boolean; spent_usd: number; cap_usd: number; remaining_usd: number }> {
  const user = (await repo.get('user', user_id)) as UserRecord | null;
  const spent_usd = user?.running_cost_usd ?? 0;
  const cap_usd = user?.hard_cap_usd ?? DEFAULT_HARD_CAP_USD;
  return {
    allowed: spent_usd < cap_usd,
    spent_usd,
    cap_usd,
    remaining_usd: Math.max(0, cap_usd - spent_usd),
  };
}
