import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { hireMailto } from '../src/hire.js';
import { LANGS, STRINGS } from '../src/i18n.js';
import { eventPath } from '../src/analytics.js';

const read = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const PAGES = ['index.html', 'how-to-play/index.html', 'lucky-numbers/index.html',
  'responsible-gaming/index.html', 'about/index.html', 'contact/index.html', 'privacy/index.html'];
const KEYS = ['hireTitle', 'hireText', 'hireCta', 'hireSubject', 'hireBody'];

for (const lang of LANGS) {
  test(`hireMailto(${lang}) carries subject and body`, () => {
    const href = hireMailto(lang);
    assert.ok(href.startsWith('mailto:hello@xonicbox.com?subject='));
    const q = new URLSearchParams(href.split('?')[1]);
    assert.equal(q.get('subject'), 'Website inquiry (from lotto.xonicbox.com)');
    assert.equal(q.get('body'), STRINGS[lang].hireBody);
    assert.ok(q.get('body').length > 10);
  });
  test(`STRINGS.${lang} has the hire keys`, () => {
    for (const k of KEYS) assert.ok(STRINGS[lang][k], `${lang}.${k}`);
  });
}

test('hireMailto falls back to Taglish for unknown language', () => {
  assert.equal(hireMailto('xx'), hireMailto('taglish'));
});

for (const page of PAGES) {
  test(`${page}: one #hire with mailto link before .site-links`, () => {
    const html = read(page);
    assert.equal((html.match(/id="hire"/g) || []).length, 1);
    const block = html.match(/<aside id="hire"[\s\S]*?<\/aside>/)[0];
    assert.ok(block.includes('href="mailto:hello@xonicbox.com'));
    assert.ok(html.indexOf('id="hire"') < html.indexOf('class="site-links"'));
    assert.ok(html.indexOf('id="hire"') > html.indexOf('</main>') || page === 'index.html');
  });
}

test('home: hire sits after the about sections, outside the ad slot', () => {
  const html = read('index.html');
  assert.ok(html.indexOf('id="hire"') > html.indexOf('id="about-games-ceb"'));
  assert.ok(!/<aside id="ad-slot"[^>]*>[\s\S]*?id="hire"[\s\S]*?<\/aside>\s*<aside id="hire"/.test(html));
});

test('eventPath hire-click', () => {
  assert.equal(eventPath('hire-click'), 'hire-click');
});

test('sw.js precaches src/hire.js under v40', () => {
  const sw = read('sw.js');
  assert.ok(sw.includes('"src/hire.js"'));
  assert.ok(sw.includes('const CACHE = "swertres-v40"'));
});
