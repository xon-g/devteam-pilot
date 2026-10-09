import { launchStubbed } from './ads-helpers.js';
import { test } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import net from 'node:net';
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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fillProfile(page) {
  await page.fill('#name', 'Jo');
  await page.fill('#age', '33');
  await pickMood(page);
}

const allLanded = () => {
  const balls = [...document.querySelectorAll('#balls .digit, .digit')];
  return balls.length > 0 && balls.every((b) => b.classList.contains('landed') && !b.classList.contains('rolling'));
};

for (const width of [375, 1280]) {
  test(`smooth animations @${width}`, { timeout: 120000 }, async () => {
    const port = await getFreePort();
    const { proc, ready } = startServer(port);
    let browser;
    try {
      await ready;
      const chromium = await loadChromium();
      browser = await launchStubbed(chromium);
      const context = await browser.newContext({ viewport: { width, height: 812 } });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (err) => errors.push(err.message));
      await page.goto(`http://localhost:${port}/`, { waitUntil: 'load' });
      await fillProfile(page);

      // warm-up draw (not measured): the first draw on a cold page pays one-off costs
      // (audio init, style/layout, timer slack) that say nothing about animation smoothness
      await page.click('#draw');
      await page.waitForFunction(allLanded, null, { polling: 25 });
      await page.locator('#draw:not([disabled])').waitFor();

      // a: keyframes only animate transform/opacity
      const props = await page.evaluate(() => {
        const out = [];
        for (const sheet of document.styleSheets) {
          for (const rule of sheet.cssRules) {
            if (rule.type !== CSSRule.KEYFRAMES_RULE) continue;
            for (const kf of rule.cssRules) {
              for (let i = 0; i < kf.style.length; i++) out.push(kf.style[i]);
            }
          }
        }
        return [...new Set(out)];
      });
      assert.ok(props.length > 0);
      for (const p of props) assert.ok(['transform', 'opacity'].includes(p), `keyframe property ${p}`);

      // b, c, h: draw 6/58
      await pickGame(page, 'Ultra Lotto 6/58');
      await fillProfile(page);
      await page.click('#draw');
      const t0 = Date.now();
      await page.waitForSelector('.digit.rolling');
      const rolling = await page.evaluate(() => {
        const cs = getComputedStyle(document.querySelector('.digit.rolling'));
        return { d: cs.animationDuration, f: cs.animationTimingFunction };
      });
      const dur = parseFloat(rolling.d);
      assert.ok(dur >= 0.36 && dur <= 0.6, rolling.d);
      assert.notStrictEqual(rolling.f, 'linear');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), 'overflow while rolling');
      await page.waitForFunction(allLanded, null, { polling: 25 });
      const elapsed = Date.now() - t0;
      // The draw is ~1.8s of chained setTimeouts (16 timers). Allow the 2s budget plus this
      // machine's measured per-timer slack, so a slow host doesn't fail while a real
      // regression (more frames, longer waits) still does.
      const slack = await page.evaluate(async () => {
        const over = [];
        for (let i = 0; i < 10; i++) {
          const a = performance.now();
          await new Promise((r) => setTimeout(r, 45));
          over.push(performance.now() - a - 45);
        }
        return over.sort((x, y) => x - y)[5];
      });
      const budget = 2000 + 16 * Math.max(0, slack);
      assert.ok(elapsed <= budget, `elapsed ${elapsed} > budget ${Math.round(budget)} (timer slack ${slack.toFixed(1)}ms)`);
      assert.strictEqual(await page.evaluate(() => document.querySelectorAll('.digit').length), 6);
      const names = await page.evaluate(() => [...document.querySelectorAll('.digit')].map((b) => getComputedStyle(b).animationName));
      assert.deepStrictEqual([...new Set(names)], ['land']);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), 'overflow after draw');

      // e: fade-ins end fully visible
      await page.locator('#draw:not([disabled])').waitFor();
      await sleep(600);
      const vis = await page.evaluate(() => ['.reasons', '#roast', '#for-name'].map((s) => {
        const el = document.querySelector(s);
        return { s, hidden: el.hidden, op: getComputedStyle(el).opacity };
      }));
      for (const v of vis) {
        assert.strictEqual(v.hidden, false, v.s);
        assert.strictEqual(v.op, '1', v.s);
      }

      // d: second draw replays landing
      await page.click('#draw');
      await page.waitForSelector('.digit.rolling');
      assert.strictEqual(await page.evaluate(() => document.querySelectorAll('.digit.landed').length), 0);
      await page.waitForFunction(allLanded, null, { polling: 25 });
      const names2 = await page.evaluate(() => [...document.querySelectorAll('.digit')].map((b) => getComputedStyle(b).animationName));
      assert.deepStrictEqual([...new Set(names2)], ['land']);

      // f: transitions
      await page.locator('#draw:not([disabled])').waitFor();
      const tr = await page.evaluate(() => [document.querySelector('.games span'), document.querySelector('#draw')].map((el) => {
        const cs = getComputedStyle(el);
        return { p: cs.transitionProperty, d: cs.transitionDuration };
      }));
      for (const t of tr) {
        assert.ok(t.p.includes('transform') || t.p === 'all', t.p);
        const d = parseFloat(t.d);
        assert.ok(d > 0 && d <= 0.2, t.d);
      }

      assert.deepStrictEqual(errors, []);
      await context.close();

      // g: reduced motion
      const rc = await browser.newContext({ viewport: { width, height: 812 } });
      const rp = await rc.newPage();
      await rp.goto(`http://localhost:${port}/`, { waitUntil: 'load' });
      await rp.emulateMedia({ reducedMotion: 'reduce' });
      await fillProfile(rp);
      await rp.click('#draw');
      const r0 = Date.now();
      await rp.waitForFunction(() => !document.querySelector('#combo-output').classList.contains('prompt'));
      assert.ok(Date.now() - r0 <= 300);
      const rm = await rp.evaluate(() => ({
        a: [...document.querySelectorAll('.digit')].map((b) => getComputedStyle(b).animationName),
        t: [...document.querySelectorAll('.games span, .moods span')].map((e) => getComputedStyle(e).transitionDuration),
      }));
      assert.ok(rm.a.length > 0 && rm.a.every((n) => n === 'none'));
      assert.ok(rm.t.every((d) => d === '0s'));
      await rc.close();
    } finally {
      if (browser) await browser.close();
      proc.kill();
    }
  });
}
