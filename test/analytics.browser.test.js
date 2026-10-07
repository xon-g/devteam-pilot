import { launchStubbed } from './ads-helpers.js';
import { test } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

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
    env: { ...process.env, PORT: String(port) },
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



const VIEWPORT = { width: 375, height: 812 };

const STUB = 'window.__gc = []; window.goatcounter = { count: (o) => window.__gc.push(o) };';

async function flow(url, blocked) {
  const chromium = await loadChromium();
  const browser = await launchStubbed(chromium);
  try {
    const context = await browser.newContext({ viewport: VIEWPORT, reducedMotion: 'reduce' });
    await context.route('https://gc.zgo.at/**', (route) => blocked
      ? route.abort()
      : route.fulfill({ status: 200, contentType: 'application/javascript', body: STUB }));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/ERR_FAILED|Failed to load resource/.test(m.text())) errors.push(m.text()); });
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => {} }, configurable: true });
    });
    await page.goto(url, { waitUntil: 'load' });
    const before = await page.evaluate(() => [localStorage.length, sessionStorage.length]);
    await page.fill('#name', 'Juanita');
    await page.fill('#age', '30');
    await page.locator('.moods span', { hasText: /^Chill$/ }).click();
    await page.click('#draw');
    await page.locator('#draw:not([disabled])').waitFor();
    await page.waitForFunction(() => !document.querySelector('#combo-output').classList.contains('prompt'));
    await page.locator('#share:not([disabled])').waitFor();
    await page.click('#share');
    await page.waitForFunction(() => document.querySelector('#share-status').textContent === 'Nakopya na!');
    const after = await page.evaluate(() => [localStorage.length, sessionStorage.length]);
    const gc = await page.evaluate(() => window.__gc || null);
    const cookies = await context.cookies();
    const priv = await page.isVisible('#privacy-note');
    return { errors, before, after, gc, cookies, priv };
  } finally {
    await browser.close();
  }
}

test('analytics events, no personal data', { timeout: 120000 }, async () => {
  const port = await getFreePort();
  const { proc, ready } = startServer(port);
  try {
    await ready;
    const url = `http://localhost:${port}/`;
    const r = await flow(url, false);
    const paths = r.gc.map((o) => o.path);
    assert.ok(paths.includes('draw/3d/chill/straight'), paths.join());
    assert.ok(paths.includes('share-tap'));
    assert.ok(paths.includes('share-done/copy'));
    const json = JSON.stringify(r.gc);
    assert.ok(!json.includes('Juanita'));
    assert.ok(!/\b30\b/.test(json));
    assert.ok(r.gc.every((o) => o.event === true));
    assert.deepStrictEqual(r.cookies, []);
    assert.deepStrictEqual(r.after, r.before);
    assert.ok(r.priv);
    assert.deepStrictEqual(r.errors, []);

    const b = await flow(url, true);
    assert.strictEqual(b.gc, null);
    assert.deepStrictEqual(b.errors, []);
  } finally {
    proc.kill();
  }
});
