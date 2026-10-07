import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import { shareUrl, shareLinks, isMobileUA, copyText, SHARE_TARGETS } from '../src/share.js';
import { SITE_URL } from '../src/config.js';
import { eventPath } from '../src/analytics.js';
import { shareText } from '../src/lucky.js';
import { GAMES, drawNumbers } from '../src/games.js';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const TEXT = 'Swertres lucky numbers ni A & B: 1-2-3 🍀 For entertainment only. 18+.';

test('shareUrl sets exactly one ref', () => {
  assert.strictEqual(shareUrl('https://lotto.xonicbox.com/', 'fb'), 'https://lotto.xonicbox.com/?ref=fb');
  const u = shareUrl('https://lotto.xonicbox.com/?a=1#x', 'wa');
  assert.strictEqual(u, 'https://lotto.xonicbox.com/?ref=wa');
  assert.strictEqual(u.split('ref=').length, 2);
});

test('shareLinks encode text and url', () => {
  const links = shareLinks(TEXT, SITE_URL);
  assert.deepStrictEqual(links.map((l) => l.id), ['fb', 'msgr', 'viber', 'wa', 'tg', 'x']);
  const starts = {
    fb: 'https://www.facebook.com/sharer/sharer.php?',
    msgr: 'fb-messenger://share/?link=',
    viber: 'viber://forward?text=',
    wa: 'https://wa.me/?',
    tg: 'https://t.me/share/url?',
    x: 'https://twitter.com/intent/tweet?',
  };
  for (const l of links) {
    assert.ok(l.href.startsWith(starts[l.id]), l.id);
    assert.ok(!/[ 🍀]/u.test(l.href), `raw char in ${l.id}`);
    assert.ok(l.href.includes(encodeURIComponent(`?ref=${l.id}`)), `ref ${l.id}`);
    const own = shareUrl(SITE_URL, l.id);
    if (l.href.startsWith('https:')) {
      const sp = new URL(l.href).searchParams;
      if (l.id === 'fb') assert.strictEqual(sp.get('u'), own);
      if (l.id === 'wa') assert.strictEqual(sp.get('text'), `${TEXT} ${own}`);
      if (l.id === 'tg') { assert.strictEqual(sp.get('url'), own); assert.strictEqual(sp.get('text'), TEXT); }
      if (l.id === 'x') { assert.strictEqual(sp.get('url'), own); assert.strictEqual(sp.get('text'), TEXT); }
    }
  }
  const by = Object.fromEntries(links.map((l) => [l.id, l.href]));
  assert.strictEqual(decodeURIComponent(by.viber.split('text=')[1]), `${TEXT} ${shareUrl(SITE_URL, 'viber')}`);
  assert.strictEqual(decodeURIComponent(by.msgr.split('link=')[1]), shareUrl(SITE_URL, 'msgr'));
});

test('isMobileUA', () => {
  for (const ua of [
    'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 [FBAN/FBIOS;FBAV/440.0]',
  ]) assert.strictEqual(isMobileUA(ua), true);
  for (const ua of [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15',
    '', undefined,
  ]) assert.strictEqual(isMobileUA(ua), false);
});

test('copyText ends with ?ref=copy', () => {
  assert.ok(copyText(TEXT, SITE_URL).endsWith('?ref=copy'));
});

test('eventPath share-done vias', () => {
  for (const via of [...SHARE_TARGETS, 'native', 'img']) assert.strictEqual(eventPath('share-done', { via }), `share-done/${via}`);
  assert.strictEqual(eventPath('share-done', { via: 'evil' }), 'share-done/other');
});

test('shareText has no claim words and keeps 18+', () => {
  for (const g of GAMES) {
    for (const mode of ['straight', 'rambolito']) {
      const t = shareText(drawNumbers(g), mode, 'Ana', g.id);
      assert.ok(!/winning|panalo|prediction|guaranteed|sure win/i.test(t), t);
      assert.ok(t.includes('18+'));
    }
  }
});

test('share.js is DOM-free; sw.js updated', () => {
  const src = read('src/share.js');
  for (const w of ['fetch(', 'window', 'document', 'navigator']) assert.ok(!src.includes(w), w);
  const sw = read('sw.js');
  assert.ok(sw.includes('swertres-v42'));
  assert.ok(sw.includes('"src/share.js"'));
});
