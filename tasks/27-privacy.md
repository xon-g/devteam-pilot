# Task 27: Privacy policy page at /privacy

Branch: `task/27-privacy` from latest `master` (303cd01). This file is its first commit.
Brief: `2026-10-06-swertres-analytics.md` item 9 (expands item 3), copy from
`2026-10-06-swertres-copy.md` "Page 6". No npm dependencies. Read `PLAN.md` (relative URLs,
GitHub Pages subpath rule) and the **test context rule** (browser globals only inside
`page.evaluate`; pure logic in DOM-free modules). Tasks 28/29 will add more content pages using
the same layout, so keep it reusable and simple.

## 1. Contact email: one config value
- New `src/config.js` (DOM-free): `export const CONTACT_EMAIL = 'hello@xonicbox.com';`
- In HTML every contact address is `<a data-contact-email href="mailto:hello@xonicbox.com">hello@xonicbox.com</a>`
  (works without JS). New `src/contact.js` (ES module) sets `href = 'mailto:' + CONTACT_EMAIL`
  and `textContent = CONTACT_EMAIL` on every `[data-contact-email]`, so changing `config.js`
  updates the pages. A static test keeps the HTML fallback equal to `CONTACT_EMAIL`.

## 2. The page: `privacy/index.html` (served at `privacy/`)
- `<html lang="fil">`, same `<head>` basics as `index.html`: the **same github.io redirect script
  first** (it keeps the path, so `/devteam-pilot/privacy/` → `https://lotto.xonicbox.com/privacy/`),
  viewport, `<title>Privacy Policy – Lotto Lucky Numbers PH</title>`, a meta description,
  `<link rel="canonical" href="https://lotto.xonicbox.com/privacy/">`, `og:title`/`og:url`
  (`https://lotto.xonicbox.com/privacy/`)/`og:image` (same absolute og-image), theme-color,
  manifest/icons/stylesheet with **relative `../` paths**, the identical GoatCounter tag at the end
  of `<head>`. No other scripts except `<script type="module" src="../src/contact.js">`.
- Body: a small header with the site name linking home (`href="../"`), `<main class="page">` with
  `<h1>Privacy Policy</h1>`, then the Page 6 copy **verbatim** (all sections, headings as `<h2>`,
  bullet list as `<ul>`, bold as `<strong>`), with:
  - "Huling na-update: 2026-10-07" (`<p id="last-updated">`; the owner merges today).
  - `{{CONTACT_EMAIL}}` → the `data-contact-email` link (both places + English summary).
  - Links: Google Ads Settings `https://adssettings.google.com`, `https://www.aboutads.info`,
    GoatCounter `https://www.goatcounter.com`, National Privacy Commission `https://privacy.gov.ph`.
    All external links `target="_blank" rel="noopener noreferrer"`.
  - The English summary as its own section with `lang="en"` (`<section lang="en">`, h2 "English summary").
- Footer, same as home: the `#not-affiliated` line, then a footer links nav (see 3), then
  `<footer id="disclaimer">` with the exact disclaimer text (always visible, like home).
- No ad code, no ads.txt, no consent banner, no cookies, no localStorage.

## 3. Footer links (home + privacy)
- On `index.html` add, directly above `<footer id="disclaimer">`:
  `<nav class="site-links" aria-label="Site links"><a href="privacy/">Privacy</a></nav>`.
  On the privacy page the same nav with `href="./"` (current page, `aria-current="page"`) and a
  "Home" link `href="../"`. Tasks 28/29 add more links here.
- Make `#privacy-note` on home end with ` <a href="privacy/">Basahin ang privacy policy</a>.`
- Styles in `styles.css` (reuse existing variables): `.page` readable width (max ~65ch), line
  height, h2 spacing, links visible on the dark background; `.site-links` small, centered, wraps
  on phones, tap targets ≥ 24px tall. Must fit 360px width with no horizontal scroll.
  Keep the sticky disclaimer from covering page text (padding at the bottom of `.page`).

## 4. Sitemap, SW, robots
- `sitemap.xml`: add `https://lotto.xonicbox.com/privacy/` (lastmod 2026-10-07).
- `sw.js`: bump `CACHE` to `"swertres-v22"`; add `"privacy/"`, `"src/config.js"`,
  `"src/contact.js"` to `ASSETS`. Navigation fallback stays as is.
- `robots.txt`: no change unless it blocks `/privacy/`.

## Acceptance tests (runnable, `npm test`; no real network calls)
- `test/privacy.test.js` (node:test, static):
  - `privacy/index.html` exists; redirect script appears before any other `<script>`; canonical and
    og:url are `https://lotto.xonicbox.com/privacy/`; GoatCounter tag exactly once, same endpoint as home.
  - Contains "GoatCounter", "RA 10173" or "Republic Act No. 10173", `https://adssettings.google.com`,
    `https://www.aboutads.info`, `https://privacy.gov.ph`, "Huling na-update: 2026-10-07".
  - Every `data-contact-email` element's href is `mailto:${CONTACT_EMAIL}` and text is `CONTACT_EMAIL`
    (import from `src/config.js`); at least 2 of them; no literal `{{CONTACT_EMAIL}}` left.
  - Every `<a target="_blank">` has `rel` containing `noopener`.
  - No `href="/` or `src="/` (root-absolute) anywhere in the page; no `<script>` other than the
    redirect, GoatCounter and `../src/contact.js`; no `adsbygoogle`/`googlesyndication`.
  - Visible text (tags stripped) ≥ 300 words; footer disclaimer text exact; `#not-affiliated` present.
  - Banned phrases: add `privacy/index.html` to the files scanned by the existing banned-phrase test
    in `test/ui.test.js` (extend its file list; don't weaken the list).
  - `index.html` has the `.site-links` nav with `href="privacy/"` and the privacy-note link.
  - `sitemap.xml` lists `/privacy/`; `sw.js` has `swertres-v22` and the three new ASSETS entries.
- `test/privacy.browser.test.js` (Playwright, server with `BASE_PATH=/devteam-pilot/`, copy the
  `startServer` helper pattern from `test/seo-aio.browser.test.js`):
  - Load home at 360×740, click the footer "Privacy" link → URL ends `/devteam-pilot/privacy/`,
    `h1` is "Privacy Policy", stylesheet applied (read a computed style inside `page.evaluate`),
    `#disclaimer` visible, `document.documentElement.scrollWidth <= innerWidth` (inside `page.evaluate`).
  - After `contact.js` runs, the contact links' href is `mailto:hello@xonicbox.com`.
  - "Home" link returns to the home page. No console errors on either page
    (`page.route('https://gc.zgo.at/**', r => r.abort())`).
- All existing tests pass (update any test that pins the cache version or ASSETS list);
  `dt-smoke` clean.

## Out of scope
Other content pages (tasks 28/29), ad code, consent banner, Cloudflare/email setup (the Architect
writes those steps in the PR).
