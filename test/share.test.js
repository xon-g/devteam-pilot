import { test } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PLAYWRIGHT = '/usr/local/lib/node_modules/playwright';
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

test('share functionality', { timeout: 60000 }, async () => {
  const port = await getFreePort();
  const { proc, ready } = startServer(port);
  let browser;
  try {
    await ready;
    const chromium = await loadChromium();
    browser = await chromium.launch();
    
    // Context A: Clipboard focus
    const contextA = await browser.newContext({ 
      viewport: VIEWPORT, 
      reducedMotion: 'reduce',
      permissions: ['clipboard-read', 'clipboard-write'] 
    });
    // Remove navigator.share via addInitScript BEFORE newPage
    await contextA.addInitScript(() => { delete Navigator.prototype.share; });
    const pageA = await contextA.newPage();
    await pageA.goto(`http://localhost:${port}/`, { waitUntil: 'load' });
    
    // Ensure button is disabled initially
    assert.strictEqual(await pageA.locator('#share').isDisabled(), true, 'share button should be disabled initially');

    // Perform draw
    await pageA.locator('.moods span', { hasText: /^Chill$/ }).click();
    await pageA.click('#draw');
    await pageA.waitForFunction(() => {
      const el = document.querySelector('#combo-output');
      return el && /^\d-\d-\d$/.test(el.textContent.trim());
    });
    const comboText = await pageA.textContent('#combo-output');

    // Click share
    const shareBtn = pageA.locator('#share');
    await shareBtn.click();
    await pageA.waitForFunction(() => {
      const el = document.querySelector('#share-status');
      return el && el.textContent.trim().length > 0;
    }, null, { timeout: 5000 });

    // Check status
    const status = await pageA.textContent('#share-status');
    assert.ok(status && status.trim().length > 0, 'share status should not be empty');

    // Check clipboard
    const clipboardText = await pageA.evaluate(() => navigator.clipboard.readText());
    assert.match(clipboardText, new RegExp(comboText.trim().replace(/[^\w-]/g, '\\$&')), 'clipboard text mismatch');

    // Context B: Share sheet focus
    const contextB = await browser.newContext({ 
      viewport: VIEWPORT, 
      reducedMotion: 'reduce' 
    });
    // Add init script to stub navigator.share BEFORE newPage
    await contextB.addInitScript(() => {
      window.__shareCalls = [];
      Navigator.prototype.share = async (o) => { window.__shareCalls.push(o); };
    });
    const pageB = await contextB.newPage();
    await pageB.goto(`http://localhost:${port}/`, { waitUntil: 'load' });

    // Perform draw
    await pageB.locator('.moods span', { hasText: /^Chill$/ }).click();
    await pageB.click('#draw');
    await pageB.waitForFunction(() => {
      const el = document.querySelector('#combo-output');
      return el && /^\d-\d-\d$/.test(el.textContent.trim());
    });
    const comboTextB = await pageB.textContent('#combo-output');

    // Click share
    await pageB.click('#share');
    await pageB.waitForFunction(() => {
      const el = document.querySelector('#share-status');
      return el && el.textContent.trim().length > 0;
    }, null, { timeout: 5000 });

    // Verify stubbed share call
    const shareCalls = await pageB.evaluate(() => window.__shareCalls || []);
    assert.strictEqual(shareCalls.length, 1, 'share should be called exactly once');
    assert.match(shareCalls[0].text, new RegExp(comboTextB.trim().replace(/[^\w-]/g, '\\$&')), 'stubbed share text mismatch');

    // Verify status again
    const statusB = await pageB.textContent('#share-status');
    assert.ok(statusB && statusB.trim().length > 0, 'share status should not be empty');

  } finally {
    if (browser) await browser.close();
    proc.kill();
  }
});
