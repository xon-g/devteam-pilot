import { launchStubbed } from './ads-helpers.js';
import { test } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PLAYWRIGHT = '/usr/local/lib/node_modules/playwright';
const DISCLAIMER = "For entertainment only. Numbers are random and don't improve your odds. 18+. Play responsibly.";

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

test('PWA browser test - offline mode', { timeout: 60000 }, async () => {
  const port = await getFreePort();
  const { proc, ready } = startServer(port);
  let browser;
  let context;
  
  try {
    await ready;
    const chromium = await loadChromium();
    browser = await launchStubbed(chromium);
    context = await browser.newContext();
    await context.route('https://gc.zgo.at/**', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    const page = await context.newPage();

    const errors = [];
    const foreignRequests = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    page.on('request', (req) => {
      const url = new URL(req.url());
      if (url.hostname === 'gc.zgo.at') return;
      if (req.url().startsWith('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-')) return; // AdSense head script (stubbed, task 46)
      if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') {
        foreignRequests.push(req.url());
      }
    });

    // Navigate to the app
    await page.goto(`http://127.0.0.1:${port}/devteam-pilot/`, { waitUntil: 'load' });
    
    // Wait for service worker to register and become controller
    await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller !== null);
    
    // Reload to ensure service worker is in control
    await page.reload();
    
    // Wait again for controller after reload
    await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller !== null);
    
    // Set offline
    // Wait for service worker to be ready before going offline
    await page.evaluate(() => navigator.serviceWorker.ready);
    await context.setOffline(true);
    
    // Reload while offline
    await page.reload();
    
    // Wait for page to be ready
    await page.waitForSelector('#draw');
    
    // Check that disclaimer is visible
    const disclaimerVisible = await page.evaluate(() => {
      const el = document.querySelector('#disclaimer');
      return el && !el.hidden && getComputedStyle(el).visibility === 'visible';
    });
    assert.ok(disclaimerVisible, 'disclaimer should be visible');
    
    // Click draw button
    await page.locator('.moods span', { hasText: /^Chill$/ }).click();
    await page.click('#draw');
    
    // Wait for draw to complete
    await page.waitForSelector('#draw:not([disabled])');
    
    // Check that 3 digits are displayed
    const digits = await page.evaluate(() => {
      const els = document.querySelectorAll('.digit');
      return Array.from(els).map(el => el.textContent.trim());
    });
    
    assert.strictEqual(digits.length, 3, 'should have 3 digits');
    for (const d of digits) {
      assert.match(d, /^\d$/, `digit "${d}" should be a single digit`);
    }
    
    // Check disclaimer is still visible
    const disclaimerText = await page.textContent('#disclaimer');
    assert.strictEqual(disclaimerText.trim(), DISCLAIMER, 'disclaimer text should be correct');
    
    // Verify no console errors
    assert.deepStrictEqual(errors, [], `console errors: ${errors.join('; ')}`);
    
    // Verify no foreign requests
    assert.deepStrictEqual(foreignRequests, [], `requests to foreign hosts: ${foreignRequests.join('; ')}`);
    
  } finally {
    if (context) await context.close();
    if (browser) await browser.close();
    proc.kill();
  }
});
