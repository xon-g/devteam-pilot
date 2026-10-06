# Task 02: page layout + draw UI

Branch: `task/02-page-ui`. Builds on task 01. No npm dependencies. Read `PLAN.md` (Layout, copy rules).

## Do
1. `index.html` + `styles.css`, mobile first (designed at 360-414px wide, still fine on desktop
   with a max-width column). CSS grid with named areas `header`, `main`, `banner`, `disclaimer`.
   Fun, enticing look (bold colors, big digits); Taglish UI copy.
2. Ad slot: `<aside id="ad-slot" class="ad-slot" hidden aria-label="Advertisement"></aside>`
   in grid area `banner`, between main and disclaimer. Empty, no ad code, no network calls,
   zero height while hidden. Comment in CSS: how to enable later.
3. Disclaimer: `<footer id="disclaimer">` with exactly
   "For entertainment only. Numbers are random and don't improve your odds. 18+. Play responsibly."
   Always visible (sticky/fixed bottom); main content gets bottom padding so nothing hides behind it.
4. Big `<button id="draw">Bunot na!</button>`. On tap: `drawCombo()`, three digit boxes
   (`.digit`, 3 of them) roll (cycle random digits) for ~600-1000 ms, then settle left to right
   on the final digits. Button disabled while rolling. Respect `prefers-reduced-motion` (skip roll).
5. Under each digit, its reason (`.reason`, from `pickReason`), shown after settling.
6. Straight / Rambolito toggle (`input[name="mode"]` radios, values `straight` / `rambolito`,
   default straight). `#combo-output` shows `formatStraight(combo)` in straight mode, or all
   `rambolitoCombos(combo)` in rambolito mode. Switching mode re-renders without re-drawing.
   Before the first draw show a Taglish prompt like "Pindutin ang Bunot na! para sa swerte mo".

## Acceptance tests (`dt-test` must pass; `dt-smoke` ok:true)
Add `test/ui.test.js`: start `scripts/serve.js` on a free port, use
`await import("/usr/local/lib/node_modules/playwright/index.mjs")` (fall back to `createRequire`
on `/usr/local/lib/node_modules/playwright`), Chromium, viewport 375x667, reducedMotion "reduce":
- no console errors on load; `#draw` text is "Bunot na!".
- `#disclaimer` text equals the exact disclaimer and is inside the viewport at load, after a
  draw, and after scrolling to the bottom.
- `#ad-slot` exists, is hidden, and has no child elements; page makes no requests to other hosts.
- click `#draw` → 3 `.digit` with a single digit each and 3 non-empty `.reason`; 10 clicks
  produce at least 2 different combos.
- `#combo-output` matches `^\d-\d-\d$` in straight mode; after choosing rambolito it lists
  1-6 combos each matching `\d-\d-\d`, and the digits are unchanged.
- no horizontal scroll at 375px (`document.documentElement.scrollWidth <= 375`).
- banned-phrase scan (same list as task 01) over `index.html` and `src/*.js`, after removing
  every occurrence of the exact disclaimer sentence (it legitimately says "odds").

## Report back
Branch, sha, `dt-test` output, `dt-smoke` JSON, path of `.smoke/home.png`.
