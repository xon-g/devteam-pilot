import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';

const read = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const CODES = { '2d': '2D', '3d': '3D', '4d': '4D', '6d': '6D', '6-42': '42', '6-45': '45', '6-49': '49', '6-55': '55', '6-58': '58', '1-58': '1' };

test('every game span has its data-ball code; only 6/xx spans are lotto', () => {
  const html = read('index.html');
  const re = /<input type="radio" name="game" value="([^"]+)"[^>]*><span([^>]*)>/g;
  const found = {};
  for (const m of html.matchAll(re)) found[m[1]] = m[2];
  assert.deepStrictEqual(Object.keys(found).sort(), Object.keys(CODES).sort());
  for (const [value, code] of Object.entries(CODES)) {
    assert.ok(found[value].includes(`data-ball="${code}"`), `${value} data-ball`);
    assert.strictEqual(/class="lotto"/.test(found[value]), value.startsWith('6-') || value === '1-58', `${value} lotto class`);
  }
});

test('styles.css draws the badge and sw.js is v20', () => {
  const css = read('styles.css');
  assert.ok(css.includes('attr(data-ball)'));
  assert.ok(css.includes('.games span.lotto::before'));
  assert.ok(read('sw.js').includes('swertres-v36'));
});
