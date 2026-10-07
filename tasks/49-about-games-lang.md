# Task 49: About/FAQ section layout breaks in English, Tagalog and Cebuano

Branch: `task/49-about-games-lang` from latest `master` (42af5e8). This file is its first commit.
Owner report in #devteam (2026-10-07): "the section id='about-games' layout breaks when changing language".
Read the **test context rule**. CSS fix plus tests; no other visual changes.

## Cause (Architect measurement)
`styles.css:98` gives the column width/centring (`width: min(100% - 2rem, 34rem); margin-inline: auto`) to
`#about-games` by **id**. The translated copies are `#about-games-en`, `#about-games-tl`, `#about-games-ceb`
(class `about-games`), so they get no width rule and stretch edge to edge: at 360px they span 0–360 (no side
padding) instead of 16–344; at 1280px 0–1280 instead of 368–912. Task 48's centring test passed only because
it measured the note against its (full-width) container.

## Do
- Make the column rule target the class: replace `#about-games` with `.about-games` in that selector, and
  check `styles.css`, `src/app.js` and tests for any other rule/query that only matches the Taglish id and
  should match all four sections (fix those the same way; keep the ids unchanged in HTML).
- `sw.js` `CACHE` → `swertres-v42` (+ `?v=42` pins the og test demands).

## Acceptance tests (`npm test` passes; existing tests change only for version pins)
New `test/about-games-lang.browser.test.js` (DOM reads only inside `page.evaluate`): at 320, 360, 768 and
1280, for each language (taglish, en, tl, ceb) chosen via the picker (not only via localStorage):
- exactly one `.about-games` section is visible and its `getBoundingClientRect()` left/right equal the
  Taglish section's left/right at that width (±1px), and equal `main`'s left/right (±1px);
- `document.documentElement.scrollWidth <= innerWidth`;
- the visible privacy note is centred within `main`'s left/right (|left gap − right gap| ≤ 2px).
Also extend `test/fine-print-center.browser.test.js` so the privacy-note check measures against `main`,
not the note's own section. Then `dt-test` and `dt-smoke` pass; include 360px and 1280px screenshots of the
FAQ in English.
