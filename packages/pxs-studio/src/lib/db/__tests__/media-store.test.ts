/**
 * The media store — the answer to creations that evaporate.
 *
 * Brian's FLUX renders were HTTP 404 three days after he paid for them, because the asset row held
 * a Replicate CDN link rather than the picture. Saving did not help: the save path copied the same
 * link. Durability was an accident of which vendor served the render — OpenAI and Gemini hand back
 * bytes, Replicate and fal hand back a url with a clock on it.
 *
 * Pure: a temp directory, no network except the one failure case (an unroutable host).
 */

import assert from 'node:assert/strict';
import test, { before } from 'node:test';
import { mkdtempSync } from 'node:fs';
import { rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// The store resolves its directory at module load, so the env var must be set BEFORE it is imported
// — hence a synchronous temp dir here and a dynamic import in `before`.
const DIR = mkdtempSync(join(tmpdir(), 'pxs-media-'));
process.env.PXS_MEDIA_DIR = DIR;

type Store = typeof import('../media-store');
let putMedia: Store['putMedia'];
let readMedia: Store['readMedia'];
let ingestMedia: Store['ingestMedia'];
let isStoredMedia: Store['isStoredMedia'];
let MEDIA_URL_PREFIX: Store['MEDIA_URL_PREFIX'];

before(async () => {
  ({ putMedia, readMedia, ingestMedia, isStoredMedia, MEDIA_URL_PREFIX } = await import('../media-store'));
});

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const b64 = (b: Uint8Array) => Buffer.from(b).toString('base64');

test.after(async () => {
  await rm(DIR, { recursive: true, force: true });
});

test('bytes stored can be read back exactly', async () => {
  const id = await putMedia(PNG, 'image/png');
  const back = await readMedia(id);
  assert.ok(back, 'stored media must be readable');
  assert.deepEqual(new Uint8Array(back!.bytes), PNG, 'the bytes are the creation — they must survive verbatim');
  assert.equal(back!.contentType, 'image/png', 'the type travels with the bytes');
  assert.match(id, /\.png$/, 'the extension follows the content type');
});

test('content-addressed: the same creation stored twice costs one file', async () => {
  const before = (await readdir(DIR)).length;
  const a = await putMedia(PNG, 'image/png');
  const b = await putMedia(PNG, 'image/png');
  assert.equal(a, b, 'identical bytes must produce the same id');
  assert.equal((await readdir(DIR)).length, before, 'and must not write a second file');
});

test('an expiring provider LINK becomes a url we own', async () => {
  // The exact failure: a data url stands in for a reachable provider response.
  const provider = `data:image/png;base64,${b64(PNG)}`;
  const out = await ingestMedia(provider);
  assert.ok(out.stored, 'ingest must take ownership');
  assert.ok(out.url.startsWith(MEDIA_URL_PREFIX), 'the asset row must point at Pixcel, not the vendor');
  assert.ok(isStoredMedia(out.url));
  const id = out.url.slice(MEDIA_URL_PREFIX.length);
  assert.deepEqual(new Uint8Array((await readMedia(id))!.bytes), PNG, 'and the bytes must really be here');
});

test('inline base64 is moved OUT of the row it used to bloat', async () => {
  const out = await ingestMedia(`data:image/png;base64,${b64(PNG)}`);
  assert.ok(out.stored);
  assert.equal(out.bytes, PNG.byteLength, 'the size is reported so a caller can meter it');
  assert.ok(!out.url.startsWith('data:'), 'the row now holds a short url, not megabytes of base64');
});

test('ingesting something we already own is a no-op, not a round trip', async () => {
  const first = await ingestMedia(`data:image/png;base64,${b64(PNG)}`);
  const again = await ingestMedia(first.url);
  assert.equal(again.url, first.url, 'an owned url passes straight through unchanged');
  assert.ok(again.stored);
});

test('a failed ingest NEVER throws and never loses the reference', async () => {
  // An unroutable host — the asset must still be recorded, with the original url intact.
  const original = 'https://pxs-nonexistent.invalid/clip.mp4';
  const out = await ingestMedia(original);
  assert.equal(out.stored, false, 'failure is reported honestly');
  assert.equal(out.url, original, 'the provider url is kept — a link that works today beats no asset');
  assert.ok(out.reason && out.reason.length > 0, 'and the caller is told why, so it can warn');
});

test('empty and malformed inputs are refused rather than stored', async () => {
  await assert.rejects(() => putMedia(new Uint8Array(), 'image/png'), /empty/);
  const bad = await ingestMedia('');
  assert.equal(bad.stored, false);
  const scheme = await ingestMedia('ftp://example.com/x.png');
  assert.equal(scheme.stored, false, 'only data: and http(s) are ingestable');
});

test('a hostile id cannot walk out of the media directory', async () => {
  for (const id of ['../../../etc/passwd', '..%2Fsecret', 'abc', 'x'.repeat(40) + '.png/../../x']) {
    assert.equal(await readMedia(id), null, `${id} must not resolve`);
  }
});
