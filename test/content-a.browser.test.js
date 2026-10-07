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


test('content-a pages: navigation and layout', { timeout: 120000 }, async () => {
  const port = await getFreePort();
  const { proc, ready } = startServer(port);
  let browser;
  try {
    await ready;
    const chromium = await loadChromium();
    browser = await launchStubbed(chromium);
    const page = await browser.newPage({ viewport: { width: 360, height: 740 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const isAnalytics = (u) => /gc\.zgo\.at/.test(u || '');
    page.on('console', (m) => {
      if (m.type() !== 'error') return;
      if (isAnalytics(m.text()) || isAnalytics(m.location().url)) return;
      errors.push(m.text());
    });
    await page.route('https://gc.zgo.at/**', (r) => r.abort());
    const base = `http://localhost:${port}/devteam-pilot/`;
    await page.goto(base);
    const checks = async (path, h1) => {
      await page.waitForURL('**/devteam-pilot/' + path);
      assert.strictEqual((await page.textContent('h1')).trim(), h1);
      const color = await page.evaluate(() => getComputedStyle(document.querySelector('.page h2')).color);
      assert.strictEqual(color, 'rgb(255, 201, 60)');
      assert.ok(await page.isVisible('#disclaimer'));
      const fits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
      assert.ok(fits, 'horizontal scroll at 360px on ' + path);
    };
    await page.click('.site-links a[href="how-to-play/"]');
    await checks('how-to-play/', 'Paano Laruin');
    await page.click('.site-links a[href="../lucky-numbers/"]');
    await checks('lucky-numbers/', 'Totoo ba ang Lucky Numbers?');
    assert.deepStrictEqual(errors, []);
  } finally {
    if (browser) await browser.close();
    proc.kill();
  }
});
