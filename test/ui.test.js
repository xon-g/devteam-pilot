import { test } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PLAYWRIGHT = '/usr/local/lib/node_modules/playwright';
const DISCLAIMER = "For entertainment only. Numbers are random and don't improve your odds. 18+. Play responsibly.";
const BANNED = ['guarantee', 'sigurado', 'siguradong panalo', 'tsansa', 'odds', 'better chance', 'sure win', 'jackpot ka na', 'panalo', 'tatama', 'jackpot'];
const VIEWPORT = { width: 375, height: 667 };

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

async function assertDisclaimerInViewport(page, when) {
  const box = await page.locator('#disclaimer').boundingBox();
  assert.ok(box, `disclaimer not rendered ${when}`);
  assert.ok(box.y >= 0 && box.y + box.height <= VIEWPORT.height, `disclaimer not in viewport ${when}: ${JSON.stringify(box)}`);
}

async function draw(page) {
  await page.locator('.moods span', { hasText: /^Chill$/ }).click();
  await page.click('#draw');
  await page.locator('#draw:not([disabled])').waitFor();
  await page.waitForFunction(() => /^\d-\d-\d$/.test(document.querySelector('#combo-output').textContent.trim()));
  return page.$$eval('.digit', (els) => els.map((el) => el.textContent.trim()));
}

test('banned phrases absent from index.html and src/*.js (disclaimer excluded)', () => {
  const files = ['index.html', ...fs.readdirSync(new URL('../src', import.meta.url)).filter((f) => f.endsWith('.js')).map((f) => `src/${f}`)];
  for (const file of files) {
    const text = fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8').split(DISCLAIMER).join('').toLowerCase();
    for (const phrase of BANNED) {
      assert.ok(!text.includes(phrase), `banned phrase "${phrase}" in ${file}`);
    }
  }
});

test('page UI acceptance', { timeout: 60000 }, async () => {
  const port = await getFreePort();
  const { proc, ready } = startServer(port);
  let browser;
  try {
    await ready;
    const chromium = await loadChromium();
    browser = await chromium.launch();
    const context = await browser.newContext({ viewport: VIEWPORT, reducedMotion: 'reduce' });
    const page = await context.newPage();

    const errors = [];
    const foreign = [];
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('request', (req) => {
      const { hostname, port: p } = new URL(req.url());
      if (hostname !== 'localhost' || p !== String(port)) foreign.push(req.url());
    });

    await page.goto(`http://localhost:${port}/`, { waitUntil: 'load' });
    assert.deepStrictEqual(errors, [], 'console errors on load');
    assert.strictEqual((await page.textContent('#draw')).trim(), 'Bunot na!');
    assert.strictEqual((await page.textContent('#disclaimer')).trim(), DISCLAIMER);
    assert.match(await page.textContent('#combo-output'), /Pindutin/, 'first-draw prompt missing');
    await assertDisclaimerInViewport(page, 'at load');

    const ad = await page.$eval('#ad-slot', (el) => ({ hidden: el.hidden, children: el.children.length, height: el.getBoundingClientRect().height }));
    assert.deepStrictEqual(ad, { hidden: true, children: 0, height: 0 });

    const digits = await draw(page);
    assert.strictEqual(digits.length, 3);
    for (const d of digits) assert.match(d, /^\d$/);
    const reasons = await page.$$eval('.reason', (els) => els.map((el) => el.textContent.trim()));
    assert.strictEqual(reasons.length, 3);
    for (const r of reasons) assert.ok(r.length > 0, 'empty reason');
    await assertDisclaimerInViewport(page, 'after draw');

    const straight = (await page.textContent('#combo-output')).trim();
    assert.strictEqual(straight, digits.join('-'));

    await page.check('input[name="mode"][value="rambolito"]');
    const combos = (await page.textContent('#combo-output')).split(',').map((s) => s.trim()).filter(Boolean);
    assert.ok(combos.length >= 1 && combos.length <= 6, `rambolito count ${combos.length}`);
    for (const c of combos) assert.match(c, /^\d-\d-\d$/);
    assert.ok(combos.includes(straight), 'rambolito list must include the drawn combo');
    assert.deepStrictEqual(await page.$$eval('.digit', (els) => els.map((el) => el.textContent.trim())), digits, 'digits changed on mode switch');

    await page.check('input[name="mode"][value="straight"]');
    const seen = new Set();
    for (let i = 0; i < 10; i++) seen.add((await draw(page)).join(''));
    assert.ok(seen.size >= 2, `10 draws gave only ${seen.size} distinct combo(s)`);

    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await assertDisclaimerInViewport(page, 'after scrolling to bottom');

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    assert.ok(scrollWidth <= VIEWPORT.width, `horizontal scroll: ${scrollWidth}px`);

    assert.deepStrictEqual(foreign, [], 'requests to other hosts');
    assert.deepStrictEqual(errors, [], 'console errors during use');
  } finally {
    if (browser) await browser.close();
    proc.kill();
  }
});
