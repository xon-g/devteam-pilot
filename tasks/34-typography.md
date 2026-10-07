# Task 34: a real typography system (type scale, rhythm, tracking)

Branch: `task/34-typography`, from `master`. This file is its first commit. No npm dependencies,
no web fonts, no font files, no external requests. Read `PLAN.md` and the **test context rule**
(browser globals only inside `page.evaluate`). Owner request, #devteam, 2026-10-07: "implement
masterful typography rules, like proper design language, just make sure the disclaimers stay as
small as possible."

## Goal
Replace the ad-hoc font sizes/weights/line-heights in `styles.css` with one small, consistent
type system, applied to `index.html` and `privacy/index.html` (same stylesheet). Same look and
colours, same layout and responsiveness, just calmer and more deliberate text.
The two disclaimers (`footer#disclaimer` and `.fine-print`) stay exactly `0.625rem` or smaller;
never bigger.

## Change (`styles.css` only, plus markup only where a class is needed)
- **Tokens in `:root`:**
  - Type scale, ratio ≈1.25 (major third), fluid where useful:
    `--step--2` (≈0.64rem, disclaimers/badges), `--step--1` (≈0.8rem, labels/captions),
    `--step-0` (1rem, body/inputs), `--step-1` (≈1.25rem), `--step-2` (≈1.563rem),
    `--step-3` (title, `clamp()` keeping today's range ≈1.9–2.75rem). Ball digit sizes may keep
    their own `clamp()`s (they are sized to the ball, not text).
  - Line heights: `--lh-tight: 1.1` (display/title/balls), `--lh-snug: 1.3` (headings, buttons,
    pills, disclaimers), `--lh-body: 1.55` (paragraphs/FAQ/privacy prose).
  - Weights limited to four: `--w-regular: 400`, `--w-medium: 600`, `--w-bold: 800`,
    `--w-black: 900`. Every `font-weight` in the file uses one of these vars (no 500/700 literals).
  - Tracking: `--track-caps: 0.08em` for all uppercase labels (eyebrow may use up to 0.16em),
    `--track-display: -0.02em` for the title and headings ≥ `--step-2`; body text `normal`.
  - Keep `--font` (system stack); add `--font-num` only if needed (same stack).
- **Base rules:** `html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }`;
  `body { font-size: var(--step-0); line-height: var(--lh-body); font-kerning: normal;
  text-rendering: optimizeLegibility; -webkit-font-smoothing: antialiased; }`.
  Headings (`h1–h3`): `text-wrap: balance`; paragraphs and `li`: `text-wrap: pretty`.
  Prose blocks (`.about-games`, privacy page content): `max-width: 65ch` for the text measure
  (the container width stays as is), consistent vertical rhythm: paragraph/list spacing in
  `em`/`lh`-based margins (`margin-block: 0 0.75em` or similar) instead of mixed px/rem.
  All numerals the user compares (balls, countdown/meta if any) keep `font-variant-numeric: tabular-nums`.
- **Hierarchy:** one clear title (`--step-3`, black, tight), section headings `--step-1`/`--step-2`
  bold snug, labels `--step--1` bold caps tracked, body `--step-0`, secondary text `--muted`.
  Minimum font size 0.75rem for everything except the two disclaimers and the game badges
  (`--step--2` / 0.625rem allowed there).
- **Disclaimers:** `footer#disclaimer` and `.fine-print` font-size `≤ 0.625rem` (use `--step--2`
  only if it computes ≤ 10px, otherwise keep `0.625rem`), `line-height` `--lh-snug`, `--w-regular`.
  Don't make the fixed footer taller than today at 375 or 1280 wide.
- **Don't** change colours, spacing of the layout grid, the game pills' sizes/spacing (task 25),
  emojis/badges, animations (task 33), JS, copy, or the privacy page text.
- `sw.js`: bump `CACHE` from `swertres-v22` to `swertres-v23` (update tests that pin it).

## Acceptance tests (runnable)
1. `npm test` passes (all existing tests still green, including game-pill-spacing, tagline,
   mobile-bg, animations, privacy).
2. New `test/typography.test.js` (Node, reads `styles.css` as text):
   a. `:root` defines `--step--2 … --step-3`, `--lh-tight`, `--lh-snug`, `--lh-body`,
      `--w-regular`, `--w-medium`, `--w-bold`, `--w-black`, `--track-caps`.
   b. Every `font-weight:` value in the file is a `var(--w-…)` (or `inherit`).
   c. No `font-weight` of 500 or 700 literals; no `@font-face`, no `url(` to a font, no
      `fonts.googleapis`.
3. New Playwright `test/typography.browser.test.js` at 375 and 1280 wide, on `/` and `/privacy/`
   (all values read inside `page.evaluate`, asserted in Node):
   a. `footer#disclaimer` and `.fine-print` (on `/`) computed `fontSize` ≤ 10px; footer
      `getBoundingClientRect().height` ≤ the value measured on master (record it in the test as a
      constant: measure on master first, put that number + 1px tolerance).
   b. Every visible text element other than the disclaimers, game badges and `.digit` has
      computed `fontSize` ≥ 12px.
   c. Body computed `lineHeight` / `fontSize` between 1.45 and 1.65; `h1` ratio ≤ 1.2.
   d. The set of distinct computed `fontWeight`s on visible elements ⊆ {400, 600, 800, 900}.
   e. Every element with computed `textTransform: uppercase` has `letterSpacing` > 0.
   f. `h1`/`h2` computed `textWrap` (or `textWrapStyle`) is `balance` where supported (skip if
      the property is unsupported in the test Chromium).
   g. On `/privacy/`, prose paragraphs' width ≤ 65ch (compare `getBoundingClientRect().width` to
      65 × the width of a "0" measured in the same font).
   h. No horizontal overflow (`scrollWidth <= clientWidth`) at either width, before and after a
      Swertres draw.
4. `dt-smoke` passes with no console errors.
5. In your report, include before/after screenshots description or paths at 375 and 1280 for `/`.
