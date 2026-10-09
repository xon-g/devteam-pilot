import { launchStubbed, getFreePort } from './ads-helpers.js';
import { test } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PLAYWRIGHT = '/usr/local/lib/node_modules/playwright';
const FIXTURE = fs.readFileSync(new URL('./fixtures/sites.json', import.meta.url), 'utf8');

async function loadChromium() {
  try {
    return (await import(`${PLAYWRIGHT}/index.mjs`)).chromium;
  } catch {
    return createRequire(import.meta.url)(PLAYWRIGHT).chromium;
  }
}

function startServer(port) {
  const proc = spawn(process.execPath, ['scripts/serve.js'], {
    cwd: ROOT, env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'inherit'],
  });
  const ready = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('server did not start in 5s')), 5000);
    proc.stdout.on('data', (c) => { if (c.toString().includes('Server running')) { clearTimeout(timer); resolve(); } });
    proc.on('exit', (code) => { clearTimeout(timer); reject(new Error(`server exited early (${code})`)); });
  });
  return { proc, ready };
}

async function open(browser, url, sitesRoute) {
  const context = await browser.newContext({ viewport: { width: 360, height: 800 }, reducedMotion: 'reduce' });
  await context.route('https://gc.zgo.at/**', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await context.route('https://xonicbox.com/sites.json', sitesRoute);
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'load' });
  return page;
}

const read = (page) => page.evaluate(() => ({
  items: [...document.querySelectorAll('#more-sites li')].map((li) => li.textContent.trim()),
  links: [...document.querySelectorAll('#more-sites li a')].map((a) => [a.textContent, a.getAttribute('href')]),
  overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
}));

test('More xonicbox tools: live list, fallback, no horizontal scroll', { timeout: 120000 }, async () => {
  const port = await getFreePort();
  const { proc, ready } = startServer(port);
  const chromium = await loadChromium();
  const browser = await launchStubbed(chromium);
  try {
    await ready;
    for (const path of ['/', '/about/']) {
      const url = `http://localhost:${port}${path}`;
      const live = await open(browser, url, (route) => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: FIXTURE }));
      await live.waitForFunction(() => document.querySelectorAll('#more-sites li').length === 4);
      const a = await read(live);
      assert.deepEqual(a.links, [['Sulit Leave PH', 'https://leave.xonicbox.com/']]);
      assert.deepEqual(a.items, ['Sulit Leave PH', 'KitaKita (soon)', 'Hayag Cebu (soon)', 'Clara (soon)']);
      assert.ok(!a.items.some((i) => i.includes('Lotto')));
      assert.ok(!a.overflow, `horizontal scroll on ${path}`);
      await live.context().close();

      const down = await open(browser, url, (route) => route.abort());
      await down.waitForTimeout(500);
      const b = await read(down);
      assert.deepEqual(b.items, ['Sulit Leave PH', 'KitaKita (soon)', 'Hayag Cebu (soon)', 'Clara (soon)']);
      assert.deepEqual(b.links, [['Sulit Leave PH', 'https://leave.xonicbox.com/']]);
      assert.ok(!b.overflow, `horizontal scroll (fallback) on ${path}`);
      await down.context().close();
    }
  } finally {
    await browser.close();
    proc.kill();
  }
});
