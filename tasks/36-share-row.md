# Task 36: Share row (Facebook, Messenger, Viber, WhatsApp, Telegram, X, Copy link) + ?ref= tags

Branch: `task/36-share-row` from latest `master` (7fdb20e). This file is its first commit.
Brief: `2026-10-07-lotto-share-buttons.md` must-haves 1, 2, 4, 5, 6. (Must-have 3, "Save image",
is task 37; don't start it here.) Read `PLAN.md` and the **test context rule** (pure logic in
DOM-free modules tested in Node; browser globals only inside `page.evaluate`). No npm
dependencies, no third-party scripts/SDKs/widgets, no new network requests. Don't restyle the site.

## 1. Pure logic: `src/share.js` (new, DOM-free, no globals)
```js
export const SHARE_TARGETS = ['fb', 'msgr', 'viber', 'wa', 'tg', 'x', 'copy'];
export function shareUrl(siteUrl, ref)          // siteUrl + '?ref=' + ref  (replace any existing query/hash)
export function shareLinks(text, siteUrl)       // → array, in SHARE_TARGETS order minus 'copy':
                                                //   [{ id: 'fb', label: 'Facebook', href }, …]
export function isMobileUA(ua)                  // /Android|iPhone|iPad|iPod|Mobile/i, false for ''/undefined
export function copyText(text, siteUrl)         // `${text} ${shareUrl(siteUrl, 'copy')}`
```
`SITE_URL = 'https://lotto.xonicbox.com/'` goes in `src/config.js` (same value as canonical/og:url).
Each link's URL carries its own `ref` (`u = shareUrl(siteUrl, id)`); every value is encoded with
`encodeURIComponent`:
| id | label | href |
| --- | --- | --- |
| fb | Facebook | `https://www.facebook.com/sharer/sharer.php?u=<u>` |
| msgr | Messenger | `fb-messenger://share/?link=<u>` |
| viber | Viber | `viber://forward?text=<text + ' ' + u>` |
| wa | WhatsApp | `https://wa.me/?text=<text + ' ' + u>` |
| tg | Telegram | `https://t.me/share/url?url=<u>&text=<text>` |
| x | X | `https://twitter.com/intent/tweet?text=<text>&url=<u>` |

## 2. Home page
- `#share` (existing id, keep it): label **"Share"** (was "I-share"). Behaviour: if `navigator.share`
  exists → `navigator.share({ text, url: shareUrl(SITE_URL, 'native') })`, `share-done/native`.
  Otherwise unchanged fallback: copy `copyText(...)` to the clipboard, `share-done/copy`.
  Status texts stay ("Naibahagi na!", "Nakopya na!", "Hindi maibahagi").
- Directly below `.actions`, a new row (before `#share-status`):
  ```html
  <nav id="share-row" class="share-row" aria-label="Share to" hidden>
    <a data-share="fb">Facebook</a> … <a data-share="x">X</a>
    <button type="button" data-share="copy">Copy link</button>
  </nav>
  ```
  Order exactly: Facebook, Messenger, Viber, WhatsApp, Telegram, X, Copy link. Hidden until a combo
  is drawn; hidden again when `applyGame` resets (same moments `#share` is disabled/enabled).
  After each draw `app.js` sets every `href` from `shareLinks(shareText(...), SITE_URL)`.
- Messenger link: removed/hidden when `!isMobileUA(navigator.userAgent)`.
- `https:` links get `target="_blank" rel="noopener noreferrer"`; `viber:`/`fb-messenger:` links don't.
- Click on any `[data-share]` → `track(window.goatcounter, eventPath('share-done', { via: id }))`.
  Copy link → `navigator.clipboard.writeText(copyText(...))`, status "Nakopya na!" (errors →
  "Hindi maibahagi", no throw).
- Style: small pill links, wrap in rows, centred, each tap target ≥ 44px tall, text labels (no brand
  logo images, no icon fonts). Quiet secondary look like `#share`. No horizontal scroll at 360px.

## 3. Analytics
`src/analytics.js`: `VIA` = `['native', 'copy', 'fb', 'msgr', 'viber', 'wa', 'tg', 'x', 'img']`
(`img` is for task 37). Anything else still maps to `other`.

## 4. OG / canonical
No change to `<link rel="canonical">` / `og:url` (stay `https://lotto.xonicbox.com/`). GoatCounter's
count.js reports `?ref=` as the referrer and uses the canonical path, so `?ref=` visits show as
referrers `fb`, `wa`, … (no code needed; just don't remove the canonical link).

## 5. Offline + cache
`sw.js`: add `"src/share.js"` to `ASSETS`; `CACHE` → `"swertres-v29"`; bump every
`og-image.png?v=28` to `?v=29` on all pages. Update every test that pins v28.

## Acceptance tests (runnable, `npm test`; no real network calls)
- `test/share-links.test.js` (node:test):
  - `shareUrl('https://lotto.xonicbox.com/', 'fb')` → `https://lotto.xonicbox.com/?ref=fb`; an input
    with an existing `?a=1#x` → still exactly one `?ref=`.
  - `shareLinks(text, SITE_URL)` with `text = 'Swertres lucky numbers ni A & B: 1-2-3 🍀 For entertainment only. 18+.'`:
    ids in order fb, msgr, viber, wa, tg, x; each href starts with the scheme/host in the table;
    parse each https href with `new URL` and assert `searchParams` decode back to exactly the
    original text / URL (so spaces, `&` and the emoji survive); each contains its own `ref=<id>`
    (encoded); no raw space, raw `&` inside a value, or raw emoji in any href.
  - viber/msgr hrefs: decode the part after `text=` / `link=` with `decodeURIComponent` and compare.
  - `isMobileUA`: an Android Chrome UA, an iPhone Safari UA, and the FB in-app UA
    (`… iPhone … [FBAN/FBIOS;…]`) → true; desktop Chrome/Windows and macOS Safari UAs, `''`,
    `undefined` → false.
  - `copyText` ends with `?ref=copy`.
  - `eventPath('share-done', { via })` for every id in SHARE_TARGETS plus 'native','img' → `share-done/<via>`; `'evil'` → `share-done/other`.
  - No banned claim words in `shareText` output for every game/mode: /winning|panalo|prediction|guaranteed|sure win/i; text still contains "18+".
  - `src/share.js` contains no `fetch(`, `window`, `document`, `navigator`.
  - `sw.js` has `swertres-v29` and lists `src/share.js`.
- `test/share-row.browser.test.js` (Playwright, same `startServer` pattern as
  `test/results-links.browser.test.js`, `BASE_PATH=/devteam-pilot/`; abort `https://gc.zgo.at/**`;
  stub `window.goatcounter = { count: (o) => window.__gc.push(o.path) }` via `addInitScript`):
  - Before a draw `#share-row` is hidden; after a draw it's visible with labels in the exact order.
  - Desktop context (default Chromium UA, 1280×800): Messenger not visible; the other 6 are.
  - Mobile context (Android UA, 375×667, `isMobile: true`): Messenger visible, href starts `fb-messenger://share/?link=`.
  - Every https link has `target="_blank"` and `rel` containing `noopener`; each href's decoded
    text contains the combo shown in `#combo-output` and `?ref=<id>`.
  - Clicking each https link (block the popup: `context.route('**/*facebook.com/**', r => r.abort())`
    etc., or intercept `page.on('popup')` and close it) pushes `share-done/<id>` to `__gc`.
  - Copy link (clipboard permissions granted) → clipboard ends with `?ref=copy`, status "Nakopya na!", `__gc` has `share-done/copy`.
  - `#share` label is "Share"; with a stubbed `navigator.share` it's called with `url` ending `?ref=native`.
  - Changing the game hides the row again.
  - At 360×740: `scrollWidth <= innerWidth`; every share-row item is ≥ 44px tall.
  - No console errors.
- Existing `test/share.test.js` / `test/analytics.browser.test.js` keep passing (update only label or
  clipboard expectations that legitimately changed; the clipboard text still contains the combo).
- **Commit, then run `npm test` on the committed head.** All tests pass; `dt-smoke` clean.

## Out of scope
Save image / canvas card (task 37), Facebook app id, any SDK/widget/pixel, changing OG tags or the
OG image, new pages.
