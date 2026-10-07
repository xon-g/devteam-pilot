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



const pickMood = (page) => page.locator('.moods span', { hasText: /^Chill$/ }).click();
test('Isang Numero draws one ball', { timeout: 90000 }, async () => {
  const port = await getFreePort();
  const { proc, ready } = startServer(port);
  let browser;
  try {
    await ready;
    browser = await launchStubbed(await loadChromium());
    for (const width of [375, 1280]) {
      const context = await browser.newContext({ viewport: { width, height: 800 }, reducedMotion: 'reduce' });
      const page = await context.newPage();
      await page.goto(`http://localhost:${port}/`, { waitUntil: 'load' });
      await page.locator('.moods span', { hasText: 'Masaya' }).click();
      await page.locator('.games span', { hasText: 'Isang Numero' }).click();
      await page.click('#draw');
      await page.locator('#draw:not([disabled])').waitFor();
      await page.waitForFunction(() => /^\d\d$/.test(document.querySelector('#combo-output').textContent.trim()));
      const r = await page.evaluate(() => ({
        balls: [...document.querySelectorAll('.digit')].filter((d) => d.getBoundingClientRect().width > 0).map((d) => d.textContent.trim()),
        eyebrow: document.querySelector('.eyebrow').textContent.trim(),
        modeHidden: document.getElementById('mode-group').hidden || getComputedStyle(document.getElementById('mode-group')).display === 'none',
        sw: document.documentElement.scrollWidth,
        cw: document.documentElement.clientWidth,
      }));
      assert.strictEqual(r.balls.length, 1);
      assert.match(r.balls[0], /^\d\d$/);
      assert.ok(Number(r.balls[0]) >= 1 && Number(r.balls[0]) <= 58);
      assert.strictEqual(r.eyebrow, 'Isang Numero (1–58)');
      assert.ok(r.modeHidden);
      assert.ok(r.sw <= r.cw, `no horizontal overflow at ${width}`);

      const p = await page.evaluate(() => {
        const spans = [...document.querySelectorAll('.games input[name="game"] + span')];
        return {
          columns: new Set(spans.map((s) => Math.round(s.getBoundingClientRect().left))).size,
          spans: spans.map((s) => {
            const b = s.getBoundingClientRect();
            return { left: b.left, right: b.right, top: b.top, bottom: b.bottom, lines: Math.round(b.height / parseFloat(getComputedStyle(s).lineHeight || '16')) };
          }),
        };
      });
      assert.strictEqual(p.spans.length, 10);
      assert.strictEqual(p.columns, width === 1280 ? 3 : 2);
      p.spans.forEach((s) => assert.ok(s.bottom - s.top >= 44, 'pill height'));
      for (let i = 0; i < 10; i++) for (let j = i + 1; j < 10; j++) {
        const a = p.spans[i], b = p.spans[j];
        assert.ok(!(a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5), `overlap ${i} ${j}`);
      }

      await page.locator('.games span', { hasText: 'Swertres' }).click();
      assert.strictEqual(await page.locator('.digit').count(), 3);
      await context.close();
    }
  } finally {
    if (browser) await browser.close();
    proc.kill();
  }
});
