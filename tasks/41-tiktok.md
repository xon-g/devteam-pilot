# Task 41: TikTok share button

Branch: `task/41-tiktok` from latest `master` (0534d3e). This file and `assets/icons/brands/tiktok.svg`
(Simple Icons 16.34.0, CC0) are its first commit. Owner request in #devteam (2026-10-07): "can you
include a tiktok share button?"
Read `PLAN.md`, tasks 36–39 and the **test context rule**. No dependencies, no SDKs, no network requests.

## Why it works this way
TikTok has no web "share this link" URL (no sharer/intent endpoint), and it can't be pre-filled from
a website. TikTok posts are videos/photos, so the button shares **our share-image card** (task 37) as a
photo, and puts the caption on the clipboard so the user can paste it.

## Do
1. `index.html`: new share control after X, before Copy link:
   `<button type="button" data-share="tiktok">` + inline `svg.share-icon` (exact path from
   `assets/icons/brands/tiktok.svg`, same attributes as the other icons) + label `TikTok` (never translated).
   Icon fill `currentColor` (TikTok's brand mark is black/white; the site is dark).
2. `src/share.js`: add `'tiktok'` to `SHARE_TARGETS` after `'x'`; `shareLinks` still returns only
   href-based links (tiktok is not in it, like copy/img).
3. `src/analytics.js`: add `'tiktok'` to `VIA`.
4. `app.js`, click on `[data-share="tiktok"]` (tracked as `share-done/tiktok` like the others):
   a. Try `navigator.clipboard.writeText(copyText(currentShareText(), SITE_URL))`; ignore failure.
   b. Build the card exactly as Save image does (refactor: shared helper, don't duplicate drawing code).
   c. If `navigator.canShare?.({ files: [file] })` → `navigator.share({ files: [file] })` (files only:
      TikTok ignores text/url and some apps reject the share when they're present). On success status
      `statusTiktokShared`; AbortError → no status.
   d. Otherwise (desktop, or share failed with a non-Abort error) → download the PNG and show
      `statusTiktokSaved`.
   Status strings, add to `STRINGS` in all three languages:
   - `statusTiktokShared`: taglish "Piliin ang TikTok, tapos i-paste ang caption!" · en "Pick TikTok, then paste the caption!" · tl "Piliin ang TikTok, saka i-paste ang caption!"
   - `statusTiktokSaved`: taglish "Na-save ang image at nakopya ang caption. I-post mo sa TikTok!" · en "Image saved and caption copied. Post it on TikTok!" · tl "Na-save ang larawan at nakopya ang caption. I-post mo sa TikTok!"
5. CSS: none beyond what `.share-row` already gives (icon fill rule for tiktok = currentColor).
6. `sw.js` `CACHE` → `swertres-v34` (+ `?v=34` pins the og test demands).

## Acceptance tests (`npm test` passes in full; existing tests unchanged except version pins and the
share-row order/label lists, which gain TikTok after X)
- Node (`test/share-links.test.js` or new): `SHARE_TARGETS` order is
  `fb, msgr, viber, wa, tg, x, tiktok, copy`; `shareLinks` returns no `tiktok` entry; `VIA` has `tiktok`;
  the `d` in `assets/icons/brands/tiktok.svg` appears verbatim in `index.html`; each STRINGS language
  has both new keys.
- Playwright (DOM/globals only inside `page.evaluate`/`addInitScript`):
  - After a draw, `[data-share="tiktok"]` is visible, contains one `svg.share-icon[aria-hidden="true"]`,
    text `TikTok`, sits right after X; ≥ 44px tall; 360px no horizontal scroll.
  - Stub `navigator.canShare → true` and `navigator.share` to record its argument: click TikTok →
    share called once with exactly one PNG `File` and no `text`/`url`; clipboard (stub) received the
    caption ending with `?ref=copy`; status = Taglish `statusTiktokShared`; a `share-done/tiktok`
    GoatCounter event was sent (existing analytics stub pattern).
  - No `canShare`: click TikTok → a download starts (`page.waitForEvent('download')`, filename ends
    `.png`); status = `statusTiktokSaved`.
  - English selected: status texts are the English ones.
Then `dt-test` and `dt-smoke` pass; include a 360px screenshot of the drawn share row.
