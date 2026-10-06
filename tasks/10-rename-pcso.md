# Task 10: Rename the site to "PCSO Lucky Numbers"

Branch: `task/10-rename-pcso`, from `task/09-game-picker` (PR #11, not merged yet; this task
needs its game picker). This file is its first commit.
No npm dependencies, no external requests. Read `PLAN.md` (copy rules, banned phrases, GitHub
Pages relative-URL rule) and the **test context rule** (browser globals only inside
`page.evaluate`). Everything from tasks 06, 08 and 09 still holds.

Owner decision (#devteam, 2026-10-07): the page now covers every PCSO game, so the name
"Swertres Lucky Numbers" becomes **"PCSO Lucky Numbers"**.

## Changes
1. `index.html`
   - `<title>`, `og:site_name`, `og:title`, `twitter:title`: `PCSO Lucky Numbers`.
   - `meta description` and `og:description`/`twitter:description` if present:
     `PCSO Lucky Numbers - random na numero para sa Swertres, EZ2, 4D, 6D at Lotto 6/42 hanggang Ultra Lotto 6/58. For entertainment only. 18+.`
   - `og:image:alt`: `PCSO Lucky Numbers - random na numero para sa PCSO games`.
   - h1: `PCSO <span>Lucky</span> Numbers` (same markup/classes).
   - Tagline: `Pili ng laro, isang tapik. Good vibes lang.`
   - Static `.eyebrow` and its JS behaviour from task 09: unchanged (`Swertres · 3D` by default).
   - Add, as the last child of `<main>` (so the fixed footer never covers it):
     `<p id="not-affiliated" class="fine-print">Hindi ito official na PCSO site. Not affiliated with PCSO.</p>`
     Small muted text, centred, task 06 tokens. Do **not** change `footer#disclaimer` text.
2. `manifest.webmanifest`: `name` `PCSO Lucky Numbers`, `short_name` `PCSO Lucky`.
3. `scripts/make-og-image.js`: title/heading text becomes `PCSO Lucky Numbers` (keep the
   card's layout and size 1200x630); rerun it and commit the new `assets/og-image.png`.
   If the card mentions "Tatlong numero" or 0-9, make it game-neutral.
4. `sw.js`: bump `CACHE` to `"swertres-v6"` (keep the `swertres-` prefix); update the cache-name
   test in `test/seo.test.js`.
5. Do **not** change: share text (already per game: `Swertres lucky numbers ko: ...` for 3D is
   correct, the game name is right there), `package.json` name, icons, repo/branch names.

## Tests
- Update `test/pwa.test.js` manifest name/short_name assertions to the new values.
- New assertions (add to `test/seo.test.js` or a new `test/rename.test.js`, node:test, reading
  files only):
  - `<title>` is exactly `PCSO Lucky Numbers`; `og:title`, `og:site_name`, `twitter:title` equal
    it; the h1 text (tags stripped) is `PCSO Lucky Numbers`.
  - `index.html` contains no `Swertres Lucky Numbers` and no `Tatlong numero`/`Tatlong random`.
  - `#not-affiliated` exists and contains `Not affiliated with PCSO`.
  - Manifest values as above; `og-image.png` still 1200x630.
- Browser (extend `test/games.browser.test.js` or `test/design.test.js`): at 360x740,
  `document.title === 'PCSO Lucky Numbers'`, `#not-affiliated` visible after scrolling to it and
  its box does not overlap `footer#disclaimer`'s box; no sideways scroll.
- Keep every existing test green; change existing assertions only where they check the old name.
  Never delete an assertion to make a test pass. Banned-phrase tests must still pass.

Done when: `npm test` passes, `dt-smoke` passes, and the report includes the full test output,
a 360x740 viewport (not full-page) screenshot of the top of the page, and the new og-image.png path.
