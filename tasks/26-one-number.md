# Task 26: "Isang Numero" choice in the game picker (one number, 1–58)

Branch: `task/26-one-number`, from `master`. This file is its first commit. No npm dependencies,
no image files, no external requests. Read `PLAN.md` and the **test context rule** (browser
globals only inside `page.evaluate`). Owner request, #devteam, 2026-10-07: "add a new choice in
game picker, it only chooses one number" … "1-58 sounds good".

## Decision (Architect)
A 10th game pill, last in "Anong laro?": **Isang Numero (1–58)**. Bunot na draws exactly one
number from 1 to 58 (uniform, using the existing `randomInt`), shown as one ball, two-digit
padded like the lotto games (e.g. `07`). No Rambolito. It is not a PCSO game; the copy says so.

## Change
- `src/games.js`: append `{ id: '1-58', name: 'Isang Numero (1–58)', kind: 'pick', count: 1,
  min: 1, max: 58, rambolito: false }` as the last entry. Existing entries and `DEFAULT_GAME`
  unchanged. `drawNumbers`/`formatNumbers` must already handle it; change them only if not.
- `index.html`: after the 6/58 label add
  `<label><input type="radio" name="game" value="1-58"><span class="lotto" data-ball="1">Isang Numero (1–58)</span></label>`
  (reuse the lotto badge style; no new badge colour). In "Mga laro" add
  `<li>Isang Numero: 1 number, 1–58 (hindi PCSO game, para sa saya lang)</li>` as the last item.
  In the FAQ "Anong mga laro ang kasama?" answer append
  ` May "Isang Numero" din na isang random na numero mula 1 hanggang 58 (hindi ito PCSO game).`
  and keep the JSON-LD FAQ text identical to the visible text (the SEO tests compare them).
  Do not change other copy, the meta descriptions, or `llms.txt`.
- `src/app.js` / `styles.css`: only what is needed so a 1-ball result looks right (ball centred,
  same size as other balls, no empty slots), the eyebrow shows `Isang Numero (1–58)`, the
  Rambolito/mode group is hidden, share text and analytics work (`draw/1-58/<mood>/straight`).
  The picker keeps 2 columns ≤560px and 3 columns above; the 10th pill just sits in the next row.
- `sw.js`: bump `CACHE` from `swertres-v19` to `swertres-v20` (update tests that pin it).
- Update existing tests that pin the list of 9 games / 9 pills to include `1-58`.

## Acceptance tests (runnable)
1. `npm test` passes.
2. Unit (`test/games.test.js` or new `test/one-number.test.js`): `getGame('1-58')` has count 1,
   min 1, max 58, rambolito false; 2000 `drawNumbers` calls each return exactly 1 integer in
   1..58, and both 1 and 58 appear at least once over 20000 draws; `formatNumbers(g, [7]) === '07'`.
3. Playwright `test/one-number.browser.test.js` at 375 and 1280 wide: pick the mood and the
   `1-58` radio, click Bunot na, wait for the draw to finish; inside `page.evaluate` return the
   number of visible result balls, their text, the eyebrow text, whether the mode group is hidden,
   and `scrollWidth`/`clientWidth`. Assert in Node: exactly 1 ball, text matches `/^\d\d$/` and is
   in 01..58, eyebrow `Isang Numero (1–58)`, mode group hidden, no horizontal overflow. Switching
   back to Swertres restores 3 balls. Also assert the picker has 10 game spans, 2 columns at 375
   and 3 at 1280, none overlap, each ≥ 44px tall and ≤ 2 text lines.
4. `dt-smoke` passes with no console errors.
