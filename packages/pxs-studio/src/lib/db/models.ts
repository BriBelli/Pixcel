/**
 * DB MODELS — the record shapes + constants for the chat data layer (PR-3).
 *
 * ONE logical table per entity, discriminated by a `category` attribute (Decision 1):
 * Thread / Interaction / Prompt / Usage / UserRecord all extend {@link BaseRecord}.
 * Every record carries `user_id` (the Auth0 subject; dev default `'dev-user'`).
 *
 * These are PURE types + constants — no React, no Next, no DOM — so the whole db/
 * layer runs under `node:test`. The server route imports them at the nodejs runtime.
 */

/**
 * Lifecycle status. Only `active` records are user-visible; the rest are audit/terminal.
 *
 * `inactive` is the output of the per-interaction edit/delete CASCADE — downstream turns are
 * superseded (programmatically) when a turn is edited or deleted. `archived` is RESERVED: an
 * explicit, thread/project-level cold-storage concept for a future two-tier active-DB / archive-DB
 * (partitioned by last-viewed) — NOT the per-interaction cascade. Defined now, unused for it.
 */
export type RecordStatus =
  | 'active'
  | 'pending'
  | 'edited'
  | 'deleted'
  | 'inactive'
  /** RESERVED — explicit thread/project cold-storage (future two-tier DB); NOT the cascade. */
  | 'archived'
  | 'failed'
  | 'cancelled';

/** The entity discriminator on every record. */
export type RecordCategory = 'thread' | 'interaction' | 'prompt' | 'usage' | 'user';

/** Fields carried by EVERY record, regardless of category. Timestamps are ms epoch. */
export interface BaseRecord {
  id: string;
  /** Auth0 subject. Dev default: `'dev-user'`. */
  user_id: string;
  category: RecordCategory;
  status: RecordStatus;
  created_at: number;
  updated_at: number;
}

/** A conversation thread. `context` is the living-context memory/summary (Decision 6-adjacent). */
export interface Thread extends BaseRecord {
  category: 'thread';
  title: string;
  context?: string;
}

/** One user↔assistant exchange within a thread. */
export interface Interaction extends BaseRecord {
  category: 'interaction';
  thread_id: string;
  model: string;
  prompt: {
    text: string;
    attachments?: string[];
    /** INPUT tokens this turn's prompt consumed. Pairs with `response.tokens_used` (output). */
    tokens?: number;
  };
  response: {
    text: string;
    /** OUTPUT tokens the model generated (NOT input — the prompt's input lives on `prompt.tokens`). */
    tokens_used: number;
    a2ui: unknown | null;
    /** Stamped from {@link A2UI_VERSION} on every stored a2ui snapshot (Decision 4). */
    a2ui_version: string;
  };
  /** The Prompt entity this interaction was launched from (recipe-IP; Decision 2). */
  source_prompt_id?: string;
  /** Set on an edit-replacement interaction → the interaction it superseded (Decision 6). */
  parent_interaction_id?: string;
}

/** A first-class, reusable prompt (recipe-IP; Decision 2). */
export interface Prompt extends BaseRecord {
  category: 'prompt';
  text: string;
  tags?: string[];
  /** The prompt's own token size — a recipe-IP metric ("quality > tokens, trim only fat"). */
  tokens?: number;
}

/** Per-interaction metering row: tokens + cost (Decision 3). */
export interface Usage extends BaseRecord {
  category: 'usage';
  interaction_id: string;
  input_tokens: number;
  output_tokens: number;
  /** Non-token external spend for this interaction (image/video generation cost, USD). */
  gen_cost_usd: number;
  /** Total cost = token cost + gen_cost_usd. */
  cost_usd: number;
}

/** The per-user record holding the running spend totals + the hard cap (Decision 3). */
export interface UserRecord extends BaseRecord {
  category: 'user';
  running_input_tokens: number;
  running_output_tokens: number;
  running_cost_usd: number;
  hard_cap_usd: number;
}

/** Union of every stored record shape. */
export type AnyRecord = Thread | Interaction | Prompt | Usage | UserRecord;

/** Stamped on every stored a2ui snapshot so the renderer can version-gate (Decision 4). */
export const A2UI_VERSION = 'a2ui-v1';

/**
 * Opus 4.8 pricing (USD per token). Source of truth for cost math.
 * Input $5 / 1M tokens, output $25 / 1M tokens.
 */
export const INPUT_USD_PER_TOKEN = 5 / 1_000_000;
export const OUTPUT_USD_PER_TOKEN = 25 / 1_000_000;

/** Dev default user id when no Auth0 subject is present. */
export const DEV_USER_ID = 'dev-user';
