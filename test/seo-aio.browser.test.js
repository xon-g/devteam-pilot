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
const DISCLAIMER = "For entertainment only. Numbers are random and don't improve your odds. 18+. Play responsibly.";

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

test('SEO/AIO: content readable without JS; FAQ and app work with JS', { timeout: 120000 }, async () => {
  const port = await getFreePort();
  const { proc, ready } = startServer(port);
  let browser;
  try {
    await ready;
    const url = `http://127.0.0.1:${port}/devteam-pilot/`;
    browser = await launchStubbed(await loadChromium());

    const noJs = await browser.newContext({ javaScriptEnabled: false });
    const p0 = await noJs.newPage();
    await p0.goto(url, { waitUntil: 'load' });
    const faqText = await p0.locator('#about-games summary').allTextContents();
    assert.ok(faqText.length >= 5, 'FAQ summaries present without JS');
    assert.ok(faqText.some((t) => t.includes('Libre ba ito?')));
    const gamesText = await p0.locator('#about-games ul').textContent();
    assert.ok(gamesText.includes('Swertres (3D)') && gamesText.includes('Ultra Lotto 6/58'));
    await noJs.close();

    const ctx = await browser.newContext({ viewport: { width: 375, height: 800 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(url, { waitUntil: 'load' });

    const summary = page.locator('#about-games details').first().locator('summary');
    await summary.click();
    assert.strictEqual(await page.locator('#about-games details').first().evaluate((el) => el.open), true);

    await page.locator('.moods span', { hasText: /^Chill$/ }).click();
    await page.click('#draw');
    await page.locator('#draw:not([disabled])').waitFor();
    await page.waitForFunction(() => /\d/.test(document.querySelector('#combo-output').textContent));

    const fits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    assert.ok(fits, 'no horizontal scroll at 375px');
    assert.deepStrictEqual(errors, []);
    await ctx.close();

    for (const width of [360, 1280]) {
      const c = await browser.newContext({ viewport: { width, height: 800 } });
      const pg = await c.newPage();
      await pg.goto(url, { waitUntil: 'load' });
      const r = await pg.evaluate(() => {
        const el = document.querySelector('#about-games p.lore');
        el.scrollIntoView();
        const b = el.getBoundingClientRect();
        return {
          visible: b.width > 0 && b.height > 0 && getComputedStyle(el).visibility !== 'hidden',
          italic: getComputedStyle(el).fontStyle === 'italic',
          fits: document.documentElement.scrollWidth <= window.innerWidth,
        };
      });
      assert.ok(r.visible, `lore visible at ${width}px`);
      assert.ok(r.italic, `lore italic at ${width}px`);
      assert.ok(r.fits, `no horizontal scroll at ${width}px`);
      await c.close();
    }
  } finally {
    if (browser) await browser.close();
    proc.kill();
  }
});
