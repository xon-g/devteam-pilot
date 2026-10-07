import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';

const read = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const BRIEF = '/home/node/briefs/2026-10-06-swertres-copy.md';
const HOME = read('index.html');
const PAGES = {
  'how-to-play': { h1: 'Paano Laruin', title: 'Paano Laruin (How to Play) – Lotto Lucky Numbers PH' },
  'lucky-numbers': { h1: 'Totoo ba ang Lucky Numbers?', title: 'Totoo ba ang Lucky Numbers? – Lotto Lucky Numbers PH' },
};
const CLAIMS = ['guarantee', 'sigurado', 'siguradong panalo', 'sure win', 'better chance', 'jackpot ka na', 'prediction', 'predict', 'hot numbers', 'system to win'];
const gc = (h) => [...h.matchAll(/<script[^>]*data-goatcounter[^>]*>/g)].map((m) => m[0]);
const og = (h) => h.match(/property="og:image" content="([^"]*)"/)[1];
const text = (h) => h.slice(h.indexOf('<body')).replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

for (const [slug, { h1, title }] of Object.entries(PAGES)) {
  const html = read(`${slug}/index.html`);
  test(`${slug}: head, scripts, structure`, () => {
    assert.ok(html.includes('<html lang="fil">'));
    assert.ok(html.includes(`<title>${title}</title>`));
    assert.ok(html.includes(`<h1>${h1}</h1>`));
    const scripts = [...html.matchAll(/<script\b([^>]*)>/g)].map((m) => m[1].trim());
    assert.strictEqual(scripts.length, 2);
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
}

test('how-to-play content', () => {
  const html = read('how-to-play/index.html');
  for (const s of ['Swertres', 'EZ2', 'STL', '4D', '6D', 'Rambolito', '1 sa 1,000', '1 sa 40,475,358']) assert.ok(html.includes(s), s);
  assert.ok(/<div class="table-wrap">\s*<table>[\s\S]*<thead>[\s\S]*<th scope="col">/.test(html));
  const marks = (html.match(/class="check"/g) || []).length;
  let expected = 21;
  if (fs.existsSync(BRIEF)) {
    const b = fs.readFileSync(BRIEF, 'utf8');
    const p1 = b.slice(b.indexOf('## Page 1'), b.indexOf('## Page 2'));
    expected = (p1.match(/\[CHECK/g) || []).length;
  }
  assert.strictEqual(marks, expected);
  assert.ok(marks > 0);
});

test('lucky-numbers content', () => {
  const html = read('lucky-numbers/index.html');
  assert.ok(html.includes("gambler's fallacy"));
  assert.ok(html.includes('1 sa 1,000'));
});

test('site-links nav on every page', () => {
  const nav = (h) => h.match(/<nav class="site-links"[^>]*>(.*?)<\/nav>/)[1];
  const links = (h) => [...nav(h).matchAll(/<a href="([^"]*)"([^>]*)>([^<]*)<\/a>/g)].map((m) => [m[1], m[3], m[2]]);
  assert.deepStrictEqual(links(HOME).map((l) => l[1]), ['How to play', 'Lucky numbers?', 'Responsible gaming', 'About', 'Contact', 'Privacy']);
  assert.deepStrictEqual(links(HOME).map((l) => l[0]), ['how-to-play/', 'lucky-numbers/', 'responsible-gaming/', 'about/', 'contact/', 'privacy/']);
  assert.ok(!nav(HOME).includes('aria-current'));
  for (const [slug, label] of [['privacy', 'Privacy'], ['how-to-play', 'How to play'], ['lucky-numbers', 'Lucky numbers?']]) {
    const l = links(read(`${slug}/index.html`));
    assert.deepStrictEqual(l.map((x) => x[1]), ['Home', 'How to play', 'Lucky numbers?', 'Responsible gaming', 'About', 'Contact', 'Privacy']);
    assert.strictEqual(l.filter((x) => x[2].includes('aria-current="page"')).length, 1);
    assert.ok(l.find((x) => x[1] === label)[2].includes('aria-current="page"'));
    assert.deepStrictEqual(l.filter((x) => !x[2].includes('aria-current')).map((x) => x[0]).every((h) => h.startsWith('../')), true);
  }
});

test('sitemap and service worker', () => {
  const sm = read('sitemap.xml');
  for (const s of Object.keys(PAGES)) assert.ok(sm.includes(`<loc>https://lotto.xonicbox.com/${s}/</loc>`));
  const sw = read('sw.js');
  assert.ok(sw.includes('const CACHE = "swertres-v32"'));
  for (const s of Object.keys(PAGES)) assert.ok(sw.includes(`"${s}/"`));
});
