import { launchStubbed, getFreePort } from './ads-helpers.js';
import { test } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PLAYWRIGHT } from '../scripts/playwright-path.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SHOTS = process.env.HIRE_SHOTS || fileURLToPath(new URL('../.smoke', import.meta.url));

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

const STUB = 'window.__gc = []; window.goatcounter = { count: (o) => window.__gc.push(o) };';
const EN_TITLE = 'Like this website?';

async function open(browser, url, width) {
  const context = await browser.newContext({ viewport: { width, height: 800 }, reducedMotion: 'reduce' });
  await context.route('https://gc.zgo.at/**', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: STUB }));
  const page = await context.newPage();
  await page.addInitScript(() => {
    document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('.hire-link')) e.preventDefault(); }, true);
  });
  await page.goto(url, { waitUntil: 'load' });
  return page;
}

test('hire card: layout, languages, analytics', { timeout: 180000 }, async () => {
  const port = await getFreePort();
  const { proc, ready } = startServer(port);
  const chromium = await loadChromium();
  const browser = await launchStubbed(chromium);
  try {
    await ready;
    for (const path of ['/', '/about/']) {
      for (const width of [320, 360, 1280]) {
        const page = await open(browser, `http://localhost:${port}${path}`, width);
        await page.locator('#hire').scrollIntoViewIfNeeded();
        assert.ok(await page.locator('#hire').isVisible());
        const h = await page.$eval('.hire-link', (el) => el.getBoundingClientRect().height);
        assert.ok(h >= 44, `link height ${h}`);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
        assert.ok(!overflow, `horizontal scroll at ${width} on ${path}`);
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        const r = await page.evaluate(() => {
          const hire = document.querySelector('#hire').getBoundingClientRect();
          const nav = document.querySelector('.site-links').getBoundingClientRect();
          const foot = document.querySelector('#disclaimer').getBoundingClientRect();
          return { hireBottom: hire.bottom, navTop: nav.top, navBottom: Math.max(...[...document.querySelectorAll('.site-links a')].map((a) => a.getBoundingClientRect().bottom)), footTop: foot.top, hireTop: hire.top };
        });
        assert.ok(r.hireBottom <= r.navTop + 1, 'card above footer nav');
        assert.ok(r.hireTop >= 0 && r.hireBottom <= r.footTop, 'card fully above the fixed disclaimer');
        assert.ok(r.navBottom <= r.footTop, `site links end above the fixed disclaimer on ${path} at ${width}`);
        if (path === '/') {
          const gap = await page.evaluate(() => {
            const note = [...document.querySelectorAll('.about-games')].find((s) => !s.hidden).getBoundingClientRect();
            return document.querySelector('#hire').getBoundingClientRect().top - note.bottom;
          });
          assert.ok(gap <= 40, `gap above hire card ${gap}px at ${width}`);
        }
        if (SHOTS && path === '/' && (width === 1280 || width === 360)) {
          fs.mkdirSync(SHOTS, { recursive: true });
          await page.locator('#hire').scrollIntoViewIfNeeded();
          await page.screenshot({ path: `${SHOTS}/hire-home-${width}.png` });
        }
        await page.context().close();
      }
    }

    // languages (home + about)
    for (const path of ['/', '/about/']) {
      const page = await open(browser, `http://localhost:${port}${path}`, 375);
      const seen = new Set();
      for (const lang of ['en', 'tl', 'ceb']) {
        await page.evaluate((l) => document.querySelector(`input[name="lang"][value="${l}"]`).click(), lang);
        const got = await page.evaluate(() => ({
          title: document.querySelector('#hire-title').textContent,
          text: document.querySelector('.hire-text').textContent,
          cta: document.querySelector('.hire-link').textContent,
          href: document.querySelector('.hire-link').getAttribute('href'),
        }));
        const body = new URLSearchParams(got.href.split('?')[1]).get('body');
        if (lang === 'en') {
          assert.equal(got.title, EN_TITLE);
          assert.equal(got.cta, 'Email xonicbox');
          assert.equal(body, "Hi xonicbox! I'd like a website. What I need: ");
        }
        if (lang === 'tl') { assert.equal(got.title, 'Gusto mo ba ang website na ito?'); assert.equal(got.cta, 'Mag-email sa xonicbox'); }
        if (lang === 'ceb') { assert.equal(got.title, 'Ganahan ka ani nga website?'); assert.match(got.text, /^Kinahanglan ka og website/); }
        assert.ok(!seen.has(body), 'body differs per language');
        seen.add(body);
      }
      await page.context().close();
    }

    // analytics
    for (const path of ['/', '/about/']) {
      const page = await open(browser, `http://localhost:${port}${path}`, 375);
      await page.waitForFunction(() => window.goatcounter);
      await page.locator('.hire-link').scrollIntoViewIfNeeded();
      await page.click('.hire-link');
      const paths = await page.evaluate(() => window.__gc.map((o) => o.path));
      assert.deepEqual(paths.filter((p) => p === 'hire-click'), ['hire-click'], path);
      await page.context().close();
    }
  } finally {
    await browser.close();
    proc.kill();
  }
});
