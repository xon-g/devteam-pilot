import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const DISCLAIMER = "For entertainment only. Numbers are random and don't improve your odds. 18+. Play responsibly.";
const BANNED = ['guarantee', 'sigurado', 'siguradong panalo', 'tsansa', 'odds', 'better chance', 'sure win', 'jackpot ka na', 'panalo', 'tatama', 'jackpot'];

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

// Extract text content from HTML tags
function extractText(html, tag) {
  const pattern = new RegExp('<' + tag + '[^>]*>([^<]*)</' + tag + '>', 'i');
  const match = html.match(pattern);
  if (match) {
    return match[1].trim();
  }
  return null;
}

// Extract meta content
function extractMetaContent(html, name, property) {
  let pattern;
  if (name) {
    // Match <meta name="..." content="...">
    pattern = new RegExp('<meta[^>]+name=["\']' + name + '["\'][^>]+content=["\']([^"\']+)["\']', 'i');
  } else if (property) {
    // Match <meta property="..." content="...">
    pattern = new RegExp('<meta[^>]+property=["\']' + property + '["\'][^>]+content=["\']([^"\']+)["\']', 'i');
  }
  const match = html.match(pattern);
  if (match) {
    return match[1].trim();
  }
  return null;
}

// Extract href or src attribute
function extractAttribute(html, tag, attr, rel) {
  let pattern;
  if (rel) {
    // Match <tag rel="..." attr="...">
    pattern = new RegExp('<' + tag + '[^>]+rel=["\']' + rel + '["\'][^>]+href=["\']([^"\']+)["\']', 'i');
  } else {
    // Match <tag attr="...">
    pattern = new RegExp('<' + tag + '[^>]+href=["\']([^"\']+)["\']', 'i');
  }
  const match = html.match(pattern);
  if (match) {
    return match[1].trim();
  }
  return null;
}

test('SEO meta tags present and non-empty', () => {
  const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
  
  // Helper to count occurrences of a tag
  function countTag(html, tagPattern) {
    const matches = html.match(tagPattern);
    return matches ? matches.length : 0;
  }
  
  // Count checks - each tag should appear exactly once
  const titlePattern = /<title[^>]*>[^<]*<\/title>/gi;
  assert.strictEqual(countTag(indexHtml, titlePattern), 1, 'title should appear exactly once');
  
  const descPattern = /<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']+)["\']/gi;
  assert.strictEqual(countTag(indexHtml, descPattern), 1, 'description meta should appear exactly once');
  
  const canonicalPattern = /<link[^>]+rel=["\']canonical["\'][^>]+href=["\']([^"\']+)["\']/gi;
  assert.strictEqual(countTag(indexHtml, canonicalPattern), 1, 'canonical link should appear exactly once');
  
  const robotsPattern = /<meta[^>]+name=["\']robots["\'][^>]+content=["\']([^"\']+)["\']/gi;
  assert.strictEqual(countTag(indexHtml, robotsPattern), 1, 'robots meta should appear exactly once');
  
  // Open Graph tags (og:*, not og:image:*)
  const ogTypePattern = /<meta[^>]+property=["\']og:type["\'][^>]+content=["\']([^"\']+)["\']/gi;
  assert.strictEqual(countTag(indexHtml, ogTypePattern), 1, 'og:type should appear exactly once');
  
  const ogSiteNamePattern = /<meta[^>]+property=["\']og:site_name["\'][^>]+content=["\']([^"\']+)["\']/gi;
  assert.strictEqual(countTag(indexHtml, ogSiteNamePattern), 1, 'og:site_name should appear exactly once');
  
  const ogTitlePattern = /<meta[^>]+property=["\']og:title["\'][^>]+content=["\']([^"\']+)["\']/gi;
  assert.strictEqual(countTag(indexHtml, ogTitlePattern), 1, 'og:title should appear exactly once');
  
  const ogDescriptionPattern = /<meta[^>]+property=["\']og:description["\'][^>]+content=["\']([^"\']+)["\']/gi;
  assert.strictEqual(countTag(indexHtml, ogDescriptionPattern), 1, 'og:description should appear exactly once');
  
  const ogUrlPattern = /<meta[^>]+property=["\']og:url["\'][^>]+content=["\']([^"\']+)["\']/gi;
  assert.strictEqual(countTag(indexHtml, ogUrlPattern), 1, 'og:url should appear exactly once');
  
  const ogImagePattern = /<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']/gi;
  assert.strictEqual(countTag(indexHtml, ogImagePattern), 1, 'og:image should appear exactly once');
  
  const ogImageWidthPattern = /<meta[^>]+property=["\']og:image:width["\'][^>]+content=["\']([^"\']+)["\']/gi;
  assert.strictEqual(countTag(indexHtml, ogImageWidthPattern), 1, 'og:image:width should appear exactly once');
  
  const ogImageHeightPattern = /<meta[^>]+property=["\']og:image:height["\'][^>]+content=["\']([^"\']+)["\']/gi;
  assert.strictEqual(countTag(indexHtml, ogImageHeightPattern), 1, 'og:image:height should appear exactly once');
  
  const ogImageAltPattern = /<meta[^>]+property=["\']og:image:alt["\'][^>]+content=["\']([^"\']+)["\']/gi;
  assert.strictEqual(countTag(indexHtml, ogImageAltPattern), 1, 'og:image:alt should appear exactly once');
  
  const ogLocalePattern = /<meta[^>]+property=["\']og:locale["\'][^>]+content=["\']([^"\']+)["\']/gi;
  assert.strictEqual(countTag(indexHtml, ogLocalePattern), 1, 'og:locale should appear exactly once');
  
  // Twitter tags (use name= not property=)
  const twitterCardPattern = /<meta[^>]+name=["\']twitter:card["\'][^>]+content=["\']([^"\']+)["\']/gi;
  assert.strictEqual(countTag(indexHtml, twitterCardPattern), 1, 'twitter:card should appear exactly once');
  
  const twitterTitlePattern = /<meta[^>]+name=["\']twitter:title["\'][^>]+content=["\']([^"\']+)["\']/gi;
  assert.strictEqual(countTag(indexHtml, twitterTitlePattern), 1, 'twitter:title should appear exactly once');
  
  const twitterDescriptionPattern = /<meta[^>]+name=["\']twitter:description["\'][^>]+content=["\']([^"\']+)["\']/gi;
  assert.strictEqual(countTag(indexHtml, twitterDescriptionPattern), 1, 'twitter:description should appear exactly once');
  
  const twitterImagePattern = /<meta[^>]+name=["\']twitter:image["\'][^>]+content=["\']([^"\']+)["\']/gi;
  assert.strictEqual(countTag(indexHtml, twitterImagePattern), 1, 'twitter:image should appear exactly once');
  
  // Title
  const title = extractText(indexHtml, 'title');
  assert.ok(title, 'title should be present');
  assert.ok(title.length <= 60, `title should be <= 60 chars, got ${title.length}: ${title}`);
  
  // Description
  const description = extractMetaContent(indexHtml, 'description', null);
  assert.ok(description, 'meta description should be present');
  assert.ok(description.length >= 70 && description.length <= 160, 
    `description should be 70-160 chars, got ${description.length}`);
  
  // Canonical
  const canonical = extractAttribute(indexHtml, 'link', 'href', 'canonical');
  assert.ok(canonical, 'canonical link should be present');
  assert.ok(canonical.startsWith('https://xon-g.github.io/devteam-pilot/'), 
    `canonical should start with origin: ${canonical}`);
  
  // Robots
  const robots = extractMetaContent(indexHtml, 'robots', null);
  assert.ok(robots, 'robots meta should be present');
  assert.ok(robots.includes('index') && robots.includes('follow'), 
    `robots should include index,follow: ${robots}`);
  
  // Open Graph tags
  const ogType = extractMetaContent(indexHtml, null, 'og:type');
  assert.strictEqual(ogType, 'website', 'og:type should be website');
  
  const ogSiteName = extractMetaContent(indexHtml, null, 'og:site_name');
  assert.ok(ogSiteName, 'og:site_name should be present');
  
  const ogTitle = extractMetaContent(indexHtml, null, 'og:title');
  assert.ok(ogTitle, 'og:title should be present');
  
  const ogDescription = extractMetaContent(indexHtml, null, 'og:description');
  assert.ok(ogDescription, 'og:description should be present');
  
  const ogUrl = extractMetaContent(indexHtml, null, 'og:url');
  assert.ok(ogUrl, 'og:url should be present');
  assert.ok(ogUrl.startsWith('https://xon-g.github.io/devteam-pilot/'), 
    `og:url should start with origin: ${ogUrl}`);
  
  const ogImage = extractMetaContent(indexHtml, null, 'og:image');
  assert.ok(ogImage, 'og:image should be present');
  assert.ok(ogImage.startsWith('https://xon-g.github.io/devteam-pilot/'), 
    `og:image should start with origin: ${ogImage}`);
  
  const ogImageWidth = extractMetaContent(indexHtml, null, 'og:image:width');
  assert.strictEqual(ogImageWidth, '1200', 'og:image:width should be 1200');
  
  const ogImageHeight = extractMetaContent(indexHtml, null, 'og:image:height');
  assert.strictEqual(ogImageHeight, '630', 'og:image:height should be 630');
  
  const ogImageAlt = extractMetaContent(indexHtml, null, 'og:image:alt');
  assert.ok(ogImageAlt, 'og:image:alt should be present');
  
  const ogLocale = extractMetaContent(indexHtml, null, 'og:locale');
  assert.strictEqual(ogLocale, 'fil_PH', 'og:locale should be fil_PH');
  
  // Twitter tags
  const twitterCard = extractMetaContent(indexHtml, 'twitter:card', null);
  assert.strictEqual(twitterCard, 'summary_large_image', 'twitter:card should be summary_large_image');
  
  const twitterTitle = extractMetaContent(indexHtml, 'twitter:title', null);
  assert.ok(twitterTitle, 'twitter:title should be present');
  
  const twitterDescription = extractMetaContent(indexHtml, 'twitter:description', null);
  assert.ok(twitterDescription, 'twitter:description should be present');
  
  const twitterImage = extractMetaContent(indexHtml, 'twitter:image', null);
  assert.ok(twitterImage, 'twitter:image should be present');
  assert.ok(twitterImage.startsWith('https://xon-g.github.io/devteam-pilot/'), 
    `twitter:image should start with origin: ${twitterImage}`);
});

test('OG image exists and has correct dimensions', () => {
  const ogImagePath = path.join(rootDir, 'assets/og-image.png');
  assert.ok(fs.existsSync(ogImagePath), 'og-image.png should exist');
  
  const dims = getPngDimensions(ogImagePath);
  assert.ok(dims, 'og-image.png should be a valid PNG');
  assert.strictEqual(dims.width, 1200, 'og-image.png width should be 1200');
  assert.strictEqual(dims.height, 630, 'og-image.png height should be 630');
});

test('sw.js precaches og-image.png and CACHE is swertres-v10', () => {
  const swJs = fs.readFileSync(path.join(rootDir, 'sw.js'), 'utf8');
  
  // Check CACHE version
  assert.ok(swJs.includes('const CACHE = "swertres-v10"'), 'CACHE should be swertres-v10');
  
  // Check og-image.png in ASSETS
  assert.ok(swJs.includes('"assets/og-image.png"'), 'sw.js should precache og-image.png');
});

test('robots.txt exists and allows all', () => {
  const robotsPath = path.join(rootDir, 'robots.txt');
  assert.ok(fs.existsSync(robotsPath), 'robots.txt should exist');
  
  const content = fs.readFileSync(robotsPath, 'utf8');
  assert.ok(content.includes('User-agent: *'), 'robots.txt should have User-agent: *');
  assert.ok(content.includes('Disallow:'), 'robots.txt should have Disallow: (empty = allow all)');
});

test('canonical, og:url, og:image, twitter:image all start with same origin', () => {
  const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
  
  const canonical = extractAttribute(indexHtml, 'link', 'href', 'canonical');
  const ogUrl = extractMetaContent(indexHtml, null, 'og:url');
  const ogImage = extractMetaContent(indexHtml, null, 'og:image');
  const twitterImage = extractMetaContent(indexHtml, 'twitter:image', null);
  
  const origin = 'https://xon-g.github.io/devteam-pilot/';
  assert.ok(canonical, 'canonical should be present');
  assert.ok(ogUrl, 'og:url should be present');
  assert.ok(ogImage, 'og:image should be present');
  assert.ok(twitterImage, 'twitter:image should be present');
  
  assert.ok(canonical.startsWith(origin), `canonical should start with origin: ${canonical}`);
  assert.ok(ogUrl.startsWith(origin), `og:url should start with origin: ${ogUrl}`);
  assert.ok(ogImage.startsWith(origin), `og:image should start with origin: ${ogImage}`);
  assert.ok(twitterImage.startsWith(origin), `twitter:image should start with origin: ${twitterImage}`);
});

test('banned phrases absent from title and meta content (disclaimer excluded)', () => {
  const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
  
  // Extract title text
  const title = extractText(indexHtml, 'title');
  const titleWithoutDisclaimer = title.split(DISCLAIMER).join('').toLowerCase();
  for (const phrase of BANNED) {
    assert.ok(!titleWithoutDisclaimer.includes(phrase), `banned phrase "${phrase}" in title`);
  }
  
  // Extract all meta content values
  const metaMatches = indexHtml.match(/<meta[^>]+content=["\']([^"\']+)["\']/gi) || [];
  for (const metaTag of metaMatches) {
    const contentMatch = metaTag.match(/content=["\']([^"\']+)["\']/i);
    if (contentMatch) {
      const content = contentMatch[1];
      const contentWithoutDisclaimer = content.split(DISCLAIMER).join('').toLowerCase();
      for (const phrase of BANNED) {
        assert.ok(!contentWithoutDisclaimer.includes(phrase), `banned phrase "${phrase}" in meta content: ${content}`);
      }
    }
  }
});

test('no absolute URLs in index.html href/src attributes (except canonical, og:url, og:image, twitter:image)', () => {
  const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
  
  // Check href attributes (except canonical link)
  const hrefMatches = indexHtml.match(/href="[^"]*"/g) || [];
  for (const match of hrefMatches) {
    const url = match.slice(6, -1);
    // Allow canonical, og:url, og:image, twitter:image which are allowed to be absolute
    if (url.startsWith('https://xon-g.github.io/devteam-pilot/')) {
      continue;
    }
    assert.ok(!url.startsWith('/'), `href should not be absolute: ${url}`);
    assert.ok(!url.startsWith('http'), `href should not be absolute: ${url}`);
  }
  
  // Check src attributes
  const srcMatches = indexHtml.match(/src="[^"]*"/g) || [];
  for (const match of srcMatches) {
    const url = match.slice(5, -1);
    assert.ok(!url.startsWith('/'), `src should not be absolute: ${url}`);
    assert.ok(!url.startsWith('http'), `src should not be absolute: ${url}`);
  }
});

test('no absolute URLs in sw.js (except in comments)', () => {
  const swJs = fs.readFileSync(path.join(rootDir, 'sw.js'), 'utf8');
  
  // Check for absolute URLs in ASSETS array
  const assetsMatch = swJs.match(/ASSETS\s*=\s*\[(.*?)\]/s);
  if (assetsMatch) {
    const assets = assetsMatch[1];
    const urls = assets.match(/"[^"]*"/g) || [];
    for (const url of urls) {
      const strippedUrl = url.slice(1, -1);
      assert.ok(!strippedUrl.startsWith('/'), `sw.js asset should not be absolute: ${strippedUrl}`);
      assert.ok(!strippedUrl.startsWith('http'), `sw.js asset should not be absolute: ${strippedUrl}`);
    }
  }
});
