import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import net from 'node:net';
import { createRequire } from 'node:module';

export const ROOT = fileURLToPath(new URL('..', import.meta.url));
export const TEST_ID = 'pub-0000000000000000';
export const TEST_SLOT = '1234567890';
const PLAYWRIGHT = '/usr/local/lib/node_modules/playwright';
const SKIP_TOP = new Set(['.git', '.smoke', 'node_modules', 'tasks']);

export function readConfig(root = ROOT) {
  return JSON.parse(fs.readFileSync(path.join(root, 'ads.config.json'), 'utf8'));
}

export function writeConfig(root, cfg) {
  fs.writeFileSync(path.join(root, 'ads.config.json'), JSON.stringify(cfg, null, 2) + '\n');
}

// Copy the served files plus test/ and scripts/ (never tasks/ or .git) into a fresh temp dir.
export function copyRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'swertres-ads-'));
  for (const name of fs.readdirSync(ROOT)) {
    if (SKIP_TOP.has(name)) continue;
    fs.cpSync(path.join(ROOT, name), path.join(dir, name), { recursive: true });
  }
  return dir;
}

export function snapshot(dir) {
  const out = {};
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else out[path.relative(dir, p)] = fs.readFileSync(p, 'utf8');
    }
  };
  for (const name of fs.readdirSync(dir)) {
    if (SKIP_TOP.has(name)) continue;
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p);
    else out[name] = fs.readFileSync(p, 'utf8');
  }
  return out;
}

export async function loadChromium() {
  try {
    return (await import(`${PLAYWRIGHT}/index.mjs`)).chromium;
  } catch {
    return createRequire(import.meta.url)(PLAYWRIGHT).chromium;
  }
}

export const AD_ROUTES = ['**/*googlesyndication.com/**', '**/*doubleclick*/**', '**/*adservice*/**'];

// Answer every ad-network request with an empty script so no test reaches the internet.
export async function stubAds(context, hits) {
  await context.route('https://gc.zgo.at/**', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  for (const pattern of AD_ROUTES) {
    await context.route(pattern, (route) => {
      if (hits) hits.push(route.request().url());
      return route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
    });
  }
}

// chromium.launch() whose contexts/pages already have the ad stubs installed.
export async function launchStubbed(chromium) {
  const browser = await chromium.launch();
  const newContext = browser.newContext.bind(browser);
  browser.newContext = async (...args) => {
    const ctx = await newContext(...args);
    await stubAds(ctx);
    return ctx;
  };
  browser.newPage = async (opts) => {
    const ctx = await browser.newContext(opts);
    return ctx.newPage();
  };
  return browser;
}

export function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.on('error', reject);
    srv.listen(0, () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

export async function startServer(cwd) {
  const port = await getFreePort();
  const proc = spawn(process.execPath, [path.join(ROOT, 'scripts/serve.js')], {
    cwd,
    env: { ...process.env, PORT: String(port), BASE_PATH: '/' },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('server did not start in 5s')), 5000);
    proc.stdout.on('data', (d) => {
      if (String(d).includes('Server running')) {
        clearTimeout(timer);
        resolve();
      }
    });
    proc.on('error', reject);
  });
  return { port, url: `http://localhost:${port}`, stop: () => proc.kill() };
}
