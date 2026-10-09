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
const TEXTS = ['Masaya', 'Pagod', 'Stressed', 'Kinikilig', 'Chill', 'Ewan ko'];

test('mood emojis render at 320, 375 and 1280', { timeout: 90000 }, async () => {
  const port = await getFreePort();
  const { proc, ready } = startServer(port);
  let browser;
  try {
    await ready;
    const chromium = await loadChromium();
    browser = await launchStubbed(chromium);
    for (const width of [320, 375, 1280]) {
      const context = await browser.newContext({ viewport: { width, height: 800 }, reducedMotion: 'reduce' });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (err) => errors.push(err.message));
      page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
      await page.goto(`http://localhost:${port}/`, { waitUntil: 'load' });
      const r = await page.evaluate(() => ({
        sw: document.documentElement.scrollWidth,
        cw: document.documentElement.clientWidth,
        spans: [...document.querySelectorAll('input[name="mood"] + span')].map((s) => {
          const rc = s.getBoundingClientRect();
          return { text: s.textContent, content: getComputedStyle(s, '::before').content, top: rc.top, bottom: rc.bottom, left: rc.left, right: rc.right };
        }),
      }));
      assert.ok(r.sw <= r.cw, `no horizontal scroll at ${width}`);
      assert.strictEqual(r.spans.length, 6);
      r.spans.forEach((s, i) => {
        assert.strictEqual(s.text, TEXTS[i]);
        assert.notStrictEqual(s.content, 'none');
        assert.ok(s.bottom - s.top >= 44, `span height ${s.bottom - s.top}`);
      });
      for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) {
        const a = r.spans[i], b = r.spans[j];
        const overlap = a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5;
        assert.ok(!overlap, `spans ${i} and ${j} overlap at ${width}`);
      }
      await page.fill('#age', '25');
      await page.locator('.moods span', { hasText: /^Ewan ko$/ }).click();
      await page.click('#draw');
      await page.waitForFunction(() => /^\d-\d-\d$/.test(document.querySelector('#combo-output').textContent.trim()));
      assert.deepStrictEqual(errors, []);
      await context.close();
    }
  } finally {
    if (browser) await browser.close();
    proc.kill();
  }
});
