# Task 42: Instagram share button

Branch: `task/42-instagram` from latest `master` (7e425d0). This file and `assets/icons/brands/instagram.svg`
(Simple Icons 16.34.0, CC0) are its first commit. Owner request in #devteam (2026-10-07): "add instagram
share button too". Read `PLAN.md`, `tasks/41-tiktok.md` and the **test context rule**. No dependencies,
no SDKs, no network requests.

## Why it works this way
Like TikTok, Instagram has no web share URL and can't be pre-filled from a website. The button works
exactly like the TikTok one (task 41): copy the caption, share the card PNG (files only) through the
native share sheet, else download it.

## Do
1. `index.html`: `<button type="button" data-share="ig">` right after TikTok, before Copy link, with an
   inline `svg.share-icon` (exact path from `assets/icons/brands/instagram.svg`, same attributes as the
   others) + label `Instagram` (never translated). Icon fill `#FF0069` (Simple Icons brand colour).
2. `src/share.js`: `'ig'` in `SHARE_TARGETS` after `'tiktok'`; `shareLinks` excludes it (generalise the
   filter to a small `APP_ONLY = ['tiktok', 'ig']` set + `copy`, no growing chain of `&&`).
3. `src/analytics.js`: add `'ig'` to `VIA`.
4. `app.js`: turn `shareTiktok()` into one `shareToApp(appKey)` used by both buttons (no copy-paste).
   Status keys become generic with the app name as a placeholder: replace `statusTiktokShared` /
   `statusTiktokSaved` with `statusAppShared` / `statusAppSaved` using `{app}`, in all three languages:
   - `statusAppShared`: taglish "Piliin ang {app}, tapos i-paste ang caption!" · en "Pick {app}, then paste the caption!" · tl "Piliin ang {app}, saka i-paste ang caption!"
   - `statusAppSaved`: taglish "Na-save ang image at nakopya ang caption. I-post mo sa {app}!" · en "Image saved and caption copied. Post it on {app}!" · tl "Na-save ang larawan at nakopya ang caption. I-post mo sa {app}!"
   `{app}` = `TikTok` or `Instagram`. TikTok's visible behaviour and texts stay exactly the same.
5. `sw.js` `CACHE` → `swertres-v35` (+ `?v=35` pins the og test demands).

## Acceptance tests (`npm test` passes in full; existing tests change only for version pins, the share
order/label/count lists gaining Instagram after TikTok, and the renamed status keys)
- Node: `SHARE_TARGETS` = `fb, msgr, viber, wa, tg, x, tiktok, ig, copy`; `shareLinks` has no `tiktok`/`ig`;
  `VIA` has `ig`; instagram `d` verbatim in `index.html`; `statusAppShared`/`statusAppSaved` exist in all
  languages with the `{app}` placeholder; the old `statusTiktok*` keys are gone.
- Playwright (extend `test/tiktok.browser.test.js` or add `test/instagram.browser.test.js`; DOM/globals
  only inside `page.evaluate`/`addInitScript`):
  - After a draw, `[data-share="ig"]` visible right after TikTok, one `svg.share-icon[aria-hidden]` with
    computed fill `rgb(255, 0, 105)`, text `Instagram`, ≥ 44px tall; 360px no horizontal scroll.
  - Share stub: click Instagram → `share` called once with exactly one PNG `File`, no text/url;
    clipboard got the caption ending `?ref=copy`; status "Piliin ang Instagram, tapos i-paste ang caption!";
    `share-done/ig` event sent.
  - No `canShare`: download `.png` starts; status "Na-save ang image at nakopya ang caption. I-post mo sa Instagram!".
  - The existing TikTok tests still pass with the same visible status texts.
Then `dt-test` and `dt-smoke` pass; include a 360px screenshot of the drawn share row.
