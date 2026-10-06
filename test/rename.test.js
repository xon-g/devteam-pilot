import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const html = read('index.html');
const meta = (attr, key) =>
  html.match(new RegExp(`<meta[^>]+${attr}=["']${key}["'][^>]+content=["']([^"']*)["']`, 'i'))?.[1];

test('site is named PCSO Lucky Numbers', () => {
  const name = 'PCSO Lucky Numbers';
  assert.strictEqual(html.match(/<title>([^<]*)<\/title>/)[1], name);
  assert.strictEqual(meta('property', 'og:title'), name);
  assert.strictEqual(meta('property', 'og:site_name'), name);
  assert.strictEqual(meta('name', 'twitter:title'), name);
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
  assert.strictEqual(manifest.name, 'PCSO Lucky Numbers');
  assert.strictEqual(manifest.short_name, 'PCSO Lucky');
  const png = fs.readFileSync(fileURLToPath(new URL('../assets/og-image.png', import.meta.url)));
  assert.strictEqual(png.readUInt32BE(16), 1200);
  assert.strictEqual(png.readUInt32BE(20), 630);
});
