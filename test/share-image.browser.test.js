import { launchStubbed } from './ads-helpers.js';
import { test } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PLAYWRIGHT = '/usr/local/lib/node_modules/playwright';

async function loadChromium() {
  try {
    return (await import(`${PLAYWRIGHT}/index.mjs`)).chromium;
  } catch {
    return createRequire(import.meta.url)(PLAYWRIGHT).chromium;
  }
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.on('error', reject);
    srv.listen(0, () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

function startServer(port) {
  const proc = spawn(process.execPath, ['scripts/serve.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(port), BASE_PATH: '/devteam-pilot/' },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  const ready = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('server did not start in 5s')), 5000);
    proc.stdout.on('data', (chunk) => {
      if (chunk.toString().includes('Server running')) {
        clearTimeout(timer);
        resolve();
      }
    });
    proc.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`server exited early (${code})`));
    });
  });
  return { proc, ready };
}



const ANDROID_VIEW = { width: 360, height: 740 };

async function setup(browser, port, opts, errors, init) {
  const context = await browser.newContext(opts);
  await context.route('https://gc.zgo.at/**', (r) => r.abort());
  await context.addInitScript(() => {
    window.__gc = [];
    window.goatcounter = { count: (o) => window.__gc.push(o.path) };
  });
  if (init) await context.addInitScript(init);
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/gc\.zgo\.at|ERR_FAILED|ERR_BLOCKED/.test(m.text() + m.location().url)) errors.push(m.text());
  });
  await page.goto(`http://localhost:${port}/devteam-pilot/`);
  return { context, page };
}

async function draw(page) {
  await page.locator('.moods span', { hasText: /^Chill$/ }).click();
  await page.click('#draw');
  await page.waitForFunction(() => /^\d-\d-\d$/.test(document.querySelector('#combo-output').textContent.trim()), null, { timeout: 20000 });
  await page.locator('#share:not([disabled])').waitFor();
}

test('save image', { timeout: 120000 }, async () => {
  const port = await getFreePort();
  const { proc, ready } = startServer(port);
  let browser;
  const errors = [];
  try {
    await ready;
    const chromium = await loadChromium();
    browser = await launchStubbed(chromium);

    // Desktop download path
    const d = await setup(browser, port, { viewport: { width: 1280, height: 800 }, acceptDownloads: true }, errors,
      () => { delete Navigator.prototype.canShare; delete navigator.canShare; });
    let page = d.page;
    assert.ok(!(await page.isVisible('#save-image')), 'hidden before draw');
    await draw(page);
    assert.ok(await page.isVisible('#save-image'));
    assert.strictEqual((await page.textContent('#save-image')).trim(), 'Save image');
    const last = await page.$$eval('#share-row [data-share]', (els) => els[els.length - 1].id);
    assert.strictEqual(last, 'save-image');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#save-image')]);
    assert.match(dl.suggestedFilename(), /^lotto-lucky-numbers-3d-\d-\d-\d\.png$/);
    const buf = fs.readFileSync(await dl.path());
    assert.deepStrictEqual([...buf.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    assert.strictEqual(buf.readUInt32BE(16), 1080);
    assert.strictEqual(buf.readUInt32BE(20), 1920);
    await page.waitForFunction(() => document.querySelector('#share-status').textContent === 'Na-save na ang image!');
    assert.ok((await page.evaluate(() => window.__gc)).includes('share-done/img'));

    // Pixel check with the app's own module
    const px = await page.evaluate(async () => {
      const { cardContent, drawCard } = await import('./src/card.js');
      const { getGame } = await import('./src/games.js');
      const c = document.createElement('canvas');
      c.width = 1080; c.height = 1920;
      const ctx = c.getContext('2d');
      drawCard(ctx, cardContent({ game: getGame('3d'), numbersText: '5-7-5', mode: 'straight', name: '', drawText: '' }), { width: 1080, height: 1920 });
      const corner = [...ctx.getImageData(2, 100, 1, 1).data];
      const band = ctx.getImageData(0, 800, 1080, 320).data;
      let gold = false;
      for (let i = 0; i < band.length; i += 4) {
        if (band[i] > 200 && band[i + 1] > 150 && band[i + 2] < 120) { gold = true; break; }
      }
      return { corner, gold };
    });
    assert.deepStrictEqual(px.corner.slice(0, 3), [0x12, 0x06, 0x1f]);
    assert.ok(px.gold, 'gold pixel in numbers band');
    await d.context.close();

    // Share path
    const s = await setup(browser, port, { viewport: { width: 1280, height: 800 } }, errors, () => {
      window.__shareCalls = [];
      navigator.canShare = () => true;
      navigator.share = async (o) => { window.__shareCalls.push({ n: o.files.length, type: o.files[0].type, url: o.url }); };
    });
    await draw(s.page);
    await s.page.click('#save-image');
    await s.page.waitForFunction(() => window.__shareCalls.length === 1);
    const call = await s.page.evaluate(() => window.__shareCalls[0]);
    assert.strictEqual(call.n, 1);
    assert.strictEqual(call.type, 'image/png');
    assert.ok(call.url.endsWith('?ref=img'));
    await s.page.waitForFunction(() => document.querySelector('#share-status').textContent === 'Naibahagi na!');
    await s.context.close();

    // Abort
    const a = await setup(browser, port, { viewport: { width: 1280, height: 800 } }, errors, () => {
      window.__tries = 0;
      navigator.canShare = () => true;
      navigator.share = async () => { window.__tries++; throw new DOMException('cancel', 'AbortError'); };
    });
    await draw(a.page);
    await a.page.click('#save-image');
    await a.page.waitForFunction(() => window.__tries === 1);
    await a.page.waitForTimeout(300);
    assert.strictEqual(await a.page.textContent('#share-status'), '');
    await a.context.close();

    // Share rejects with NotAllowedError (Safari): fall back to download
    const n = await setup(browser, port, { viewport: { width: 1280, height: 800 }, acceptDownloads: true }, errors, () => {
      navigator.canShare = () => true;
      navigator.share = async () => { throw new DOMException('expired', 'NotAllowedError'); };
    });
    await draw(n.page);
    const [dl2] = await Promise.all([n.page.waitForEvent('download'), n.page.click('#save-image')]);
    assert.match(dl2.suggestedFilename(), /\.png$/);
    await n.page.waitForFunction(() => document.querySelector('#share-status').textContent === 'Na-save na ang image!');
    await n.context.close();

    // Mobile layout
    const m = await setup(browser, port, { viewport: ANDROID_VIEW }, errors);
    await draw(m.page);
    assert.ok(await m.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    const box = await m.page.locator('#save-image').boundingBox();
    assert.ok(box.height >= 44, `height ${box.height}`);
    await m.context.close();

    assert.deepStrictEqual(errors, []);
  } finally {
    if (browser) await browser.close();
    proc.kill();
  }
});
