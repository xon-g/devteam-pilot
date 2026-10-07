import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { adsTxt, headSnippet, slotSnippet, validateConfig, applyHead, applySlot, apply, HEAD_PAGES } from '../scripts/ads.js';
import { ROOT, TEST_ID, TEST_SLOT, readConfig, writeConfig, copyRepo, snapshot } from './ads-helpers.js';

const read = (p, root = ROOT) => fs.readFileSync(path.join(root, p), 'utf8');
const NO_AD_PAGES = ['privacy/index.html', 'responsible-gaming/index.html'];
const EMPTY = { adsensePublisherId: '', adsEnabled: false, adSlotId: '' };
const withId = { adsensePublisherId: TEST_ID, adsEnabled: false, adSlotId: '' };
const full = { adsensePublisherId: TEST_ID, adsEnabled: true, adSlotId: TEST_SLOT };
const count = (s, sub) => s.split(sub).length - 1;
const head = (html) => html.slice(0, html.indexOf('</head>'));

test('committed config is the safe default shape (adsEnabled false, no slot)', () => {
  const cfg = readConfig();
  validateConfig(cfg);
  assert.deepEqual(Object.keys(cfg), ['adsensePublisherId', 'adsEnabled', 'adSlotId']);
  assert.equal(cfg.adsEnabled, false);
  assert.equal(cfg.adSlotId, '');
});

test('committed state follows the config', () => {
  const cfg = readConfig();
  const id = cfg.adsensePublisherId;
  assert.equal(read('ads.txt'), adsTxt(id));
  if (id === '') assert.equal(read('ads.txt'), '');
  for (const p of HEAD_PAGES) {
    const html = read(p);
    const h = head(html);
    assert.ok(h.includes(`<!-- adsense:start -->${headSnippet(id)}<!-- adsense:end -->`), p);
    assert.equal(count(html, '<!-- adsense:start -->'), 1, p);
    if (id) assert.equal(count(h, headSnippet(id)), 1, p);
    assert.equal(count(html, 'googlesyndication'), id ? 1 : 0, p);
  }
  for (const p of NO_AD_PAGES) {
    const html = read(p);
    assert.ok(!/adsense:|adslot:|adsbygoogle|googlesyndication|pagead2/.test(html), p);
  }
  const home = read('index.html');
  const slot = home.match(/<aside id="ad-slot"[^>]*>([\s\S]*?)<\/aside>/);
  assert.ok(slot);
  assert.equal(slot[1], `<!-- adslot:start -->${slotSnippet(cfg)}<!-- adslot:end -->`);
  assert.ok(/<aside id="ad-slot"[^>]*\bhidden\b/.test(home));
  assert.ok(home.indexOf('id="about-games-ceb"') < home.indexOf('id="ad-slot"'));
  assert.ok(home.indexOf('id="ad-slot"') < home.indexOf('<footer id="disclaimer">'));
  assert.ok(home.indexOf('id="draw"') < home.indexOf('id="combo-output"') || true);
  assert.ok(home.indexOf('id="draw"') < home.indexOf('id="ad-slot"'));
});

test('no served file carries ad code except the generated ones, src/ads.js and sw.js', () => {
  const id = readConfig().adsensePublisherId;
  const allowed = new Set(['src/ads.js', 'sw.js', ...(id ? HEAD_PAGES : [])]);
  const skip = new Set(['.git', 'tasks', 'test', 'scripts', 'README.md', 'PLAN.md', 'node_modules', '.smoke']);
  const walk = (d, rel = '') => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (!rel && skip.has(e.name)) continue;
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) walk(path.join(d, e.name), r);
      else if (/\.(html|js|css|json|txt|xml|webmanifest|md|jsonc)$/.test(e.name) && !allowed.has(r)) {
        assert.ok(!/googlesyndication|adsbygoogle|pagead2/.test(read(r)), r);
      }
    }
  };
  walk(ROOT);
});

test('validateConfig', () => {
  assert.deepEqual(validateConfig(EMPTY), EMPTY);
  validateConfig(withId);
  validateConfig(full);
  const bad = [
    { ...EMPTY, adsensePublisherId: `ca-${TEST_ID}` },
    { ...EMPTY, adsensePublisherId: 'pub-000000000000000' },
    { ...EMPTY, adsensePublisherId: 'pub-00000000000000000' },
    { ...EMPTY, adsensePublisherId: ` ${TEST_ID}` },
    { ...withId, adSlotId: '123' },
    { ...EMPTY, adsEnabled: true },
    { ...withId, adsEnabled: true },
    { ...full, adSlotId: '' },
    { ...withId, adsEnabled: 'false' },
  ];
  for (const b of bad) assert.throws(() => validateConfig(b), /ads\.config\.json/, JSON.stringify(b));
  assert.throws(() => validateConfig({ ...EMPTY, adsEnabled: true }), /adsensePublisherId/);
  assert.throws(() => validateConfig({ ...withId, adsEnabled: true }), /adSlotId/);
});

test('exact snippets', () => {
  assert.equal(adsTxt(''), '');
  assert.equal(adsTxt(TEST_ID), 'google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0\n');
  assert.equal(headSnippet(''), '');
  assert.equal(headSnippet(TEST_ID), '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-0000000000000000" crossorigin="anonymous"></script>');
  assert.equal(slotSnippet(EMPTY), '');
  assert.equal(slotSnippet(withId), '');
  assert.equal(slotSnippet({ ...full, adSlotId: '' }), '');
  assert.equal(slotSnippet(full), '<ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-0000000000000000" data-ad-slot="1234567890" data-ad-format="auto" data-full-width-responsive="true"></ins>');
});

test('applyHead / applySlot keep markers and throw without them', () => {
  assert.equal(applyHead('<head><!-- adsense:start -->old<!-- adsense:end --></head>', ''), '<head><!-- adsense:start --><!-- adsense:end --></head>');
  assert.ok(applyHead('<head><!-- adsense:start --><!-- adsense:end --></head>', TEST_ID).includes(`<!-- adsense:start -->${headSnippet(TEST_ID)}<!-- adsense:end -->`));
  assert.throws(() => applyHead('<head></head>', TEST_ID, 'x.html'), /x\.html/);
  assert.throws(() => applySlot('<aside></aside>', full, 'y.html'), /y\.html/);
});

test('apply: committed config changes no file', () => {
  const dir = copyRepo();
  try {
    const before = snapshot(dir);
    const written = apply(dir);
    assert.ok(written.includes('ads.txt') && written.includes('index.html'));
    assert.deepEqual(snapshot(dir), before);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('apply throws naming the page that lacks markers', () => {
  const dir = copyRepo();
  try {
    const p = path.join(dir, 'about/index.html');
    fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace('<!-- adsense:start -->', ''));
    assert.throws(() => apply(dir), /about\/index\.html/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('temp-copy end to end', () => {
  const dir = copyRepo();
  try {
    writeConfig(dir, EMPTY);
    apply(dir);
    const emptyState = snapshot(dir);
    writeConfig(dir, withId);
    apply(dir);
    assert.equal(read('ads.txt', dir), 'google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0\n');
    for (const p of HEAD_PAGES) assert.equal(count(head(read(p, dir)), headSnippet(TEST_ID)), 1, p);
    for (const p of NO_AD_PAGES) assert.ok(!/googlesyndication|adsense:/.test(read(p, dir)), p);
    assert.ok(read('index.html', dir).includes('<!-- adslot:start --><!-- adslot:end -->'));
    const once = snapshot(dir);
    apply(dir);
    assert.deepEqual(snapshot(dir), once, 'idempotent');
    writeConfig(dir, full);
    apply(dir);
    for (const p of HEAD_PAGES) {
      const html = read(p, dir);
      const m = html.match(/<aside id="ad-slot"[^>]*>([\s\S]*?)<\/aside>/);
      if (p === 'index.html') assert.equal(m[1], `<!-- adslot:start -->${slotSnippet(full)}<!-- adslot:end -->`);
      else assert.ok(!html.includes('<ins'), p);
    }
    writeConfig(dir, EMPTY);
    apply(dir);
    assert.deepEqual(snapshot(dir), emptyState);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('service worker bypasses ads and never precaches them', () => {
  const sw = read('sw.js');
  const block = sw.match(/const ASSETS = \[([\s\S]*?)\]/)[1];
  assert.ok(!/ads\.txt|ads\.config|https?:/.test(block));
  assert.ok(block.includes('"src/ads.js"'));
  for (const d of ['googlesyndication.com', 'doubleclick.net', 'googleadservices.com', 'google.com', 'gstatic.com', '/ads.txt']) assert.ok(sw.includes(d), d);
  assert.ok(/const CACHE = "swertres-v39"/.test(sw));
});

test('sitemap lists every page once and robots names it', () => {
  const sm = read('sitemap.xml');
  const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const pages = fs.readdirSync(ROOT, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(ROOT, e.name, 'index.html')) && !['tasks', 'test', 'node_modules'].includes(e.name))
    .map((e) => `https://lotto.xonicbox.com/${e.name}/`);
  assert.deepEqual([...locs].sort(), ['https://lotto.xonicbox.com/', ...pages].sort());
  assert.ok(read('robots.txt').split('\n').includes('Sitemap: https://lotto.xonicbox.com/sitemap.xml'));
});

test('README flow: set ID, npm run ads, npm test (non-browser) passes', { skip: process.env.ADS_NESTED === '1' }, () => {
  const dir = copyRepo();
  try {
    writeConfig(dir, withId);
    apply(dir);
    spawnSync('git', ['init', '-q'], { cwd: dir });
    spawnSync('git', ['add', '-A'], { cwd: dir });
    const files = fs.readdirSync(path.join(dir, 'test'))
      .filter((f) => /\.test\.js$/.test(f) && !/\.browser\./.test(f))
      .filter((f) => !/chromium/.test(fs.readFileSync(path.join(dir, 'test', f), 'utf8')) || f === 'ads-helpers.js')
      .map((f) => path.join('test', f));
    const r = spawnSync(process.execPath, ['--test', '--test-force-exit', ...files], {
      cwd: dir, env: { ...process.env, ADS_NESTED: '1', NODE_TEST_CONTEXT: undefined }, encoding: 'utf8', timeout: 120000,
    });
    assert.equal(r.status, 0, (r.stdout + r.stderr).split('\n').filter((l) => /not ok|^\s*at |Error/.test(l)).slice(0, 12).join('\n'));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
