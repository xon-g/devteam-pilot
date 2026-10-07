# Task 45: Responsiveness and spacing pass

Branch: `task/45-responsive-spacing` from latest `master` (72eeba8). This file is its first commit.
Owner request (2026-10-07): "Reassess the design responsiveness and spacings". Architect audit at 320, 360,
390, 768, 1280px (home in Taglish and Cebuano after a draw, how-to-play, privacy): **no horizontal
overflow anywhere**; the problems are below. Read `PLAN.md`, `STACK.md` and the **test context rule**.
CSS-first; touch HTML/JS only where stated. Keep the look (colours, fonts, radii, pill style); this is a
layout/spacing fix, not a redesign. No dependencies.

## Findings to fix
1. **Desktop/tablet wastes space and cramps the form.** At 768 and 1280 the form card is ~420px wide
   inside a 34rem column, so 3-column game pills wrap names to two lines in small text ("Mega Lotto /
   6/45", "Isang Numero / (1–58)") while the sides are empty. At ≥ 640px: the form card, the reasons card,
   the actions and the share row use the full column width (`34rem`); game pills fit their names on one
   line (3 columns is fine if they fit; otherwise adjust columns). Phones (< 640px) keep today's layout.
2. **Share row wraps raggedly** (3/3/2/1 rows on desktop because of `max-width: 22rem`). At ≥ 640px it
   uses the column width so the 10 controls sit in at most 2 rows; centred.
3. **Inconsistent vertical rhythm.** Big gaps after the sound toggle before the form (~50px), between the
   share row and "Next draw" (~80px, from empty `#share-status` + margins), and between the three
   fine-print lines (official results, not-affiliated, privacy note). Introduce spacing tokens in `:root`
   (`--space-1: .5rem; --space-2: .75rem; --space-3: 1rem; --space-4: 1.5rem; --space-5: 2rem`) and use them
   for the gaps/margins in header, `main`, `.about`, `.reasons`, `.actions`, `.share-row`, `.next-draw`,
   fine print, `.about-games`, `.page`. Empty `#share-status` must take no vertical space
   (`:empty { display:none }` or `min-height` only when it has text, without layout jump > 24px).
4. **Fine print too small to read** (`--step--2`, ~11px): `.fine-print`, `#official-results`,
   `#not-affiliated`, `#privacy-note*`, `footer#disclaimer` → at least 12.5px computed (use `--step--1` or a
   new token), muted colour kept, contrast ≥ 4.5:1 against the background.
5. **Cebuano field hints wrap at 320px** ("NGALAN (dili kinahanglan)", "EDAD (dili kinahanglan)"):
   change `STRINGS.ceb.optional` to "(opsyonal)" and `required` to a short word if it wraps
   (e.g. "(kinahanglan)" is fine if it fits). Field labels must be one line at 320px in all 4 languages.
6. Content pages (`.page`) use the same tokens; headings/paragraph/list spacing consistent with the home
   about section.

## Acceptance tests (`npm test` passes; existing tests change only where they pin old sizes/spacing values)
New `test/layout.browser.test.js` (Playwright; all DOM reads inside `page.evaluate`), after a draw with
name "Maria Clara Santos" and a mood, for widths 320, 360, 390, 768, 1280 and languages taglish + ceb:
- `document.documentElement.scrollWidth <= innerWidth`.
- Every visible `button`, `a` inside `main`/header/share row (except inline links inside paragraphs and
  the footer nav), and every radio label pill is ≥ 44px tall.
- At 768 and 1280: `.about` (form card) width ≥ 480px; every `.games span` label is one line (its height ≤
  the height of the shortest game pill + 1px, i.e. all game pills equal height); `#share-row` controls
  occupy ≤ 2 distinct `top` values.
- Vertical gaps between consecutive visible children of `main` are each between 8px and 40px (measure
  `next.top - prev.bottom`).
- Gap between the header's last visible element and the form card ≤ 40px.
- Computed `font-size` of `.fine-print`, `#official-results`, `#not-affiliated`, `footer#disclaimer` ≥ 12.5px.
- At 320, field label spans (`.field > span`) are a single line in all four languages (check taglish, en,
  tl, ceb).
- Content pages `/how-to-play/` and `/privacy/` at 320 and 1280: no horizontal scroll.
Then `dt-test` and `dt-smoke` pass. Report with full-page screenshots after a draw at 360 and 1280
(Taglish) and 320 (Cebuano), and `/how-to-play/` at 360.
Cache: `sw.js` `CACHE` → `swertres-v38` (+ `?v=38` pins the og test demands).
