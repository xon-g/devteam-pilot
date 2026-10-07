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
const CODES = ['2D', '3D', '4D', '6D', '42', '45', '49', '55', '58'];
const TEXTS = ['EZ2 (2D)', 'Swertres (3D)', '4D Lotto', '6D Lotto', 'Lotto 6/42', 'Mega Lotto 6/45', 'Super Lotto 6/49', 'Grand Lotto 6/55', 'Ultra Lotto 6/58'];

test('game badges render at 320, 375 and 1280', { timeout: 90000 }, async () => {
  const port = await getFreePort();
  const { proc, ready } = startServer(port);
  let browser;
  try {
    await ready;
    const chromium = await loadChromium();
    browser = await chromium.launch();
    for (const width of [320, 375, 1280]) {
      const context = await browser.newContext({ viewport: { width, height: 800 }, reducedMotion: 'reduce' });
      const page = await context.newPage();
      await page.goto(`http://localhost:${port}/`, { waitUntil: 'load' });
      const r = await page.evaluate(() => ({
        sw: document.documentElement.scrollWidth,
        cw: document.documentElement.clientWidth,
        spans: [...document.querySelectorAll('input[name="game"] + span')].map((s) => {
          const b = getComputedStyle(s, '::before');
          const rc = s.getBoundingClientRect();
          return { text: s.textContent, content: b.content, w: parseFloat(b.width), h: parseFloat(b.height), bg: b.backgroundImage, top: rc.top, bottom: rc.bottom, left: rc.left, right: rc.right };
        }),
      }));
      assert.ok(r.sw <= r.cw, `no horizontal scroll at ${width}`);
      assert.strictEqual(r.spans.length, 9);
      r.spans.forEach((s, i) => {
        assert.strictEqual(s.text, TEXTS[i]);
        assert.notStrictEqual(s.content, 'none');
        assert.ok(s.content.includes(CODES[i]), `content ${s.content}`);
        assert.ok(Math.abs(s.w - s.h) < 0.5 && s.w >= 20, `ball ${s.w}x${s.h}`);
        assert.ok(s.bg.includes('radial-gradient'));
        assert.strictEqual(s.bg.includes('255, 209, 225') || s.bg.includes('194, 24, 91'), i >= 4, `pink only for lotto (${i})`);
        assert.ok(s.bottom - s.top >= 44, `span height ${s.bottom - s.top}`);
      });
      for (let i = 0; i < 9; i++) for (let j = i + 1; j < 9; j++) {
        const a = r.spans[i], b = r.spans[j];
        const overlap = a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5;
        assert.ok(!overlap, `spans ${i} and ${j} overlap at ${width}`);
      }
      if (width === 375) {
        await page.locator('.games').scrollIntoViewIfNeeded();
        await page.locator('.games').screenshot({ path: '/tmp/game-badges-375.png' });
      }
      await context.close();
    }
  } finally {
    if (browser) await browser.close();
    proc.kill();
  }
});
