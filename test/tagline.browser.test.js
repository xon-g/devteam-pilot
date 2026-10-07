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

const DISCLAIMER = "For entertainment only. Numbers are random and don't improve your odds. 18+. Play responsibly.";

test('sw.js contains swertres-v29', () => {
  assert.ok(fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8').includes('swertres-v29'));
});

test('disclaimer texts are 10px and clear of the fixed footer', { timeout: 90000 }, async () => {
  const port = await getFreePort();
  const { proc, ready } = startServer(port);
  let browser;
  try {
    await ready;
    const chromium = await loadChromium();
    browser = await chromium.launch();
    for (const [width, height] of [[360, 740], [1280, 800]]) {
      const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
      const page = await context.newPage();
      await page.goto(`http://localhost:${port}/`, { waitUntil: 'load' });
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      const r = await page.evaluate(() => {
        const fs = (id) => getComputedStyle(document.getElementById(id)).fontSize;
        const d = document.getElementById('disclaimer').getBoundingClientRect();
        const p = document.getElementById('privacy-note').getBoundingClientRect();
        return {
          sizes: [fs('disclaimer'), fs('not-affiliated'), fs('privacy-note')],
          text: document.getElementById('disclaimer').textContent.trim(),
          dTop: d.top, dBottom: d.bottom, dHeight: d.height, dLeft: d.left, dRight: d.right,
          pBottom: p.bottom,
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth, innerHeight: window.innerHeight,
        };
      });
      const tag = `${width}px`;
      assert.deepStrictEqual(r.sizes, ['10px', '10px', '10px'], tag);
      assert.strictEqual(r.text, DISCLAIMER, tag);
      assert.ok(r.dTop >= 0 && r.dBottom <= r.innerHeight && r.dLeft >= 0 && r.dRight <= r.innerWidth, `${tag} disclaimer outside viewport`);
      if (width === 360) assert.ok(r.dHeight <= 48, `${tag} height ${r.dHeight}`);
      assert.ok(r.pBottom <= r.dTop, `${tag} privacy-note ${r.pBottom} behind footer ${r.dTop}`);
      assert.ok(r.scrollWidth <= r.innerWidth, `${tag} overflow ${r.scrollWidth}`);
      await context.close();
    }
  } finally {
    if (browser) await browser.close();
    proc.kill();
  }
});

test('tagline markup has the break before "For fun lang." exactly once', () => {
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const m = html.match(/<p class="tagline">([^]*?)<\/p>/);
  assert.ok(m, 'tagline paragraph missing');
  assert.ok(m[1].includes('6/42–6/58.<br>For fun lang.'), m[1]);
  assert.strictEqual(html.split('For fun lang.').length - 1, 1);
});

test('tagline renders "For fun lang." on its own line at 360px', { timeout: 90000 }, async () => {
  const port = await getFreePort();
  const { proc, ready } = startServer(port);
  let browser;
  try {
    await ready;
    const chromium = await loadChromium();
    browser = await chromium.launch();
    const context = await browser.newContext({ viewport: { width: 360, height: 780 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto(`http://localhost:${port}/`, { waitUntil: 'load' });
    const r = await page.evaluate(() => {
      const el = document.querySelector('.tagline');
      const nodes = [...el.childNodes].filter((n) => n.nodeType === 3);
      const top = (n) => { const rg = document.createRange(); rg.selectNodeContents(n); return rg.getClientRects()[0].top; };
      return {
        brs: el.querySelectorAll('br').length,
        firstTop: top(nodes[0]),
        lastTop: top(nodes[nodes.length - 1]),
        lastText: nodes[nodes.length - 1].textContent,
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      };
    });
    assert.strictEqual(r.brs, 1);
    assert.strictEqual(r.lastText, 'For fun lang.');
    assert.ok(r.lastTop > r.firstTop, `${r.lastTop} <= ${r.firstTop}`);
    assert.ok(r.scrollWidth <= r.innerWidth, `overflow ${r.scrollWidth}`);
  } finally {
    if (browser) await browser.close();
    proc.kill();
  }
});
