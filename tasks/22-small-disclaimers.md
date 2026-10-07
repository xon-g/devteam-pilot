# Task 22: Make all disclaimer texts as small as possible

Branch: `task/22-small-disclaimers`, from `master`. This file is its first commit. No npm
dependencies, no external requests. Read `PLAN.md` and the **test context rule** (browser
globals only inside `page.evaluate`). Owner request, #devteam, 2026-10-07: "Can you make all
the disclaimer texts as small as possible".

"As small as possible" here means as small as still readable: **10px (`0.625rem`)**. Below that
mobile browsers clamp or auto-inflate text and it stops being legible, and the 18+ / odds
disclaimer must stay visible on every page.

## Change (`styles.css` only, plus `sw.js`)
- `footer#disclaimer`: `font-size: 0.625rem; line-height: 1.3;` and a thinner bar:
  `padding: 0.35rem 0.75rem calc(0.35rem + env(safe-area-inset-bottom));`. Keep it fixed,
  visible, same text, same colours.
- `.fine-print` (covers `#not-affiliated` and `#privacy-note`): `font-size: 0.625rem;
  line-height: 1.4;`.
- Do not change any copy, meta, JSON-LD or `llms.txt`. Do not change the "(optional)" /
  "(required)" `<small>` form labels: those are not disclaimers.
- `sw.js`: bump `CACHE` from `swertres-v15` to `swertres-v16`.

## Acceptance tests (runnable)
1. `npm test` passes (all existing tests, plus the new ones below).
2. New Node test: `sw.js` contains `swertres-v16`.
3. New Playwright check at 360x740 and at 1280x800, values read inside `page.evaluate`:
   computed `font-size` of `#disclaimer`, `#not-affiliated` and `#privacy-note` is `10px` each;
   `#disclaimer` is fully inside the viewport, its text equals the existing DISCLAIMER string,
   and its height is at most 48px at 360px width.
4. Same Playwright run: after scrolling to the bottom, the bottom of `#privacy-note` is above the
   top of `#disclaimer` (not hidden behind the fixed footer), and there is no horizontal
   overflow (`document.documentElement.scrollWidth <= innerWidth`).
5. `dt-smoke` passes.
