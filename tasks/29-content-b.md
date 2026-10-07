# Task 29: Content pages B: Responsible Gaming, About, Contact

Branch: `task/29-content-b` from latest `master` (d0fd9fa). This file is its first commit.
Brief: `2026-10-06-swertres-analytics.md` item 8 (+ 11: About says plainly it's free, for fun,
not PCSO; + 12: [CHECK] facts), copy from `2026-10-06-swertres-copy.md` "Page 3", "Page 4", "Page 5".
No npm dependencies. Read `PLAN.md` and the **test context rule** (browser globals only inside
`page.evaluate`). **Use task 28's pages (`how-to-play/`, `lucky-numbers/`) as the template**: same
`<head>` pattern, header, `.page` layout, `.check` marks, footer, styles. Don't restyle the site.

## 1. Pages
- `responsible-gaming/index.html` (Page 3), title `Responsible Gaming – Lotto Lucky Numbers PH`,
  `<h1>Responsible Gaming</h1>`.
- `about/index.html` (Page 4), title `About – Lotto Lucky Numbers PH`, `<h1>Tungkol sa Amin</h1>`.
- `contact/index.html` (Page 5), title `Contact – Lotto Lucky Numbers PH`, `<h1>Contact</h1>`.
- Each: `<html lang="fil">`; same head as `how-to-play/index.html` (redirect script first, own English
  meta description, canonical + `og:url` = `https://lotto.xonicbox.com/<slug>/`, `og:title`, the same
  `og:image` as home incl. its `?v=`, theme-color, relative `../` assets, identical GoatCounter tag).
- Body: copy **verbatim** (same markdown → HTML rules as task 28). Every `[CHECK…]` becomes
  `<mark class="check">[CHECK…]</mark>`. "English summary" → `<section lang="en"><h2>English summary</h2><p>…</p></section>`.
- **Responsible gaming help links:** link "PAGCOR" to `https://www.pagcor.ph/` and "PCSO" to
  `https://www.pcso.gov.ph/` (`target="_blank" rel="noopener noreferrer"`), keep the [CHECK] marks
  next to them (the owner verifies exact pages/hotlines). Don't invent hotline numbers; keep "hal. 1553"
  only as the copy has it, inside the mark.
- **About:** "Contact page" in the last paragraph links to `../contact/`; "Privacy Policy" links to `../privacy/`.
- **Contact:** every `{{CONTACT_EMAIL}}` becomes `<a data-contact-email href="mailto:hello@xonicbox.com">hello@xonicbox.com</a>`
  and the page loads `<script type="module" src="../src/contact.js"></script>` (exactly like privacy).
  "Totoo ba ang lucky numbers?" links to `../lucky-numbers/`; "Privacy Policy" to `../privacy/`.
  No contact form.

## 2. Footer links (all 8 pages)
- `.site-links` order: Home, How to play, Lucky numbers?, Responsible gaming, About, Contact, Privacy.
  Home page omits Home and uses `how-to-play/` etc.; sub-pages use `../`, `../how-to-play/`, …
  Current page has `aria-current="page"`. Update home, privacy, how-to-play, lucky-numbers.
  Must wrap cleanly at 360px (no sideways scroll), tap targets ≥ 24px tall, stay visually small.

## 3. Sitemap, SW, llms.txt
- `sitemap.xml`: add the three URLs (lastmod 2026-10-07).
- `sw.js`: `CACHE` → `"swertres-v26"`; add `"responsible-gaming/"`, `"about/"`, `"contact/"` to `ASSETS`.
- `llms.txt`: add the three pages to its Pages section, one-line English descriptions.

## Banned phrases
Don't add these pages to the `BANNED` scan in `test/ui.test.js`. Apply task 28's claim-phrase scan
(`guarantee`, `sigurado`, `siguradong panalo`, `sure win`, `better chance`, `jackpot ka na`,
`prediction`, `predict`, `hot numbers`, `system to win`, case-insensitive) to the three new pages.
Note: About's copy says "nanghuhula" — fine, not on the list.

## Acceptance tests (runnable, `npm test`; no real network calls)
- `test/content-b.test.js` (node:test, static), for each new page:
  - exists; redirect script before any other `<script>`; canonical/og:url correct; GoatCounter once,
    same endpoint as home; `og:image` equals home's; no root-absolute `href="/"`/`src="/`; scripts
    limited to redirect + GoatCounter (+ `../src/contact.js` on contact only); no ad code.
  - visible text ≥ 300 words; `<section lang="en">` present; footer disclaimer exact; `#not-affiliated` present.
  - `class="check"` count equals the `[CHECK` count of that page's copy section (read the brief file if
    readable, else hard-code: Page 3 = 3, Page 4 = 0, Page 5 = 0).
  - responsible-gaming: contains "18 pataas", "PAGCOR", "PCSO", links to pagcor.ph and pcso.gov.ph with
    `rel` containing `noopener`.
  - about: contains "Hindi kami ang PCSO", "xonicbox", "18 pataas"; links `../contact/` and `../privacy/`.
  - contact: ≥ 2 `[data-contact-email]` anchors, each `href="mailto:hello@xonicbox.com"`; no `{{`;
    no `<form`.
  - claim-phrase scan passes on all three.
  - all 8 pages: `.site-links` has the links in the order above, exactly one `aria-current="page"` on
    sub-pages, none on home.
  - `sitemap.xml` lists the three; `sw.js` has `swertres-v26` and the three ASSETS entries.
- `test/content-b.browser.test.js` (Playwright, `BASE_PATH=/devteam-pilot/`, same `startServer`
  pattern as `test/content-a.browser.test.js`; abort `https://gc.zgo.at/**`):
  - At 360×740: from home click "Responsible gaming", then "About", then "Contact" via the footer nav;
    each: URL ends `/devteam-pilot/<slug>/`, h1 correct, stylesheet applied, `#disclaimer` visible,
    `scrollWidth <= innerWidth` (inside `page.evaluate`).
  - Contact: every `[data-contact-email]` text is `hello@xonicbox.com` after load.
  - No console errors.
- **Commit, then run `npm test` on the committed head** (`test/redirect.test.js` uses `git ls-files`,
  so new pages are only checked after commit). Update tests that pin cache version, ASSETS or the nav
  (content-a, privacy, redirect, etc.). All tests pass; `dt-smoke` clean.

## Out of scope
Changing the copy (owner reviews it in the PR), contact forms, results links (task 31), countdown (task 32).
