import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';

const read = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const BRIEF = '/home/node/briefs/2026-10-06-swertres-copy.md';
const HOME = read('index.html');
const PAGES = {
  'responsible-gaming': { h1: 'Responsible Gaming', title: 'Responsible Gaming – Lotto Lucky Numbers PH', page: 3, checks: 3 },
  about: { h1: 'Tungkol sa Amin', title: 'About – Lotto Lucky Numbers PH', page: 4, checks: 0 },
  contact: { h1: 'Contact', title: 'Contact – Lotto Lucky Numbers PH', page: 5, checks: 0 },
};
const CLAIMS = ['guarantee', 'sigurado', 'siguradong panalo', 'sure win', 'better chance', 'jackpot ka na', 'prediction', 'predict', 'hot numbers', 'system to win'];
const gc = (h) => [...h.matchAll(/<script[^>]*data-goatcounter[^>]*>/g)].map((m) => m[0]);
const og = (h) => h.match(/property="og:image" content="([^"]*)"/)[1];
const text = (h) => h.slice(h.indexOf('<body')).replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

for (const [slug, { h1, title, page, checks }] of Object.entries(PAGES)) {
  const html = read(`${slug}/index.html`);
  test(`${slug}: head, scripts, structure`, () => {
    assert.ok(html.includes('<html lang="fil">'));
    assert.ok(html.includes(`<title>${title}</title>`));
    assert.ok(html.includes(`<h1>${h1}</h1>`));
    const scripts = [...html.matchAll(/<script\b([^>]*)>/g)].map((m) => m[1].trim());
    assert.strictEqual(scripts.length, slug === 'contact' ? 4 : 3);
    if (slug === 'contact') assert.ok(scripts.includes('type="module" src="../src/contact.js"'));
    assert.ok(html.indexOf('location.replace') < html.indexOf('data-goatcounter'));
    assert.ok(html.indexOf('<script>') < html.indexOf('<meta name="viewport"'));
    assert.ok(html.includes(`<link rel="canonical" href="https://lotto.xonicbox.com/${slug}/">`));
    assert.ok(html.includes(`<meta property="og:url" content="https://lotto.xonicbox.com/${slug}/">`));
    assert.deepStrictEqual(gc(html), gc(HOME));
    assert.strictEqual(gc(html).length, 1);
    assert.strictEqual(og(html), og(HOME));
    assert.ok(!/(href|src)="\//.test(html));
    assert.ok(!/adsbygoogle|googlesyndication/.test(html));
    assert.ok(text(html).split(' ').length >= 300);
    assert.ok(/<section lang="en">\s*<h2>English summary<\/h2>/.test(html));
    assert.ok(html.includes('<footer id="disclaimer">For entertainment only. Numbers are random and don\'t improve your odds. 18+. Play responsibly.</footer>'));
    assert.ok(html.includes('id="not-affiliated"'));
  });
  test(`${slug}: no claim phrases`, () => {
    const t = text(html).toLowerCase();
    for (const c of CLAIMS) assert.ok(!t.includes(c), c);
  });
  test(`${slug}: [CHECK] marks match the copy`, () => {
    let expected = checks;
    if (fs.existsSync(BRIEF)) {
      const b = fs.readFileSync(BRIEF, 'utf8');
      const sec = b.slice(b.indexOf(`## Page ${page}:`), b.indexOf(`## Page ${page + 1}:`));
      expected = (sec.match(/\[CHECK/g) || []).length;
    }
    assert.strictEqual((html.split('data-lang-block="en"')[0].match(/class="check"/g) || []).length, expected); // Taglish block only
  });
}

test('responsible-gaming content', () => {
  const html = read('responsible-gaming/index.html');
  for (const s of ['18 pataas', 'PAGCOR', 'PCSO']) assert.ok(html.includes(s), s);
  for (const u of ['https://www.pagcor.ph/', 'https://www.pcso.gov.ph/']) {
    const m = html.match(new RegExp(`<a href="${u}"([^>]*)>`));
    assert.ok(m, u);
    assert.ok(m[1].includes('noopener'));
  }
});

test('about content', () => {
  const html = read('about/index.html');
  for (const s of ['Hindi kami ang PCSO', 'xonicbox', '18 pataas', 'href="../contact/"', 'href="../privacy/"']) assert.ok(html.includes(s), s);
});

test('contact content', () => {
  const html = read('contact/index.html');
  const anchors = [...html.matchAll(/<a data-contact-email[^>]*>/g)].map((m) => m[0]);
  assert.ok(anchors.length >= 2);
  for (const a of anchors) assert.ok(a.includes('href="mailto:hello@xonicbox.com"'));
  assert.ok(!html.includes('{{'));
  assert.ok(!html.includes('<form'));
  assert.ok(html.includes('href="../lucky-numbers/"') && html.includes('href="../privacy/"'));
});

test('site-links nav on all 8 pages', () => {
  const ORDER = [['', 'Home'], ['how-to-play/', 'How to play'], ['lucky-numbers/', 'Lucky numbers?'], ['responsible-gaming/', 'Responsible gaming'], ['about/', 'About'], ['contact/', 'Contact'], ['privacy/', 'Privacy']];
  const nav = (h) => h.match(/<nav class="site-links"[^>]*>(.*?)<\/nav>/)[1];
  const links = (h) => [...nav(h).matchAll(/<a href="([^"]*)"([^>]*)>([^<]*)<\/a>/g)].map((m) => ({ href: m[1], attrs: m[2], label: m[3] }));
  const home = links(HOME);
  assert.deepStrictEqual(home.map((l) => l.label), ORDER.slice(1).map((o) => o[1]));
  assert.deepStrictEqual(home.map((l) => l.href), ORDER.slice(1).map((o) => o[0]));
  assert.ok(!nav(HOME).includes('aria-current'));
  for (const [slug, label] of [['how-to-play', 'How to play'], ['lucky-numbers', 'Lucky numbers?'], ['responsible-gaming', 'Responsible gaming'], ['about', 'About'], ['contact', 'Contact'], ['privacy', 'Privacy']]) {
    const l = links(read(`${slug}/index.html`));
    assert.deepStrictEqual(l.map((x) => x.label), ORDER.map((o) => o[1]));
    assert.deepStrictEqual(l.map((x) => x.href).filter((h) => h !== './'), ORDER.filter((o) => o[0] !== `${slug}/`).map((o) => '../' + o[0]));
    assert.strictEqual(l.filter((x) => x.attrs.includes('aria-current="page"')).length, 1);
    assert.ok(l.find((x) => x.label === label).attrs.includes('aria-current="page"'));
  }
});

test('sitemap and sw list the new pages', () => {
  const sm = read('sitemap.xml');
  const sw = read('sw.js');
  for (const s of ['responsible-gaming', 'about', 'contact']) {
    assert.ok(sm.includes(`<loc>https://lotto.xonicbox.com/${s}/</loc>`));
    assert.ok(sw.includes(`"${s}/"`));
  }
  assert.ok(sw.includes('swertres-v34'));
});
