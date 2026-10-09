# Task 56: design + typography reassessment (lotto.xonicbox.com)

Owner 2026-10-09 15:00: "Do a design and typography reassessment to lotto.xonicbox.com".
Branch `task/56-design-pass` from origin/master 8f73117. **CSS-first**: the Astro migration (tasks 50–54, held)
copies `styles.css` verbatim to `public/styles.css`, so keep changes in `styles.css`; touch HTML/JS only where listed
(small, so the Astro chain can absorb it). Keep the look (dark purple, gold, pink, pill shapes, balls); no copy, logic,
palette or dependency changes. Bump the cache version as the repo requires.

## Audit (Architect, live site at 375 and 1280; before shots in the review folder note)
1. **Game chips** (Anong laro?): labels wrap inside pills ("Isang Numero (1–58)" at 1280; "Mega Lotto 6/45",
   "Super Lotto 6/49", "Grand Lotto 6/55", "Ultra Lotto 6/58" at 375), so chip heights and text baselines differ;
   the lone last chip leaves a ragged grid.
2. **Mood chips at 375**: "Stressed"/"Kinikilig" touch the pill edges; emoji and label sizes compete.
3. **About text**: a 10-line italic paragraph is hard to read; italics should mark only a short aside.
4. **Heading scale**: h1 44px / h2 20px with nothing between; h2 has normal tracking; section rhythm is uneven
   (About/Mga laro/FAQ spacing differs).
5. **FAQ**: native ▶ markers clash with the polished UI; summaries lack a hover/focus state matching the chips.
6. **Footer**: "More xonicbox tools" box is full-bleed with its border touching the viewport edges while everything
   else sits in the 34rem column; hire card, privacy note and links are centred while About/FAQ are left-aligned.
7. **Small text** (next draw, PCSO links, privacy note, disclaimer) is `--step--1` muted on purple; confirm ≥4.5:1,
   and the uppercase field labels mix "NAME (optional)" casing/weights.
8. **Numbers**: countdown ("in 1h 58m"), ball digits, game numbers use proportional figures.
9. **Fixed disclaimer bar** covers the last ~40px of content while scrolling (the balls pass under it); the page
   needs bottom padding equal to the bar height so nothing is permanently hidden at the end.
10. "Tunog: On" floats alone centred between the language switch and the card.

## Change
- Chips: game chips never wrap text (shorter padding, `white-space: nowrap`, `--step--1` label on narrow widths, or
  a 2-column grid at ≤400px whose cells fit the longest label); equal heights; if the count leaves a lone last chip,
  let it span the row (like "Custom" on Sulit Leave). Mood chips: inner padding ≥ `--space-2`, label never touches
  the edge at 360px (2-column at ≤380px if needed).
- About: body text upright; keep italics only on the first "joke" sentence or remove; `max-width: 65ch`,
  `text-wrap: pretty`.
- Headings: add `--step-2` h2 with `letter-spacing: var(--track-display)`, `text-wrap: balance` on h1/h2;
  sections `margin-block: var(--space-5)` consistently.
- FAQ: custom chevron marker (CSS only, rotates on open, respects reduced motion), summary hover/focus styles
  consistent with chips, ≥44px tap height.
- Footer: "More xonicbox tools" block constrained to the same column as the rest (no full-bleed border); decide one
  alignment for footer blocks (centred is fine) and apply it consistently to hire card, privacy note, tools list
  and links.
- `font-variant-numeric: tabular-nums` on balls, countdown, game numbers.
- Body `padding-bottom` = disclaimer bar height (incl. safe area) so the end of the page isn't hidden.
- Contrast: every small muted text pair passes 4.5:1 (extend the contrast test if the repo has one; else add one).

## Acceptance (runnable)
- `dt-test . --long` passes; update tests that assert old styles.
- New browser test at 360, 375, 768, 1280: no `.chip` (game/mood) label wraps (single line box height equal ±1px
  across chips of one group); no horizontal scroll; the "More xonicbox tools" block's left/right equal the main
  column's (±1px) at 1280; the last element before the disclaimer is fully visible when scrolled to the bottom
  (its bottom ≤ bar top); FAQ summary marker is not the default (`list-style` none) and height ≥ 44px;
  `tabular-nums` on a ball and the countdown.
- `dt-smoke . /` passes; add `review/56-home-375.png`, `review/56-home-1280.png` (full page) and OPEN them;
  compare with the Architect's before shots (kept outside the repo) in the report.
- No new dependencies.
