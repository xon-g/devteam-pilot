import { chromium } from '/usr/local/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const iconsDir = path.join(root, 'assets', 'icons');

const svg = fs.readFileSync(path.join(iconsDir, 'favicon.svg'), 'utf8');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 32, height: 32 } });
await page.setContent(
  `<style>html,body{margin:0;background:transparent}svg{display:block;width:32px;height:32px}</style>${svg}`
);
const png = await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: 32, height: 32 } });
await browser.close();

fs.writeFileSync(path.join(iconsDir, 'favicon-32.png'), png);

// ICO: 6-byte ICONDIR + 16-byte ICONDIRENTRY + PNG bytes
const header = Buffer.alloc(22);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(1, 4); // image count
header.writeUInt8(32, 6); // width
header.writeUInt8(32, 7); // height
header.writeUInt8(0, 8); // palette colours
header.writeUInt8(0, 9); // reserved
header.writeUInt16LE(1, 10); // colour planes
header.writeUInt16LE(32, 12); // bits per pixel
header.writeUInt32LE(png.length, 14); // image size
header.writeUInt32LE(22, 18); // image offset
fs.writeFileSync(path.join(root, 'favicon.ico'), Buffer.concat([header, png]));
console.log('favicon files written');
