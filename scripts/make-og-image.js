import { chromium } from '/usr/local/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const assetsDir = path.join(root, 'assets');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8'); // the live site's styles.css

// Fixed numbers, real .digit markup: no randomness so the card is reproducible.
const balls = [7, 1, 3].map((n) => `<div class="digit">${n}</div>`).join('');

const html = `<!DOCTYPE html>
<html lang="fil">
<head>
<meta charset="UTF-8">
<style>${css}</style>
<style>
  html, body { width: 1200px; height: 630px; overflow: hidden; }
  body { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 28px; text-align: center; min-height: 0; }
  body::before { height: 630px; }
  .eyebrow { margin: 0; font-size: 28px; }
  .title { font-size: 88px; }
  .tagline { margin: 0; font-size: 34px; }
  .balls { --ball: 150px; margin-top: 8px; gap: 32px; }
  .balls .digit { font-size: 92px; }
  .note { margin: 0; font-size: 24px; color: var(--muted); }
</style>
</head>
<body>
  <p class="eyebrow">Lucky Number Generator</p>
  <h1 class="title">Lotto <span>Lucky</span> Numbers PH</h1>
  <p class="tagline">Lucky numbers para sa Swertres, EZ2 at Lotto. For fun lang!</p>
  <div class="balls">${balls}</div>
  <p class="note">For entertainment only. 18+. Not affiliated with PCSO.</p>
</body>
</html>`;

async function main() {
  fs.mkdirSync(assetsDir, { recursive: true });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
    await page.setContent(html);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(assetsDir, 'og-image.png'), type: 'png' });
  } finally {
    await browser.close();
  }
  console.log('Generated assets/og-image.png (1200x630)');
}

main().catch((err) => {
  console.error('Error generating OG image:', err);
  process.exit(1);
});
