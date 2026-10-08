import { launchStubbed } from './ads-helpers.js';
import { test } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
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



const VIEWPORT = { width: 375, height: 812 };
const pickMood = (page) => page.locator('.moods span', { hasText: /^Chill$/ }).click();
const pickGame = (page, name) => page.locator('.games span', { hasText: name }).click();

const FAKE = () => {
  window.__audio = { created: 0, starts: [] };
  window.AudioContext = class {
    constructor() { window.__audio.created++; this.currentTime = 0; this.state = 'running'; this.destination = {}; }
    resume() { return Promise.resolve(); }
    createOscillator() {
      return { frequency: { setValueAtTime(v) { this.v = v; } }, connect() {},
        start() { window.__audio.starts.push(this.frequency.v); }, stop() {} };
    }
    createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
  };
};

async function draw(page) {
  await page.click('#draw');
  await page.locator('#draw:not([disabled])').waitFor();
  await page.waitForFunction(() => !document.querySelector('#combo-output').classList.contains('prompt'));
}
const starts = (page) => page.evaluate(() => window.__audio.starts.slice());
const near = (arr, f) => arr.filter((x) => Math.abs(x - f) < 0.01).length;

test('sound effects', { timeout: 120000 }, async () => {
  const port = await getFreePort();
  const { proc, ready } = startServer(port);
  let browser;
  const url = `http://localhost:${port}/`;
  try {
    await ready;
    const chromium = await loadChromium();
    browser = await launchStubbed(chromium);
    const context = await browser.newContext({ viewport: VIEWPORT });
    await context.addInitScript(FAKE);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto(url, { waitUntil: 'load' });

    // 1
    assert.strictEqual(await page.evaluate(() => window.__audio.created), 0);

    // 2
    await pickMood(page);
    await draw(page);
    assert.strictEqual(await page.evaluate(() => window.__audio.created), 1);
    let s = await starts(page);
    assert.strictEqual(near(s, 2400), 10);
    for (let i = 0; i < 3; i++) assert.strictEqual(near(s, 1320 * 1.06 ** i), 3 > i ? 1 : 0, `ding ${i}`);
    assert.strictEqual(near(s, 2093), 1);

    // 3
    await page.click('#sound');
    assert.strictEqual((await page.textContent('#sound')).trim(), '🔇 Tunog: Off');
    assert.strictEqual(await page.getAttribute('#sound', 'aria-pressed'), 'false');
    const before = (await starts(page)).length;
    await draw(page);
    assert.strictEqual((await starts(page)).length, before);
    await page.click('#sound');
    assert.strictEqual((await page.textContent('#sound')).trim(), '🔊 Tunog: On');
    assert.strictEqual(await page.getAttribute('#sound', 'aria-pressed'), 'true');
    await draw(page);
    assert.ok((await starts(page)).length > before);

    // 4
    await pickGame(page, 'Ultra Lotto 6/58');
    const b4 = await starts(page);
    await draw(page);
    const d4 = (await starts(page)).slice(b4.length);
    let dings = 0;
    for (let i = 0; i < 6; i++) dings += near(d4, 1320 * 1.06 ** i);
    assert.strictEqual(dings, 6);

    assert.deepStrictEqual(errors, []);
    await context.close();

    // 5
    const rm = await browser.newContext({ viewport: VIEWPORT, reducedMotion: 'reduce' });
    await rm.addInitScript(FAKE);
    const p5 = await rm.newPage();
    await p5.goto(url, { waitUntil: 'load' });
    await pickMood(p5);
    await draw(p5);
    s = await starts(p5);
    assert.strictEqual(near(s, 2400), 0);
    let d5 = 0;
    for (let i = 0; i < 3; i++) d5 += near(s, 1320 * 1.06 ** i);
    assert.strictEqual(d5, 0);
    assert.strictEqual(near(s, 2093), 1);
    await rm.close();

    // 6
    const nc = await browser.newContext({ viewport: VIEWPORT });
    await nc.addInitScript(() => { delete window.AudioContext; delete window.webkitAudioContext; window.AudioContext = undefined; window.webkitAudioContext = undefined; });
    const p6 = await nc.newPage();
    const e6 = [];
    p6.on('pageerror', (err) => e6.push(err.message));
    await p6.goto(url, { waitUntil: 'load' });
    await pickMood(p6);
    await draw(p6);
    assert.match((await p6.textContent('#combo-output')).trim(), /^\d-\d-\d$/);
    assert.deepStrictEqual(e6, []);
    await nc.close();

    // 7
    const sm = await browser.newContext({ viewport: { width: 360, height: 740 } });
    const p7 = await sm.newPage();
    await p7.goto(url, { waitUntil: 'load' });
    const m = await p7.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      h: document.querySelector('#sound').getBoundingClientRect().height,
    }));
    assert.ok(m.overflow <= 0, 'sideways scroll');
    assert.ok(m.h >= 44, `sound button height ${m.h}`);
    await sm.close();
  } finally {
    if (browser) await browser.close();
    proc.kill();
  }
});
