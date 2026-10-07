import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import { CONTACT_EMAIL } from '../src/config.js';

const read = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const html = read('privacy/index.html');
const home = read('index.html');
const DISCLAIMER = "For entertainment only. Numbers are random and don't improve your odds. 18+. Play responsibly.";
const GC = '<script data-goatcounter="https://lottoluckynumbersph.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script>';

test('privacy head: redirect first, canonical, og, GoatCounter once', () => {
  const scripts = [...html.matchAll(/<script[^>]*>/g)];
  assert.ok(html.slice(scripts[0].index).startsWith('<script>'));
  assert.ok(html.slice(scripts[0].index, scripts[1].index).includes('location.replace'));
  assert.ok(html.includes('<link rel="canonical" href="https://lotto.xonicbox.com/privacy/">'));
  assert.ok(html.includes('<meta property="og:url" content="https://lotto.xonicbox.com/privacy/">'));
  assert.ok(html.includes('<title>Privacy Policy – Lotto Lucky Numbers PH</title>'));
  assert.strictEqual(html.split(GC).length - 1, 1);
  assert.ok(home.includes(GC));
  assert.strictEqual(html.split('gc.zgo.at').length - 1, 1);
});

test('privacy content', () => {
  for (const s of ['GoatCounter', 'Republic Act No. 10173', 'https://adssettings.google.com', 'https://www.aboutads.info', 'https://privacy.gov.ph', 'Huling na-update: 2026-10-07']) {
    assert.ok(html.includes(s), s);
  }
  assert.ok(html.includes('<section lang="en">'));
  assert.ok(html.includes('id="not-affiliated"'));
  assert.ok(html.includes(`<footer id="disclaimer">${DISCLAIMER}</footer>`));
  const text = html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ');
  assert.ok(text.split(/\s+/).filter(Boolean).length >= 300);
});

test('contact email links match config', () => {
  const links = [...html.matchAll(/<a data-contact-email([^>]*)>([^<]*)<\/a>/g)];
  assert.ok(links.length >= 2);
  for (const m of links) {
    assert.ok(m[1].includes(`href="mailto:${CONTACT_EMAIL}"`));
    assert.strictEqual(m[2], CONTACT_EMAIL);
  }
  assert.ok(!html.includes('{{CONTACT_EMAIL}}'));
});

test('links and scripts are safe and relative', () => {
  for (const m of html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)) assert.ok(/rel="[^"]*noopener/.test(m[0]), m[0]);
  assert.ok(!/(href|src)="\//.test(html));
  const srcs = [...html.matchAll(/<script\b([^>]*)>/g)].map((m) => m[1].trim());
  assert.strictEqual(srcs.length, 3);
  assert.ok(srcs.includes('type="module" src="../src/contact.js"'));
  assert.ok(!/adsbygoogle|googlesyndication/.test(html));
});

test('home footer links, sitemap, service worker', () => {
  assert.ok(home.includes('<nav class="site-links" aria-label="Site links"><a href="privacy/">Privacy</a></nav>'));
  assert.ok(home.indexOf('class="site-links"') < home.indexOf('<footer id="disclaimer">'));
  assert.ok(/id="privacy-note"[\s\S]*<a href="privacy\/">Basahin ang privacy policy<\/a>\.<\/p>/.test(home));
  assert.ok(read('sitemap.xml').includes('<loc>https://lotto.xonicbox.com/privacy/</loc>'));
  const sw = read('sw.js');
  assert.ok(sw.includes('"swertres-v24"'));
  for (const a of ['"privacy/"', '"src/config.js"', '"src/contact.js"']) assert.ok(sw.includes(a), a);
});
