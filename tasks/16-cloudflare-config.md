# Task 16: Cloudflare Workers static-assets config

Branch: `task/16-cloudflare-config`, from latest `master`. This file is its first commit.
No npm dependencies, no external requests, no changes to site files (HTML/CSS/JS/sw.js).

Owner report (2026-10-07): the Cloudflare build (`npx wrangler deploy`) fails with
"Asset too large ... node_modules/workerd/bin/workerd 129 MiB". With no `wrangler.jsonc` in
the repo, wrangler runs its auto-setup: it installs wrangler into `./node_modules`, then
uploads the whole repo (`assets.directory = "."`), including `node_modules`, `.git` and
internal files. GitHub Pages must keep working unchanged.

## 1. `wrangler.jsonc` (repo root)
Exactly this (no `$schema` line: it points into `node_modules`, which we don't have):
```jsonc
{
  "name": "devteam-pilot",
  "compatibility_date": "2026-10-06",
  "assets": {
    "directory": "."
  }
}
```

## 2. `.assetsignore` (repo root, gitignore syntax)
```
.git
.github
.gitignore
.assetsignore
.wrangler
.smoke
.review
node_modules
tasks
test
scripts
PLAN.md
STACK.md
README.md
package.json
package-lock.json
wrangler.jsonc
```
Do not ignore anything the site serves: `index.html`, `styles.css`, `sw.js`, `src/`,
`assets/`, `manifest.webmanifest`, `robots.txt`, `sitemap.xml`, `llms.txt`.

## 3. `.gitignore`
Add `.wrangler/` (local wrangler state).

## Acceptance tests (runnable)
- `dt-test` passes.
- Add `test/cloudflare.test.js` (`node:test`, Node only, no network):
  - `wrangler.jsonc` parses with `JSON.parse` and has `name` `devteam-pilot`,
    `assets.directory` `"."`, a `compatibility_date` matching `/^\d{4}-\d{2}-\d{2}$/`, and no
    `$schema` key;
  - `.assetsignore` lines include `node_modules`, `.git`, `tasks`, `test`, `scripts`;
  - every site file is still served: none of `index.html`, `styles.css`, `sw.js`, `src`,
    `assets`, `manifest.webmanifest`, `robots.txt`, `sitemap.xml`, `llms.txt` appears as a
    line in `.assetsignore`;
  - every URL precached in `sw.js` (the string list in the precache array) maps to a path
    that is not under an ignored entry.
- `dt-smoke` passes with no console errors (site unchanged).
- Known limit: the real Cloudflare build can't run here; the owner re-runs it after merge.
