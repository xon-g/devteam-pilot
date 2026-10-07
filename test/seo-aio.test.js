import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GAMES } from '../src/games.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const html = read('index.html');
const ORIGIN = 'https://lotto.xonicbox.com/';
const DISCLAIMER = "For entertainment only. Numbers are random and don't improve your odds. 18+. Play responsibly.";
const BANNED = ['guarantee', 'sigurado', 'siguradong panalo', 'tsansa', 'odds', 'better chance', 'sure win', 'jackpot ka na', 'panalo', 'tatama', 'jackpot'];

const norm = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
const count = (re) => (html.match(re) || []).length;
const meta = (attr, key) => {
  const m = html.match(new RegExp(`<meta[^>]+${attr}="${key}"[^>]+content="([^"]*)"`, 'i'));
  return m && m[1];
};
const title = html.match(/<title>([^<]*)<\/title>/)[1];
const description = meta('name', 'description');
const about = html.match(/<section id="about-games"[\s\S]*?<\/section>/)[0];
const ldBlocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
const faq = [...about.matchAll(/<details><summary>([\s\S]*?)<\/summary><p>([\s\S]*?)<\/p><\/details>/g)].map((m) => [norm(m[1]), norm(m[2])]);

function assertClean(text, label) {
  const t = text.split(DISCLAIMER).join('').toLowerCase();
  for (const b of BANNED) assert.ok(!t.includes(b), `banned phrase "${b}" in ${label}`);
}
function strings(v, out = []) {
  if (typeof v === 'string') out.push(v);
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => strings(x, out));
  return out;
}

test('head tags: title, description, og/twitter', () => {
  assert.equal(count(/<title>/g), 1);
  assert.ok(title.length <= 70, `title length ${title.length}`);
  assert.ok(title.includes('Lotto Lucky Numbers PH') && !title.includes('PCSO'));
  assert.ok(description.length >= 70 && description.length <= 175, `description length ${description.length}`);
  for (const [attr, key, expected] of [
    ['name', 'description', description], ['property', 'og:title', title], ['name', 'twitter:title', title],
    ['property', 'og:description', description], ['name', 'twitter:description', description],
  ]) {
    assert.equal(count(new RegExp(`<meta[^>]+${attr}="${key}"`, 'g')), 1, `${key} exactly once`);
    assert.equal(meta(attr, key), expected, `${key} matches`);
  }
});

test('header and about section structure', () => {
  assert.equal(count(/<h1[\s>]/g), 1);
  assert.ok(html.includes('<p class="eyebrow">Lucky Number Generator</p>'));
  assert.ok(!html.includes('Swertres · 3D'));
  assert.ok(html.indexOf('id="about-games"') > html.indexOf('</main>'));
  assert.ok(html.indexOf('id="about-games"') < html.indexOf('id="ad-slot"'));
  assert.ok((about.match(/<h2>/g) || []).length >= 3);
});

test('games list matches GAMES in order with count and range', () => {
  const lis = [...about.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => norm(m[1]));
  assert.equal(lis.length, GAMES.length);
  GAMES.forEach((g, i) => {
    assert.ok(lis[i].startsWith((g.id === '1-58' ? 'Isang Numero' : g.name) + ':'), `${g.name} at position ${i}: ${lis[i]}`);
    assert.ok(lis[i].includes(`${g.count} `), `${g.name} count`);
    assert.ok(lis[i].includes(`${g.min}–${g.max}`), `${g.name} range`);
  });
});

test('JSON-LD: WebApplication and FAQPage', () => {
  assert.ok(ldBlocks.length >= 2);
  const app = ldBlocks.find((b) => b['@type'] === 'WebApplication');
  assert.equal(app.name, 'Lotto Lucky Numbers PH');
  assert.equal(app.url, ORIGIN);
  assert.equal(app.description, description);
  assert.equal(app.applicationCategory, 'EntertainmentApplication');
  assert.equal(app.operatingSystem, 'Any');
  assert.deepEqual(app.inLanguage, ['fil', 'en']);
  assert.equal(app.isAccessibleForFree, true);
  assert.equal(app.offers['@type'], 'Offer');
  assert.equal(app.offers.price, '0');
  assert.equal(app.offers.priceCurrency, 'PHP');
  const page = ldBlocks.find((b) => b['@type'] === 'FAQPage');
  assert.ok(faq.length >= 5 && faq.length <= 6);
  assert.equal(page.mainEntity.length, faq.length);
  page.mainEntity.forEach((q, i) => {
    assert.equal(norm(q.name), faq[i][0]);
    assert.equal(norm(q.acceptedAnswer.text), faq[i][1]);
  });
});

test('sitemap.xml and robots.txt', () => {
  const sm = read('sitemap.xml');
  assert.deepEqual([...sm.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]), [ORIGIN]);
  assert.match(sm.match(/<lastmod>([^<]*)<\/lastmod>/)[1], /^\d{4}-\d{2}-\d{2}$/);
  const robots = read('robots.txt');
  assert.ok(robots.split('\n').includes(`Sitemap: ${ORIGIN}sitemap.xml`));
  assert.ok(!/Disallow:\s*\/\s*$/m.test(robots));
});

test('llms.txt', () => {
  const t = read('llms.txt');
  assert.ok(t.startsWith('# '));
  assert.ok(/^> /m.test(t));
  assert.ok(t.includes(ORIGIN) && t.includes(DISCLAIMER));
  for (const g of GAMES.filter((x) => x.id !== '1-58')) assert.ok(t.includes(g.name), g.name);
});

test('banned phrases absent from about, JSON-LD and llms.txt', () => {
  assertClean(norm(about), '#about-games');
  assertClean(strings(ldBlocks).join('\n'), 'JSON-LD');
  assertClean(read('llms.txt'), 'llms.txt');
});

test('no host paths in new files', () => {
  const host = new RegExp('/' + 'Users' + '/|/' + 'home' + '/');
  for (const f of ['sitemap.xml', 'robots.txt', 'llms.txt', 'index.html']) assert.ok(!host.test(read(f)), f);
});

test('about lore is parody, followed by the honest "Ang totoo:" paragraph; llms.txt stays factual', () => {
  const m = about.match(/<p class="lore">([\s\S]*?)<\/p>\s*<p>([\s\S]*?)<\/p>/);
  assert.ok(m, 'p.lore followed by a plain p');
  const lore = norm(m[1]);
  assert.ok(lore.includes('Kapreng Naka-tsinelas') && lore.includes('Lola Diwata'));
  const truth = norm(m[2]);
  assert.ok(truth.startsWith('Ang totoo:'));
  assert.ok(truth.includes('hindi ito hula sa resulta ng bola'));
  const llms = read('llms.txt');
  assert.ok(!llms.includes('Kapre') && !llms.includes('Diwata'));
});
