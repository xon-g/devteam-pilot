import { test } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PLAYWRIGHT = '/usr/local/lib/node_modules/playwright';
const VIEWPORTS = [
  { width: 320, height: 640 },
  { width: 375, height: 667 },
  { width: 414, height: 896 },
  { width: 768, height: 1024 },
  { width: 1280, height: 800 },
];

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

async function draw(page) {
  await page.locator('.moods span', { hasText: /^Chill$/ }).click();
  await page.click('#draw');
  await page.locator('#draw:not([disabled])').waitFor();
  await page.waitForFunction(() => /^\d-\d-\d$/.test(document.querySelector('#combo-output').textContent.trim()));
}

test('design acceptance across viewports', { timeout: 120000 }, async () => {
  const port = await getFreePort();
  const { proc, ready } = startServer(port);
  let browser;
  try {
    await ready;
    const chromium = await loadChromium();
    browser = await chromium.launch();

    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({ viewport: vp, reducedMotion: 'reduce' });
      const page = await context.newPage();

      await page.goto(`http://localhost:${port}/`, { waitUntil: 'load' });
      await draw(page);

      // 1. No horizontal scroll
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      assert.ok(scrollWidth <= vp.width, `viewport ${vp.width}x${vp.height}: horizontal scroll ${scrollWidth}px`);

      // 2. Digit boxes: equal width/height, same top, middle centered
      const digits = await page.evaluate(() => {
        const els = document.querySelectorAll('.digit');
        return Array.from(els).map(el => {
          const rect = el.getBoundingClientRect();
          return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
        });
      });
      const widths = digits.map(d => Math.round(d.width));
      const heights = digits.map(d => Math.round(d.height));
      const tops = digits.map(d => Math.round(d.top));
      const centers = digits.map(d => d.left + d.width / 2);

      assert.strictEqual(widths[0], widths[1], `viewport ${vp.width}x${vp.height}: digit 0/1 width mismatch`);
      assert.strictEqual(widths[1], widths[2], `viewport ${vp.width}x${vp.height}: digit 1/2 width mismatch`);
      assert.strictEqual(heights[0], heights[1], `viewport ${vp.width}x${vp.height}: digit 0/1 height mismatch`);
      assert.strictEqual(heights[1], heights[2], `viewport ${vp.width}x${vp.height}: digit 1/2 height mismatch`);
      for (let i = 0; i < 3; i++) {
        assert.ok(Math.abs(widths[i] - heights[i]) <= 1, `viewport ${vp.width}x${vp.height}: digit ${i} not square`);
      }
      for (let i = 1; i < 3; i++) {
        assert.ok(Math.abs(tops[0] - tops[i]) <= 1, `viewport ${vp.width}x${vp.height}: digit ${i} top mismatch`);
      }
      const midX = vp.width / 2;
      assert.ok(Math.abs(centers[1] - midX) <= 2, `viewport ${vp.width}x${vp.height}: middle digit not centered (${centers[1]} vs ${midX})`);

      // 3. Interactive elements min height 44
      const drawRect = await page.evaluate(() => document.querySelector('#draw').getBoundingClientRect());
      const shareRect = await page.evaluate(() => document.querySelector('#share').getBoundingClientRect());
      const spanRects = await page.evaluate(() => Array.from(document.querySelectorAll('.segmented span')).map(el => el.getBoundingClientRect()));
      assert.ok(drawRect.height >= 44, `viewport ${vp.width}x${vp.height}: #draw height ${drawRect.height} < 44`);
      assert.ok(shareRect.height >= 44, `viewport ${vp.width}x${vp.height}: #share height ${shareRect.height} < 44`);
      for (let i = 0; i < spanRects.length; i++) {
        assert.ok(spanRects[i].height >= 44, `viewport ${vp.width}x${vp.height}: span ${i} height ${spanRects[i].height} < 44`);
      }

      // 4. Disclaimer full width, bottom fixed, share above it after scroll
      const disclaimerRect = await page.evaluate(() => document.querySelector('#disclaimer').getBoundingClientRect());
      assert.ok(disclaimerRect.left <= 0.5, `viewport ${vp.width}x${vp.height}: disclaimer left ${disclaimerRect.left} > 0.5`);
      assert.ok(disclaimerRect.width >= vp.width - 1, `viewport ${vp.width}x${vp.height}: disclaimer width ${disclaimerRect.width} < ${vp.width - 1}`);
      assert.ok(disclaimerRect.bottom >= vp.height - 0.5, `viewport ${vp.width}x${vp.height}: disclaimer bottom ${disclaimerRect.bottom} < ${vp.height - 0.5}`);

      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      const shareRectAfter = await page.evaluate(() => document.querySelector('#share').getBoundingClientRect());
      const disclaimerRectAfter = await page.evaluate(() => document.querySelector('#disclaimer').getBoundingClientRect());
      assert.ok(shareRectAfter.bottom <= disclaimerRectAfter.top, `viewport ${vp.width}x${vp.height}: share bottom ${shareRectAfter.bottom} not above disclaimer top ${disclaimerRectAfter.top}`);

      // 5. Reasons visible, non-empty, mini matches digit
      const reasonsVisible = await page.evaluate(() => document.querySelector('.reasons') && !document.querySelector('.reasons').hidden);
      assert.ok(reasonsVisible, `viewport ${vp.width}x${vp.height}: reasons list not visible`);
      const reasons = await page.evaluate(() => Array.from(document.querySelectorAll('.reason')).map(el => el.textContent.trim()));
      const miniTexts = await page.evaluate(() => Array.from(document.querySelectorAll('.mini')).map(el => el.textContent.trim()));
      const digitTexts = await page.evaluate(() => Array.from(document.querySelectorAll('.digit')).map(el => el.textContent.trim()));
      assert.strictEqual(reasons.length, 3, `viewport ${vp.width}x${vp.height}: expected 3 reasons, got ${reasons.length}`);
      for (const r of reasons) {
        assert.ok(r.length > 0, `viewport ${vp.width}x${vp.height}: empty reason`);
        assert.ok(r.length <= 48, `viewport ${vp.width}x${vp.height}: reason too long (${r.length} chars): ${r}`);
      }
      for (let i = 0; i < 3; i++) {
        assert.strictEqual(miniTexts[i], digitTexts[i], `viewport ${vp.width}x${vp.height}: mini ${i} "${miniTexts[i]}" != digit ${i} "${digitTexts[i]}"`);
      }

      // 6. Mode toggle works
      await page.check('input[name="mode"][value="rambolito"]');
      await page.waitForFunction(() => {
        const el = document.querySelector('#combo-output');
        if (!el) return false;
        const text = el.textContent.trim();
        // Rambolito format: comma-separated combos like "1-2-3, 1-3-2"
        return text.split(',').every(c => /^\d-\d-\d$/.test(c.trim()));
      });
      const rambolitoText = await page.textContent('#combo-output');
      assert.ok(rambolitoText.split(',').every(c => /^\d-\d-\d$/.test(c.trim())), `viewport ${vp.width}x${vp.height}: rambolito format`);
      await page.check('input[name="mode"][value="straight"]');
      await page.waitForFunction(() => /^\d-\d-\d$/.test(document.querySelector('#combo-output').textContent.trim()));
      const straightText = await page.textContent('#combo-output');
      assert.match(straightText, /^\d-\d-\d$/, `viewport ${vp.width}x${vp.height}: straight format mismatch`);

      // Save screenshot
      const filename = `.smoke/design-${vp.width}.png`;
      await page.screenshot({ path: filename, fullPage: true });
    }
  } finally {
    if (browser) await browser.close();
    proc.kill();
  }
});

test('lucky.js REASONS content', () => {
  const reasonsPath = new URL('../src/reasons.js', import.meta.url);
  const content = fs.readFileSync(reasonsPath, 'utf8');
  
  // Check required phrases exist
  assert.ok(content.includes('"Pwede nang mangarap"'), 'Missing "Pwede nang mangarap"');
  assert.ok(content.includes('"Meron din naman palang ganda ang buhay"'), 'Missing "Moner din naman palang ganda ang buhay"');
  
  // Check each digit has at least 4 reasons
  for (let d = 0; d <= 9; d++) {
    const regex = new RegExp(`\\b${d}\\s*:\\s*\\[([^\\]]+)\\]`, 's');
    const match = content.match(regex);
    assert.ok(match, `Missing REASONS[${d}]`);
    const reasonsStr = match[1];
    const reasons = reasonsStr.split(',').map(s => s.trim().replace(/["']/g, '')).filter(Boolean);
    assert.ok(reasons.length >= 4, `Digit ${d} has ${reasons.length} reasons, need at least 4`);
    for (const r of reasons) {
      assert.ok(r.length <= 48, `Digit ${d} reason too long (${r.length} chars): ${r}`);
    }
  }
});
