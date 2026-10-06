import { chromium } from '/usr/local/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.join(__dirname, '..', 'assets', 'icons');

// Ensure assets/icons directory exists
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// SVG content for the icons - Swertres is the 3D lotto, not 69
const svg192 = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="192" height="192" viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg">
  <rect width="192" height="192" fill="#FFD700"/>
  <circle cx="96" cy="96" r="80" fill="#FFFFFF"/>
  <text x="96" y="110" font-family="Arial, sans-serif" font-size="70" font-weight="bold" text-anchor="middle" fill="#FFD700">3D</text>
</svg>`;

const svg512 = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#FFD700"/>
  <circle cx="256" cy="256" r="200" fill="#FFFFFF"/>
  <text x="256" y="320" font-family="Arial, sans-serif" font-size="200" font-weight="bold" text-anchor="middle" fill="#FFD700">3D</text>
</svg>`;

const svgMaskable512 = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#FFD700"/>
  <!-- Full-bleed background, text inside central 80% safe zone -->
  <rect x="51.2" y="51.2" width="409.6" height="409.6" fill="#FFFFFF"/>
  <text x="256" y="290" font-family="Arial, sans-serif" font-size="160" font-weight="bold" text-anchor="middle" fill="#FFD700">3D</text>
</svg>`;

async function generatePng(svgContent, outputPath, width, height) {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Set the viewport to match the SVG dimensions
  await page.setViewportSize({ width, height });
  
  // Set SVG content as the page content
  await page.setContent(svgContent);
  
  // Wait for the page to fully render
  await page.waitForLoadState('networkidle');
  
  // Take a screenshot and save as PNG
  await page.screenshot({ path: outputPath, type: 'png' });
  
  await browser.close();
  console.log(`Generated: ${outputPath} (${width}x${height})`);
}

async function main() {
  try {
    // Generate the icons
    await generatePng(svg192, path.join(assetsDir, 'icon-192.png'), 192, 192);
    await generatePng(svg512, path.join(assetsDir, 'icon-512.png'), 512, 512);
    await generatePng(svgMaskable512, path.join(assetsDir, 'icon-maskable-512.png'), 512, 512);
    
    console.log('All icons generated successfully!');
  } catch (err) {
    console.error('Error generating icons:', err);
    process.exit(1);
  }
}

main();
