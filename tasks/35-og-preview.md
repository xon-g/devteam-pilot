# Task 35: fresh, self-updating share preview (Messenger/Facebook thumbnail)

Branch: `task/35-og-preview`. Rebase onto the latest `master` (after task 34 typography merges) before
starting. No npm dependencies, no external requests at runtime. Read `PLAN.md` and the **test context
rule**. Owner request, #devteam, 2026-10-07: "When i share the site url on messenger, an outdated preview
thumbnail shows up, keep it updated to latest".

## Why it's stale
- `og:image` is always `https://lotto.xonicbox.com/assets/og-image.png`. Facebook/Messenger cache the
  preview per URL (~30 days), so a new image at the same URL is never re-fetched.
- `scripts/make-og-image.js` draws a hand-made card (Arial, hard-coded colours) that doesn't look like
  the site any more.

## Change
- `scripts/make-og-image.js`: render the card from the site's own `styles.css` (load it into the card
  page, or serve the repo with `scripts/serve.js` and screenshot a card page that links it), so fonts,
  colours and the ball style match the live site. Content: site name, a short Tagalog tagline, one row of
  sample balls using the real `.digit` markup/classes with fixed numbers (no randomness), and
  "For entertainment only. 18+. Not affiliated with PCSO." small but legible. 1200×630,
  `deviceScaleFactor: 1`, PNG, ≤ 300 KB; text readable when shrunk to 500 px wide (min ~28 px for tagline).
  No timestamps, no host paths in output. Add `"og": "node scripts/make-og-image.js"` to `package.json` scripts.
- Regenerate `assets/og-image.png` with it and commit the PNG.
- `index.html` and `privacy/index.html`: `og:image` and `twitter:image` become
  `https://lotto.xonicbox.com/assets/og-image.png?v=NN` where NN is the number in `sw.js` `CACHE`
  (`swertres-vNN`). Add `og:image:secure_url` (same URL) and `og:image:type` `image/png`. Keep exactly
  one of each tag.
- `sw.js`: bump `CACHE` by one from master's value; precache entry for the image stays working.
- Document in `PLAN.md` (one short paragraph): any task that changes the look runs `npm run og`, and every
  cache bump also bumps `?v=` (the test enforces it).

## Acceptance tests (runnable)
1. `npm test` passes.
2. New `test/og-preview.test.js` (Node):
   a. In both HTML files, `og:image`, `og:image:secure_url` and `twitter:image` are identical, absolute
      `https://lotto.xonicbox.com/assets/og-image.png?v=NN`, and NN equals the number in `sw.js` CACHE.
   b. `og:image:type` is `image/png`; width 1200 / height 630 tags present once.
   c. Read `assets/og-image.png` bytes: PNG signature, IHDR width 1200 and height 630, size ≤ 300 KB.
   d. `scripts/make-og-image.js` references `styles.css` and contains no `/Users/` or `/home/` path.
3. Playwright: fetching `/assets/og-image.png?v=NN` from `npm start` returns 200 `image/png`.
4. `dt-smoke` passes with no console errors. Attach the generated PNG path in the report.
