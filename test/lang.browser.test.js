import { launchStubbed } from './ads-helpers.js';
import { test } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import net from 'node:net';
import fs from 'node:fs';
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

async function drawIn(page, name = '') {
  if (name) await page.fill('#name', name);
  await page.locator('.moods span[data-emoji="😎"]').click();
  await page.click('#draw');
  await page.locator('#draw:not([disabled])').waitFor();
  await page.waitForFunction(() => /^\d-\d-\d$/.test(document.querySelector('#combo-output').textContent.trim()));
}

const bodyText = (page) => page.evaluate(() => document.body.innerText);
const htmlLang = (page) => page.evaluate(() => document.documentElement.lang);

test('language picker', { timeout: 120000 }, async () => {
  const port = await getFreePort();
  const { proc, ready } = startServer(port);
  let browser;
  try {
    await ready;
    const url = `http://127.0.0.1:${port}/devteam-pilot/`;
    browser = await launchStubbed(await loadChromium());
    fs.mkdirSync(new URL('../.smoke', import.meta.url), { recursive: true });
    const shot = (page, name) => page.screenshot({ path: fileURLToPath(new URL(`../.smoke/${name}.png`, import.meta.url)), fullPage: true });

    // Fresh context: Taglish
    const ctx = await browser.newContext({ viewport: { width: 360, height: 780 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(url, { waitUntil: 'load' });
    assert.strictEqual(await page.locator('input[name="lang"][value="taglish"]').isChecked(), true);
    assert.strictEqual(await htmlLang(page), 'fil');
    assert.strictEqual((await page.textContent('#draw')).trim(), 'Bunot na!');

    // 360px layout
    const layout = await page.evaluate(() => ({
      sw: document.documentElement.scrollWidth,
      heights: [...document.querySelectorAll('#lang-picker label')].map((l) => l.getBoundingClientRect().height),
    }));
    assert.ok(layout.sw <= 360, `scrollWidth ${layout.sw}`);
    assert.strictEqual(layout.heights.length, 4);
    for (const h of layout.heights) assert.ok(h >= 44, `picker label ${h}`);
    await shot(page, 'lang-top-360');

    // Draw in Taglish, then switch to English without redrawing
    await drawIn(page, 'Bea');
    const before = await page.evaluate(() => ({
      balls: [...document.querySelectorAll('.digit')].map((d) => d.textContent.trim()),
      reasons: [...document.querySelectorAll('.reason')].map((r) => r.textContent),
    }));
    await page.locator('#lang-picker span', { hasText: 'English' }).click();
    assert.strictEqual(await htmlLang(page), 'en');
    const after = await page.evaluate(async () => {
      const { MOOD_REASONS_I18N } = await import('/devteam-pilot/src/reasons.js');
      const reasons = [...document.querySelectorAll('.reason')].map((r) => r.textContent);
      const tg = MOOD_REASONS_I18N.taglish.chill;
      return {
        balls: [...document.querySelectorAll('.digit')].map((d) => d.textContent.trim()),
        reasons,
        expected: null,
        tg,
        en: MOOD_REASONS_I18N.en.chill,
        wa: document.querySelector('a[data-share="wa"]').href,
        forName: document.getElementById('for-name').textContent,
      };
    });
    assert.deepStrictEqual(after.balls, before.balls);
    assert.notDeepStrictEqual(after.reasons, before.reasons);
    before.reasons.forEach((r, i) => {
      const idx = after.tg.indexOf(r);
      assert.ok(idx >= 0, `old reason ${r} not in Taglish table`);
      assert.strictEqual(after.reasons[i], after.en[idx]);
    });
    assert.strictEqual(after.forName, 'For Bea');
    assert.ok(decodeURIComponent(after.wa).includes('lucky numbers for Bea'), after.wa);
    const en = await bodyText(page);
    for (const word of ['Bunot', 'Pindutin', 'Kumusta', 'Pumili', 'Tunog', 'Tungkol', 'Mga laro', 'bawat', 'walang ulit', 'Opisyal', 'Para kay']) {
      assert.ok(!en.includes(word), `English page still shows "${word}"`);
    }
    await shot(page, 'lang-result-en-360');

    // Reload keeps English
    await page.reload({ waitUntil: 'load' });
    assert.strictEqual(await page.evaluate(() => localStorage.getItem('lang')), 'en');
    assert.strictEqual(await page.locator('input[name="lang"][value="en"]').isChecked(), true);
    assert.strictEqual(await htmlLang(page), 'en');

    // Tagalog
    await page.locator('#lang-picker span', { hasText: 'Tagalog' }).click();
    assert.strictEqual(await htmlLang(page), 'fil');
    await drawIn(page, 'Bea');
    const tl = await bodyText(page);
    for (const word of ['Copy link', 'Save image', 'Next draw', 'Sound', 'optional', 'required', 'For fun', 'Draw']) {
      assert.ok(!tl.includes(word), `Tagalog page still shows "${word}"`);
    }
    await shot(page, 'lang-result-tl-360');

    // Cebuano: switch after a Taglish draw
    await page.locator('#lang-picker span', { hasText: 'Taglish' }).click();
    await drawIn(page, 'Bea');
    const tgReasons = await page.evaluate(() => [...document.querySelectorAll('.reason')].map((r) => r.textContent));
    const tgBalls = await page.evaluate(() => [...document.querySelectorAll('.digit')].map((d) => d.textContent.trim()));
    await page.locator('#lang-picker span', { hasText: 'Cebuano' }).click();
    assert.strictEqual(await htmlLang(page), 'ceb');
    const ceb = await page.evaluate(async () => {
      const { MOOD_REASONS_I18N } = await import('/devteam-pilot/src/reasons.js');
      const { shareText } = await import('/devteam-pilot/src/lucky.js');
      const vis = (id) => !document.getElementById(id).hidden;
      return {
        balls: [...document.querySelectorAll('.digit')].map((d) => d.textContent.trim()),
        reasons: [...document.querySelectorAll('.reason')].map((r) => r.textContent),
        tg: MOOD_REASONS_I18N.taglish.chill,
        ceb: MOOD_REASONS_I18N.ceb.chill,
        wa: decodeURIComponent(document.querySelector('a[data-share="wa"]').href),
        shareHead: shareText([1, 2, 3], 'straight', 'Bea', '3d', 'ceb').split(':')[0],
        visible: { taglish: vis('about-games'), en: vis('about-games-en'), tl: vis('about-games-tl'), ceb: vis('about-games-ceb') },
        sectionLang: document.getElementById('about-games-ceb').lang,
      };
    });
    assert.deepStrictEqual(ceb.balls, tgBalls);
    tgReasons.forEach((r, i) => assert.strictEqual(ceb.reasons[i], ceb.ceb[ceb.tg.indexOf(r)]));
    assert.ok(ceb.wa.includes(ceb.shareHead), ceb.wa);
    assert.ok(ceb.wa.includes('Mga lucky number ni Bea'), ceb.wa);
    assert.deepStrictEqual(ceb.visible, { taglish: false, en: false, tl: false, ceb: true });
    assert.strictEqual(ceb.sectionLang, 'ceb');
    const cebText = await bodyText(page);
    for (const word of ['Pindutin', 'Kumusta ka', 'Pumili', 'Tungkol', 'Copy link', 'Save image', 'Next draw']) {
      assert.ok(!cebText.includes(word), `Cebuano page still shows "${word}"`);
    }
    const cebLayout = await page.evaluate(() => ({
      sw: document.documentElement.scrollWidth,
      labels: [...document.querySelectorAll('#lang-picker label')].map((l) => {
        const sp = l.querySelector('span');
        return { h: l.getBoundingClientRect().height, clipped: sp.scrollWidth > sp.clientWidth };
      }),
    }));
    assert.ok(cebLayout.sw <= 360, `scrollWidth ${cebLayout.sw}`);
    assert.strictEqual(cebLayout.labels.length, 4);
    for (const l of cebLayout.labels) assert.ok(l.h >= 44 && !l.clipped, JSON.stringify(l));
    await shot(page, 'lang-result-ceb-360');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: fileURLToPath(new URL('../.smoke/lang-top-ceb-360.png', import.meta.url)) });

    // Reload keeps Cebuano; content pages show the Cebuano block
    await page.reload({ waitUntil: 'load' });
    assert.strictEqual(await page.evaluate(() => localStorage.getItem('lang')), 'ceb');
    assert.strictEqual(await htmlLang(page), 'ceb');
    await page.goto(new URL('about/', url).href, { waitUntil: 'load' });
    assert.strictEqual(await page.evaluate(() => document.querySelector('[data-lang-block="ceb"]').hidden), false);
    assert.strictEqual(await htmlLang(page), 'ceb');
    assert.deepStrictEqual(errors, []);
    await ctx.close();

    // Storage that throws
    const ctx2 = await browser.newContext({ viewport: { width: 360, height: 780 }, reducedMotion: 'reduce' });
    await ctx2.addInitScript(() => {
      Storage.prototype.getItem = () => { throw new Error('blocked'); };
      Storage.prototype.setItem = () => { throw new Error('blocked'); };
    });
    const p2 = await ctx2.newPage();
    const errors2 = [];
    p2.on('console', (m) => { if (m.type() === 'error') errors2.push(m.text()); });
    p2.on('pageerror', (e) => errors2.push(String(e)));
    await p2.goto(url, { waitUntil: 'load' });
    assert.strictEqual((await p2.textContent('#draw')).trim(), 'Bunot na!');
    await p2.locator('#lang-picker span', { hasText: 'English' }).click();
    assert.strictEqual((await p2.textContent('#draw')).trim(), 'Draw!');
    assert.strictEqual(await htmlLang(p2), 'en');
    assert.deepStrictEqual(errors2, []);
    await ctx2.close();
  } finally {
    if (browser) await browser.close();
    proc.kill();
  }
});
