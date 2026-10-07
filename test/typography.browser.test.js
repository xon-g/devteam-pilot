import { test } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PLAYWRIGHT = '/usr/local/lib/node_modules/playwright';
// footer#disclaimer height measured on master (f9f44bb) + 1px tolerance
const MASTER_FOOTER = { 375: 64, 1280: 40 };

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

const port = await getFreePort();
const server = startServer(port);
await server.ready;
const chromium = await loadChromium();
const browser = await chromium.launch();
const base = `http://localhost:${port}`;

test.after(async () => {
  await browser.close();
  server.proc.kill();
});

for (const width of [375, 1280]) {
  for (const path of ['/', '/privacy/']) {
    test(`typography ${path} @${width}`, async () => {
      const page = await browser.newPage({ viewport: { width, height: 800 } });
      await page.goto(base + path);

      // a + b + d + e: computed styles
      const info = await page.evaluate(() => {
        const px = (v) => parseFloat(v);
        const out = { small: [], weights: [], upper: [], disclaimers: {}, footerH: null };
        const isDisclaimer = (el) => el.matches('footer#disclaimer, footer#disclaimer *, .fine-print, .fine-print *');
        for (const el of document.body.querySelectorAll('*')) {
          if (el.closest('head, script, style, [hidden]')) continue;
          const cs = getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden') continue;
          const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
          if (!hasText && !el.matches('.digit')) continue;
          out.weights.push(cs.fontWeight);
          if (cs.textTransform === 'uppercase' && !(px(cs.letterSpacing) > 0)) out.upper.push(el.tagName + '.' + el.className);
          if (!isDisclaimer(el) && !el.matches('.digit') && px(cs.fontSize) < 12) {
            out.small.push(`${el.tagName}.${el.className}:${cs.fontSize}`);
          }
        }
        const f = document.querySelector('footer#disclaimer');
        out.disclaimers.footer = px(getComputedStyle(f).fontSize);
        out.footerH = f.getBoundingClientRect().height;
        const fp = document.querySelector('.fine-print');
        out.disclaimers.finePrint = fp ? px(getComputedStyle(fp).fontSize) : null;
        const b = getComputedStyle(document.body);
        out.body = px(b.lineHeight) / px(b.fontSize);
        const h1 = document.querySelector('h1');
        const hs = getComputedStyle(h1);
        out.h1 = px(hs.lineHeight) / px(hs.fontSize);
        const wrap = (e) => { const c = getComputedStyle(e); return c.textWrap || c.textWrapStyle; };
        out.wrap = [...document.querySelectorAll('h1, h2')].map(wrap);
        out.wrapSupported = CSS.supports('text-wrap', 'balance');
        return out;
      });

      assert.ok(info.disclaimers.footer >= 12.5, `footer font ${info.disclaimers.footer}`);
      if (path === '/') assert.ok(info.disclaimers.finePrint >= 12.5);
      assert.ok(info.footerH <= MASTER_FOOTER[width], `footer height ${info.footerH}`);
      assert.deepEqual(info.small, []);
      assert.ok(info.body >= 1.45 && info.body <= 1.65, `body lh ${info.body}`);
      assert.ok(info.h1 <= 1.2, `h1 lh ${info.h1}`);
      const bad = [...new Set(info.weights)].filter((w) => !['400', '600', '800', '900'].includes(w));
      assert.deepEqual(bad, []);
      assert.deepEqual(info.upper, []);
      if (info.wrapSupported) for (const w of info.wrap) assert.equal(w, 'balance');

      // g: prose measure on /privacy/
      if (path === '/privacy/') {
        const m = await page.evaluate(() => {
          const p = document.querySelector('.page p');
          const probe = document.createElement('span');
          probe.style.cssText = 'position:absolute;visibility:hidden;white-space:pre';
          probe.textContent = '0';
          p.appendChild(probe);
          const zero = probe.getBoundingClientRect().width;
          probe.remove();
          const widths = [...document.querySelectorAll('.page p')].map((e) => e.getBoundingClientRect().width);
          return { zero, max: Math.max(...widths) };
        });
        assert.ok(m.max <= 65 * m.zero + 0.5, `prose ${m.max} > ${65 * m.zero}`);
      }

      // h: overflow before/after a draw
      const overflow = () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
      assert.ok(await overflow(), 'overflow before draw');
      if (path === '/') {
        await page.evaluate(() => { localStorage.clear(); });
        await page.click('input[value="3-digit"], input[name="game"]', { force: true }).catch(() => {});
        await page.click('#draw', { force: true }).catch(() => {});
        await page.waitForTimeout(1500);
        assert.ok(await overflow(), 'overflow after draw');
      }
      await page.close();
    });
  }
}
