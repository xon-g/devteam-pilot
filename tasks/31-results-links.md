# Task 31: "Check official results" links

Branch: `task/31-results-links` from latest `master` (c1965d6). This file is its first commit.
Brief: `2026-10-06-swertres-analytics.md` item 7. **Links only**: our code never fetches, scrapes or
copies results from PCSO or anywhere else. No npm dependencies. Read `PLAN.md` and the **test context
rule** (browser globals only inside `page.evaluate`). Don't restyle the site.

## 1. Config (one spot for the two URLs)
In `src/config.js` add:
```js
export const PCSO_RESULTS_URL = 'https://www.pcso.gov.ph/SearchLottoResult.aspx';
export const PCSO_FACEBOOK_URL = 'https://www.facebook.com/PCSOPhilippines';
```
(Both unverified from our side: pcso.gov.ph answers 403 to scripts and Facebook hides page names.
The owner checks them in a browser before merging; see PR notes.)

## 2. Home page link row
The app has one game picker, not per-game cards, so add **one** row that names the selected game.
In `index.html`, directly **above** `#not-affiliated`:
```html
<p id="official-results" class="official-results fine-print">
  Opisyal na resulta ng <span id="results-game">Swertres (3D)</span>:
  <a data-results="site" href="https://www.pcso.gov.ph/SearchLottoResult.aspx" target="_blank" rel="noopener noreferrer">PCSO website</a>
  · <a data-results="facebook" href="https://www.facebook.com/PCSOPhilippines" target="_blank" rel="noopener noreferrer">PCSO Facebook</a>
</p>
```
- Works without JS (static hrefs). In `src/app.js` `applyGame`: set `#results-game` text to `game.name`,
  set both `href`s from the config constants, and hide the row (`hidden`) when `game.id === '1-58'`
  (not a PCSO game). Shown for every other game.
- Style: reuse `.fine-print` look; links underlined, tap targets ≥ 24px tall, wraps cleanly at 360px.
- No analytics event, no fetch, no new script tags.

## 3. Contact page
Contact's "Mga resulta ng draw" bullet: link "opisyal na PCSO website" to the same results URL
(`target="_blank" rel="noopener noreferrer"`). Copy text unchanged.

## 4. Cache
`sw.js`: `CACHE` → `"swertres-v27"`; bump every `og-image.png?v=26` to `?v=27` on all pages (as task 29
did). Update tests that pin either version.

## Acceptance tests (runnable, `npm test`; no real network calls)
- `test/results-links.test.js` (node:test, static):
  - `src/config.js` exports both constants; both are `https://`, hosts `www.pcso.gov.ph` and `www.facebook.com`.
  - `index.html`: exactly one `#official-results`, placed before `#not-affiliated`; both anchors' `href`
    equal the config values; `target="_blank"`; `rel` contains `noopener` and `noreferrer`.
  - No file under `src/` contains `fetch(`, `XMLHttpRequest` or `sendBeacon` (none do today), and only
    `src/config.js` mentions `pcso.gov.ph` or `facebook.com`.
  - contact page links the results URL with `rel` containing `noopener`.
  - `sw.js` has `swertres-v27`.
- `test/results-links.browser.test.js` (Playwright, same `startServer` pattern as
  `test/content-b.browser.test.js`, `BASE_PATH=/devteam-pilot/`; abort `https://gc.zgo.at/**`, and
  route `https://www.pcso.gov.ph/**` and `https://www.facebook.com/**` to a 200 stub so nothing leaves the machine):
  - Default load: row visible, `#results-game` = "Swertres (3D)".
  - Select each game in turn: row visible with `game.name` for all nine PCSO games; hidden for "1-58".
  - Clicking "PCSO website" opens a new page (`context.waitForEvent('page')`) whose URL is the results URL;
    same for Facebook.
  - At 360×740: `scrollWidth <= innerWidth`; each link's bounding box height ≥ 24.
  - No console errors.
- **Commit, then run `npm test` on the committed head.** All tests pass; `dt-smoke` clean.

## Out of scope
Showing, fetching or caching any results; the countdown (task 32); copy changes.
