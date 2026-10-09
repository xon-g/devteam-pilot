import { launchStubbed } from './ads-helpers.js';
import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { PLAYWRIGHT } from '../scripts/playwright-path.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url));

test('index.html links both favicons with relative hrefs', () => {
  const html = read('index.html').toString('utf8');
  assert.ok(html.includes('<link rel="icon" href="assets/icons/favicon.svg" type="image/svg+xml">'));
  assert.ok(html.includes('<link rel="icon" href="assets/icons/favicon-32.png" type="image/png" sizes="32x32">'));
});

test('favicon.svg is a small self-contained yellow ball', () => {
  const buf = read('assets/icons/favicon.svg');
  const svg = buf.toString('utf8');
  for (const s of ['<svg', 'radialGradient', '#ffc93c', '#ff9f1c']) assert.ok(svg.includes(s), s);
  assert.ok(!svg.includes('<script'));
  assert.ok(!svg.replace('http://www.w3.org/2000/svg', '').includes('http'));
  assert.ok(buf.length < 1024);
});

test('favicon-32.png is a 32x32 PNG', () => {
  const png = read('assets/icons/favicon-32.png');
  assert.ok(png.subarray(0, 8).equals(PNG_SIG));
  assert.equal(png.readUInt32BE(16), 32);
  assert.equal(png.readUInt32BE(20), 32);
});

test('favicon.ico wraps a 32x32 PNG', () => {
  const ico = read('favicon.ico');
  assert.ok(ico.subarray(0, 6).equals(Buffer.from([0, 0, 1, 0, 1, 0])));
  assert.equal(ico[6], 32);
  assert.equal(ico[7], 32);
  const offset = ico.readUInt32LE(18);
  assert.ok(ico.subarray(offset, offset + 8).equals(PNG_SIG));
});

test('sw.js precaches favicons under swertres-v44', () => {
  const sw = read('sw.js').toString('utf8');
  assert.ok(sw.includes('swertres-v44'));
  assert.ok(sw.includes('assets/icons/favicon.svg'));
  assert.ok(sw.includes('assets/icons/favicon-32.png'));
});

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

test('favicons are served with correct content types', { timeout: 60000 }, async () => {
  const port = await getFreePort();
  const proc = spawn(process.execPath, ['scripts/serve.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  let browser;
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('server did not start in 5s')), 5000);
      proc.stdout.on('data', (c) => {
        if (c.toString().includes('Server running')) { clearTimeout(timer); resolve(); }
      });
      proc.on('exit', (code) => { clearTimeout(timer); reject(new Error(`server exited early (${code})`)); });
    });
    let chromium;
    try {
      chromium = (await import(`${PLAYWRIGHT}/index.mjs`)).chromium;
    } catch {
      chromium = createRequire(import.meta.url)(PLAYWRIGHT).chromium;
    }
    browser = await launchStubbed(chromium);
    const context = await browser.newContext();
    await context.route('https://gc.zgo.at/**', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    const page = await context.newPage();
    const base = `http://127.0.0.1:${port}/`;
    await page.goto(base, { waitUntil: 'load' });
    const hrefs = await page.evaluate(() => [...document.querySelectorAll('link[rel="icon"]')].map((l) => l.href));
    assert.equal(hrefs.length, 2);
    const types = [];
    for (const href of hrefs) {
      assert.ok(href.startsWith(base), href);
      const res = await fetch(href);
      assert.equal(res.status, 200);
      types.push(res.headers.get('content-type'));
    }
    assert.deepEqual(types, ['image/svg+xml', 'image/png']);
    const ico = await fetch(`${base}favicon.ico`);
    assert.equal(ico.status, 200);
  } finally {
    if (browser) await browser.close();
    proc.kill();
  }
});
