import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { apply } from '../scripts/ads.js';
import { TEST_ID, TEST_SLOT, readConfig, writeConfig, copyRepo, loadChromium, stubAds, startServer } from './ads-helpers.js';

const EMPTY = { adsensePublisherId: '', adsEnabled: false, adSlotId: '' };
const FULL = { adsensePublisherId: TEST_ID, adsEnabled: true, adSlotId: TEST_SLOT };
const ADS_HOST = /googlesyndication|doubleclick|adservice/;
async function drawOnce(page) {
  await page.locator('.moods span', { hasText: /^Chill$/ }).click();
  await page.click('#draw');
  await page.locator('#draw:not([disabled])').waitFor();
  await page.waitForFunction(() => /^\d-\d-\d$/.test(document.querySelector('#combo-output').textContent.trim()));
}

const VIEWPORTS = [{ width: 375, height: 667 }, { width: 1280, height: 800 }];

let browser;
const dirs = [];
const servers = [];

async function serveCopy(cfg) {
  const dir = copyRepo();
  dirs.push(dir);
  writeConfig(dir, cfg);
  apply(dir);
  const srv = await startServer(dir);
  servers.push(srv);
  return srv;
}

before(async () => {
  browser = await (await loadChromium()).launch();
});

after(async () => {
  await browser?.close();
  for (const s of servers) s.stop();
  for (const d of dirs) fs.rmSync(d, { recursive: true, force: true });
});

for (const viewport of VIEWPORTS) {
  test(`ID empty: no ad request, no globals, slot hidden @${viewport.width}`, async () => {
    const srv = await serveCopy(EMPTY);
    const ctx = await browser.newContext({ viewport });
    await stubAds(ctx);
    const page = await ctx.newPage();
    const adRequests = [];
    page.on('request', (r) => { if (ADS_HOST.test(new URL(r.url()).hostname)) adRequests.push(r.url()); });
    await page.goto(`${srv.url}/`);
    await drawOnce(page);
    await page.goto(`${srv.url}/how-to-play/`);
    await page.waitForLoadState('networkidle');
    assert.deepEqual(adRequests, []);
    assert.equal(await page.evaluate(() => typeof window.adsbygoogle), 'undefined');
    await page.goto(`${srv.url}/`);
    const slot = await page.$eval('#ad-slot', (el) => ({ hidden: el.hidden, height: el.getBoundingClientRect().height, kids: el.children.length }));
    assert.deepEqual(slot, { hidden: true, height: 0, kids: 0 });
    assert.equal(await page.evaluate(() => typeof window.adsbygoogle), 'undefined');
    await ctx.close();
  });

  test(`test ID + adsEnabled: slot visible, below result, above disclaimer @${viewport.width}`, async () => {
    const srv = await serveCopy(FULL);
    const ctx = await browser.newContext({ viewport });
    const hits = [];
    await stubAds(ctx, hits);
    const page = await ctx.newPage();
    const ads = await ctx.request.get(`${srv.url}/ads.txt`);
    assert.equal(ads.status(), 200);
    assert.equal(await ads.text(), 'google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0\n');

    await page.goto(`${srv.url}/`, { waitUntil: 'domcontentloaded' });
    const measure = () => page.$eval('#ad-slot', (el) => ({ hidden: el.hidden, h: el.getBoundingClientRect().height }));
    const before = await measure();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300);
    const after = await measure();
    assert.ok(hits.some((u) => u.includes('adsbygoogle.js?client=ca-pub-0000000000000000')), 'head script requested');
    assert.equal(after.hidden, false);
    assert.ok(after.h >= 280, `height ${after.h}`);
    assert.equal(before.h, after.h, 'no layout shift');
    assert.equal(await page.evaluate(() => document.querySelectorAll('#ad-slot ins.adsbygoogle').length), 1);
    assert.equal(await page.evaluate(() => window.adsbygoogle.length), 1);

    await drawOnce(page);
    const geo = await page.evaluate(() => {
      const r = (s) => document.querySelector(s).getBoundingClientRect();
      const s = r('#ad-slot');
      return { slotTop: s.top + scrollY, outBottom: r('#combo-output').bottom + scrollY, drawBottom: r('#draw').bottom + scrollY };
    });
    assert.ok(geo.slotTop >= geo.outBottom, 'below result');
    assert.ok(geo.slotTop >= geo.drawBottom, 'below draw');
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(200);
    const end = await page.evaluate(() => {
      const s = document.querySelector('#ad-slot').getBoundingClientRect();
      const d = document.querySelector('#disclaimer').getBoundingClientRect();
      return { slotBottom: s.bottom, discTop: d.top, discBottom: d.bottom, vh: innerHeight };
    });
    assert.ok(end.slotBottom <= end.discTop, `slot bottom ${end.slotBottom} above disclaimer top ${end.discTop}`);
    assert.ok(end.discTop >= 0 && end.discBottom <= end.vh + 0.5, 'disclaimer fully in viewport');

    const n = hits.length;
    for (const p of ['/privacy/', '/responsible-gaming/']) {
      await page.goto(`${srv.url}${p}`);
      await page.waitForLoadState('networkidle');
    }
    assert.equal(hits.length, n, 'no ad request on privacy / responsible-gaming');
    await ctx.close();
  });
}

test('service worker never caches ads.txt or ad hosts', async () => {
  const srv = await serveCopy({ ...FULL, adsEnabled: false, adSlotId: '' });
  const ctx = await browser.newContext({ viewport: VIEWPORTS[1] });
  await stubAds(ctx);
  const page = await ctx.newPage();
  await page.goto(`${srv.url}/`);
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  const out = await page.evaluate(async () => {
    const texts = [];
    for (let i = 0; i < 2; i++) texts.push(await (await fetch('ads.txt')).text());
    const urls = [];
    for (const k of await caches.keys()) for (const r of await (await caches.open(k)).keys()) urls.push(r.url);
    return { texts, urls, keys: await caches.keys() };
  });
  assert.deepEqual(out.texts, ['google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0\n', 'google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0\n']);
  assert.ok(out.urls.length > 0, 'shell is cached');
  assert.ok(!out.urls.some((u) => u.endsWith('ads.txt') || u.includes('googlesyndication')), out.urls.join('\n'));
  await ctx.close();
});

test('committed repo (stubbed ads) matches its config in the browser', async () => {
  const cfg = readConfig();
  const srv = await startServer(new URL('..', import.meta.url).pathname);
  servers.push(srv);
  const ctx = await browser.newContext({ viewport: VIEWPORTS[0] });
  const hits = [];
  await stubAds(ctx, hits);
  const page = await ctx.newPage();
  await page.goto(`${srv.url}/`);
  await page.waitForLoadState('networkidle');
  assert.equal(hits.length > 0, !!cfg.adsensePublisherId);
  const slot = await page.$eval('#ad-slot', (el) => ({ hidden: el.hidden, kids: el.children.length }));
  assert.deepEqual(slot, cfg.adsEnabled ? { hidden: false, kids: 1 } : { hidden: true, kids: 0 });
  await ctx.close();
});
