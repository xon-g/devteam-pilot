import { launchStubbed } from './ads-helpers.js';
import { test } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';
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



const WIDTHS = [320, 360, 390, 768, 1280];
const LANGS = ['taglish', 'ceb'];
const SHOTS = new URL('../.smoke/', import.meta.url);
fs.mkdirSync(SHOTS, { recursive: true });

let server, browser, base;
test.before(async () => {
  const port = await getFreePort();
  server = startServer(port);
  await server.ready;
  base = `http://localhost:${port}/devteam-pilot`;
  browser = await launchStubbed(await loadChromium());
});
test.after(async () => {
  await browser?.close();
  server?.proc.kill();
});

async function open(width, lang, path = '/') {
  const context = await browser.newContext({ viewport: { width, height: 800 } });
  await context.route('https://gc.zgo.at/**', (r) => r.abort());
  await context.addInitScript((l) => { try { localStorage.setItem('lang', l); } catch {} }, lang);
  const page = await context.newPage();
  await page.goto(base + path);
  return { context, page };
}

async function drawAfterName(page) {
  await page.fill('#name', 'Maria Clara Santos');
  await page.locator('.moods label').first().click();
  await page.click('#draw');
  await page.waitForFunction(() => /^\d-\d-\d$/.test(document.querySelector('#combo-output').textContent.trim()), null, { timeout: 20000 });
  await page.locator('#share:not([disabled])').waitFor();
  await page.waitForTimeout(500);
}

for (const lang of LANGS) {
  for (const width of WIDTHS) {
    test(`layout ${lang} @${width}`, { timeout: 60000 }, async () => {
      const { context, page } = await open(width, lang);
      await drawAfterName(page);
      const r = await page.evaluate(() => {
        const vis = (el) => {
          const cs = getComputedStyle(el);
          const b = el.getBoundingClientRect();
          return cs.display !== 'none' && cs.visibility !== 'hidden' && b.width > 0 && b.height > 0;
        };
        const out = { overflow: document.documentElement.scrollWidth - innerWidth };
        out.short = [...document.querySelectorAll('header button, main button, main a, header a, .share-row a, .share-row button, .segmented span, .games span, .moods span')]
          .filter((el) => vis(el) && !el.closest('p, footer, .site-links'))
          .filter((el) => el.getBoundingClientRect().height < 44)
          .map((el) => el.tagName + '.' + el.className + ':' + el.getBoundingClientRect().height);
        const main = document.querySelector('main');
        const kids = [...main.children].filter(vis);
        out.gaps = kids.slice(1).map((k, i) => ({
          id: k.id || k.className,
          gap: k.getBoundingClientRect().top - kids[i].getBoundingClientRect().bottom,
        }));
        const header = document.querySelector('header');
        const hk = [...header.children].filter(vis);
        out.headerGap = document.querySelector('.about').getBoundingClientRect().top - hk[hk.length - 1].getBoundingClientRect().bottom;
        out.aboutWidth = document.querySelector('.about').getBoundingClientRect().width;
        const pills = [...document.querySelectorAll('.games span')].filter(vis).map((s) => s.getBoundingClientRect().height);
        out.pillOverflow = [...document.querySelectorAll('.games span')].filter(vis).filter((s) => s.scrollWidth > s.clientWidth).map((s) => s.textContent);
        out.pillMin = Math.min(...pills);
        out.pillMax = Math.max(...pills);
        out.shareTops = [...new Set([...document.querySelectorAll('#share-row > *')].filter(vis).map((e) => Math.round(e.getBoundingClientRect().top)))].length;
        const fs = (sel) => parseFloat(getComputedStyle(document.querySelector(sel)).fontSize);
        out.fonts = ['.fine-print', '#official-results', '#not-affiliated', 'footer#disclaimer'].map(fs);
        out.fieldLines = [...document.querySelectorAll('.field > span')].map((s) => Math.round(s.getBoundingClientRect().height / parseFloat(getComputedStyle(s).lineHeight)));
        return out;
      });
      if (lang === 'taglish' && (width === 360 || width === 1280)) await page.screenshot({ path: fileURLToPath(new URL(`layout-${lang}-${width}.png`, SHOTS)), fullPage: true });
      if (lang === 'ceb' && width === 320) await page.screenshot({ path: fileURLToPath(new URL(`layout-${lang}-${width}.png`, SHOTS)), fullPage: true });
      await context.close();

      assert.ok(r.overflow <= 0, `overflow ${r.overflow}`);
      assert.deepEqual(r.short, []);
      if (width >= 768) {
        assert.ok(r.aboutWidth >= 480, `about width ${r.aboutWidth}`);
        assert.deepEqual(r.pillOverflow, []);
        assert.ok(r.pillMax <= r.pillMin + 1, `pill heights ${r.pillMin}-${r.pillMax}`);
        assert.ok(r.shareTops <= 2, `share rows ${r.shareTops}`);
      }
      for (const g of r.gaps) assert.ok(g.gap >= 8 && g.gap <= 40, `gap ${g.id}: ${g.gap}`);
      assert.ok(r.headerGap <= 40, `header gap ${r.headerGap}`);
      for (const f of r.fonts) assert.ok(f >= 12.5, `fine print ${f}`);
      assert.ok(r.fieldLines.every((n) => n === 1), `field lines ${r.fieldLines}`);
    });
  }
}

for (const lang of ['taglish', 'en', 'tl', 'ceb']) {
  test(`field labels one line @320 ${lang}`, async () => {
    const { context, page } = await open(320, lang);
    const lines = await page.evaluate(() => [...document.querySelectorAll('.field > span')].map((s) => Math.round(s.getBoundingClientRect().height / parseFloat(getComputedStyle(s).lineHeight))));
    await context.close();
    assert.deepEqual(lines, [1, 1]);
  });
}

for (const path of ['/how-to-play/', '/privacy/']) {
  for (const width of [320, 1280, 360]) {
    test(`content page ${path} @${width}`, async () => {
      const { context, page } = await open(width, 'taglish', path);
      const o = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      if (path === '/how-to-play/' && width === 360) await page.screenshot({ path: fileURLToPath(new URL('how-to-play-360.png', SHOTS)), fullPage: true });
      await context.close();
      assert.ok(o <= 0, `overflow ${o}`);
    });
  }
}
