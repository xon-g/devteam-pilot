import { launchStubbed } from './ads-helpers.js';
import { test } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { MOOD_REASONS } from '../src/reasons.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PLAYWRIGHT = '/usr/local/lib/node_modules/playwright';
const DISCLAIMER = "For entertainment only. Numbers are random and don't improve your odds. 18+. Play responsibly.";
const BANNED = ['guarantee', 'sigurado', 'siguradong panalo', 'tsansa', 'odds', 'better chance', 'sure win', 'jackpot ka na', 'panalo', 'tatama', 'jackpot'];
const VIEWPORT = { width: 375, height: 812 };

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


const CHILL = (page) => page.locator('.moods span', { hasText: /^Chill$/ });

async function finishDraw(page) {
  await page.click('#draw');
  await page.locator('#draw:not([disabled])').waitFor();
  await page.waitForFunction(() => /^\d-\d-\d$/.test(document.querySelector('#combo-output').textContent.trim()));
}

test('about-you form', { timeout: 90000 }, async () => {
  const port = await getFreePort();
  const { proc, ready } = startServer(port);
  let browser;
  try {
    await ready;
    const chromium = await loadChromium();
    browser = await launchStubbed(chromium);
    const context = await browser.newContext({ viewport: VIEWPORT, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    const url = `http://localhost:${port}/`;
    await page.goto(url, { waitUntil: 'load' });

    // 1
    assert.strictEqual(await page.locator('#draw').isDisabled(), true);
    assert.strictEqual((await page.textContent('#form-status')).trim(), 'Pumili ng mood para makabunot.');

    // 2
    await page.locator('.moods span', { hasText: /^Masaya$/ }).click();
    assert.strictEqual(await page.locator('#draw').isDisabled(), false);
    assert.strictEqual(await page.locator('input[value="masaya"]').isChecked(), true);

    // 3
    await page.fill('#age', '15');
    assert.strictEqual(await page.locator('#draw').isDisabled(), true);
    assert.ok((await page.textContent('#form-status')).includes('18+ lang'));
    await page.fill('#age', '17');
    assert.strictEqual(await page.locator('#draw').isDisabled(), true);
    await page.fill('#age', '');
    assert.strictEqual(await page.locator('#draw').isDisabled(), false);
    await page.fill('#age', '25');
    assert.strictEqual(await page.locator('#draw').isDisabled(), false);

    // 4, 5
    await page.fill('#name', '<b>Bea</b>');
    await finishDraw(page);
    const forName = await page.evaluate(() => ({
      text: document.querySelector('#for-name').textContent,
      hidden: document.querySelector('#for-name').hidden,
      hasB: document.querySelector('#for-name b') !== null,
    }));
    assert.strictEqual(forName.text, 'Para kay <b>Bea</b>');
    assert.strictEqual(forName.hidden, false);
    assert.strictEqual(forName.hasB, false);
    const reasons = await page.$$eval('.reason', (els) => els.map((el) => el.textContent.trim()));
    assert.strictEqual(new Set(reasons).size, 3);
    for (const r of reasons) assert.ok(MOOD_REASONS.masaya.includes(r), `unexpected reason ${r}`);
    assert.match((await page.textContent('#combo-output')).trim(), /^\d-\d-\d$/);

    // 6
    const digitsBefore = await page.$$eval('.digit', (els) => els.map((el) => el.textContent.trim()));
    await page.focus('#name');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    assert.strictEqual(page.url(), url);
    assert.deepStrictEqual(await page.$$eval('.digit', (els) => els.map((el) => el.textContent.trim())), digitsBefore);

    // 7
    const stored = await page.evaluate(() => ({ l: localStorage.length, s: sessionStorage.length, c: document.cookie }));
    assert.deepStrictEqual(stored, { l: 0, s: 0, c: '' });

    // 9: draw in flight must not re-enable #draw when the form became invalid
    await page.fill('#name', '');
    await page.fill('#age', '20');
    const slow = await browser.newContext({ viewport: VIEWPORT });
    const slowPage = await slow.newPage();
    await slowPage.goto(url, { waitUntil: 'load' });
    await CHILL(slowPage).click();
    await slowPage.fill('#age', '20');
    await slowPage.click('#draw');
    await slowPage.fill('#age', '15');
    await slowPage.waitForFunction(() => /^\d-\d-\d$/.test(document.querySelector('#combo-output').textContent.trim()));
    await slowPage.waitForTimeout(300);
    assert.strictEqual(await slowPage.locator('#draw').isDisabled(), true, '#draw must stay disabled when age is 15 after the draw');
    await slow.close();

    assert.deepStrictEqual(errors, []);
    await context.close();

    // 8
    for (const vp of [{ width: 360, height: 740 }, { width: 1280, height: 800 }]) {
      const ctx = await browser.newContext({ viewport: vp, reducedMotion: 'reduce' });
      const p = await ctx.newPage();
      await p.goto(url, { waitUntil: 'load' });
      const m = await p.evaluate(() => {
        const box = (el) => el.getBoundingClientRect();
        const about = box(document.querySelector('.about'));
        const age = box(document.querySelector('#age'));
        return {
          overflow: document.documentElement.scrollWidth - window.innerWidth,
          heights: [...document.querySelectorAll('#name, #age, .moods span')].map((el) => box(el).height),
          ageInside: age.left >= about.left && age.right <= about.right && age.top >= about.top && age.bottom <= about.bottom,
        };
      });
      assert.ok(m.overflow <= 0, `${vp.width}: sideways scroll ${m.overflow}`);
      assert.strictEqual(m.heights.length, 8);
      for (const h of m.heights) assert.ok(h >= 44, `${vp.width}: control height ${h}`);
      assert.ok(m.ageInside, `${vp.width}: #age outside .about`);
      await ctx.close();
    }
  } finally {
    if (browser) await browser.close();
    proc.kill();
  }
});

test('screenshots', { timeout: 60000 }, async () => {
  const port = await getFreePort();
  const { proc, ready } = startServer(port);
  let browser;
  try {
    await ready;
    const chromium = await loadChromium();
    browser = await launchStubbed(chromium);
    fs.mkdirSync(new URL('../.smoke', import.meta.url), { recursive: true });
    for (const [w, h] of [[375, 812], [1280, 800]]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
      const p = await ctx.newPage();
      await p.goto(`http://localhost:${port}/`, { waitUntil: 'load' });
      await p.fill('#name', 'Bea Cruz');
      await p.fill('#age', '25');
      await CHILL(p).click();
      await finishDraw(p);
      await p.screenshot({ path: fileURLToPath(new URL(`../.smoke/form-${w}.png`, import.meta.url)), fullPage: true });
      await ctx.close();
    }
  } finally {
    if (browser) await browser.close();
    proc.kill();
  }
});
