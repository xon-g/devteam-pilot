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


const ORDER = ['Facebook', 'Messenger', 'Viber', 'WhatsApp', 'Telegram', 'X', 'TikTok', 'Instagram', 'Copy link', 'Save image'];
const IDS = ['fb', 'msgr', 'viber', 'wa', 'tg', 'x', 'tiktok', 'ig', 'copy', 'img'];
const ANDROID = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36';

async function setup(browser, port, opts, errors) {
  const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'], ...opts });
  await context.route('https://gc.zgo.at/**', (r) => r.abort());
  await context.route(/^https:\/\/(www\.facebook\.com|wa\.me|t\.me|twitter\.com)\//, (r) => r.abort());
  await context.addInitScript(() => {
    window.__gc = [];
    window.goatcounter = { count: (o) => window.__gc.push(o.path) };
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/gc\.zgo\.at|ERR_FAILED|ERR_BLOCKED/.test(m.text() + m.location().url)) errors.push(m.text());
  });
  page.on('popup', (p) => p.close().catch(() => {}));
  await page.goto(`http://localhost:${port}/devteam-pilot/`);
  return { context, page };
}

async function draw(page) {
  await page.locator('.moods span', { hasText: /^Chill$/ }).click();
  await page.click('#draw');
  await page.waitForFunction(() => /^\d-\d-\d$/.test(document.querySelector('#combo-output').textContent.trim()), null, { timeout: 20000 });
  await page.locator('#share:not([disabled])').waitFor();
}

test('share row', { timeout: 120000 }, async () => {
  const port = await getFreePort();
  const { proc, ready } = startServer(port);
  let browser;
  const errors = [];
  try {
    await ready;
    const chromium = await loadChromium();
    browser = await chromium.launch();

    // Desktop
    const d = await setup(browser, port, { viewport: { width: 1280, height: 800 } }, errors);
    let page = d.page;
    assert.ok(!(await page.isVisible('#share-row')), 'hidden before draw');
    assert.strictEqual((await page.textContent('#share')).trim(), 'Share');
    await draw(page);
    assert.ok(await page.isVisible('#share-row'));
    const labels = await page.$$eval('#share-row [data-share]', (els) => els.map((e) => e.textContent.trim()));
    assert.deepStrictEqual(labels, ORDER);
    const icons = await page.$$eval('#share-row [data-share]', (els) => els.map((e) => {
      const svgs = e.querySelectorAll('svg.share-icon');
      const r = svgs[0].getBoundingClientRect();
      return { n: svgs.length, aria: svgs[0].getAttribute('aria-hidden'), w: r.width, h: r.height };
    }));
    assert.strictEqual(icons.length, 10);
    for (const i of icons) if (i.w) assert.deepStrictEqual(i, { n: 1, aria: 'true', w: 20, h: 20 });
    const fills = await page.evaluate(() => {
      const f = (id) => getComputedStyle(document.querySelector(`[data-share="${id}"] svg`)).fill;
      return { fb: f('fb'), wa: f('wa'), tg: f('tg'), viber: f('viber'), x: f('x'), xColor: getComputedStyle(document.querySelector('[data-share="x"]')).color };
    });
    assert.deepStrictEqual(fills, { fb: 'rgb(8, 102, 255)', wa: 'rgb(37, 211, 102)', tg: 'rgb(38, 165, 228)', viber: 'rgb(115, 96, 242)', x: fills.x, xColor: fills.xColor });
    assert.strictEqual(fills.x, fills.xColor);
    assert.ok(!(await page.isVisible('[data-share="msgr"]')), 'msgr hidden on desktop');
    for (const id of IDS.filter((i) => i !== 'msgr')) assert.ok(await page.isVisible(`[data-share="${id}"]`), id);

    const combo = (await page.textContent('#combo-output')).trim();
    for (const id of ['fb', 'wa', 'tg', 'x']) {
      const a = page.locator(`a[data-share="${id}"]`);
      assert.strictEqual(await a.getAttribute('target'), '_blank');
      assert.match(await a.getAttribute('rel'), /noopener/);
      const href = await a.getAttribute('href');
      const sp = new URL(href).searchParams;
      const decoded = [...sp.values()].join(' ');
      assert.ok(id === 'fb' || decoded.includes(combo), `${id} has combo`);
      assert.ok(decoded.includes(`?ref=${id}`), `${id} ref`);
      await a.click();
      await page.waitForFunction((p) => window.__gc.includes(p), `share-done/${id}`);
    }

    await page.click('[data-share="copy"]');
    await page.waitForFunction(() => document.querySelector('#share-status').textContent === 'Nakopya na!');
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    assert.ok(clip.endsWith('?ref=copy'));
    assert.ok(clip.includes(combo));
    assert.ok((await page.evaluate(() => window.__gc)).includes('share-done/copy'));

    await page.check('input[name="game"][value="6-42"]', { force: true });
    assert.ok(!(await page.isVisible('#share-row')), 'hidden after game change');
    await d.context.close();

    // Native share stub
    const n = await setup(browser, port, { viewport: { width: 1280, height: 800 } }, errors);
    await n.page.evaluate(() => { window.__shareCalls = []; navigator.share = async (o) => { window.__shareCalls.push(o); }; });
    await draw(n.page);
    await n.page.click('#share');
    await n.page.waitForFunction(() => window.__shareCalls.length === 1);
    const url = await n.page.evaluate(() => window.__shareCalls[0].url);
    assert.ok(url.endsWith('?ref=native'));
    await n.context.close();

    // Mobile
    const m = await setup(browser, port, { viewport: { width: 375, height: 667 }, userAgent: ANDROID, isMobile: true, hasTouch: true }, errors);
    await draw(m.page);
    assert.ok(await m.page.isVisible('[data-share="msgr"]'));
    assert.ok((await m.page.getAttribute('[data-share="msgr"]', 'href')).startsWith('fb-messenger://share/?link='));
    await m.context.close();

    // 360px
    const s = await setup(browser, port, { viewport: { width: 360, height: 740 }, userAgent: ANDROID, isMobile: true }, errors);
    await draw(s.page);
    assert.ok(await s.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'no h-scroll');
    const hs = await s.page.$$eval('#share-row [data-share]', (els) => els.filter((e) => e.offsetParent).map((e) => e.getBoundingClientRect().height));
    assert.strictEqual(hs.length, 10);
    assert.ok(hs.every((h) => h >= 44), `heights ${hs}`);
    await s.page.locator('#share-row').screenshot({ path: '/home/node/projects/swertres/.smoke/share-row-360.png' });
    await s.context.close();

    assert.deepStrictEqual(errors, []);
  } finally {
    if (browser) await browser.close();
    proc.kill();
  }
});
