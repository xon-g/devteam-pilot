# Task 37: "Save image" share card (Instagram / TikTok Stories)

Branch: `task/37-share-image` from latest `master` (b20533d). This file is its first commit.
Brief: `2026-10-07-lotto-share-buttons.md` must-have 3 (+ 4: `via=img`, + 6: wording). Task 36 (share
row, `src/share.js`, `SITE_URL`, `VIA` incl. `img`) is merged; build on it. Read `PLAN.md` and the
**test context rule** (pure logic in DOM-free modules tested in Node; browser globals only inside
`page.evaluate`). No npm dependencies, no external service, no new network requests, no new fonts.
Don't restyle the site.

## 1. Pure logic: `src/card.js` (new, DOM-free, no globals)
- `cardContent({ game, numbersText, mode, name, drawText })` → plain object with the strings the
  card shows, in this order:
  - `title`: `"Lotto Lucky Numbers PH"`
  - `game`: `game.name` (e.g. `"Swertres (3D)"`)
  - `forName`: `"Para kay <name>"` or `''`
  - `numbers`: `numbersText` (what `#combo-output` shows, e.g. `"5-7-5"` or `"03 · 11 · 24 …"`); for
    Rambolito use the straight combo plus `"(Rambolito)"` on its own line (`modeLine`), never the full permutation list.
  - `draw`: `"Next draw: " + drawText` (e.g. `"Next draw: ngayong 5:00 PM"`) or `''` when there's none
  - `fun`: `"Random, for fun only. 18+."`
  - `disclaimer`: `"Not affiliated with PCSO."`
  - `url`: `"lotto.xonicbox.com"`
- `cardFileName(gameId, numbersText)` → `lotto-lucky-numbers-<gameId>-<digits/dashes only>.png`
  (e.g. `lotto-lucky-numbers-3d-5-7-5.png`; strip everything except `[a-z0-9-]`, collapse repeats).
- `fitFontSize(textLength, maxWidth, base)`: simple shrink rule so long lotto numbers fit (document
  the rule; unit-test monotonic: longer text → smaller or equal size, never below 40).
- `drawCard(ctx, content, { width: 1080, height: 1920 })`: draws on any CanvasRenderingContext2D-like
  object (takes `ctx` as an argument, never touches `document`). Background `#12061f` with a gold
  (`#ffc93c` → `#ff9f1c`) accent, big gold numbers centred, white text, URL at the bottom, disclaimer
  ≥ 28px and readable. Font: `system-ui, sans-serif` (whatever the page already uses is fine; no new font files).
- Wording is fixed by the brief: never "winning", "panalo", "prediction", "guaranteed", "sure win".

## 2. Home page
- Add a button `<button type="button" data-share="img" id="save-image">Save image</button>` at the
  **end** of `#share-row` (after Copy link). It appears/hides with the row.
- Click (in `src/app.js`):
  1. Fire `share-done/img` (same as the other row buttons; the existing row click handler already does this for any `[data-share]`).
  2. Build a 1080×1920 `<canvas>` (not in the DOM), `drawCard`, `canvas.toBlob(..., 'image/png')`.
     Use the same next-draw label the page shows (`#next-draw` text parts) if visible, else no draw line.
  3. `const file = new File([blob], cardFileName(...), { type: 'image/png' })`. If
     `navigator.canShare?.({ files: [file] })` → `navigator.share({ files: [file], text: shareText…,
     url: shareUrl(SITE_URL, 'img') })`; on `AbortError` do nothing.
     Otherwise download: object URL + temporary `<a download>`; revoke the URL afterwards.
  4. Status: "Na-save na ang image!" (download) / "Naibahagi na!" (shared) / "Hindi ma-save" on error (no throw).
- Same pill style as the other row items, ≥ 44px tall.

## 3. Offline + cache
`sw.js`: add `"src/card.js"` to `ASSETS`; `CACHE` → `"swertres-v30"`; bump every `og-image.png?v=29`
to `?v=30` on all pages (not in `tasks/`). Update every test that pins v29.

## Acceptance tests (runnable, `npm test`; no real network calls)
- `test/card.test.js` (node:test):
  - `cardContent` for 3d straight, 3d rambolito, 6-58 and 1-58 (no draw → `draw === ''`); every
    string field is present; `fun` contains "18+"; `disclaimer` contains "Not affiliated with PCSO";
    `url` is `lotto.xonicbox.com`; no field matches /winning|panalo|prediction|guaranteed|sure win/i;
    rambolito `numbers` is the straight combo (no commas).
  - `cardFileName('3d', '5-7-5')` → `lotto-lucky-numbers-3d-5-7-5.png`; `'6-58'` with
    `'03 · 11 · 24 · 30 · 41 · 58'` → only `[a-z0-9-]` and ends `.png`; no `--`.
  - `fitFontSize` monotonic and ≥ 40.
  - `drawCard` with a fake ctx (object recording `fillText` calls + no-op other methods): every
    non-empty content string is drawn exactly once; all x within 0..1080, y within 0..1920.
  - `src/card.js` contains no `document`, `window`, `navigator`, `fetch(`.
  - `sw.js` has `swertres-v30` and lists `src/card.js`.
- `test/share-image.browser.test.js` (Playwright, same `startServer` pattern as
  `test/share-row.browser.test.js`, `BASE_PATH=/devteam-pilot/`; abort `https://gc.zgo.at/**`;
  goatcounter stub pushing paths to `window.__gc`):
  - `#save-image` hidden before a draw, visible after, last item in `#share-row`, label "Save image".
  - Desktop (no `navigator.canShare`; delete it via `addInitScript`): click → Playwright
    `page.waitForEvent('download')`; suggested filename matches `^lotto-lucky-numbers-3d-\d-\d-\d\.png$`;
    saved file starts with the PNG signature and its IHDR width/height are 1080×1920 (read bytes 16–23);
    status "Na-save na ang image!"; `__gc` has `share-done/img`.
  - Share path: `addInitScript` stubs `navigator.canShare = () => true` and `navigator.share` recording
    its argument; click → share called once with 1 file of type `image/png`, `url` ending `?ref=img`;
    status "Naibahagi na!". A share stub that rejects with `AbortError` → no error status, no console error.
  - Pixel check: in `page.evaluate`, build the card with the app's own modules (import `src/card.js`),
    draw a known combo, `getImageData` at the background corner is ≈ `#12061f` and some pixel in the
    numbers band is gold-ish (R > 200, G > 150, B < 120).
  - At 360×740: `scrollWidth <= innerWidth`; `#save-image` ≥ 44px tall.
  - No console errors.
- Existing share tests keep passing.
- **Commit, then run `npm test` on the committed head.** All tests pass; `dt-smoke` clean.

## Out of scope
Dynamic per-share OG images, uploading the image anywhere, new fonts, any SDK, changing the share row order.
