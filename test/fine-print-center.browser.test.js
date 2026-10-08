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
const LANGS = { taglish: null, en: 'en', tl: 'tl', ceb: 'ceb' };

test('centred fine print: privacy note, official results, not-affiliated, hire', { timeout: 240000 }, async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const port = await getFreePort();
  const { proc, ready } = startServer(port);
  const chromium = await loadChromium();
  const browser = await launchStubbed(chromium);
  try {
    await ready;
    for (const [name, lang] of Object.entries(LANGS)) {
      for (const width of [360, 768, 1280]) {
        const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
        await context.route('https://gc.zgo.at/**', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: STUB }));
        const page = await context.newPage();
        if (lang) await page.addInitScript((l) => localStorage.setItem('lang', l), lang);
        await page.goto(`http://localhost:${port}/`, { waitUntil: 'load' });
        const rows = await page.evaluate(() => {
          const gap = (el, box) => {
            const a = el.getBoundingClientRect();
            const b = box.getBoundingClientRect();
            return { width: a.width, left: a.left - b.left, right: b.right - a.right };
          };
          const section = [...document.querySelectorAll('.about-games')].find((s) => !s.hidden);
          const note = section.querySelector('.fine-print');
          const out = { privacy: gap(note, document.querySelector('main')), noteVisible: note.getBoundingClientRect().width > 0 };
          for (const id of ['official-results', 'not-affiliated']) {
            const el = document.getElementById(id);
            out[id] = el.getBoundingClientRect().width > 0 ? gap(el, document.querySelector('main')) : null;
          }
          out.hire = gap(document.getElementById('hire'), document.body);
          return out;
        });
        assert.ok(rows.noteVisible, `${name}@${width}: privacy note visible`);
        for (const key of ['privacy', 'official-results', 'not-affiliated', 'hire']) {
          if (!rows[key]) continue;
          const d = Math.abs(rows[key].left - rows[key].right);
          assert.ok(d <= 2, `${name}@${width} ${key}: gaps ${rows[key].left}/${rows[key].right}`);
        }
        if (name === 'taglish' && width === 1280) {
          await page.locator('#privacy-note').scrollIntoViewIfNeeded();
          await page.screenshot({ path: `${SHOTS}/fine-print-center-1280.png` });
        }
        await context.close();
      }
    }
  } finally {
    await browser.close();
    proc.kill();
  }
});
