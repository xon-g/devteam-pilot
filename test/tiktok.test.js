import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import { SHARE_TARGETS, shareLinks } from '../src/share.js';
import { eventPath } from '../src/analytics.js';
import { STRINGS, LANGS } from '../src/i18n.js';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('SHARE_TARGETS order includes tiktok after x', () => {
  assert.deepStrictEqual(SHARE_TARGETS, ['fb', 'msgr', 'viber', 'wa', 'tg', 'x', 'tiktok', 'copy']);
});

test('shareLinks has no tiktok entry', () => {
  const links = shareLinks('t', 'https://example.com/');
  assert.ok(!links.some((l) => l.id === 'tiktok'));
});

test('analytics accepts tiktok via', () => {
  assert.strictEqual(eventPath('share-done', { via: 'tiktok' }), 'share-done/tiktok');
});

test('tiktok icon path inlined verbatim', () => {
  const d = read('assets/icons/brands/tiktok.svg').match(/<path d="([^"]+)"/)[1];
  assert.ok(read('index.html').includes(`d="${d}"`));
});

test('every language has the tiktok strings', () => {
  for (const l of LANGS) {
    assert.ok(STRINGS[l].statusTiktokShared, l);
    assert.ok(STRINGS[l].statusTiktokSaved, l);
  }
});
