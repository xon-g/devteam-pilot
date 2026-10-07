# Task 25: Less cramped game picker on phones

Branch: `task/25-game-pill-spacing`, from `master`. This file is its first commit. No npm
dependencies, no image files, no external requests. Read `PLAN.md` and the **test context rule**
(browser globals only inside `page.evaluate`). Owner request, #devteam, 2026-10-07: "The anong laro
choices texts look cramped" (phone screenshot, ~390px wide: 3 columns, labels like "Mega Lotto
6/45" wrap to 3 short centred lines beside the ball badge).

## Decision (Architect)
On narrow screens the game picker uses **2 columns** instead of 3, and the label text sits
left-aligned next to its ball, so every label fits in at most 2 lines. Desktop is unchanged.

## Change
- `styles.css` only (plus `sw.js` and tests):
  - Add a media query `@media (max-width: 560px)` with `.games { grid-template-columns: repeat(2, 1fr); }`.
    `.moods` keeps 3 columns everywhere.
  - `.games span`: `justify-content: flex-start; text-align: left; padding: 0.35rem 0.75rem 0.35rem 0.4rem;`
    (ball near the left edge, text after it). Keep the pill shape, min-height 44px, `gap: 0.35rem`,
    `line-height: 1.15`, the badge and its `flex: none`. Merge this into the existing `.games span`
    rule(s) rather than adding a third one.
- `sw.js`: bump `CACHE` from `swertres-v18` to `swertres-v19` (update tests that pin the version).
- Do not change `index.html`, copy, the mood pills, or other sections.

## Acceptance tests (runnable)
1. `npm test` passes (existing tests updated only where they pin the cache version or the
   3-column game grid at narrow widths).
2. New Playwright test `test/game-pill-spacing.browser.test.js`, viewports 320, 375, 412 and 1280
   wide: inside `page.evaluate`, return for the `.games` fieldset the number of distinct
   `getBoundingClientRect().left` values among the game spans, and for each game span its rect,
   its `textContent`, and the number of rendered text lines (use a `Range` over the span's text
   node: count distinct rounded `top` values of `range.getClientRects()`), plus
   `document.documentElement.scrollWidth` / `clientWidth`. In Node assert:
   - 2 columns at 320/375/412, 3 columns at 1280;
   - every label renders in ≤ 2 lines at every width;
   - every span ≥ 44px tall, no two spans overlap, `scrollWidth <= clientWidth`;
   - text unchanged (e.g. `Mega Lotto 6/45`), and the `::before` badge is still present
     (`content` not `none`, width === height ≥ 20px).
   Also assert `.moods` still has 3 columns at 375.
3. `dt-smoke` passes with no console errors.
