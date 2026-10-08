import { launchStubbed } from './ads-helpers.js';
import { test } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
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

const TEXTS = ['EZ2 (2D)', 'Swertres (3D)', '4D Lotto', '6D Lotto', 'Lotto 6/42', 'Mega Lotto 6/45', 'Super Lotto 6/49', 'Grand Lotto 6/55', 'Ultra Lotto 6/58', 'Isang Numero (1–58)'];

test('game picker spacing at 320, 375, 412 and 1280', { timeout: 90000 }, async () => {
  const port = await getFreePort();
  const { proc, ready } = startServer(port);
  let browser;
  try {
    await ready;
    const chromium = await loadChromium();
    browser = await launchStubbed(chromium);
    for (const width of [320, 375, 412, 1280]) {
      const context = await browser.newContext({ viewport: { width, height: 800 }, reducedMotion: 'reduce' });
      const page = await context.newPage();
      await page.goto(`http://localhost:${port}/`, { waitUntil: 'load' });
      const r = await page.evaluate(() => {
        const spans = [...document.querySelectorAll('.games input[name="game"] + span')];
        const lefts = new Set(spans.map((s) => Math.round(s.getBoundingClientRect().left)));
        const moods = new Set([...document.querySelectorAll('.moods input[name="mood"] + span')].map((s) => Math.round(s.getBoundingClientRect().left))).size;
        return {
          columns: lefts.size,
          moods,
          sw: document.documentElement.scrollWidth,
          cw: document.documentElement.clientWidth,
          spans: spans.map((s) => {
            const rc = s.getBoundingClientRect();
            const range = document.createRange();
            range.selectNodeContents(s);
            const tops = new Set([...range.getClientRects()].map((q) => Math.round(q.top)));
            const b = getComputedStyle(s, '::before');
            return { text: s.textContent, lines: tops.size, left: rc.left, right: rc.right, top: rc.top, bottom: rc.bottom, content: b.content, w: parseFloat(b.width), h: parseFloat(b.height) };
          }),
        };
      });
      assert.strictEqual(r.columns, width === 1280 ? 3 : 2, `columns at ${width}`);
      if (width === 375) assert.strictEqual(r.moods, 3, 'moods keep 3 columns');
      assert.ok(r.sw <= r.cw, `no horizontal scroll at ${width}`);
      assert.strictEqual(r.spans.length, 10);
      r.spans.forEach((s, i) => {
        assert.strictEqual(s.text, TEXTS[i]);
        assert.ok(s.lines <= 2, `${s.text} has ${s.lines} lines at ${width}`);
        assert.ok(s.bottom - s.top >= 44, `span height ${s.bottom - s.top}`);
        assert.notStrictEqual(s.content, 'none');
        assert.ok(Math.abs(s.w - s.h) < 0.5 && s.w >= 20, `ball ${s.w}x${s.h}`);
      });
      for (let i = 0; i < 10; i++) for (let j = i + 1; j < 10; j++) {
        const a = r.spans[i], b = r.spans[j];
        const overlap = a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5;
        assert.ok(!overlap, `spans ${i} and ${j} overlap at ${width}`);
      }
      await context.close();
    }
  } finally {
    if (browser) await browser.close();
    proc.kill();
  }
});
