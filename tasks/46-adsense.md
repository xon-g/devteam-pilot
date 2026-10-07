# Task 46: AdSense readiness (brief items 13-16, phase 3)

Branch: `task/46-adsense`. Start from the latest `master` **after task 45 is merged** (or from the
approved `task/45-responsive-spacing` head if it isn't merged yet; the hand-off says which).
Bump the service-worker `CACHE` one above the base (v39 if the base is at v38).
Static site, no build step on Cloudflare; generated files are committed. No new dependencies.
**The publisher ID stays `""` and `adsEnabled` stays `false` in every commit.** Never add a real ID.

## Why
The owner wants AdSense approval. When the owner sends the publisher ID, one config change plus
`npm run ads` must produce `ads.txt` and the AdSense `<head>` script; the ad unit appears only when
the owner later turns `adsEnabled` on and supplies an ad-unit slot ID. While the ID is empty,
nothing ad-related reaches visitors (no request to googlesyndication.com, `#ad-slot` hidden).

## Build
1. `ads.config.json` (repo root, served is fine, it holds no secrets):
   `{ "adsensePublisherId": "", "adsEnabled": false, "adSlotId": "" }`
   (`adsEnabled` is the brief's `ADS_ENABLED`). Valid: ID `""` or `/^pub-\d{16}$/`; slot ID `""`
   or `/^\d{10}$/`; `adsEnabled` boolean. `adsEnabled: true` with an empty ID or empty slot ID is
   an error (throw, naming the missing value).
2. `scripts/ads.js` (ES module, like the rest of the repo), pure exported functions plus a CLI:
   - `validateConfig(cfg)` → the config or throws (rules above).
   - `adsTxt(id)`: `""` for empty; else exactly `google.com, ${id}, DIRECT, f08c47fec0942fa0\n`.
   - `headSnippet(id)`: `""` for empty; else exactly
     `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-${id}" crossorigin="anonymous"></script>`
   - `slotSnippet(cfg)`: `""` unless `adsEnabled && id && slotId`; else exactly
     `<ins class="adsbygoogle" style="display:block" data-ad-client="ca-${id}" data-ad-slot="${slotId}" data-ad-format="auto" data-full-width-responsive="true"></ins>`
   - `applyHead(html, id)` replaces what is between `<!-- adsense:start -->` and
     `<!-- adsense:end -->`; `applySlot(html, cfg)` replaces what is between
     `<!-- adslot:start -->` and `<!-- adslot:end -->`. Markers kept; empty content = markers
     adjacent on one line. Throw if a page that should carry markers lacks them.
   - `apply(rootDir)`: reads `rootDir/ads.config.json`, validates, writes `rootDir/ads.txt`, runs
     `applyHead` on the head pages and `applySlot` on `index.html`. Returns the files written.
   - CLI (`node scripts/ads.js`) applies to the repo root and prints the files written.
     `package.json`: `"ads": "node scripts/ads.js"`.
3. Head markers just before `</head>` on: `index.html`, `how-to-play/`, `lucky-numbers/`,
   `about/`, `contact/`. **Never** on `privacy/` or `responsible-gaming/` (no ad code there).
4. Slot: `<aside id="ad-slot" …>` keeps its place (after the `about-games` sections, before
   `footer#disclaimer`, i.e. below the result and above the disclaimer; never between `#draw` and
   the result) and keeps `hidden`. Put the slot markers inside it.
5. `src/ads.js` (DOM module) `initAdSlot()`: if `#ad-slot` contains `ins.adsbygoogle`, remove
   `hidden` and call `(window.adsbygoogle = window.adsbygoogle || []).push({})` once; otherwise do
   nothing (no globals created). Call it from `src/app.js` on load. Add `src/ads.js` to the SW
   `ASSETS`.
6. CSS: `.ad-slot` stays `height: 0` while hidden; when not hidden it reserves
   `min-height: 280px` (height auto, no overflow clipping of the ad), same width as `main`, and it
   is fully scrollable above the fixed disclaimer (the disclaimer must never cover it at the end of
   the page; check the existing bottom padding).
7. Service worker (`sw.js`): never cache or serve from cache any request whose path ends in
   `/ads.txt` or whose host ends in `googlesyndication.com`, `doubleclick.net`,
   `googleadservices.com`, `google.com` or `gstatic.com` (let them go to the network untouched:
   `return` before `respondWith`). `ads.txt` and `ads.config.json` are not in `ASSETS`. Bump `CACHE`.
8. Sitemap (item 15): keep it complete. Language variants share one URL (`data-lang-block`), so
   no extra entries; note that in the PR. `robots.txt` keeps the Sitemap line.
9. `README.md`: short "Turning on AdSense" section (set the ID → `npm run ads` → test → PR; after
   AdSense approval the owner creates an ad unit, sets `adSlotId` + `adsEnabled: true` → `npm run ads`).
10. `privacy/` already has the Google ad-cookies text (task 27); don't change it unless a test shows a gap.

## Do not
Consent banner/CMP, Auto ads, other networks, more than one ad unit, ads on `privacy/` or
`responsible-gaming/`, any real ID, tests that reach the internet, host paths or secrets in files.

## Acceptance tests (`dt-test`; add `test/ads.test.js` + `test/ads.browser.test.js`; all existing tests keep passing)
- Committed state: config is exactly `{ adsensePublisherId: "", adsEnabled: false, adSlotId: "" }`;
  `ads.txt` is `""`; no served file (outside `tasks/ test/ scripts/ README.md PLAN.md .git`) contains
  `googlesyndication`, `adsbygoogle` or `pagead2` except `src/ads.js` and `sw.js`, which may name
  them; the 5 head pages contain `<!-- adsense:start --><!-- adsense:end -->` inside `<head>`;
  privacy and responsible-gaming have no ad markers; `index.html` `#ad-slot` contains exactly
  `<!-- adslot:start --><!-- adslot:end -->` and `hidden`.
- In sync: `apply` on a temp copy of the repo with the committed config changes no file.
- `validateConfig`: accepts the default and `{pub-0000000000000000, false, ""}` and
  `{pub-0000000000000000, true, "1234567890"}`; throws for `ca-pub-…`, 15/17 digits, leading
  space, slot `"123"`, `adsEnabled: true` with empty ID, `adsEnabled: true` with empty slot,
  `adsEnabled: "false"` (string).
- Exact strings for `adsTxt`, `headSnippet`, `slotSnippet` with `pub-0000000000000000` / `1234567890`.
- Temp-copy end-to-end (copy the served files to `fs.mkdtempSync`, never touch the repo): with the
  test ID and `adsEnabled: false`: `ads.txt` has the exact line, the head script is in `<head>`
  once on the 5 pages and absent from privacy and responsible-gaming, the slot is empty; with
  `adsEnabled: true` + slot: the `<ins>` is inside `#ad-slot` in `index.html` only. `apply` twice
  is idempotent; back to empty → identical to the committed files.
- Browser (Playwright, 375×667 and 1280×800), **ID empty** (repo as committed): load `/`, draw
  once, visit `/how-to-play/`: no request to any host containing `googlesyndication`,
  `doubleclick` or `adservice`; `window.adsbygoogle` is `undefined` (read inside `page.evaluate`);
  `#ad-slot` hidden with height 0.
- Browser, **test ID + `adsEnabled: true`** on a served temp copy (`scripts/serve.js` with `cwd` = the
  temp dir): intercept `**/*googlesyndication.com/**` with `page.route` and fulfil an empty script
  (count the hits, no real network); `GET /ads.txt` → 200 with the exact line; the head script is
  requested on `/`; `#ad-slot` visible, height ≥ 280px, its top is below the bottom of
  `#combo-output` and below `#draw`, and after scrolling to the bottom the slot's bottom is above
  the top of `#disclaimer` (disclaimer still fully in the viewport); `/privacy/` and
  `/responsible-gaming/` make no googlesyndication request; no layout shift: the slot's height
  before and after the stub script runs is the same.
- Service worker: static checks that `ASSETS` contains no `ads.txt`/`ads.config.json`/remote URL
  and that the bypass list above is in `sw.js`; browser check on a served copy with the test ID:
  after the SW controls the page, `fetch('ads.txt')` twice, then
  `(await caches.keys())` → no cached request URL ends in `ads.txt` or contains `googlesyndication`
  (all read inside `page.evaluate`).
- Sitemap: every `*/index.html` page (plus `/`) is a `<loc>` on `https://lotto.xonicbox.com/…/`
  and every `<loc>` maps to a page; `robots.txt` names the sitemap.
- Test context rule: browser globals only inside `page.evaluate`; DOM-free logic in `scripts/ads.js`.
- `dt-smoke` passes.

## Report
RESULT line, commit sha, test summary (pass/fail counts), `npm run ads` output, cache version.
