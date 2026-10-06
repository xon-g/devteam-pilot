# Task 08: "About you" form (Name, Age, Kumusta ka?)

Branch: `task/08-about-you` (from master; this file is its first commit).
No npm dependencies, no external requests. Read `PLAN.md` (copy rules, GitHub Pages rule) and the
**test context rule**: browser globals only inside `page.evaluate(() => ...)`, return values to
Node and assert there.

Owner request (#devteam, 2026-10-07): add Name (optional), Age (optional), Kumusta ka? (required).
Decisions: Kumusta ka? is a mood pick (6 choices) that picks the Taglish lines; numbers stay
purely random. Age under 18 blocks drawing. **Nothing is stored or sent**: no localStorage,
sessionStorage, cookies, fetch/XHR, analytics. The name only appears on the page and in the share
text the user sends themselves.

## Keep
Everything listed under "Keep" in `tasks/06-redesign.md` (ids, classes, radios, "Bunot na!",
grid areas, ad slot, exact disclaimer, reduced motion). `#combo-output` after a draw is still only
the combo (`d-d-d` or the Rambolito list); the name goes in its own element.

## 1. Pure logic: new `src/profile.js` (no DOM)
```js
export const MOODS = ['masaya', 'pagod', 'stressed', 'kinikilig', 'chill', 'ewan'];
export const MOOD_LABELS = { masaya: 'Masaya', pagod: 'Pagod', stressed: 'Stressed',
  kinikilig: 'Kinikilig', chill: 'Chill', ewan: 'Ewan ko' };
export function cleanName(raw)            // trim, collapse inner whitespace to one space
export function validateProfile({ name, age, mood })  // name/age are raw input strings
  // returns { ok: true, name, age, mood }  (name: cleaned string, '' if blank; age: number or null)
  //      or { ok: false, field: 'name'|'age'|'mood', message }
export function pickMoodReasons(mood, n = 3)  // n DISTINCT items from MOOD_REASONS[mood],
  // random via randomInt from lucky.js (no Math.random)
```
Rules, checked in this order: name (after `cleanName`) longer than 30 chars → `field:'name'`,
message `Hanggang 30 letters lang ang pangalan, bes.` · age blank/whitespace → `null` (fine);
otherwise must match `/^\d{1,3}$/` and be 1..120, else `field:'age'`, message
`Pakilagay ang tamang edad.`; age < 18 → `field:'age'`, message
`18+ lang 'to, bes. Balik ka pag 18 ka na!` · mood not in `MOODS` → `field:'mood'`, message
`Kumusta ka? Pumili ka muna, bes.`

`src/lucky.js`: `shareText(combo, mode, name = '')`: with a non-empty name the text starts
`Swertres lucky numbers ni ${name}: ` instead of `Swertres lucky numbers ko: `; everything else
unchanged (the existing tests for no name must still pass).

## 2. Copy: add to `src/reasons.js` exactly this (keep `REASONS` as is)
```js
export const MOOD_REASONS = {
  masaya: ["Ang saya mo today, nakakahawa ka bes", "Good mood ka? Sana all!", "Ngiti pa lang, ulam na", "Meron din naman palang ganda ang buhay", "Happy ka? Deserve mo 'yan", "Positive vibes only, ganern"],
  pagod: ["Pahinga ka muna, hindi ka robot", "Kape muna bago lahat", "Pagod pero ang ganda/pogi pa rin", "Dasurv mo ang mahabang tulog", "Konting kapit na lang, bes", "Rest day ka sa isip, kahit saglit"],
  stressed: ["Hinga muna. In... out... ayan", "Isa-isang hakbang lang, kaya mo 'yan", "Hindi lahat kailangan ngayon, bes", "Laban lang, kapit lang", "Stress? Di ka niya deserve", "Yakap from the internet, bes"],
  kinikilig: ["Uy, sino 'yan? Kwento mo naman!", "Kilig levels: off the charts", "Sana all may pinapakilig", "Ang blooming mo, halata ka", "Crush mo ba 'yan o crush ka niya?", "Pa-fall season, ingat sa puso"],
  chill: ["Kalma lang, chill lang", "Walang rush, ikaw ang bida", "Petiks mode: activated", "Easy lang tayo today", "Kape, kwentuhan, good vibes", "Go with the flow, bes"],
  ewan: ["Okay lang hindi okay, bes", "Mood: buffering...", "Ewan din namin, pero kasama mo kami", "Hanapin muna natin ang vibe mo", "Halo-halong feelings? Sige lang", "Pwede nang mangarap, kahit ewan"]
};
```

## 3. Markup (`index.html`), first thing inside `<main>`, before `.balls`
```html
<form id="about-you" class="about" novalidate autocomplete="off">
  <div class="about-row">
    <label class="field"><span>Name <small>(optional)</small></span>
      <input id="name" name="name" type="text" maxlength="40" spellcheck="false"></label>
    <label class="field"><span>Age <small>(optional)</small></span>
      <input id="age" name="age" type="text" inputmode="numeric" maxlength="3"></label>
  </div>
  <fieldset class="moods">
    <legend>Kumusta ka? <small>(required)</small></legend>
    <!-- one per MOODS value, same pattern as .segmented: -->
    <label><input type="radio" name="mood" value="masaya"><span>Masaya</span></label>
    <!-- pagod, stressed, kinikilig, chill, ewan (label text from MOOD_LABELS) -->
  </fieldset>
  <p id="form-status" aria-live="polite"></p>
</form>
```
Between `.balls` and `.reasons`: `<p id="for-name" class="for-name" hidden></p>`.

## 4. Wiring (`src/app.js`)
- One `checkForm()` that reads the inputs, calls `validateProfile`, sets
  `drawButton.disabled = !result.ok`, and sets `#form-status` text to `result.message` or `''`.
  Exception: before the user has touched the mood at all, show the hint
  `Pumili ng mood para makabunot.` instead of the mood error. Call it on load and on every
  `input`/`change` inside the form.
- On load `#draw` is disabled (no mood picked yet).
- `draw()`'s `finally` must not blindly re-enable `#draw`: call `checkForm()` instead.
- In `draw()` use `pickMoodReasons(mood, 3)` for the 3 reason lines (instead of `pickReason`).
- `#for-name`: after a draw, if the name is non-empty, set `textContent` to `Para kay ${name}`
  and unhide it; otherwise hide it. **Only `textContent`**, never `innerHTML`.
- Share uses `shareText(currentCombo, mode, name)`.
- Form `submit` → `preventDefault()` (Enter must not reload the page).

## 5. Styles (`styles.css`), match the task 06 tokens
- `.about`: card (`var(--card)`, `1px solid var(--line)`, `var(--radius)`, padding 1rem),
  `width:100%`, `display:grid; gap:.9rem`.
- `.about-row`: `display:grid; grid-template-columns:1fr 6.5rem; gap:.75rem`.
- `.field span`, `legend`: `--muted`, .8rem, weight 700, uppercase, letter-spacing .08em;
  `small` normal case, weight 400.
- inputs: `min-height:44px`, `width:100%`, `box-sizing:border-box`, background
  `rgba(0,0,0,.25)`, `1px solid var(--line)`, radius 12px, `color:var(--text)`, font 1rem
  (16px, so iOS doesn't zoom); `:focus-visible` → `outline:2px solid var(--gold)`.
- `.moods`: no default fieldset border/padding, `display:grid;
  grid-template-columns:repeat(3,1fr); gap:.5rem`; radio hidden exactly like `.segmented input`;
  `span` = chip: `min-height:44px`, centered, radius 999px, `1px solid var(--line)`, `--muted`;
  `input:checked + span` gold background, `var(--bg)` text; `focus-visible` gold outline.
- `#form-status`: .85rem, `var(--pink)`, `min-height:1.2em`, margin 0.
- `.for-name`: gold, weight 800, centered.
- `#draw:disabled`: `opacity:.45; cursor:not-allowed`.

## 6. Service worker
Add `src/profile.js` to the precache list and bump `CACHE` to `"swertres-v4"`; update the
`seo.test.js` cache-name test to v4.

## 7. Tests
- **Every existing browser test that clicks `#draw`** (design, ui, share, pwa.browser) must pick a
  mood first, like a user: `await page.locator('.moods span', { hasText: /^Chill$/ }).click()`.
  Add `'panalo'`, `'tatama'`, `'jackpot'` to the `BANNED` lists in `seo.test.js` and the second
  list in `lucky.test.js` so all lists match.
- New `test/profile.test.js` (node:test, no browser):
  - `MOOD_REASONS` keys equal `MOODS` (sorted compare); each list ≥ 6 strings, trimmed non-empty,
    ≤ 48 chars, no duplicates; no banned phrase (case-insensitive) anywhere in `MOOD_REASONS`.
  - `validateProfile` table: `{name:'',age:'',mood:'chill'}` ok with `age:null`, `name:''`;
    `name:'  Bea   Cruz '` → `'Bea Cruz'`; 31-char name → field name; age `'17'` → field age
    with the 18+ message; `'18'` ok, `age:18`; `'0'`, `'121'`, `'abc'`, `'1e2'`, `'-5'`, `'25.5'`
    → field age, `Pakilagay ang tamang edad.`; mood `''` and `'happy'` → field mood.
  - `pickMoodReasons('pagod')` 200 times: always 3 distinct items, all in `MOOD_REASONS.pagod`.
  - `shareText([1,2,3],'straight','Bea')` starts `Swertres lucky numbers ni Bea: 1-2-3`; without
    name unchanged.
  - Privacy: no file in `src/` contains `localStorage`, `sessionStorage`, `document.cookie`,
    `fetch(`, `XMLHttpRequest`, `innerHTML`.
- New `test/form.browser.test.js` (same server/Playwright setup as `ui.test.js`, 375x812):
  1. On load `#draw` is disabled and `#form-status` reads `Pumili ng mood para makabunot.`
  2. Click the `Masaya` chip text → `#draw` enabled, `input[value="masaya"]` checked.
  3. Type `15` in `#age` → `#draw` disabled, status contains `18+ lang`; clear it → enabled;
     type `25` → enabled.
  4. Type `<b>Bea</b>` in `#name`, draw → `#for-name` textContent is exactly
     `Para kay <b>Bea</b>` and `document.querySelector('#for-name b') === null` (in evaluate).
  5. After the draw: the 3 `.reason` texts are distinct and each is in `MOOD_REASONS.masaya`
     (import it in Node); `#combo-output` still matches `/^\d-\d-\d$/`.
  6. Press Enter inside `#name` → no navigation (`page.url()` unchanged, digits still shown).
  7. After drawing: `localStorage.length === 0`, `sessionStorage.length === 0`,
     `document.cookie === ''` (in evaluate).
  8. At 360x740 and 1280x800: `document.documentElement.scrollWidth <= innerWidth` (no sideways
     scroll), every `#name`, `#age` and `.moods span` box is ≥ 44px tall, `#age` box is fully
     inside `.about`'s box.
- Keep the triple-digit-safe Rambolito check from task 07 if you touch that code.

## Acceptance (`dt-test` passes, `dt-smoke` ok:true)
1. All tests green; report the count. Run `node --test test/form.browser.test.js` 3 times, green.
2. Prove the checks bite (apply, run, copy the failure, `git checkout -- <file>`; never commit):
   a. `src/app.js`: set `#for-name` with `innerHTML` → profile privacy test fails.
   b. `src/profile.js`: change the age limit to `< 16` → table test and browser step 3 fail.
   c. `src/app.js`: in `draw()`'s `finally`, set `drawButton.disabled = false` instead of calling
      `checkForm()`. Add browser step 9 for this: pick a mood, type age `20`, click `#draw`, and
      while the roll is still running (right after the click) change age to `15`; when the draw
      finishes, `#draw` must be disabled. With the break, step 9 fails.
3. Screenshots `.smoke/form-375.png` and `.smoke/form-1280.png` (after a draw, name filled).
4. Diff touches only `index.html`, `styles.css`, `src/`, `sw.js`, `test/`, this task file.

## Report back
`RESULT:` line first, then branch, head sha, `dt-test` summary lines, `dt-smoke` JSON, the 3 runs,
break messages a-c, screenshot paths.
