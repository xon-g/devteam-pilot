# PLAN: Swertres Lucky Numbers (pilot)

Brief: `2026-10-06-swertres-lucky-numbers.md` (owner-approved 2026-10-06).
Owner notes (#devteam, 2026-10-06): copy in Taglish; no ads now, but keep a banner slot in the
layout so ads can be added later without a redesign.
Owner scope addition (#devteam, 2026-10-06, approved by the owner directly): installable PWA
(manifest + service worker, works offline), SEO + Open Graph tags for share previews, and the
site must stay hostable on GitHub Pages. Still no npm dependencies. Nothing gets deployed and the
repo's visibility is the owner's call.

## Stack
- Static HTML/CSS/vanilla JS (ES modules). No framework, no build step, **no npm dependencies**.
- Randomness: `crypto.getRandomValues` with rejection sampling (no modulo bias).
- Tests: Node's built-in `node:test` (unit) + a browser check that uses the Playwright already
  installed on the machine (`/usr/local/lib/node_modules/playwright`), not a project dependency.
- `npm start` = tiny Node static server (`scripts/serve.js`, `node:http` only, PORT env, default 4173).

## GitHub Pages rule
- The site must work when served from a subpath (`https://xon-g.github.io/devteam-pilot/`).
  Every URL in HTML, CSS, JS, the manifest and the service worker is **relative** (no leading `/`).
- `scripts/serve.js` accepts `BASE_PATH` (e.g. `/devteam-pilot/`) so tests can serve the site
  from a subpath like Pages does. Default `/`.
- Absolute URLs are allowed only where the spec requires them (`og:url`, `og:image`,
  `<link rel="canonical">`), all built from the one placeholder origin above, which the owner
  can change.

## Structure
```
index.html            single page
styles.css            mobile-first styles
src/lucky.js          pure logic: random digits, combos, rambolito, reasons (no DOM)
src/reasons.js        the written list of Taglish reasons per digit 0-9
src/app.js            DOM wiring: button, roll animation, toggle, copy/share
manifest.webmanifest  PWA manifest (relative start_url/scope)
sw.js                 service worker: precache app shell, cache-first, offline
assets/icons/         192/512 PNG icons + maskable, share image (1200x630)
scripts/serve.js      static file server for npm start / tests (BASE_PATH aware)
test/*.test.js        node:test unit + browser tests
```

## Layout (mobile first, CSS grid with named areas)
`header` (title) → `main` (digits, reasons, toggle, Bunot na! button, copy/share) →
`banner` (ad slot, empty and collapsed now) → `disclaimer` (always visible, sticky bottom).
The ad slot is `<aside id="ad-slot" class="ad-slot" hidden>` in its own grid area: adding an
ad later = fill that element and remove `hidden`; nothing else moves or gets redesigned. It
sits above the disclaimer so a banner can never cover the disclaimer.

## Data
No storage beyond the service worker's cache, no network calls, no backend. Reasons are a static list (≥ 3 per digit).

## Rules for copy
- Taglish, playful, horoscope-style.
- Disclaimer exact text: "For entertainment only. Numbers are random and don't improve your odds. 18+. Play responsibly."
- Nothing may imply better odds or guaranteed wins (a test scans all copy for banned phrases).

## Risks
- Builder runs a local model: tasks are kept small with runnable acceptance checks.
- `navigator.share` missing on desktop: fall back to clipboard.
- Rambolito with repeated digits (e.g. 1-1-2): permutations must be de-duplicated.
- Stale service worker cache after updates: cache name is versioned; old caches deleted on activate.
- Service workers need HTTPS or localhost: fine for GitHub Pages and tests.
- GitHub Pages on a private repo needs a paid plan; making it public is the owner's decision.

## Tasks
1. `tasks/01-scaffold-core.md`: scaffold, static server, pure logic + reasons, unit tests.
2. `tasks/02-page-ui.md`: page layout incl. ad slot + disclaimer, Bunot na! with roll animation, reasons, Straight/Rambolito toggle.
3. `tasks/03-copy-share.md`: Copy/Share button and copy safety check.
4. `tasks/04-pwa.md`: manifest, icons, service worker (offline), BASE_PATH subpath serving.
5. `tasks/05-seo-og.md`: title/description, Open Graph + Twitter tags, canonical, share image.
