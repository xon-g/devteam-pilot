# Task 09: Pick the PCSO game (not just Swertres)

Branch: `task/09-game-picker` (from master; this file is its first commit).
No npm dependencies, no external requests. Read `PLAN.md` (copy rules, GitHub Pages rule) and the
**test context rule**: browser globals only inside `page.evaluate(() => ...)`, return values to
Node and assert there. Everything in "Keep" of `tasks/06-redesign.md` and the privacy rules of
`tasks/08-about-you.md` still hold (nothing stored or sent, `textContent` only, no `innerHTML`).

Owner request (#devteam, 2026-10-07): "Should be able to pick which philippine lotto to generate
numbers with not just swertres." Default stays Swertres, so the page looks and behaves exactly as
today until the user picks another game.

## 1. Pure logic: new `src/games.js` (no DOM)
```js
export const GAMES = [
  { id: '2d',   name: 'EZ2 (2D)',          kind: 'pick',  count: 2, min: 1, max: 31, rambolito: true  },
  { id: '3d',   name: 'Swertres (3D)',     kind: 'digit', count: 3, min: 0, max: 9,  rambolito: true  },
  { id: '4d',   name: '4D Lotto',          kind: 'digit', count: 4, min: 0, max: 9,  rambolito: false },
  { id: '6d',   name: '6D Lotto',          kind: 'digit', count: 6, min: 0, max: 9,  rambolito: false },
  { id: '6-42', name: 'Lotto 6/42',        kind: 'lotto', count: 6, min: 1, max: 42, rambolito: false },
  { id: '6-45', name: 'Mega Lotto 6/45',   kind: 'lotto', count: 6, min: 1, max: 45, rambolito: false },
  { id: '6-49', name: 'Super Lotto 6/49',  kind: 'lotto', count: 6, min: 1, max: 49, rambolito: false },
  { id: '6-55', name: 'Grand Lotto 6/55',  kind: 'lotto', count: 6, min: 1, max: 55, rambolito: false },
  { id: '6-58', name: 'Ultra Lotto 6/58',  kind: 'lotto', count: 6, min: 1, max: 58, rambolito: false },
];
export const DEFAULT_GAME = '3d';
export function getGame(id)           // the GAMES entry, or the '3d' entry for unknown ids
export function drawNumbers(game)     // uses randomInt from lucky.js only (no Math.random)
  // digit: count values 0..9, repeats allowed, order as drawn
  // pick:  count values min..max, repeats allowed, order as drawn
  // lotto: count DISTINCT values min..max, sorted ascending
export function formatNumbers(game, nums)  // joined with '-'; digit games: plain digits
  // ("1-2-3"); pick and lotto: two-digit zero-padded ("07-21", "03-12-25-31-40-42")
```
`src/lucky.js`:
- `drawCombo()` stays (returns 3 digits) so old tests keep passing.
- `shareText(combo, mode, name = '', gameId = '3d')`: lead becomes
  `${short} lucky numbers ko: ` / `${short} lucky numbers ni ${name}: ` where `short` is the game
  name without the parenthesised part (`Swertres`, `EZ2`, `4D Lotto`, `Ultra Lotto 6/58`, ...).
  Numbers formatted with `formatNumbers`; Rambolito only when the game allows it, otherwise
  always the straight form with no `(Straight)`/`(Rambolito)` tag. For `'3d'` the output must be
  byte-identical to today.
- `rambolitoCombos` must also work for 2D (pass already-formatted parts or format inside; the
  2D result looks like `07-21, 21-07`; same pair → one combo).

## 2. Markup (`index.html`)
Inside `#about-you`, after `.about-row` and before `.moods`:
```html
<fieldset class="games">
  <legend>Anong laro?</legend>
  <!-- one per GAMES entry, same radio+span chip pattern as .moods; '3d' checked -->
  <label><input type="radio" name="game" value="3d" checked><span>Swertres (3D)</span></label>
</fieldset>
```
Write the 9 chips into the HTML (no JS rendering needed for them). Keep the static
`digit-0..2`, `reason-0..2`, `mini-0..2` elements for the default game.
The `.eyebrow` text follows the picked game: `Swertres · 3D` for 3d, otherwise the game name
(e.g. `Ultra Lotto 6/58`). `<title>`, h1, meta and Open Graph tags: **unchanged** in this task.

## 3. Wiring (`src/app.js`)
- On game change (and before each draw), rebuild `.balls` and `.reasons` to `game.count` items
  with ids `digit-<i>`, `reason-<i>`, `mini-<i>` and the existing classes, using
  `document.createElement` + `textContent` only. Clear the old result, disable `#share`, show the
  first-draw prompt again.
- Straight/Rambolito radios: visible and usable only when `game.rambolito`; otherwise hide their
  group (`hidden`) and treat the mode as straight.
- `draw()`: rolling uses random values in the game's range (`min..max`); final numbers from
  `drawNumbers(game)`; ball text for pick/lotto is zero-padded two digits. Reasons:
  `pickMoodReasons(mood, game.count)` (each mood list has exactly 6 lines, so 6 fits). Reduced
  motion: no rolling, same final state.
- `#combo-output` = `formatNumbers` (or the Rambolito list). Share passes the game id.

## 4. Styles (`styles.css`), task 06 tokens
- `.games` = same chip look as `.moods` (grid, 3 columns, 44px chips, gold checked, focus
  outline). Chip text may wrap to 2 lines at 360px; no horizontal scroll.
- `.balls` must fit 6 balls in one row at 360px wide without overflow: make ball size respond to
  the count (e.g. `.balls[data-count="6"]` smaller balls, or `clamp()` sizes); two-digit numbers
  must fit inside a ball without clipping. 2/3/4 balls keep today's size feel.

## 5. Service worker
Add `src/games.js` to the precache list, bump `CACHE` to `"swertres-v5"`, update the
`seo.test.js` cache-name test to v5.

## 6. Tests (keep every existing test green)
- New `test/games.test.js` (node:test):
  - `GAMES` ids unique, 9 entries, include every id above; `getGame('nope').id === '3d'`.
  - For every game, 500 draws: length = count; every value an integer in min..max; lotto values
    distinct and strictly ascending.
  - Coverage: 2000 draws of `6-58` hit both 1 and 58; 2000 draws of `2d` hit 1 and 31; digit
    games hit 0 and 9.
  - `formatNumbers`: `3d [1,2,3]` → `1-2-3`; `2d [7,21]` → `07-21`; `6-42 [3,12,25,31,40,42]` →
    `03-12-25-31-40-42`; `6d [0,0,1,2,3,4]` → `0-0-1-2-3-4`.
  - `shareText([1,2,3],'straight')` unchanged from today (exact string); `'rambolito'` too.
    `shareText([3,12,25,31,40,42],'rambolito','Bea','6-42')` →
    `Lotto 6/42 lucky numbers ni Bea: 03-12-25-31-40-42 🍀 For entertainment only. 18+.`
    2D rambolito `[7,21]` → contains `07-21, 21-07 (Rambolito)`.
  - No `Math.random` in `src/`.
- New `test/games.browser.test.js` (same setup as `form.browser.test.js`):
  1. On load: 9 `input[name="game"]`, `3d` checked, 3 `.digit` balls, mode radios visible.
  2. Pick Chill mood, pick `Ultra Lotto 6/58`, draw: 6 `.digit` balls whose texts are 2-digit,
     distinct, ascending, each 01..58; `#combo-output` matches `/^\d\d(-\d\d){5}$/`; 6 distinct
     `.reason` texts; mode radios hidden; `.eyebrow` contains `Ultra Lotto 6/58`.
  3. Pick EZ2, draw: 2 balls in 01..31; switch to Rambolito → output lists the reversed pair
     too (or one combo if the same number twice).
  4. Pick 6D, draw: 6 single-digit balls, output `/^\d(-\d){5}$/`.
  5. Switch back to Swertres: 3 balls, output reset to the prompt, `#share` disabled.
  6. At 360x740 and 1280x800 with 6/58 drawn: no sideways scroll
     (`scrollWidth <= innerWidth`), every `.digit` box fully inside `.balls`'s box, every game
     chip ≥ 44px tall.
  7. Reduced motion (`page.emulateMedia({ reducedMotion: 'reduce' })`): 6/58 draw still ends
     with 6 valid balls.
- Update the existing tests only where the new fieldset changes counts or selectors; never
  delete an assertion to make it pass.

Done when: `npm test` passes, `dt-smoke` passes, and the Builder report includes the full test
output and one screenshot each at 360x740 for Swertres and for Ultra Lotto 6/58 after a draw.
