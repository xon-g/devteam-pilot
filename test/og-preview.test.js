import { test } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PLAYWRIGHT = '/usr/local/lib/node_modules/playwright';
const read = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

const swNum = read('sw.js').match(/const CACHE = "swertres-v(\d+)"/)[1];
const IMG = `https://lotto.xonicbox.com/assets/og-image.png?v=${swNum}`;

function metaValues(html, attr, name) {
  const re = /<meta\s+([^>]*)>/g;
  const out = [];
  let m;
  while ((m = re.exec(html))) {
    const a = m[1];
    if (new RegExp(`${attr}="${name}"`).test(a)) out.push(a.match(/content="([^"]*)"/)[1]);
  }
  return out;
}

for (const file of ['index.html', 'privacy/index.html', 'how-to-play/index.html', 'lucky-numbers/index.html']) {
  test(`${file}: image tags are versioned to match sw.js CACHE`, () => {
    const html = read(file);
    assert.deepStrictEqual(metaValues(html, 'property', 'og:image'), [IMG]);
    assert.deepStrictEqual(metaValues(html, 'property', 'og:image:secure_url'), [IMG]);
    assert.deepStrictEqual(metaValues(html, 'name', 'twitter:image'), [IMG]);
    assert.deepStrictEqual(metaValues(html, 'property', 'og:image:type'), ['image/png']);
    assert.deepStrictEqual(metaValues(html, 'property', 'og:image:width'), ['1200']);
    assert.deepStrictEqual(metaValues(html, 'property', 'og:image:height'), ['630']);
  });
}

test('assets/og-image.png is a 1200x630 PNG under 300 KB', () => {
  const buf = fs.readFileSync(new URL('../assets/og-image.png', import.meta.url));
  assert.deepStrictEqual([...buf.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.strictEqual(buf.readUInt32BE(16), 1200);
  assert.strictEqual(buf.readUInt32BE(20), 630);
  assert.ok(buf.length <= 300 * 1024, `size ${buf.length}`);
});

test('make-og-image.js renders from styles.css with no host paths', () => {
  const src = read('scripts/make-og-image.js');
  assert.ok(src.includes('styles.css'));
  assert.ok(!src.includes('/Users/'));
  assert.ok(!src.includes('/home/'));
});

test('versioned og-image URL is served as image/png', { timeout: 60000 }, async () => {
  const port = await new Promise((resolve, reject) => {
    const s = net.createServer();
    s.on('error', reject);
    s.listen(0, () => { const { port } = s.address(); s.close(() => resolve(port)); });
  });
  const proc = spawn(process.execPath, ['scripts/serve.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(port), BASE_PATH: '/' },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  let browser;
  try {
    await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('server did not start')), 5000);
      proc.stdout.on('data', (c) => { if (c.toString().includes('Server running')) { clearTimeout(t); resolve(); } });
      proc.on('exit', (code) => { clearTimeout(t); reject(new Error(`server exited (${code})`)); });
    });
    let chromium;
    try { chromium = (await import(`${PLAYWRIGHT}/index.mjs`)).chromium; }
    catch { chromium = createRequire(import.meta.url)(PLAYWRIGHT).chromium; }
    browser = await chromium.launch();
    const page = await browser.newPage();
    const res = await page.goto(`http://localhost:${port}/assets/og-image.png?v=${swNum}`);
    assert.strictEqual(res.status(), 200);
    assert.match(res.headers()['content-type'], /image\/png/);
  } finally {
    if (browser) await browser.close();
    proc.kill();
  }
});
