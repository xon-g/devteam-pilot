# Task 24: Emojis in the mood picker

Branch: `task/24-mood-emojis`, from `master` (cut after task 23 is merged). This file is its first
commit. No npm dependencies, no image files, no external requests. Read `PLAN.md` and the
**test context rule** (browser globals only inside `page.evaluate`). Owner request, #devteam,
2026-10-07: "Without breaking the responsiveness or aesthetic, can you possibly add emojis in the
kumusta ka picker form".

## Look
An emoji to the left of each mood label, same approach as the task 23 game badges:
`masaya`→😄, `pagod`→😴, `stressed`→😫, `kinikilig`→🥰, `chill`→😎, `ewan`→🤷.
Emoji about 1.1em, `flex: none`, `gap: 0.35rem` from the text. Pill shape, min-height 44px and the
3-column grid stay as they are; label text may wrap but the emoji never shrinks.

## Change
- `index.html`: add `data-emoji="<emoji>"` to each mood label `<span>` (no new elements, label text
  unchanged).
- `styles.css`: `.moods span::before { content: attr(data-emoji) / ""; ... }` (the `/ ""` keeps
  screen readers from reading the emoji; the label text already names the mood).
- `sw.js`: bump `CACHE` by one from the version on `master` (update tests that pin it).
- Do not change copy, mood values, the game pills or the mood-based reasons.

## Acceptance tests (runnable)
1. `npm test` passes (existing tests, updated only where they pin the cache version).
2. New Node test `test/mood-emojis.test.js`: each `input[name="mood"]` label span in `index.html`
   has the `data-emoji` from the table; `styles.css` contains `.moods span::before` and
   `attr(data-emoji)`; `sw.js` has the bumped version.
3. New Playwright test `test/mood-emojis.browser.test.js` at viewport widths 320, 375 and 1280:
   inside `page.evaluate`, return each mood span's `getComputedStyle(span, '::before').content`,
   its `textContent`, its `getBoundingClientRect()`, and `document.documentElement.scrollWidth` /
   `clientWidth`. In Node assert: content is not `none`; `textContent` unchanged (e.g. `Ewan ko`);
   no horizontal scroll; every span ≥ 44px tall; no two spans overlap. Then pick a mood, submit,
   and check the existing result flow still works (no console errors).
4. `dt-smoke` passes with no console errors.
