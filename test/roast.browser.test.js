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



import { AGE_ROASTS } from '../src/roast.js';

const VIEWPORT = { width: 375, height: 812 };
const pickMood = (page) => page.locator('.moods span', { hasText: /^Chill$/ }).click();
const pickGame = (page, name) => page.locator('.games span', { hasText: name }).click();

async function draw(page) {
  await page.click('#draw');
  await page.locator('#draw:not([disabled])').waitFor();
  await page.waitForFunction(() => !document.querySelector('#combo-output').classList.contains('prompt'));
}

const lines = (page) => page.$$eval('#roast li', (els) => els.map((e) => e.textContent));
const ageLines = (min, age) => AGE_ROASTS.find((b) => b.min === min).lines.map((t) => t.split('{age}').join(String(age)));

test('roast lines', { timeout: 120000 }, async () => {
  const port = await getFreePort();
  const { proc, ready } = startServer(port);
  let browser;
  const url = `http://localhost:${port}/`;
  try {
    await ready;
    const chromium = await loadChromium();
    browser = await launchStubbed(chromium);
    const context = await browser.newContext({ viewport: VIEWPORT, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto(url, { waitUntil: 'load' });

    // 1
    await page.fill('#name', '<i>Jo</i>');
    await page.fill('#age', '33');
    await pickMood(page);
    await draw(page);
    assert.ok(await page.isVisible('#roast'));
    const l1 = await lines(page);
    assert.strictEqual(l1.length, 2);
    assert.ok(l1[0].includes('<i>Jo</i>'), l1[0]);
    assert.strictEqual(await page.evaluate(() => document.querySelector('#roast i')), null);
    assert.ok(ageLines(30, 33).includes(l1[1]), l1[1]);
    fs.mkdirSync(`${ROOT}.smoke`, { recursive: true });
    await page.screenshot({ path: `${ROOT}.smoke/roast-375.png`, fullPage: true });

    // 2
    await page.fill('#name', '');
    await page.fill('#age', '');
    await draw(page);
    assert.ok(await page.isHidden('#roast'));

    // 3
    await page.fill('#age', '25');
    await draw(page);
    const l3 = await lines(page);
    assert.strictEqual(l3.length, 1);
    assert.ok(ageLines(22, 25).includes(l3[0]), l3[0]);

    // 4
    await pickGame(page, 'Ultra Lotto 6/58');
    assert.ok(await page.isHidden('#roast'));
    assert.strictEqual(await page.evaluate(() => document.querySelector('#roast').children.length), 0);

    assert.deepStrictEqual(errors, []);
    await context.close();

    // 5
    const sm = await browser.newContext({ viewport: { width: 360, height: 740 }, reducedMotion: 'reduce' });
    const p5 = await sm.newPage();
    await p5.goto(url, { waitUntil: 'load' });
    await p5.fill('#name', 'W'.repeat(30));
    await p5.fill('#age', '99');
    await pickMood(p5);
    await draw(p5);
    assert.ok(await p5.isVisible('#roast'));
    const overflow = await p5.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(overflow <= 0, `sideways scroll ${overflow}`);
    await sm.close();
  } finally {
    if (browser) await browser.close();
    proc.kill();
  }
});
