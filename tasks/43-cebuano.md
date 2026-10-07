# Task 43: Cebuano (Bisaya) language, home page + picker

Branch: `task/43-cebuano`, based on `task/42-instagram` (0ce0b64, PR #43 awaiting merge; it renamed the
status keys to `statusAppShared`/`statusAppSaved`). This file is its first commit. Owner request in
#devteam (2026-10-07): "Add new language, Cebuano". Read `PLAN.md`, `tasks/39-lang-home.md` (structure,
voice, never-translate list) and the **test context rule**. Content pages are task 44: don't touch them
here except what the shared picker markup needs.

## Language
| code | picker label | `<html lang>` | voice |
| --- | --- | --- | --- |
| `ceb` | Cebuano | `ceb` | everyday conversational Cebuano/Bisaya as spoken in Cebu; friendly and playful like the Taglish, light English where Cebuanos naturally use it (game names, "lotto", brands, numbers stay) |
Order in the picker: Taglish, English, Tagalog, Cebuano. Default stays Taglish.

## Do
1. `src/i18n.js`: `LANGS = ['taglish', 'en', 'tl', 'ceb']`, `LANG_LABELS.ceb = 'Cebuano'`,
   `HTML_LANG.ceb = 'ceb'`, `STRINGS.ceb` with every key (incl. `statusAppShared`/`statusAppSaved` with `{app}`,
   `navHome`, day names, draw labels).
2. Content tables: add `ceb` to `REASONS_I18N`, `MOOD_REASONS_I18N` and all four roast tables (same keys,
   buckets, lengths; line *i* translates Taglish line *i*; same placeholders). Every function that takes
   `lang` must work for `ceb` (share text, card, schedule, game name: "Isang Numero" → "Usa ka Numero").
3. Home `index.html`: 4th radio `ceb` in `#lang-picker`; a 4th about/FAQ section `#about-games-ceb`
   (`data-lang-block="ceb"`, `lang="ceb"`, hidden), full Cebuano translation incl. FAQ and privacy note,
   following exactly the task-39 pattern.
4. Picker layout: 4 options must fit at 360px with ≥ 44px tap targets and no horizontal scroll. Use
   `repeat(4, 1fr)` with width up to `24rem` if labels fit on one line at 360px; otherwise a 2×2 grid.
   Content pages get the 4th radio in task 44. Until then, if `page-lang.js` reads a stored language
   that the page has no block for (`ceb`), it shows the Taglish block and keeps working.
5. `sw.js` `CACHE` → `swertres-v36` (+ `?v=36` pins the og test demands).

## Acceptance tests (`npm test` passes in full; existing tests change only for version pins and
language lists gaining `ceb`)
- `test/i18n.test.js` covers `ceb` everywhere it covers `en`/`tl` (keys, placeholders, table lengths,
  ≤10% identical-to-Taglish lines; `normalizeLang('ceb') === 'ceb'`).
- Browser (`test/lang.browser.test.js` extended):
  - Choose Cebuano: `<html lang>` is `ceb`; `#about-games-ceb` is visible, the others hidden; the visible
    text contains none of `Pindutin`, `Kumusta ka`, `Pumili`, `Tungkol`, `Copy link`, `Save image`, `Next draw`.
  - Draw in Taglish, switch to Cebuano: same numbers, reasons equal `MOOD_REASONS_I18N.ceb[mood][i]` for
    the same indices; WhatsApp share href contains the Cebuano share text.
  - Reload: still Cebuano. Then open `/about/`: page loads, Taglish block visible, no console errors.
  - 360px: `scrollWidth <= 360`; all 4 picker labels ≥ 44px tall and fully visible (not clipped:
    `scrollWidth <= clientWidth` on each label span).
Then `dt-test` and `dt-smoke` pass; include 360px screenshots of the top of the page and a drawn result in Cebuano.
