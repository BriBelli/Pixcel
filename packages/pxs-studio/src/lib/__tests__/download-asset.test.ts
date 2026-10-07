/**
 * Getting your work out.
 *
 * The studio could generate images and video and offered no way to save any of it — the only
 * download buttons in the whole app were in the legacy pixel-art tabs. For a tool whose output IS
 * the product, that is not a missing nicety; it is the last step of the job, missing.
 *
 * The part worth testing is the FILENAME. "download.mp4" in a Downloads folder tells you nothing
 * three weeks later, which for a tool that produces dozens of near-identical takes is the difference
 * between an archive and a pile.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import { suggestFilename } from '../download-asset';

test('a title the user chose wins — it is what they would recognise', () => {
  const name = suggestFilename({ url: '/api/media/abc.mp4', kind: 'video', title: 'Lamborghini launch', prompt: 'something else' });
  assert.match(name, /^lamborghini-launch-\d{4}-\d{2}-\d{2}\.mp4$/);
});

test('no title → the opening words of the prompt, which is how you remember a render', () => {
  const name = suggestFilename({
    url: '/api/media/abc.png',
    kind: 'image',
    prompt: 'A black Lamborghini sits dead still on a wet neon street at night, rain beading',
  });
  assert.match(name, /^a-black-lamborghini-sits-dead-/);
  assert.match(name, /\.png$/);
  // Truncated: a filename built from a 200-word prompt is unusable.
  assert.ok(name.length < 70, `too long: ${name}`);
});

test('nothing to name it after still produces a usable file', () => {
  assert.match(suggestFilename({ url: '/api/media/abc.mp4', kind: 'video' }), /^pixcel-\d{4}-\d{2}-\d{2}\.mp4$/);
});

test('the extension follows the actual file, not the hope', () => {
  assert.match(suggestFilename({ url: '/api/media/x.webp', title: 'a' }), /\.webp$/);
  assert.match(suggestFilename({ url: 'https://p.test/y.mp4?token=abc', title: 'a' }), /\.mp4$/, 'a query string must not become the extension');
  assert.match(suggestFilename({ url: 'data:image/png;base64,AAAA', title: 'a' }), /\.png$/);
  assert.match(suggestFilename({ url: 'https://p.test/no-extension', kind: 'video', title: 'a' }), /\.mp4$/, 'falls back to the kind');
});

test('punctuation and spacing never reach the filesystem', () => {
  const name = suggestFilename({ url: '/api/media/a.png', title: 'Cowboy / "hero" shot: take #3!' });
  assert.ok(!/[/"#:!]/.test(name), `unsafe characters survived: ${name}`);
  assert.ok(!name.startsWith('-') && !name.includes('--'), `messy slug: ${name}`);
});

test('a title of pure punctuation still yields a name, not an empty one', () => {
  const name = suggestFilename({ url: '/api/media/a.png', title: '!!! ???' });
  assert.match(name, /^pixcel-/, 'a slug that reduces to nothing falls back rather than producing ".png"');
});
