# Task 23: Game badges in the game picker

Branch: `task/23-game-badges`, from `master`. This file is its first commit. No npm dependencies,
no image files, no external requests. Read `PLAN.md` and the **test context rule** (browser
globals only inside `page.evaluate`). Owner request, #devteam, 2026-10-07: "Without breaking the
responsiveness or aesthetic, can you possibly add the logo of the games in the game picker form?"

## Decision (Architect)
Official PCSO game logos are PCSO trademarks and the site says "Not affiliated with PCSO", so we
do **not** use them. Instead each game gets its own small lotto-ball badge in the site's style.

## Look
- A small ball (about 1.6rem, `aspect-ratio: 1`, round) to the left of each game label, with a
  short code in bold, about 0.6rem, dark text (`var(--bg)`):
  `2d`→`2D`, `3d`→`3D`, `4d`→`4D`, `6d`→`6D`, `6-42`→`42`, `6-45`→`45`, `6-49`→`49`,
  `6-55`→`55`, `6-58`→`58`.
- Digit games (2D, 3D, 4D, 6D): the `.digit` gold gradient
  `radial-gradient(circle at 35% 30%, #fff 0%, #fff3c4 35%, var(--gold) 70%, var(--gold-2) 100%)`.
- 6/xx lotto games: same shape, pink gradient
  `radial-gradient(circle at 35% 30%, #fff 0%, #ffd1e1 35%, var(--pink) 75%, #c2185b 100%)`.
- So the gold ball stays visible on the gold checked pill, give every badge
  `box-shadow: 0 0 0 1px var(--bg)`.
- The pill keeps its current shape, min-height 44px and 3-column grid. Label text may wrap next
  to the ball; the ball must never shrink (`flex: none`).

## Change
- `index.html`: add `data-ball="<code>"` to each game label `<span>` (no new elements, label text
  unchanged), and add `class="lotto"` to the five 6/xx spans.
- `styles.css`: `.games span` gets `gap: 0.35rem`; badge drawn with
  `.games span::before { content: attr(data-ball) / ""; ... }` (the `/ ""` keeps screen readers
  from reading the code); `.games span.lotto::before` swaps to the pink gradient.
- `sw.js`: bump `CACHE` from `swertres-v16` to `swertres-v17` (update tests that pin the version).
- Do not change copy, other fieldsets, or the mood pills.

## Acceptance tests (runnable)
1. `npm test` passes (existing tests, updated only where they pin the cache version).
2. New Node test `test/game-badges.test.js`: every `input[name="game"]` label span in `index.html`
   has the `data-ball` value from the table above; exactly the five 6/xx spans have `class="lotto"`;
   `styles.css` contains `attr(data-ball)` and `.games span.lotto::before`; `sw.js` has `swertres-v17`.
3. New Playwright test `test/game-badges.browser.test.js`, at viewport widths 320, 375 and 1280:
   inside `page.evaluate`, for each game span return `getComputedStyle(span, '::before')`
   `content`, `width`, `height`, `backgroundImage`, plus `document.documentElement.scrollWidth`
   and `clientWidth`, and each span's `getBoundingClientRect()`. In Node assert: content is not
   `none`; width === height and both ≥ 20px; backgroundImage contains `radial-gradient`; the pink
   one for the five lotto games; `scrollWidth <= clientWidth` (no horizontal scroll); every span
   ≥ 44px tall and no two spans overlap. Also assert each span's `textContent` is unchanged
   (e.g. `Swertres (3D)`).
4. `dt-smoke` passes with no console errors.
