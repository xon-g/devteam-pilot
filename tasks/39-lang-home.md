# Task 39: Language picker on the home page (Taglish default, English, Tagalog)

Branch: `task/39-lang-home`, based on `task/38-share-icons` (eb3c619, PR #39, awaiting merge) so the
share-row markup matches. This file is its first commit. Owner request in #devteam (2026-10-07):
"Should be able to pick language: Taglish (default), English, Tagalog." Owner chose to cover every
page; **this task is the home page only**; content pages are task 40 (don't touch them here, except
the privacy sentence in step 8).
Read `PLAN.md` and the **test context rule**: pure logic and all text tables in DOM-free modules,
tested in Node; browser globals (`window`, `document`, `localStorage`, `navigator`) only in `app.js`
and only inside `page.evaluate` in tests. No dependencies, no build step, no network requests.

## Languages
| code | picker label | `<html lang>` | voice |
| --- | --- | --- | --- |
| `taglish` (default) | Taglish | `fil` | today's text, unchanged |
| `en` | English | `en` | natural, friendly English; keep the jokes, drop Pinoy slang that doesn't translate (rewrite the joke instead of explaining it) |
| `tl` | Tagalog | `fil` | everyday Tagalog, as little English as is natural (game names, "lotto", brand names, numbers stay) |
Never translate: brand names (Facebook, Messenger, Viber, WhatsApp, Telegram, X, GoatCounter, PCSO),
game names except "Isang Numero" (en: "One Number"), "Lotto Lucky Numbers PH", Straight/Rambolito.

## 1. `src/i18n.js` (new, DOM-free)
```js
export const LANGS = ['taglish', 'en', 'tl'];
export const DEFAULT_LANG = 'taglish';
export const LANG_LABELS = { taglish: 'Taglish', en: 'English', tl: 'Tagalog' };
export const HTML_LANG = { taglish: 'fil', en: 'en', tl: 'fil' };
export function normalizeLang(v)          // valid code → itself, anything else → 'taglish'
export const STRINGS = { taglish: {…}, en: {…}, tl: {…} }   // same keys in all three
export function t(lang, key, vars = {})   // STRINGS[lang][key] ?? STRINGS.taglish[key] ?? key; replaces {name}-style vars
```
Every user-visible string of the home page goes into `STRINGS`: header (eyebrow, tagline, sound
On/Off), field labels and "(optional)"/"(required)", legends, mood labels, prompt, Draw/Share
buttons, share-row "Copy link"/"Save image" and the nav `aria-label`, every status text in
`app.js`, "Para kay {name}", next-draw line, official-results line, not-affiliated line, site-links,
footer disclaimer, and the validation messages in `profile.js` (return a `code` and look up the
message; keep `message` = Taglish for compatibility).

## 2. Content tables (keep existing exports = Taglish, unchanged)
- `reasons.js`: add `REASONS_I18N = { taglish: REASONS, en: {…}, tl: {…} }` and `MOOD_REASONS_I18N` the
  same way. Same keys and **same array lengths** in every language; line *i* in en/tl is the
  translation of line *i* in Taglish.
- `roast.js`: same for `NAME_ROASTS`, `LONG_NAME_ROASTS`, `SHORT_NAME_ROASTS`, `AGE_ROASTS` (same
  buckets, same `{name}`/`{age}` placeholders). `nameRoast`, `ageRoast`, `roastLines`,
  `pickMoodReasons` gain a trailing `lang = 'taglish'` parameter.
- `lucky.js` `shareText(…, lang = 'taglish')`, `card.js` lines, `schedule.js` day names and
  "ngayong/bukas/in 2h 5m" labels, `games.js` display name of `1-58`: all take `lang`, default
  Taglish, output for Taglish byte-identical to today (existing tests must pass unchanged).

## 3. Picker (header, under the tagline, before the sound toggle)
```html
<div id="lang-picker" class="segmented lang-picker" role="radiogroup" aria-label="Language / Wika">
  <label><input type="radio" name="lang" value="taglish" checked><span>Taglish</span></label>
  <label><input type="radio" name="lang" value="en"><span>English</span></label>
  <label><input type="radio" name="lang" value="tl"><span>Tagalog</span></label>
</div>
```
Reuse the existing `.segmented` look; ≥ 44px tap targets; fits at 360px with no horizontal scroll.
Picker labels are never translated.

## 4. Behaviour (`app.js`)
- On load: `lang = normalizeLang(localStorage.getItem('lang'))` (wrap storage in try/catch; blocked
  storage → default). Check the matching radio, set `<html lang>`, apply strings.
- Static text: mark elements with `data-i18n="<key>"` (sets `textContent`). For the long prose with
  links/markup (the `#about-games` section incl. FAQ and `#privacy-note`), put three sibling blocks
  `<div data-lang-block="taglish">…</div><div data-lang-block="en" hidden>…</div><div data-lang-block="tl" hidden>…</div>`
  and show only the active one. Never put translated strings through `innerHTML`.
- On change: save to `localStorage` key `lang`, re-apply everything, and if a result is on screen
  re-render its text **without redrawing**: same numbers, same reason/roast line *indices* in the new
  language (store the picked indices, not the strings), share-row hrefs rebuilt from the new
  `shareText`. No analytics event for language changes.
- `<head>` meta, OG tags, JSON-LD and `<title>` stay as they are (no translation, no JS rewrite).
- No-JS first paint stays Taglish (the HTML default).

## 5. Service worker
`sw.js`: add `src/i18n.js` to `ASSETS`, `CACHE` → `swertres-v32` (and `og-image.png?v=32` wherever the
og-preview test demands it).

## 6. Privacy
In `privacy/index.html` add one sentence to the Taglish part and one to the English summary: the
chosen language is remembered in the browser's local storage on this device only, never sent.
(en: "If you pick a language, your browser remembers it on this device only; it is never sent to us.")

## Acceptance tests (runnable: `npm test` passes in full; existing tests unchanged except version pins)
New `test/i18n.test.js` (Node):
- `LANGS`, `DEFAULT_LANG`, `normalizeLang` (`'en'`→`'en'`, `'EN'`, `''`, `null`, `'fr'` → `'taglish'`).
- `STRINGS.en` and `STRINGS.tl` have exactly the keys of `STRINGS.taglish`, all non-empty strings, and
  each value has the same set of `{placeholders}` as the Taglish one.
- `REASONS_I18N`, `MOOD_REASONS_I18N` and every roast table: same keys/buckets and same array lengths
  across languages; placeholders preserved line by line; `en` and `tl` lines are not identical to the
  Taglish line for more than 10% of lines in any table (catches untranslated copies).
- Taglish defaults: `shareText`, `roastLines`, `pickMoodReasons`, `drawLabel` without `lang` equal
  their explicit-`'taglish'` result.
New `test/lang.browser.test.js` (Playwright; DOM/storage reads only in `page.evaluate`):
- Fresh context: Taglish radio checked, `document.documentElement.lang === 'fil'`, `#draw` text "Bunot na!".
- Click English: `lang === 'en'`; visible body text (`document.body.innerText`) contains none of
  `Bunot`, `Pindutin`, `Kumusta`, `Pumili`, `Tunog`, `Tungkol`, `Mga laro`, `bawat`, `walang ulit`,
  `Opisyal`, `Para kay`.
- Click Tagalog: `lang === 'fil'`; visible text contains none of `Copy link`, `Save image`, `Next draw`,
  `Sound`, `optional`, `required`, `For fun`, `Draw`.
- Draw in Taglish, switch to English: the ball numbers are unchanged, reason texts changed and equal
  `MOOD_REASONS_I18N.en[mood][i]` for the same indices (expose nothing global; compare by importing
  the module inside `page.evaluate` via `await import('/src/reasons.js')`), FB share href contains the
  English share text.
- Reload after choosing English: still English (localStorage `lang === 'en'`).
- localStorage throwing (stub `Storage.prototype.getItem/setItem` to throw via `addInitScript`):
  page loads in Taglish, switching still works, no console errors.
- 360px: `scrollWidth <= 360`, each picker label ≥ 44px tall.
Then `dt-test` and `dt-smoke` pass. In your report include 360px screenshots of the top of the page
and of a drawn result in English and in Tagalog.
