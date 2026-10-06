import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Helper to read PNG header and extract dimensions
function getPngDimensions(filePath) {
  const buffer = fs.readFileSync(filePath);
  // PNG header: 8 bytes signature, then IHDR chunk
  // IHDR: length (4), type 'IHDR' (4), data (13), CRC (4)
  // Data layout: width (4), height (4), bit depth (1), color type (1), etc.
  if (buffer.length < 29) {
    return null;
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return { width, height };
}

test('manifest.webmanifest exists and is valid JSON', () => {
  const manifestPath = path.join(rootDir, 'manifest.webmanifest');
  assert.ok(fs.existsSync(manifestPath), 'manifest.webmanifest should exist');
  
  const content = fs.readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(content);
  
  assert.strictEqual(manifest.name, 'PCSO Lucky Numbers', 'name should be "PCSO Lucky Numbers"');
  assert.strictEqual(manifest.short_name, 'PCSO Lucky', 'short_name should be "PCSO Lucky"');
  assert.strictEqual(manifest.start_url, './', 'start_url should be "./"');
  assert.strictEqual(manifest.scope, './', 'scope should be "./"');
  assert.strictEqual(manifest.display, 'standalone', 'display should be "standalone"');
  assert.strictEqual(manifest.theme_color, '#12061f', 'theme_color should be #12061f');
  assert.strictEqual(manifest.background_color, '#12061f', 'background_color should be #12061f');
  
  assert.ok(Array.isArray(manifest.icons), 'icons should be an array');
  assert.strictEqual(manifest.icons.length, 3, 'should have 3 icons');
  
  // Check icon 192x192
  const icon192 = manifest.icons.find(icon => icon.sizes === '192x192');
  assert.ok(icon192, 'should have 192x192 icon');
  assert.strictEqual(icon192.src, 'assets/icons/icon-192.png', '192x192 icon src should be correct');
  
  // Check icon 512x512
  const icon512 = manifest.icons.find(icon => icon.sizes === '512x512' && !icon.purpose);
  assert.ok(icon512, 'should have 512x512 icon');
  assert.strictEqual(icon512.src, 'assets/icons/icon-512.png', '512x512 icon src should be correct');
  
  // Check maskable icon
  const iconMaskable = manifest.icons.find(icon => icon.purpose === 'maskable');
  assert.ok(iconMaskable, 'should have maskable icon');
  assert.strictEqual(iconMaskable.src, 'assets/icons/icon-maskable-512.png', 'maskable icon src should be correct');
});

test('icon files exist and have correct dimensions', () => {
  const icon192Path = path.join(rootDir, 'assets/icons/icon-192.png');
  const icon512Path = path.join(rootDir, 'assets/icons/icon-512.png');
  const iconMaskablePath = path.join(rootDir, 'assets/icons/icon-maskable-512.png');
  
  assert.ok(fs.existsSync(icon192Path), 'icon-192.png should exist');
  assert.ok(fs.existsSync(icon512Path), 'icon-512.png should exist');
  assert.ok(fs.existsSync(iconMaskablePath), 'icon-maskable-512.png should exist');
  
  const dim192 = getPngDimensions(icon192Path);
  assert.strictEqual(dim192.width, 192, 'icon-192.png width should be 192');
  assert.strictEqual(dim192.height, 192, 'icon-192.png height should be 192');
  
  const dim512 = getPngDimensions(icon512Path);
  assert.strictEqual(dim512.width, 512, 'icon-512.png width should be 512');
  assert.strictEqual(dim512.height, 512, 'icon-512.png height should be 512');
  
  const dimMaskable = getPngDimensions(iconMaskablePath);
  assert.strictEqual(dimMaskable.width, 512, 'icon-maskable-512.png width should be 512');
  assert.strictEqual(dimMaskable.height, 512, 'icon-maskable-512.png height should be 512');
});

test('no absolute URLs in index.html', () => {
  const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
  
  // Check href attributes (except canonical link which is allowed to be absolute)
  const hrefMatches = indexHtml.match(/href="[^"]*"/g) || [];
  for (const match of hrefMatches) {
    const url = match.slice(6, -1); // Extract URL from href="..."
    // Allow canonical links (rel="canonical") to have absolute URLs
    if (url.startsWith('https://xon-g.github.io/devteam-pilot/')) {
      continue;
    }
    assert.ok(!url.startsWith('/'), `href should not be absolute: ${url}`);
    assert.ok(!url.startsWith('http'), `href should not be absolute: ${url}`);
  }
  
  // Check src attributes
  const srcMatches = indexHtml.match(/src="[^"]*"/g) || [];
  for (const match of srcMatches) {
    const url = match.slice(5, -1); // Extract URL from src="..."
    assert.ok(!url.startsWith('/'), `src should not be absolute: ${url}`);
    assert.ok(!url.startsWith('http'), `src should not be absolute: ${url}`);
  }
});

test('no absolute URLs in manifest.webmanifest', () => {
  const manifestPath = path.join(rootDir, 'manifest.webmanifest');
  const content = fs.readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(content);
  
  for (const icon of manifest.icons) {
    assert.ok(!icon.src.startsWith('/'), `icon src should not be absolute: ${icon.src}`);
    assert.ok(!icon.src.startsWith('http'), `icon src should not be absolute: ${icon.src}`);
  }
  
  // Check start_url and scope
  assert.ok(!manifest.start_url.startsWith('/'), `start_url should not be absolute: ${manifest.start_url}`);
  assert.ok(!manifest.start_url.startsWith('http'), `start_url should not be absolute: ${manifest.start_url}`);
  assert.ok(!manifest.scope.startsWith('/'), `scope should not be absolute: ${manifest.scope}`);
  assert.ok(!manifest.scope.startsWith('http'), `scope should not be absolute: ${manifest.scope}`);
});

test('no absolute URLs in sw.js', () => {
  const swJs = fs.readFileSync(path.join(rootDir, 'sw.js'), 'utf8');
  
  // Check for absolute URLs in ASSETS array
  const assetsMatch = swJs.match(/ASSETS\s*=\s*\[(.*?)\]/s);
  if (assetsMatch) {
    const assets = assetsMatch[1];
    const urls = assets.match(/"[^"]*"/g) || [];
    for (const url of urls) {
      const strippedUrl = url.slice(1, -1); // Strip quotes
      assert.ok(!strippedUrl.startsWith('/'), `sw.js asset should not be absolute: ${strippedUrl}`);
      assert.ok(!strippedUrl.startsWith('http'), `sw.js asset should not be absolute: ${strippedUrl}`);
    }
  }
  
  // Also check for any other quoted strings that look like paths or URLs
  const allQuotedStrings = swJs.match(/"[^"]*"/g) || [];
  for (const str of allQuotedStrings) {
    const stripped = str.slice(1, -1);
    // Skip if it's a URL pattern (http://, https://) or not a path-like string
    if (stripped.startsWith('/') || stripped.startsWith('http')) {
      assert.ok(false, `Found absolute URL in sw.js: ${stripped}`);
    }
  }
});

test('service worker registration does not break page', () => {
  const appJs = fs.readFileSync(path.join(rootDir, 'src/app.js'), 'utf8');
  
  // Check that registration is wrapped in try-catch or has .catch()
  assert.ok(appJs.includes('navigator.serviceWorker.register'), 'should register service worker');
  assert.ok(
    appJs.includes('.catch(() => {})'),
    'service worker registration should have error handling'
  );
});
