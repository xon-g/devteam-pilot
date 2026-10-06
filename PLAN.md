# PLAN: Swertres Lucky Numbers (pilot)

Brief: `2026-10-06-swertres-lucky-numbers.md` (owner-approved 2026-10-06).
Owner notes (#devteam, 2026-10-06): copy in Taglish; no ads now, but keep a banner slot in the
layout so ads can be added later without a redesign.

## Stack
- Static HTML/CSS/vanilla JS (ES modules). No framework, no build step, **no npm dependencies**.
- Randomness: `crypto.getRandomValues` with rejection sampling (no modulo bias).
- Tests: Node's built-in `node:test` (unit) + a browser check that uses the Playwright already
  installed on the machine (`/usr/local/lib/node_modules/playwright`), not a project dependency.
- `npm start` = tiny Node static server (`scripts/serve.js`, `node:http` only, PORT env, default 4173).

## Structure
```
index.html            single page
styles.css            mobile-first styles
src/lucky.js          pure logic: random digits, combos, rambolito, reasons (no DOM)
src/reasons.js        the written list of Taglish reasons per digit 0-9
src/app.js            DOM wiring: button, roll animation, toggle, copy/share
scripts/serve.js      static file server for npm start / tests
test/*.test.js        node:test unit + browser tests
```

## Layout (mobile first, CSS grid with named areas)
`header` (title) → `main` (digits, reasons, toggle, Bunot na! button, copy/share) →
`banner` (ad slot, empty and collapsed now) → `disclaimer` (always visible, sticky bottom).
The ad slot is `<aside id="ad-slot" class="ad-slot" hidden>` in its own grid area: adding an
ad later = fill that element and remove `hidden`; nothing else moves or gets redesigned. It
sits above the disclaimer so a banner can never cover the disclaimer.

## Data
No storage, no network, no backend. Reasons are a static list (≥ 3 per digit).

## Rules for copy
- Taglish, playful, horoscope-style.
- Disclaimer exact text: "For entertainment only. Numbers are random and don't improve your odds. 18+. Play responsibly."
- Nothing may imply better odds or guaranteed wins (a test scans all copy for banned phrases).

## Risks
- Builder runs a local model: tasks are kept small with runnable acceptance checks.
- `navigator.share` missing on desktop: fall back to clipboard.
- Rambolito with repeated digits (e.g. 1-1-2): permutations must be de-duplicated.

## Tasks
1. `tasks/01-scaffold-core.md`: scaffold, static server, pure logic + reasons, unit tests.
2. `tasks/02-page-ui.md`: page layout incl. ad slot + disclaimer, Bunot na! with roll animation, reasons, Straight/Rambolito toggle.
3. `tasks/03-copy-share.md`: Copy/Share button and copy safety check.
