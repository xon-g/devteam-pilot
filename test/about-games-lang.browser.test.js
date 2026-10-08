import { launchStubbed, getFreePort } from './ads-helpers.js';
import { test } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PLAYWRIGHT } from '../scripts/playwright-path.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SHOTS = process.env.FINE_PRINT_SHOTS || fileURLToPath(new URL('../.smoke', import.meta.url));

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
const LABELS = { taglish: 'Taglish', en: 'English', tl: 'Tagalog', ceb: 'Cebuano' };

test('about/FAQ section keeps the same column in every language', { timeout: 240000 }, async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const port = await getFreePort();
  const { proc, ready } = startServer(port);
  const chromium = await loadChromium();
  const browser = await launchStubbed(chromium);
  try {
    await ready;
    for (const width of [320, 360, 768, 1280]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      await context.route('https://gc.zgo.at/**', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: STUB }));
      const page = await context.newPage();
      await page.goto(`http://localhost:${port}/`, { waitUntil: 'load' });
      const ref = await page.evaluate(() => {
        const r = document.getElementById('about-games').getBoundingClientRect();
        const m = document.querySelector('main').getBoundingClientRect();
        return { left: r.left, right: r.right, mainLeft: m.left, mainRight: m.right };
      });
      for (const [lang, label] of Object.entries(LABELS)) {
        await page.locator('#lang-picker span', { hasText: label }).click();
        await page.waitForFunction((l) => { const v = document.querySelector('.about-games:not([hidden])'); return v && v.dataset.langBlock === l; }, lang);
        const r = await page.evaluate(() => {
          const visible = [...document.querySelectorAll('.about-games')].filter((s) => !s.hidden);
          const b = visible[0].getBoundingClientRect();
          const m = document.querySelector('main').getBoundingClientRect();
          const n = visible[0].querySelector('.fine-print').getBoundingClientRect();
          return {
            count: visible.length, left: b.left, right: b.right, mainLeft: m.left, mainRight: m.right,
            noteGap: (n.left - m.left) - (m.right - n.right), scrollWidth: document.documentElement.scrollWidth, innerWidth,
          };
        });
        const tag = `${lang}@${width}`;
        assert.strictEqual(r.count, 1, `${tag}: one visible section`);
        assert.ok(Math.abs(r.left - ref.left) <= 1 && Math.abs(r.right - ref.right) <= 1, `${tag}: ${r.left}/${r.right} vs taglish ${ref.left}/${ref.right}`);
        assert.ok(Math.abs(r.left - r.mainLeft) <= 1 && Math.abs(r.right - r.mainRight) <= 1, `${tag}: matches main ${r.mainLeft}/${r.mainRight}`);
        assert.ok(r.scrollWidth <= r.innerWidth, `${tag}: no horizontal overflow (${r.scrollWidth} > ${r.innerWidth})`);
        assert.ok(Math.abs(r.noteGap) <= 2, `${tag}: privacy note off-centre by ${r.noteGap}`);
        if (lang === 'en' && (width === 360 || width === 1280)) {
          await page.locator('#about-games-en').scrollIntoViewIfNeeded();
          await page.screenshot({ path: `${SHOTS}/about-games-en-${width}.png` });
        }
      }
      await context.close();
    }
  } finally {
    await browser.close();
    proc.kill();
  }
});
