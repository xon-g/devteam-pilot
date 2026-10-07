import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import { cardContent, cardFileName, fitFontSize, drawCard } from '../src/card.js';
import { getGame } from '../src/games.js';

const BAD = /winning|panalo|prediction|guaranteed|sure win/i;
const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

const cases = [
  { game: getGame('3d'), numbersText: '5-7-5', mode: 'straight', name: 'Ana', drawText: 'ngayong 5:00 PM' },
  { game: getGame('3d'), numbersText: '5-7-5', mode: 'rambolito', name: '', drawText: 'ngayong 5:00 PM' },
  { game: getGame('6-58'), numbersText: '03-11-24-30-41-58', mode: 'straight', name: 'Ben', drawText: 'bukas 9:00 PM' },
  { game: getGame('1-58'), numbersText: '07', mode: 'straight', name: '', drawText: '' },
];

test('cardContent fields', () => {
  for (const c of cases) {
    const x = cardContent(c);
    assert.strictEqual(x.title, 'Lotto Lucky Numbers PH');
    assert.strictEqual(x.game, c.game.name);
    assert.strictEqual(x.forName, c.name ? `Para kay ${c.name}` : '');
    assert.strictEqual(x.numbers, c.numbersText);
    assert.strictEqual(x.draw, c.drawText ? `Next draw: ${c.drawText}` : '');
    assert.ok(x.fun.includes('18+'));
    assert.ok(x.disclaimer.includes('Not affiliated with PCSO'));
    assert.strictEqual(x.url, 'lotto.xonicbox.com');
    for (const v of Object.values(x)) assert.ok(!BAD.test(v), v);
  }
  assert.strictEqual(cardContent(cases[1]).modeLine, '(Rambolito)');
  assert.ok(!cardContent(cases[1]).numbers.includes(','));
  assert.strictEqual(cardContent(cases[0]).modeLine, '');
  assert.strictEqual(cardContent(cases[3]).draw, '');
});

test('cardFileName', () => {
  assert.strictEqual(cardFileName('3d', '5-7-5'), 'lotto-lucky-numbers-3d-5-7-5.png');
  const n = cardFileName('6-58', '03 · 11 · 24 · 30 · 41 · 58');
  assert.match(n, /^[a-z0-9-]+\.png$/);
  assert.ok(!n.includes('--'));
});

test('fitFontSize monotonic and >= 40', () => {
  let prev = Infinity;
  for (let len = 1; len <= 200; len++) {
    const s = fitFontSize(len, 960, 220);
    assert.ok(s <= prev && s >= 40, `len ${len}`);
    prev = s;
  }
  assert.strictEqual(fitFontSize(1000, 960, 220), 40);
});

test('drawCard draws each string once, in bounds', () => {
  for (const c of cases) {
    const content = cardContent(c);
    const calls = [];
    const ctx = new Proxy({ fillText: (t, x, y, mw) => calls.push({ t, x, y, mw }), createLinearGradient: () => ({ addColorStop() {} }) }, {
      get: (o, k) => (k in o ? o[k] : () => {}),
      set: (o, k, v) => ((o[k] = v), true),
    });
    drawCard(ctx, content, { width: 1080, height: 1920 });
    for (const v of Object.values(content).filter(Boolean)) {
      assert.strictEqual(calls.filter((k) => k.t === v).length, 1, v);
    }
    assert.strictEqual(calls.length, Object.values(content).filter(Boolean).length);
    for (const k of calls) {
      assert.ok(k.x >= 0 && k.x <= 1080 && k.y >= 0 && k.y <= 1920);
      assert.strictEqual(k.mw, 960);
    }
  }
});

test('card.js is DOM-free and cached by sw.js', () => {
  const src = read('src/card.js');
  for (const w of ['document', 'window', 'navigator', 'fetch(']) assert.ok(!src.includes(w), w);
  const sw = read('sw.js');
  assert.ok(sw.includes('swertres-v32'));
  assert.ok(sw.includes('"src/card.js"'));
});

test('drawCard shrinks a long name to fit', () => {
  const fonts = [];
  let font = '';
  const calls = [];
  const ctx = new Proxy({ fillText: (t) => calls.push({ t, font }), createLinearGradient: () => ({ addColorStop() {} }) }, {
    get: (o, k) => (k in o ? o[k] : () => {}),
    set: (o, k, v) => { if (k === 'font') font = v; o[k] = v; return true; },
  });
  const content = cardContent({ game: getGame('3d'), numbersText: '5-7-5', mode: 'straight', name: 'A'.repeat(40), drawText: '' });
  drawCard(ctx, content, { width: 1080, height: 1920 });
  const call = calls.find((k) => k.t === content.forName);
  const size = Number(/(\d+)px/.exec(call.font)[1]);
  fonts.push(size);
  assert.ok(size < 44, `size ${size}`);
  assert.ok(size >= fitFontSize(1000, 960, 44), `size ${size}`);
});
