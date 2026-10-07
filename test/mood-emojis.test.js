import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';

const read = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const EMOJI = { masaya: '😄', pagod: '😴', stressed: '😫', kinikilig: '🥰', chill: '😎', ewan: '🤷' };

test('every mood span has its data-emoji', () => {
  const html = read('index.html');
  const found = {};
  for (const m of html.matchAll(/<input type="radio" name="mood" value="([^"]+)"[^>]*><span([^>]*)>/g)) found[m[1]] = m[2];
  assert.deepStrictEqual(Object.keys(found).sort(), Object.keys(EMOJI).sort());
  for (const [v, e] of Object.entries(EMOJI)) assert.ok(found[v].includes(`data-emoji="${e}"`), v);
});

test('styles.css draws the emoji and sw.js is v20', () => {
  const css = read('styles.css');
  assert.ok(css.includes('.moods span::before'));
  assert.ok(css.includes('attr(data-emoji)'));
  assert.ok(read('sw.js').includes('swertres-v29'));
});
