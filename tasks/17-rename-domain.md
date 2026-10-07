# Task 17: Rename to "Lotto Lucky Numbers PH" + move URLs to lotto.xonicbox.com

Branch: `task/17-rename-domain`, from latest `master`. This file is its first commit.
No npm dependencies, no external requests. Read `PLAN.md` and the **test context rule**
(browser globals only inside `page.evaluate`). Brief: analytics brief items 5 and 11.

The site is now live on Cloudflare at https://lotto.xonicbox.com (owner, 2026-10-07).
GitHub Pages (https://xon-g.github.io/devteam-pilot/) still serves the same `master`.
New origin everywhere: `https://lotto.xonicbox.com/` (with trailing slash).

## 1. Rename (`index.html`, `manifest.webmanifest`, `llms.txt`, `scripts/make-og-image.js`)
- `<title>`, `og:title`, `twitter:title`:
  `Lotto Lucky Numbers PH – Swertres, EZ2, Lotto Lucky Number Generator`
- `og:site_name`, JSON-LD WebSite/WebApplication `name`: `Lotto Lucky Numbers PH`.
- `meta description`, `og:description`, `twitter:description`, JSON-LD `description`, exactly:
  `Free, for-fun random lucky-number generator for Philippine PCSO lotto games: Swertres, EZ2, 4D, 6D and Lotto 6/42 to 6/58. Entertainment only, 18+. Not affiliated with PCSO.`
- `og:image:alt`: `Lotto Lucky Numbers PH - random lucky numbers para sa Swertres, EZ2 at Lotto`.
- h1: `Lotto <span>Lucky</span> Numbers PH` (same classes). Check it fits on a 360px-wide screen
  without overflow (wrap is fine).
- `.tagline`: `Lucky numbers para sa Swertres, EZ2, 4D, 6D at Lotto 6/42–6/58. For fun lang.`
- FAQ (both the visible `<details>` and the FAQPage JSON-LD, kept identical): question
  `Ano ang PCSO Lucky Number Generator?` → `Ano ang Lotto Lucky Numbers PH?`; answer starts
  `Isang libreng website na gumagawa ng random na numero para sa mga laro ng PCSO, ...` (keep the rest).
- Keep `#not-affiliated`, the footer disclaimer and every other "PCSO" mention that is
  descriptive (e.g. "mga laro ng PCSO", "Hindi ito official na PCSO site"). The name itself
  must not contain "PCSO". Never add "Sweepstakes", PCSO logos or seals.
- Remove the stale comment lines 4-5 in `<head>` ("Placeholder origin ..." / github.io URL).
- `manifest.webmanifest`: `name` `Lotto Lucky Numbers PH`, `short_name` `Lotto Lucky PH`.
  `start_url`/`scope` stay `./`.
- `llms.txt`: title `# Lotto Lucky Numbers PH`, replace "PCSO Lucky Number Generator" with
  "Lotto Lucky Numbers PH", URL → new origin.
- `scripts/make-og-image.js`: card title `Lotto Lucky Numbers PH`; rerun, commit the new
  `assets/og-image.png` (still 1200x630).

## 2. New origin
- `canonical`, `og:url`, `og:image`, `twitter:image`, JSON-LD `url`s, `sitemap.xml` `<loc>`
  (lastmod = commit date), `robots.txt` `Sitemap:` line → `https://lotto.xonicbox.com/...`.
- In-page links/assets stay **relative** (the site must still render on github.io until the
  redirect fires and in Cloudflare preview deploys).

## 3. Redirect github.io → lotto.xonicbox.com
- First element in `<head>` after `<meta charset>`: a small inline script that runs only when
  `location.hostname === 'xon-g.github.io'` and does
  `location.replace('https://lotto.xonicbox.com' + path + location.search + location.hash)`,
  where `path` is `location.pathname` with the leading `/devteam-pilot` removed (empty → `/`).
  On any other host (lotto.xonicbox.com, `*.pages.dev`/workers preview, localhost) it does nothing.
- Put the pure path mapping in `src/redirect.js` (DOM-free, exported `redirectTarget(hostname,
  pathname, search, hash)` returning the URL string or `null`) and unit-test it; the inline
  script may duplicate its 3-4 lines (no module load before redirect), and a test asserts the
  inline script and `src/redirect.js` agree on the cases below.
- `sw.js`: bump `CACHE` to `"swertres-v12"` so installed PWAs fetch the new HTML.

## Tests (update existing ones, don't delete coverage)
- Replace the old origin/name constants in `test/seo.test.js`, `test/seo-aio.test.js`,
  `test/pwa.test.js`, `test/rename.test.js`, `test/games.browser.test.js` with the new ones.
- `test/redirect.test.js` (node:test): `redirectTarget` cases:
  - `('xon-g.github.io','/devteam-pilot/','','')` → `https://lotto.xonicbox.com/`
  - `('xon-g.github.io','/devteam-pilot','','')` → `https://lotto.xonicbox.com/`
  - `('xon-g.github.io','/devteam-pilot/index.html','?g=3d','#x')` → `https://lotto.xonicbox.com/index.html?g=3d#x`
  - `('lotto.xonicbox.com','/','','')`, `('localhost','/','','')`, `('abc.devteam-pilot.pages.dev','/','','')` → `null`
- Assertions: no file outside `tasks/`, `test/` and `.review/` contains `xon-g.github.io`
  except the redirect script/module; `<title>` and h1 (tags stripped) contain
  `Lotto Lucky Numbers PH`; no `PCSO Lucky` anywhere in `index.html`, manifest or `llms.txt`;
  `Not affiliated with PCSO` still present; manifest name/short_name as above.
- Browser (Playwright, served on localhost): page loads, does **not** redirect, title correct.
- `npm test` green, `dt-smoke` green.
