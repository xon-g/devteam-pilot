import { launchStubbed } from './ads-helpers.js';
import { test } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import net from 'node:net';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
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

const PAGES = ['about', 'contact', 'how-to-play', 'lucky-numbers', 'privacy', 'responsible-gaming'];
const visible = (page) => page.evaluate(() => Object.fromEntries(
  [...document.querySelectorAll('[data-lang-block]')].map((el) => [el.dataset.langBlock, !el.hidden && el.offsetParent !== null]),
));
const htmlLang = (page) => page.evaluate(() => document.documentElement.lang);
const bodyText = (page) => page.evaluate(() => document.body.innerText);

test('content page language picker', { timeout: 180000 }, async () => {
  const port = await getFreePort();
  const { proc, ready } = startServer(port);
  let browser;
  try {
    await ready;
    const base = `http://127.0.0.1:${port}/devteam-pilot/`;
    browser = await launchStubbed(await loadChromium());
    fs.mkdirSync(new URL('../.smoke', import.meta.url), { recursive: true });
    const shot = (page, name) => page.screenshot({ path: fileURLToPath(new URL(`../.smoke/${name}.png`, import.meta.url)), fullPage: true });

    // Fresh context: Taglish everywhere, no horizontal overflow at 360px, big tap targets
    for (const p of PAGES) {
      const ctx = await browser.newContext({ viewport: { width: 360, height: 780 }, reducedMotion: 'reduce' });
      const page = await ctx.newPage();
      const errors = [];
      page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
      page.on('pageerror', (e) => errors.push(String(e)));
      await page.goto(`${base}${p}/`, { waitUntil: 'load' });
      assert.deepStrictEqual(await visible(page), { taglish: true, en: false, tl: false, ceb: false }, p);
      assert.strictEqual(await htmlLang(page), 'fil', p);
      const layout = await page.evaluate(() => ({
        sw: document.documentElement.scrollWidth,
        heights: [...document.querySelectorAll('#lang-picker label')].map((l) => l.getBoundingClientRect().height),
        clipped: [...document.querySelectorAll('#lang-picker label')].filter((l) => l.scrollWidth > l.clientWidth || l.getBoundingClientRect().right > 360).length,
      }));
      assert.ok(layout.sw <= 360, `${p} scrollWidth ${layout.sw}`);
      assert.strictEqual(layout.heights.length, 4);
      assert.strictEqual(layout.clipped, 0, `${p} picker clipped`);
      for (const h of layout.heights) assert.ok(h >= 44, `${p} picker label ${h}`);
      assert.deepStrictEqual(errors, [], p);
      await ctx.close();
    }

    // Choice persists across pages and back to home
    const ctx = await browser.newContext({ viewport: { width: 360, height: 780 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto(`${base}about/`, { waitUntil: 'load' });
    await page.locator('#lang-picker span', { hasText: 'English' }).click();
    assert.deepStrictEqual(await visible(page), { taglish: false, en: true, tl: false, ceb: false });
    await page.goto(`${base}privacy/`, { waitUntil: 'load' });
    assert.deepStrictEqual(await visible(page), { taglish: false, en: true, tl: false, ceb: false });
    assert.strictEqual(await htmlLang(page), 'en');
    const en = await bodyText(page);
    for (const w of ['Tungkol', 'Hindi', 'namin', 'Walang']) assert.ok(!en.includes(w), `English privacy has ${w}`);
    assert.ok(en.includes('GoatCounter') && en.includes('Google'));
    await shot(page, 'privacy-en-360');
    await page.locator('#lang-picker span', { hasText: 'Tagalog' }).click();
    assert.deepStrictEqual(await visible(page), { taglish: false, en: false, tl: true, ceb: false });
    assert.strictEqual(await htmlLang(page), 'fil');
    await shot(page, 'privacy-tl-360');
    await page.locator('#lang-picker span', { hasText: 'Cebuano' }).click();
    assert.deepStrictEqual(await visible(page), { taglish: false, en: false, tl: false, ceb: true });
    assert.strictEqual(await htmlLang(page), 'ceb');
    const ceb = await bodyText(page);
    for (const w of ['Tungkol', 'namin', 'Walang', 'We ']) assert.ok(!ceb.includes(w), `Cebuano privacy has ${w}`);
    assert.ok(ceb.includes('GoatCounter') && ceb.includes('Google'));
    await shot(page, 'privacy-ceb-360');
    await page.goto(`${base}about/`, { waitUntil: 'load' });
    assert.deepStrictEqual(await visible(page), { taglish: false, en: false, tl: false, ceb: true });
    await page.goto(base, { waitUntil: 'load' });
    assert.strictEqual(await page.locator('input[name="lang"][value="ceb"]').isChecked(), true);
    await page.locator('#lang-picker span', { hasText: 'Tagalog' }).click();
    await page.goto(`${base}how-to-play/`, { waitUntil: 'load' });
    const tl = await bodyText(page);
    for (const w of ['Next draw', 'For entertainment only']) assert.ok(!tl.includes(w), `Tagalog page has ${w}`);
    await page.goto(base, { waitUntil: 'load' });
    assert.strictEqual(await page.locator('input[name="lang"][value="tl"]').isChecked(), true);
    await ctx.close();

    // Blocked localStorage: stays Taglish, no errors
    const bctx = await browser.newContext({ viewport: { width: 360, height: 780 } });
    await bctx.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } });
    });
    const bpage = await bctx.newPage();
    const berrors = [];
    bpage.on('console', (m) => { if (m.type() === 'error') berrors.push(m.text()); });
    bpage.on('pageerror', (e) => berrors.push(String(e)));
    for (const p of PAGES) {
      await bpage.goto(`${base}${p}/`, { waitUntil: 'load' });
      assert.deepStrictEqual(await visible(bpage), { taglish: true, en: false, tl: false, ceb: false }, p);
    }
    assert.deepStrictEqual(berrors, []);
    await bctx.close();
  } finally {
    if (browser) await browser.close();
    proc.kill();
  }
});
