import { test } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
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
    env: { ...process.env, PORT: String(port), BASE_PATH: '/devteam-pilot/' },
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

async function open(browser, port, { block = false } = {}) {
  const context = await browser.newContext({ viewport: { width: 360, height: 740 }, serviceWorkers: 'block' });
  await context.route('https://gc.zgo.at/**', (r) => r.abort());
  if (block) await context.route('**/data/draw-schedule.json', (r) => r.fulfill({ status: 404, body: 'nope' }));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    if (/gc\.zgo\.at/.test(m.text() + (m.location().url || ''))) return;
    if (block && /404/.test(m.text())) return; // the deliberately failed schedule request
    errors.push(m.text());
  });
  await page.clock.install({ time: new Date('2026-10-07T07:48:00Z') });
  await page.clock.pauseAt(new Date('2026-10-07T07:48:00Z'));
  await page.goto(`http://localhost:${port}/devteam-pilot/`);
  return { context, page, errors };
}

test('next draw row', { timeout: 120000 }, async () => {
  const port = await getFreePort();
  const { proc, ready } = startServer(port);
  let browser;
  try {
    await ready;
    browser = await (await loadChromium()).launch();
    const { page, errors } = await open(browser, port);
    await page.waitForSelector('#next-draw:not([hidden])');
    const text = async () => (await page.textContent('#next-draw')).replace(/\s+/g, ' ');
    let t = await text();
    assert.ok(t.includes('Swertres (3D)') && t.includes('ngayong 5:00 PM') && t.includes('in 1h 12m'), t);

    await page.check('input[name="game"][value="4d"]', { force: true });
    // 4D draws Mon/Wed/Fri, and the fixed clock is Wednesday, so tonight's draw is next.
    assert.ok((await text()).includes('ngayong 9:00 PM'));
    await page.check('input[name="game"][value="6-58"]', { force: true });
    assert.ok((await text()).includes('Biyernes 9:00 PM'));
    await page.check('input[name="game"][value="1-58"]', { force: true });
    assert.ok(!(await page.isVisible('#next-draw')));
    await page.check('input[name="game"][value="6-42"]', { force: true });
    assert.ok(await page.isVisible('#next-draw'));

    await page.check('input[name="game"][value="3d"]', { force: true });
    await page.clock.fastForward('31:00');
    t = await text();
    assert.ok(t.includes('in 41m'), t);

    const fits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    assert.ok(fits, 'horizontal scroll at 360px');
    assert.deepStrictEqual(errors, []);
  } finally {
    if (browser) await browser.close();
    proc.kill();
  }
});

test('page works when the schedule fails to load', { timeout: 120000 }, async () => {
  const port = await getFreePort();
  const { proc, ready } = startServer(port);
  let browser;
  try {
    await ready;
    browser = await (await loadChromium()).launch();
    const { page, errors } = await open(browser, port, { block: true });
    await page.fill('#name', 'Juan');
    await page.fill('#age', '30');
    await page.click('label:has(input[name="mood"]) >> nth=0');
    await page.waitForTimeout(200);
    assert.ok(!(await page.isVisible('#next-draw')));
    assert.ok(await page.isEnabled('#draw'));
    assert.deepStrictEqual(errors, []);
  } finally {
    if (browser) await browser.close();
    proc.kill();
  }
});
