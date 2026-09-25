/**
 * ENV DRIFT — "your key changed on disk; the server is still using the old one."
 *
 * Next reads .env.local ONCE at boot. Brian rotates his API keys periodically, and on 2026-09-19 he
 * rotated them while the dev server had been running since the 15th. Every render answered "invalid
 * key credentials" while the same key worked perfectly when called directly, and it cost three days
 * and a full diagnosis to find that the process simply held a stale copy. Nothing in the app could
 * tell "this key is wrong" from "this key is stale", because from inside the process they are
 * identical — the provider rejects you either way.
 *
 * From outside the process they are trivially distinguishable: read the file, compare. That is all
 * this does, and it costs nothing, so it runs at the moment an auth failure happens rather than on a
 * timer.
 *
 * NEVER TOUCHES VALUES. It compares digests and reports only key NAMES. A diagnostic that prints
 * secrets is a worse bug than the one it diagnoses.
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Short digest — enough to tell "same" from "different", useless to anyone who sees it. */
function digest(v: string): string {
  return createHash('sha256').update(v).digest('hex').slice(0, 12);
}

export interface EnvDrift {
  /** Keys whose on-disk value differs from the one this process loaded — a restart fixes these. */
  changed: string[];
  /** Keys present on disk but absent from this process — added since boot. */
  added: string[];
  /** True when the file could not be read (no .env.local, permissions). Not an error — just unknown. */
  unreadable: boolean;
}

/** Parse a dotenv file into key → value. Tolerant: blank lines, comments, `export `, quotes. */
function parseEnvFile(text: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const body = line.startsWith('export ') ? line.slice(7) : line;
    const eq = body.indexOf('=');
    if (eq <= 0) continue;
    const key = body.slice(0, eq).trim();
    let value = body.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key) out.set(key, value);
  }
  return out;
}

/**
 * Compare the running process's env against .env.local on disk.
 *
 * Only keys that LOOK like credentials are compared, so an unrelated flag toggled in the file never
 * produces a scary "your key changed" notice.
 */
export function detectEnvDrift(
  envPath = join(process.cwd(), '.env.local'),
  env: NodeJS.ProcessEnv = process.env,
): EnvDrift {
  let text: string;
  try {
    text = readFileSync(envPath, 'utf8');
  } catch {
    return { changed: [], added: [], unreadable: true };
  }

  const onDisk = parseEnvFile(text);
  const changed: string[] = [];
  const added: string[] = [];

  for (const [key, fileValue] of onDisk) {
    if (!/(_KEY|_TOKEN|_SECRET)$/.test(key)) continue;
    const live = env[key];
    if (live === undefined || live === '') {
      if (fileValue) added.push(key);
      continue;
    }
    if (digest(live) !== digest(fileValue)) changed.push(key);
  }

  return { changed: changed.sort(), added: added.sort(), unreadable: false };
}

/**
 * The sentence to append to an auth failure, or undefined when drift is not the explanation.
 *
 * Scoped to the key that actually failed where one is known: a render that failed on fal should not
 * be explained by a rotated OpenAI key.
 */
export function authFailureHint(envKey?: string, drift: EnvDrift = detectEnvDrift()): string | undefined {
  if (drift.unreadable) return undefined;
  const relevant = envKey
    ? [...drift.changed, ...drift.added].filter((k) => k === envKey)
    : [...drift.changed, ...drift.added];
  if (relevant.length === 0) return undefined;
  const names = relevant.join(', ');
  return (
    `${names} ${relevant.length === 1 ? 'was' : 'were'} changed in .env.local after this server started, ` +
    `so it is still using the old value. Restart the dev server to pick up the new one.`
  );
}
