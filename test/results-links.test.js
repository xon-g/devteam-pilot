import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PCSO_RESULTS_URL, PCSO_FACEBOOK_URL } from '../src/config.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

test('config exports both official URLs', () => {
  assert.strictEqual(new URL(PCSO_RESULTS_URL).protocol, 'https:');
  assert.strictEqual(new URL(PCSO_RESULTS_URL).hostname, 'www.pcso.gov.ph');
  assert.strictEqual(new URL(PCSO_FACEBOOK_URL).protocol, 'https:');
  assert.strictEqual(new URL(PCSO_FACEBOOK_URL).hostname, 'www.facebook.com');
});

test('index.html has one results row before #not-affiliated with correct links', () => {
  const html = read('index.html');
  assert.strictEqual(html.match(/id="official-results"/g).length, 1);
  const rowAt = html.indexOf('id="official-results"');
  assert.ok(rowAt < html.indexOf('id="not-affiliated"'));
  const row = html.slice(rowAt, html.indexOf('</p>', rowAt));
  for (const [key, url] of [['site', PCSO_RESULTS_URL], ['facebook', PCSO_FACEBOOK_URL]]) {
    const a = row.match(new RegExp(`<a[^>]*data-results="${key}"[^>]*>`))[0];
    assert.ok(a.includes(`href="${url}"`), key);
    assert.ok(a.includes('target="_blank"'), key);
    const rel = a.match(/rel="([^"]*)"/)[1];
    assert.ok(rel.includes('noopener') && rel.includes('noreferrer'), key);
  }
});

test('src has no network calls and only config mentions the hosts', () => {
  for (const f of fs.readdirSync(path.join(ROOT, 'src'))) {
    const src = read(`src/${f}`);
    assert.ok(!/XMLHttpRequest|sendBeacon/.test(src), `${f} makes network calls`);
    const fetches = src.match(/fetch\(/g) || [];
    if (f === 'schedule.js') {
      assert.strictEqual(fetches.length, 1, 'schedule.js should have exactly one fetch(');
      assert.ok(/fetch\(new URL\([^)]*import\.meta\.url\)\)/.test(src), 'fetch must use import.meta.url');
      assert.ok(!/http/.test(src), 'schedule.js has an http literal');
    } else {
      assert.strictEqual(fetches.length, 0, `${f} makes network calls`);
    }
    if (f !== 'config.js' && f !== 'share.js') assert.ok(!/pcso\.gov\.ph|facebook\.com/.test(src), `${f} mentions hosts`);
  }
});

test('contact page links the results URL with noopener', () => {
  const html = read('contact/index.html');
  const a = html.match(new RegExp(`<a[^>]*href="${PCSO_RESULTS_URL}"[^>]*>`));
  assert.ok(a, 'results link missing');
  assert.ok(/rel="[^"]*noopener/.test(a[0]));
});

test('sw.js has swertres-v41', () => {
  assert.ok(read('sw.js').includes('swertres-v41'));
});
