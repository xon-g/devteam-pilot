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

test('mobile background: no white strip, layout unchanged', { timeout: 90000 }, async () => {
  const port = await getFreePort();
  const { proc, ready } = startServer(port);
  let browser;
  try {
    await ready;
    const chromium = await loadChromium();
    browser = await launchStubbed(chromium);
    const context = await browser.newContext({ viewport: { width: 360, height: 780 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto(`http://localhost:${port}/`, { waitUntil: 'load' });

    const styles = await page.evaluate(() => {
      const before = getComputedStyle(document.body, '::before');
      return {
        htmlBg: getComputedStyle(document.documentElement).backgroundColor,
        attachment: getComputedStyle(document.body).backgroundAttachment,
        pos: before.position,
        image: before.backgroundImage,
      };
    });
    assert.strictEqual(styles.htmlBg, 'rgb(18, 6, 31)');
    assert.notStrictEqual(styles.attachment, 'fixed');
    assert.strictEqual(styles.pos, 'fixed');
    assert.ok(styles.image.includes('radial-gradient'), styles.image);

    const layout = await page.evaluate(() => ({
      mainTop: document.querySelector('main').offsetTop,
      headerBottom: document.querySelector('header').offsetTop + document.querySelector('header').offsetHeight,
    }));
    assert.strictEqual(layout.mainTop, layout.headerBottom);

    // Simulate the toolbar hiding: viewport grows, scroll to bottom.
    await page.setViewportSize({ width: 360, height: 900 });
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(200);
    const footer = await page.evaluate(() => {
      const r = document.querySelector('footer#disclaimer').getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, vh: window.innerHeight, w: window.innerWidth };
    });
    assert.ok(footer.bottom > 0 && footer.top < footer.vh, 'footer visible');
    assert.ok(Math.abs(footer.bottom - footer.vh) <= 1, `footer at bottom: ${footer.bottom} vs ${footer.vh}`);

    const clipY = Math.max(0, Math.floor(footer.top) - 120);
    const clipH = Math.floor(footer.top) - clipY;
    assert.ok(clipH > 0);
    const buf = await page.screenshot({ clip: { x: 0, y: clipY, width: 360, height: clipH } });
    const white = await page.evaluate(async (b64) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      let n = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i] === 255 && d[i + 1] === 255 && d[i + 2] === 255) n++;
      return n;
    }, buf.toString('base64'));
    assert.strictEqual(white, 0, `pure-white pixels above footer: ${white}`);

    for (const width of [360, 1280]) {
      await page.setViewportSize({ width, height: 800 });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      assert.strictEqual(overflow, false, `horizontal scroll at ${width}`);
    }
    assert.deepStrictEqual(errors, []);
  } finally {
    if (browser) await browser.close();
    proc.kill();
  }
});
