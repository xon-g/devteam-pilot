import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const html = read('index.html');
const meta = (attr, key) =>
  html.match(new RegExp(`<meta[^>]+${attr}=["']${key}["'][^>]+content=["']([^"']*)["']`, 'i'))?.[1];

test('site is named Lotto Lucky Numbers PH', () => {
  const name = 'Lotto Lucky Numbers PH';
  assert.ok(html.match(/<title>([^<]*)<\/title>/)[1].includes(name));
  assert.strictEqual(meta('property', 'og:title'), html.match(/<title>([^<]*)<\/title>/)[1]);
  assert.strictEqual(meta('property', 'og:site_name'), name);
  assert.strictEqual(meta('name', 'twitter:title'), html.match(/<title>([^<]*)<\/title>/)[1]);
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)[1].replace(/<[^>]+>/g, '').trim();
  assert.strictEqual(h1, name);
});

test('no leftover old name or 3-digit-only copy', () => {
  assert.ok(!html.includes('Swertres Lucky Numbers'));
  assert.ok(!/Tatlong numero|Tatlong random/.test(html));
});

test('#not-affiliated note', () => {
  const m = html.match(/<p id="not-affiliated"[^>]*>([^<]*)<\/p>/);
  assert.ok(m, '#not-affiliated exists');
  assert.ok(m[1].includes('Not affiliated with PCSO'));
});

test('manifest and og-image', () => {
  const manifest = JSON.parse(read('manifest.webmanifest'));
  assert.strictEqual(manifest.name, 'Lotto Lucky Numbers PH');
  assert.strictEqual(manifest.short_name, 'Lotto Lucky PH');
  const png = fs.readFileSync(fileURLToPath(new URL('../assets/og-image.png', import.meta.url)));
  assert.strictEqual(png.readUInt32BE(16), 1200);
  assert.strictEqual(png.readUInt32BE(20), 630);
});

test('no "PCSO Lucky" in index.html, manifest or llms.txt; title and h1 carry the name', () => {
  for (const f of ['index.html', 'manifest.webmanifest', 'llms.txt']) assert.ok(!read(f).includes('PCSO Lucky'), f);
  assert.ok(html.match(/<title>([^<]*)<\/title>/)[1].includes('Lotto Lucky Numbers PH'));
  assert.ok(html.includes('Lotto <span>Lucky</span> Numbers PH'));
});
