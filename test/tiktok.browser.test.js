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

test('tiktok share', { timeout: 120000 }, async () => {
  const port = await getFreePort();
  const { proc, ready } = startServer(port);
  let browser;
  const errors = [];
  const vp = { viewport: { width: 1280, height: 800 } };
  try {
    await ready;
    const chromium = await loadChromium();
    browser = await launchStubbed(chromium);

    // Share path
    const s = await setup(browser, port, vp, errors, () => {
      window.__shareCalls = [];
      window.__clip = [];
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (t) => { window.__clip.push(t); } }, configurable: true });
      navigator.canShare = () => true;
      navigator.share = async (o) => { window.__shareCalls.push({ keys: Object.keys(o), n: o.files.length, type: o.files[0].type, isFile: o.files[0] instanceof File }); };
    });
    await draw(s.page);
    const info = await s.page.evaluate(() => {
      const b = document.querySelector('[data-share="tiktok"]');
      const svgs = b.querySelectorAll('svg.share-icon[aria-hidden="true"]');
      return { vis: b.offsetParent !== null, n: svgs.length, text: b.textContent.trim(), prev: b.previousElementSibling.dataset.share, h: b.getBoundingClientRect().height };
    });
    assert.deepStrictEqual({ ...info, h: undefined }, { vis: true, n: 1, text: 'TikTok', prev: 'x', h: undefined });
    assert.ok(info.h >= 44, `height ${info.h}`);
    await s.page.click('[data-share="tiktok"]');
    await s.page.waitForFunction(() => window.__shareCalls.length === 1);
    const call = await s.page.evaluate(() => window.__shareCalls[0]);
    assert.deepStrictEqual(call, { keys: ['files'], n: 1, type: 'image/png', isFile: true });
    const clip = await s.page.evaluate(() => window.__clip);
    assert.strictEqual(clip.length, 1);
    assert.ok(clip[0].endsWith('?ref=copy'), clip[0]);
    await s.page.waitForFunction(() => document.querySelector('#share-status').textContent === 'Piliin ang TikTok, tapos i-paste ang caption!');
    assert.ok((await s.page.evaluate(() => window.__gc)).includes('share-done/tiktok'));
    await s.context.close();

    // Abort: no status
    const a = await setup(browser, port, vp, errors, () => {
      window.__tries = 0;
      navigator.canShare = () => true;
      navigator.share = async () => { window.__tries++; throw new DOMException('cancel', 'AbortError'); };
    });
    await draw(a.page);
    await a.page.click('[data-share="tiktok"]');
    await a.page.waitForFunction(() => window.__tries === 1);
    await a.page.waitForTimeout(300);
    assert.strictEqual(await a.page.textContent('#share-status'), '');
    await a.context.close();

    // No canShare: download
    const d = await setup(browser, port, { ...vp, acceptDownloads: true }, errors,
      () => { delete Navigator.prototype.canShare; delete navigator.canShare; });
    await draw(d.page);
    const [dl] = await Promise.all([d.page.waitForEvent('download'), d.page.click('[data-share="tiktok"]')]);
    assert.match(dl.suggestedFilename(), /\.png$/);
    await d.page.waitForFunction(() => document.querySelector('#share-status').textContent === 'Na-save ang image at nakopya ang caption. I-post mo sa TikTok!');
    await d.context.close();

    // English
    const e = await setup(browser, port, { ...vp, acceptDownloads: true }, errors, () => {
      localStorage.setItem('lang', 'en');
      delete Navigator.prototype.canShare; delete navigator.canShare;
    });
    await draw(e.page);
    await Promise.all([e.page.waitForEvent('download'), e.page.click('[data-share="tiktok"]')]);
    await e.page.waitForFunction(() => document.querySelector('#share-status').textContent === 'Image saved and caption copied. Post it on TikTok!');
    await e.context.close();

    // Mobile
    const m = await setup(browser, port, { viewport: ANDROID_VIEW }, errors);
    await draw(m.page);
    assert.ok(await m.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await m.page.locator('#share-row').scrollIntoViewIfNeeded();
    fs.mkdirSync(fileURLToPath(new URL('../.smoke', import.meta.url)), { recursive: true });
    await m.page.locator('#share-row').screenshot({ path: fileURLToPath(new URL('../.smoke/tiktok-row-360.png', import.meta.url)) });
    await m.context.close();

    assert.deepStrictEqual(errors, []);
  } finally {
    if (browser) await browser.close();
    proc.kill();
  }
});
