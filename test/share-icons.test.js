import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const html = read('index.html');
const row = html.slice(html.indexOf('id="share-row"'), html.indexOf('</nav>', html.indexOf('id="share-row"')));

test('brand path data is inlined verbatim', () => {
  for (const slug of ['facebook', 'messenger', 'viber', 'whatsapp', 'telegram', 'x', 'tiktok', 'instagram']) {
    const d = read(`assets/icons/brands/${slug}.svg`).match(/<path d="([^"]+)"/)[1];
    assert.ok(html.includes(`d="${d}"`), slug);
  }
});

test('share row has no img and no https in svg', () => {
  assert.ok(row.length > 100);
  assert.ok(!row.includes('<img'));
  for (const m of row.matchAll(/<svg[\s\S]*?<\/svg>/g)) assert.ok(!m[0].includes('https://'));
});

test('sw.js CACHE is swertres-v39', () => {
  assert.ok(read('sw.js').includes('const CACHE = "swertres-v39"'));
});
