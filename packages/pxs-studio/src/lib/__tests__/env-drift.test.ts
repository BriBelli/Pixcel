/**
 * Env drift — telling a STALE key from a WRONG one.
 *
 * Brian rotated his API keys while the dev server had been running for four days. Next reads
 * .env.local once at boot, so every render answered "invalid key credentials" while the very same
 * key worked when called directly. Three days went to that, because from inside the process the two
 * cases are identical: the provider rejects you either way. From outside, you read the file.
 *
 * Pure: temp files, no network.
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { authFailureHint, detectEnvDrift } from '../env-drift';

const DIR = mkdtempSync(join(tmpdir(), 'pxs-env-'));
function envFile(contents: string, name = '.env.local'): string {
  const p = join(DIR, name);
  writeFileSync(p, contents);
  return p;
}

test('a key rotated on disk after boot is reported as CHANGED', () => {
  const p = envFile('FAL_API_KEY=new-value-after-rotation\n');
  const drift = detectEnvDrift(p, { FAL_API_KEY: 'old-value-loaded-at-boot' });
  assert.deepEqual(drift.changed, ['FAL_API_KEY']);
  assert.deepEqual(drift.added, []);
});

test('matching values are NOT drift — the common case must stay silent', () => {
  const p = envFile('FAL_API_KEY=same\nOPENAI_API_KEY=same-too\n');
  const drift = detectEnvDrift(p, { FAL_API_KEY: 'same', OPENAI_API_KEY: 'same-too' });
  assert.deepEqual(drift.changed, []);
  assert.deepEqual(drift.added, []);
});

test('a key added to the file since boot is reported as ADDED', () => {
  const p = envFile('FAL_API_KEY=abc\nNEW_PROVIDER_KEY=xyz\n');
  const drift = detectEnvDrift(p, { FAL_API_KEY: 'abc' });
  assert.deepEqual(drift.added, ['NEW_PROVIDER_KEY']);
});

test('only credential-shaped names are compared', () => {
  // A toggled feature flag must never produce a "your key changed" scare.
  const p = envFile('SOME_FLAG=true\nFAL_API_KEY=abc\n');
  const drift = detectEnvDrift(p, { SOME_FLAG: 'false', FAL_API_KEY: 'abc' });
  assert.deepEqual(drift.changed, [], 'SOME_FLAG is not a credential');
});

test('the file format is parsed the way dotenv writes it', () => {
  const p = envFile('# a comment\n\nexport FAL_API_KEY="quoted-value"\nOPENAI_API_KEY=\'single\'\n');
  const drift = detectEnvDrift(p, { FAL_API_KEY: 'quoted-value', OPENAI_API_KEY: 'single' });
  assert.deepEqual(drift.changed, [], 'quotes and `export` are stripped before comparing');
});

test('a missing .env.local is unknown, never a false alarm', () => {
  const drift = detectEnvDrift(join(DIR, 'nope.env'), { FAL_API_KEY: 'abc' });
  assert.equal(drift.unreadable, true);
  assert.deepEqual(drift.changed, []);
  assert.equal(authFailureHint('FAL_API_KEY', drift), undefined, 'unknown must not produce a hint');
});

// ── THE HINT ─────────────────────────────────────────────────────────────────────────────────────

test('the hint names the key and says what to DO about it', () => {
  const p = envFile('FAL_API_KEY=rotated\n');
  const hint = authFailureHint('FAL_API_KEY', detectEnvDrift(p, { FAL_API_KEY: 'stale' }));
  assert.ok(hint, 'a drifted key must produce a hint');
  assert.match(hint!, /FAL_API_KEY/);
  assert.match(hint!, /Restart/i, 'naming the cause without the fix is half an answer');
});

test("a render's failure is not explained by an UNRELATED key's rotation", () => {
  const p = envFile('OPENAI_API_KEY=rotated\nFAL_API_KEY=same\n');
  const drift = detectEnvDrift(p, { OPENAI_API_KEY: 'stale', FAL_API_KEY: 'same' });
  assert.equal(
    authFailureHint('FAL_API_KEY', drift),
    undefined,
    'a fal failure must not be blamed on a rotated OpenAI key',
  );
  assert.ok(authFailureHint('OPENAI_API_KEY', drift), 'but the key that DID rotate is still reported');
});

test('no drift → no hint, so a genuinely wrong key is not misdiagnosed as stale', () => {
  const p = envFile('FAL_API_KEY=abc\n');
  assert.equal(authFailureHint('FAL_API_KEY', detectEnvDrift(p, { FAL_API_KEY: 'abc' })), undefined);
});

test('the diagnostic never exposes a secret', () => {
  const p = envFile('FAL_API_KEY=super-secret-live-value\n');
  const drift = detectEnvDrift(p, { FAL_API_KEY: 'other-secret-value' });
  const blob = JSON.stringify(drift) + (authFailureHint('FAL_API_KEY', drift) ?? '');
  assert.ok(!blob.includes('super-secret-live-value'), 'the on-disk value must never appear');
  assert.ok(!blob.includes('other-secret-value'), 'nor the loaded one');
});
