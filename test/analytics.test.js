import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import { eventPath, track } from '../src/analytics.js';

test('eventPath draw', () => {
  assert.strictEqual(eventPath('draw', { game: '3d', mood: 'chill', mode: 'straight' }), 'draw/3d/chill/straight');
  assert.strictEqual(eventPath('draw', { game: '6-42', mood: 'ewan', mode: 'rambolito' }), 'draw/6-42/ewan/rambolito');
  assert.strictEqual(eventPath('draw', { game: 'x', mood: 'y', mode: 'z' }), 'draw/other/other/other');
  assert.strictEqual(eventPath('draw', { game: '3d', mood: 'Juanita', mode: 'straight' }), 'draw/3d/other/straight');
  assert.strictEqual(eventPath('draw'), 'draw/other/other/other');
});

test('eventPath other kinds', () => {
  assert.strictEqual(eventPath('share-tap'), 'share-tap');
  assert.strictEqual(eventPath('share-done', { via: 'native' }), 'share-done/native');
  assert.strictEqual(eventPath('share-done', { via: 'copy' }), 'share-done/copy');
  assert.strictEqual(eventPath('share-done', { via: 'Juanita' }), 'share-done/other');
  assert.strictEqual(eventPath('pwa-install'), 'pwa-install');
  assert.strictEqual(eventPath('nope'), null);
});

test('track is safe', () => {
  assert.doesNotThrow(() => track(undefined, 'a'));
  assert.doesNotThrow(() => track({}, 'a'));
  assert.doesNotThrow(() => track({ count() { throw new Error('x'); } }, 'a'));
  const calls = [];
  track({ count: (o) => calls.push(o) }, 'share-tap');
  track({ count: (o) => calls.push(o) }, null);
  assert.deepStrictEqual(calls, [{ path: 'share-tap', title: 'share-tap', event: true }]);
});

test('index.html GoatCounter tag and privacy note', () => {
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const tag = '<script data-goatcounter="https://lottoluckynumbersph.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script>';
  assert.strictEqual(html.split(tag).length - 1, 1);
  assert.strictEqual(html.split('gc.zgo.at').length - 1, 1);
  assert.ok(!/[^:]\/\/gc\.zgo\.at/.test(html));
  const head = html.slice(html.indexOf('<head>'), html.indexOf('</head>'));
  assert.ok(head.includes(tag));
  assert.ok(head.indexOf(tag) > head.indexOf('location.replace'));
  const note = html.match(/<p id="privacy-note"[^>]*>([\s\S]*?)<\/p>/);
  assert.ok(note);
  assert.ok(note[1].includes('GoatCounter') && note[1].includes('walang cookies'));
  assert.ok(html.includes('id="not-affiliated"'));
});

test('sw.js cache bumped, no gc caching', () => {
  const sw = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.ok(sw.includes('"swertres-v40"'));
  assert.ok(!sw.includes('zgo.at'));
});
