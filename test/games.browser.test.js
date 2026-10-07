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



const pickMood = (page) => page.locator('.moods span', { hasText: /^Chill$/ }).click();
const pickGame = (page, name) => page.locator('.games span', { hasText: name }).click();
const balls = (page) => page.$$eval('.digit', (els) => els.map((el) => el.textContent.trim()));
const out = async (page) => (await page.textContent('#combo-output')).trim();

async function draw(page, re) {
  await page.click('#draw');
  await page.locator('#draw:not([disabled])').waitFor();
  await page.waitForFunction((src) => new RegExp(src).test(document.querySelector('#combo-output').textContent.trim()), re.source);
}

test('game picker', { timeout: 120000 }, async () => {
  const port = await getFreePort();
  const { proc, ready } = startServer(port);
  let browser;
  try {
    await ready;
    const chromium = await loadChromium();
    browser = await chromium.launch();
    const context = await browser.newContext({ viewport: { width: 360, height: 740 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto(`http://localhost:${port}/`, { waitUntil: 'load' });

    // 1
    assert.strictEqual(await page.locator('input[name="game"]').count(), 9);
    assert.strictEqual(await page.locator('input[name="game"][value="3d"]').isChecked(), true);
    assert.strictEqual((await balls(page)).length, 3);
    assert.strictEqual(await page.locator('#mode-group').isVisible(), true);

    // 2
    await pickMood(page);
    await pickGame(page, 'Ultra Lotto 6/58');
    await draw(page, /^\d\d(-\d\d){5}$/);
    const b = await balls(page);
    assert.strictEqual(b.length, 6);
    for (const t of b) assert.match(t, /^\d\d$/);
    const nums = b.map(Number);
    for (let i = 0; i < 6; i++) {
      assert.ok(nums[i] >= 1 && nums[i] <= 58);
      if (i) assert.ok(nums[i] > nums[i - 1]);
    }
    assert.match(await out(page), /^\d\d(-\d\d){5}$/);
    const reasons = await page.$$eval('.reason', (els) => els.map((el) => el.textContent.trim()));
    assert.strictEqual(reasons.length, 6);
    assert.strictEqual(new Set(reasons).size, 6);
    assert.strictEqual(await page.locator('#mode-group').isVisible(), false);
    assert.ok((await page.textContent('.eyebrow')).includes('Ultra Lotto 6/58'));
    await page.screenshot({ path: '.smoke/ultra-360x740.png', fullPage: true });

    // 6
    for (const vp of [{ width: 360, height: 740 }, { width: 1280, height: 800 }]) {
      await page.setViewportSize(vp);
      const m = await page.evaluate(() => {
        const box = document.querySelector('.balls').getBoundingClientRect();
        return {
          overflow: document.documentElement.scrollWidth - window.innerWidth,
          inside: [...document.querySelectorAll('.digit')].every((d) => {
            const r = d.getBoundingClientRect();
            return r.left >= box.left - 0.5 && r.right <= box.right + 0.5 && r.top >= box.top - 0.5 && r.bottom <= box.bottom + 0.5;
          }),
          clipped: [...document.querySelectorAll('.digit')].some((d) => d.scrollWidth > d.clientWidth),
          chips: [...document.querySelectorAll('.games span')].map((el) => el.getBoundingClientRect().height),
        };
      });
      assert.ok(m.overflow <= 0, `${vp.width}: sideways scroll`);
      assert.ok(m.inside, `${vp.width}: ball outside .balls`);
      assert.ok(!m.clipped, `${vp.width}: ball text clipped`);
      assert.strictEqual(m.chips.length, 9);
      for (const h of m.chips) assert.ok(h >= 44, `${vp.width}: chip height ${h}`);
    }
    await page.setViewportSize({ width: 360, height: 740 });

    // 3
    await pickGame(page, 'EZ2');
    assert.strictEqual(await page.locator('#mode-group').isVisible(), true);
    await draw(page, /^\d\d-\d\d$/);
    const e = (await balls(page)).map(Number);
    assert.strictEqual(e.length, 2);
    for (const n of e) assert.ok(n >= 1 && n <= 31);
    await page.locator('.segmented span', { hasText: /^Rambolito$/ }).click();
    const pair = e.map((n) => String(n).padStart(2, '0'));
    const expected = e[0] === e[1] ? pair[0] + '-' + pair[1] : [pair.join('-'), pair.slice().reverse().join('-')].sort().join(', ');
    assert.strictEqual(await out(page), expected);
    await page.locator('.segmented span', { hasText: /^Straight$/ }).click();

    // 4
    await pickGame(page, '6D Lotto');
    await draw(page, /^\d(-\d){5}$/);
    const d = await balls(page);
    assert.strictEqual(d.length, 6);
    for (const t of d) assert.match(t, /^\d$/);

    // 5
    await pickGame(page, 'Swertres (3D)');
    assert.strictEqual((await balls(page)).length, 3);
    assert.strictEqual(await page.locator('#combo-output.prompt').count(), 1);
    assert.strictEqual(await page.locator('#share').isDisabled(), true);
    assert.strictEqual(await page.locator('#mode-group').isVisible(), true);
    await page.screenshot({ path: '.smoke/swertres-360x740.png', fullPage: false });

    // rename: title, not-affiliated note clear of the footer, no sideways scroll
    assert.ok((await page.evaluate(() => document.title)).includes('Lotto Lucky Numbers PH'));
    await page.locator('#not-affiliated').scrollIntoViewIfNeeded();
    assert.strictEqual(await page.locator('#not-affiliated').isVisible(), true);
    const boxes = await page.evaluate(() => {
      const r = (s) => { const b = document.querySelector(s).getBoundingClientRect(); return { top: b.top, bottom: b.bottom }; };
      return { note: r('#not-affiliated'), foot: r('footer#disclaimer'),
        scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth };
    });
    assert.ok(boxes.note.bottom <= boxes.foot.top, 'note does not overlap footer');
    assert.ok(boxes.scrollW <= boxes.clientW, 'no sideways scroll');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: '.smoke/swertres-360x740.png', fullPage: false });

    // switch game during an animated draw
    await page.click('#draw');
    await pickGame(page, 'Ultra Lotto 6/58');
    await page.locator('#draw:not([disabled])').waitFor();
    assert.strictEqual((await balls(page)).length, 6);
    assert.strictEqual(await page.locator('#combo-output.prompt').count(), 1);
    assert.strictEqual(await page.locator('#share').isDisabled(), true);

    assert.deepStrictEqual(errors, []);
    await context.close();

    // 7
    const rm = await browser.newContext({ viewport: { width: 360, height: 740 } });
    const p2 = await rm.newPage();
    await p2.emulateMedia({ reducedMotion: 'reduce' });
    await p2.goto(`http://localhost:${port}/`, { waitUntil: 'load' });
    await pickMood(p2);
    await pickGame(p2, 'Ultra Lotto 6/58');
    await draw(p2, /^\d\d(-\d\d){5}$/);
    const r = (await balls(p2)).map(Number);
    assert.strictEqual(r.length, 6);
    for (const n of r) assert.ok(n >= 1 && n <= 58);
    await rm.close();
  } finally {
    if (browser) await browser.close();
    proc.kill();
  }
});
