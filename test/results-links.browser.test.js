import { launchStubbed } from './ads-helpers.js';
import { test } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';
import { PLAYWRIGHT } from '../scripts/playwright-path.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

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


const GAMES = [
  ['2d', 'EZ2 (2D)'], ['3d', 'Swertres (3D)'], ['4d', '4D Lotto'], ['6d', '6D Lotto'],
  ['6-42', 'Lotto 6/42'], ['6-45', 'Mega Lotto 6/45'], ['6-49', 'Super Lotto 6/49'],
  ['6-55', 'Grand Lotto 6/55'], ['6-58', 'Ultra Lotto 6/58'],
];
const RESULTS_URL = 'https://www.pcso.gov.ph/SearchLottoResult.aspx';
const FACEBOOK_URL = 'https://www.facebook.com/pcsoofficialsocialmedia';

test('official results links', { timeout: 120000 }, async () => {
  const port = await getFreePort();
  const { proc, ready } = startServer(port);
  let browser;
  try {
    await ready;
    const chromium = await loadChromium();
    browser = await launchStubbed(chromium);
    const context = await browser.newContext({ viewport: { width: 360, height: 740 } });
    const stub = (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>stub</title>' });
    await context.route('https://gc.zgo.at/**', (r) => r.abort());
    await context.route('https://www.pcso.gov.ph/**', stub);
    await context.route('https://www.facebook.com/**', stub);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const isAnalytics = (u) => /gc\.zgo\.at/.test(u || '');
    page.on('console', (m) => {
      if (m.type() !== 'error') return;
      if (isAnalytics(m.text()) || isAnalytics(m.location().url)) return;
      errors.push(m.text());
    });
    await page.goto(`http://localhost:${port}/devteam-pilot/`);

    assert.ok(await page.isVisible('#official-results'));
    assert.strictEqual((await page.textContent('#results-game')).trim(), 'Swertres (3D)');

    for (const [id, name] of GAMES) {
      await page.check(`input[name="game"][value="${id}"]`, { force: true });
      assert.ok(await page.isVisible('#official-results'), id);
      assert.strictEqual((await page.textContent('#results-game')).trim(), name, id);
    }
    await page.check('input[name="game"][value="1-58"]', { force: true });
    assert.ok(!(await page.isVisible('#official-results')), '1-58 hidden');
    await page.check('input[name="game"][value="3d"]', { force: true });
    assert.ok(await page.isVisible('#official-results'));

    for (const [key, url] of [['site', RESULTS_URL], ['facebook', FACEBOOK_URL]]) {
      const [popup] = await Promise.all([
        context.waitForEvent('page'),
        page.click(`#official-results a[data-results="${key}"]`),
      ]);
      await popup.waitForLoadState();
      assert.strictEqual(popup.url(), url);
      await popup.close();
    }

    const fits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    assert.ok(fits, 'horizontal scroll at 360px');
    const heights = await page.$$eval('#official-results a', (els) => els.map((e) => e.getBoundingClientRect().height));
    assert.strictEqual(heights.length, 2);
    assert.ok(heights.every((h) => h >= 24), `link heights ${heights}`);
    assert.deepStrictEqual(errors, []);
  } finally {
    if (browser) await browser.close();
    proc.kill();
  }
});
