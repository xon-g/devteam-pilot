import { launchStubbed, startServer, loadChromium } from './ads-helpers.js';
import { test } from 'node:test';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const WIDTHS = [360, 375, 768, 1280];

async function open(browser, url, width) {
  const context = await browser.newContext({ viewport: { width, height: 800 }, reducedMotion: 'reduce' });
  await context.route('https://gc.zgo.at/**', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await context.route('https://xonicbox.com/sites.json', (route) => route.abort());
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'load' });
  return page;
}

test('design pass: chips, footer column, bottom clearance, FAQ marker, tabular figures', { timeout: 180000 }, async () => {
  const { url: base, stop } = await startServer(ROOT);
  const chromium = await loadChromium();
  const browser = await launchStubbed(chromium);
  try {
    for (const width of WIDTHS) {
      const page = await open(browser, `${base}/`, width);
      await page.waitForFunction(() => document.querySelectorAll('#more-sites li').length === 4);

      const chips = await page.evaluate(() => {
        const group = (sel) => [...document.querySelectorAll(`${sel} span`)].map((el) => {
          const r = el.getBoundingClientRect();
          const range = document.createRange();
          range.selectNodeContents(el);
          const lines = new Set([...range.getClientRects()].map((q) => Math.round(q.top))).size;
          return { h: r.height, lines, text: el.textContent, clipped: el.scrollWidth > el.clientWidth + 1 };
        });
        return { games: group('.games'), moods: group('.moods') };
      });
      for (const [name, list] of Object.entries(chips)) {
        for (const c of list) {
          assert.ok(!c.clipped, `${name} "${c.text}" clipped at ${width}`);
        }
        const hs = list.map((c) => c.h);
        assert.ok(Math.max(...hs) - Math.min(...hs) <= 1, `${name} chip heights differ at ${width}: ${hs}`);
      }
      const wraps = await page.evaluate(() => [...document.querySelectorAll('.games span, .moods span')].filter((el) => {
        const cs = getComputedStyle(el);
        return cs.whiteSpace !== 'nowrap';
      }).length);
      assert.equal(wraps, 0, `chips use nowrap at ${width}`);

      const geo = await page.evaluate(() => {
        const rect = (sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return { l: r.left, r: r.right }; };
        document.querySelectorAll('.games span, .moods span').forEach((el) => { el.dataset.top = el.getBoundingClientRect().top; });
        return {
          main: rect('main'),
          more: rect('#more-sites'),
          hire: rect('#hire'),
          overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          tops: [...document.querySelectorAll('.games span')].map((el) => el.getBoundingClientRect().height),
        };
      });
      assert.ok(!geo.overflow, `horizontal scroll at ${width}`);
      assert.ok(Math.abs(geo.more.l - geo.main.l) <= 1 && Math.abs(geo.more.r - geo.main.r) <= 1,
        `more-sites column ${JSON.stringify(geo.more)} vs main ${JSON.stringify(geo.main)} at ${width}`);
      assert.ok(Math.abs(geo.hire.l - geo.main.l) <= 1 && Math.abs(geo.hire.r - geo.main.r) <= 1, `hire column at ${width}`);

      const bottom = await page.evaluate(async () => {
        window.scrollTo(0, document.documentElement.scrollHeight);
        await new Promise((r) => setTimeout(r, 100));
        const links = document.querySelector('.site-links').getBoundingClientRect();
        const bar = document.querySelector('#disclaimer').getBoundingClientRect();
        return { linksBottom: links.bottom, barTop: bar.top };
      });
      assert.ok(bottom.linksBottom <= bottom.barTop + 0.5, `last element hidden under bar at ${width}: ${JSON.stringify(bottom)}`);

      const ui = await page.evaluate(() => {
        const s = document.querySelector('.about-games:not([hidden]) summary');
        const cs = getComputedStyle(s);
        return {
          listStyle: cs.listStyleType,
          display: cs.display,
          h: s.getBoundingClientRect().height,
          digit: getComputedStyle(document.querySelector('.digit')).fontVariantNumeric,
          countdown: getComputedStyle(document.querySelector('#next-draw-in')).fontVariantNumeric,
          italic: getComputedStyle(document.querySelector('.about-games:not([hidden]) .lore')).fontStyle,
        };
      });
      assert.equal(ui.listStyle, 'none', `summary list-style at ${width}`);
      assert.ok(ui.h >= 44, `summary height ${ui.h} at ${width}`);
      assert.ok(ui.digit.includes('tabular-nums'), 'digit tabular-nums');
      assert.ok(ui.countdown.includes('tabular-nums'), 'countdown tabular-nums');
      assert.notEqual(ui.italic, 'italic');
      await page.context().close();
    }
  } finally {
    await browser.close();
    stop();
  }
});
