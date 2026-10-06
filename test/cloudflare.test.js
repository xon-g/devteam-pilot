import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const ignored = read(".assetsignore")
  .split("\n")
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#"));

test("wrangler.jsonc has the expected static-assets config", () => {
  const cfg = JSON.parse(read("wrangler.jsonc"));
  assert.equal(cfg.name, "devteam-pilot");
  assert.equal(cfg.assets.directory, ".");
  assert.match(cfg.compatibility_date, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal("$schema" in cfg, false);
});

test(".assetsignore excludes internal files", () => {
  for (const entry of ["node_modules", ".git", "tasks", "test", "scripts"]) {
    assert.ok(ignored.includes(entry), `${entry} should be ignored`);
  }
});

test(".assetsignore does not hide site files", () => {
  for (const f of ["index.html", "styles.css", "sw.js", "src", "assets",
    "manifest.webmanifest", "robots.txt", "sitemap.xml", "llms.txt"]) {
    assert.ok(!ignored.includes(f), `${f} must be served`);
  }
});

test("every precached URL in sw.js is not under an ignored entry", () => {
  const sw = read("sw.js");
  const block = sw.match(/const ASSETS = \[([\s\S]*?)\]/)[1];
  const urls = [...block.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  assert.ok(urls.length > 0);
  for (const url of urls) {
    const path = url.replace(/^\.\//, "");
    if (!path) continue;
    const hit = ignored.find((e) => path === e || path.startsWith(`${e}/`));
    assert.equal(hit, undefined, `${url} is under ignored entry ${hit}`);
  }
});
