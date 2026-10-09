import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseSites, loadSites, moreSitesModel, fallbackSites } from '../src/more-sites.js';
import { MORE_SITES as config } from '../src/config.js';

const good = {
  version: 1,
  sites: [
    { id: 'a', name: 'A', tagline: 'ta', url: 'https://a.example/', status: 'live' },
    { id: 'b', name: 'B', tagline: 'tb', url: null, status: 'soon' },
  ],
};
const okFetch = (body) => async () => ({ ok: true, json: async () => body });

test('parseSites: good list keeps order and shape', () => {
  assert.deepEqual(parseSites(good), [
    { id: 'a', name: 'A', tagline: 'ta', href: 'https://a.example/', soon: false },
    { id: 'b', name: 'B', tagline: 'tb', href: null, soon: true },
  ]);
});

test('parseSites: bad version, shape, status and non-https urls', () => {
  assert.deepEqual(parseSites({ ...good, version: 2 }), []);
  assert.deepEqual(parseSites(null), []);
  assert.deepEqual(parseSites({ version: 1, sites: 'x' }), []);
  const sites = [
    { id: 'x', name: 'X', tagline: '', url: 'https://x.example/', status: 'gone' },
    { id: 'h', name: 'H', tagline: '', url: 'http://h.example/', status: 'live' },
    { id: 'j', name: 'J', tagline: '', url: 'javascript:alert(1)', status: 'live' },
    { id: 'n', name: 'N', tagline: '', url: null, status: 'live' },
    { id: 'ok', name: 'Ok', tagline: '', url: 'https://ok.example/', status: 'live' },
  ];
  assert.deepEqual(parseSites({ version: 1, sites }).map((s) => s.id), ['ok']);
});

test('parseSites: soon entries ignore any url', () => {
  const [s] = parseSites({ version: 1, sites: [{ id: 's', name: 'S', tagline: '', url: 'https://s.example/', status: 'soon' }] });
  assert.equal(s.href, null);
  assert.equal(s.soon, true);
});

test('moreSitesModel removes the current site and keeps order', () => {
  const sites = parseSites({ version: 1, sites: ['a', 'b', 'c'].map((id) => ({ id, name: id, tagline: '', url: null, status: 'soon' })) });
  assert.deepEqual(moreSitesModel(sites, 'b').map((s) => s.id), ['a', 'c']);
});

test('loadSites: returns the parsed list and asks without credentials', async () => {
  let seen;
  const sites = await loadSites(config, { fetch: async (url, init) => { seen = [url, init.credentials]; return { ok: true, json: async () => good }; } });
  assert.deepEqual(seen, ['https://xonicbox.com/sites.json', 'omit']);
  assert.deepEqual(sites.map((s) => s.id), ['a', 'b']);
});

test('loadSites falls back to config.tools on every kind of failure', async () => {
  const fallback = await loadSites(config, { fetch: async () => { throw new Error('offline'); } });
  assert.deepEqual(fallback.map((s) => s.id), config.tools.map((t) => t.id));
  assert.equal(fallback.find((s) => s.id === 'hayag').soon, true);
  assert.equal(fallback.find((s) => s.id === 'lotto').href, 'https://lotto.xonicbox.com/');
  const hang = await loadSites(config, { fetch: () => new Promise(() => {}), timeoutMs: 20 });
  assert.deepEqual(hang, fallback);
  const badJson = await loadSites(config, { fetch: async () => ({ ok: true, json: async () => { throw new SyntaxError('bad'); } }) });
  assert.deepEqual(badJson, fallback);
  assert.deepEqual(await loadSites(config, { fetch: okFetch({ version: 1, sites: [] }) }), fallback);
  assert.deepEqual(await loadSites(config, { fetch: okFetch({ version: 2, sites: good.sites }) }), fallback);
  assert.deepEqual(await loadSites(config, { fetch: async () => ({ ok: false, status: 500 }) }), fallback);
});

test('config.tools fallback matches the live sites.json fixture', async () => {
  const master = parseSites(JSON.parse(await readFile(new URL('./fixtures/sites.json', import.meta.url), 'utf8')));
  assert.equal(master.length, 5);
  assert.deepEqual(fallbackSites(config), master);
});

test('every page has the More xonicbox tools block between hire card and footer nav, with a static fallback', async () => {
  for (const f of ['index.html', 'about', 'contact', 'privacy', 'how-to-play', 'lucky-numbers', 'responsible-gaming']) {
    const html = await readFile(new URL(`../${f.endsWith('.html') ? f : `${f}/index.html`}`, import.meta.url), 'utf8');
    const hire = html.indexOf('id="hire"');
    const more = html.indexOf('id="more-sites"');
    const nav = html.indexOf('class="site-links"');
    assert.ok(hire > 0 && hire < more && more < nav, f);
    assert.ok(html.includes('href="https://leave.xonicbox.com/"'), f);
    for (const n of ['KitaKita (soon)', 'Hayag Cebu (soon)', 'Clara (soon)']) assert.ok(html.includes(n), `${f} ${n}`);
    assert.ok(!html.slice(more, nav).includes('lotto.xonicbox.com'), f);
  }
});

test('sw precaches the more-sites modules', async () => {
  const sw = await readFile(new URL('../sw.js', import.meta.url), 'utf8');
  assert.ok(sw.includes('"src/more-sites.js"') && sw.includes('"src/more-sites-ui.js"'));
});
