import { chromium } from '/usr/local/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.join(__dirname, '..', 'assets');

// Ensure assets directory exists
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// HTML content for the OG image card (1200x630)
const ogHtml = `<!DOCTYPE html>
<html lang="fil">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Swertres Lucky Numbers</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      width: 1200px;
      height: 630px;
      background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
      font-family: Arial, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .card {
      background: white;
      border-radius: 20px;
      padding: 60px;
      text-align: center;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
    }
    h1 {
      font-size: 80px;
      font-weight: bold;
      color: #FFD700;
      margin: 0 0 20px 0;
      text-transform: uppercase;
    }
    .disclaimer {
      font-size: 36px;
      color: #333;
      font-weight: bold;
      margin-top: 40px;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>Swertres</h1>
    <p style="font-size: 48px; color: #FFA500; margin: 20px 0;">Lucky Numbers</p>
    <p class="disclaimer">For entertainment only. 18+.</p>
  </div>
</body>
</html>`;

async function generateOgImage() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Set the viewport to match the OG image dimensions
  await page.setViewportSize({ width: 1200, height: 630 });
  
  // Set HTML content as the page content
  await page.setContent(ogHtml);
  
  // Wait for the page to fully render
  await page.waitForLoadState('networkidle');
  
  // Take a screenshot and save as PNG
  const outputPath = path.join(assetsDir, 'og-image.png');
  await page.screenshot({ path: outputPath, type: 'png' });
  
  await browser.close();
  console.log(`Generated: ${outputPath} (1200x630)`);
}

async function main() {
  try {
    await generateOgImage();
    console.log('OG image generated successfully!');
  } catch (err) {
    console.error('Error generating OG image:', err);
    process.exit(1);
  }
}

main();
