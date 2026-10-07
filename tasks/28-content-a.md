# Task 28: Content pages A: "Paano Laruin" (How to play) + "Totoo ba ang Lucky Numbers?"

Branch: `task/28-content-a` from latest `master` (7139010). This file is its first commit.
Brief: `2026-10-06-swertres-analytics.md` item 8 (+ item 12: [CHECK] facts), copy from
`2026-10-06-swertres-copy.md` "Page 1" and "Page 2". No npm dependencies. Read `PLAN.md`
(relative URLs, GitHub Pages subpath rule) and the **test context rule** (browser globals only inside
`page.evaluate`). **Reuse the privacy page (task 27) as the template**: same `<head>` pattern,
header, `.page` layout, footer, styles. Don't restyle the site.

## 1. Pages
- `how-to-play/index.html` (Page 1), title `Paano Laruin (How to Play) – Lotto Lucky Numbers PH`,
  `<h1>Paano Laruin</h1>`.
- `lucky-numbers/index.html` (Page 2), title `Totoo ba ang Lucky Numbers? – Lotto Lucky Numbers PH`,
  `<h1>Totoo ba ang Lucky Numbers?</h1>`.
- Each: `<html lang="fil">`; same head as `privacy/index.html` (github.io redirect script first,
  viewport, own meta description in English, canonical + `og:url` = `https://lotto.xonicbox.com/<slug>/`,
  `og:title`, the same `og:image` value as home (keep its `?v=` cache-bust), theme-color,
  manifest/icons/stylesheet with relative `../` paths, the identical GoatCounter tag). No other scripts.
- Body: copy **verbatim** (headings `###` → `<h2>`, lists `<ul>`, bold `<strong>`, *italic* `<em>`).
  The 6/42–6/58 markdown table → a real `<table>` (with `<thead>`, `<th scope="col">`) inside
  `<div class="table-wrap">` that scrolls horizontally on its own (`overflow-x: auto`) so the page
  never scrolls sideways at 360px.
- **[CHECK] facts stay visible** (brief item 12): every `[CHECK]` / `[CHECK: …]` in the copy becomes
  `<mark class="check">[CHECK…]</mark>` with the same text. Style `.check` subtly (small, muted
  highlight); the owner verifies these before merging.
- The "English summary" paragraph becomes `<section lang="en"><h2>English summary</h2><p>…</p></section>`
  (like privacy).

## 2. Footer links (all pages)
- `.site-links` nav order everywhere: Home, How to play, Lucky numbers?, Privacy. Home page nav
  has no Home link (as today) and uses `how-to-play/`, `lucky-numbers/`, `privacy/`; sub-pages use
  `../`, `../how-to-play/`, `../lucky-numbers/`, `../privacy/`. Current page gets `aria-current="page"`.
  Update `privacy/index.html` too. Must wrap cleanly at 360px, tap targets ≥ 24px tall.

## 3. Sitemap, SW, llms.txt
- `sitemap.xml`: add both URLs (lastmod 2026-10-07).
- `sw.js`: `CACHE` → `"swertres-v25"`; add `"how-to-play/"`, `"lucky-numbers/"` to `ASSETS`.
- `llms.txt`: list both pages with one-line English descriptions (absolute lotto.xonicbox.com URLs),
  if the file already lists pages; otherwise add a short "Pages" section.

## Banned phrases (important)
These pages explain odds honestly, so they legitimately contain "tsansa", "odds", "jackpot", "panalo".
**Don't add them to the `BANNED` list scan in `test/ui.test.js`** (that list is for the app UI).
Instead, in the new test, scan both pages for claim phrases that must never appear:
`guarantee`, `sigurado`, `siguradong panalo`, `sure win`, `better chance`, `jackpot ka na`,
`prediction`, `predict`, `hot numbers`, `system to win`. Case-insensitive.

## Acceptance tests (runnable, `npm test`; no real network calls)
- `test/content-a.test.js` (node:test, static), for each page:
  - exists; redirect script before any other `<script>`; canonical and og:url correct; GoatCounter
    tag exactly once, same endpoint as home; `og:image` equals home's.
  - no root-absolute `href="/`/`src="/`; scripts limited to redirect + GoatCounter; no
    `adsbygoogle`/`googlesyndication`.
  - visible text (tags stripped) ≥ 300 words; `<section lang="en">` present; footer disclaimer exact;
    `#not-affiliated` present.
  - how-to-play: contains "Swertres", "EZ2", "STL", "4D", "6D", "Rambolito", "1 sa 1,000",
    "1 sa 40,475,358"; has a `<table>` inside `.table-wrap`; the number of `class="check"` marks
    equals the number of `[CHECK` occurrences in the Page 1 copy (count it from the brief file at
    `/home/node/briefs/2026-10-06-swertres-copy.md` if readable, else hard-code the count you counted).
  - lucky-numbers: contains "gambler's fallacy", "1 sa 1,000".
  - claim-phrase scan above passes.
  - every page (home, privacy, both new) has the `.site-links` nav with the four/three links in order
    and exactly one `aria-current="page"` on sub-pages.
  - `sitemap.xml` lists both; `sw.js` has `swertres-v25` and both ASSETS entries.
- `test/content-a.browser.test.js` (Playwright, `BASE_PATH=/devteam-pilot/`, same `startServer`
  pattern as `test/privacy.browser.test.js`; `page.route('https://gc.zgo.at/**', r => r.abort())`):
  - At 360×740: from home click "How to play" → URL ends `/devteam-pilot/how-to-play/`, h1 correct,
    stylesheet applied, `#disclaimer` visible, `scrollWidth <= innerWidth` (inside `page.evaluate`);
    the `.table-wrap` element itself may scroll. Then click "Lucky numbers?" → same checks.
  - No console errors on either page.
- All existing tests pass (update tests that pin cache version, ASSETS or the nav); `dt-smoke` clean.

## Out of scope
Responsible gaming, About, Contact pages (task 29); changing the copy (the owner reviews it in the PR);
any results fetching.
