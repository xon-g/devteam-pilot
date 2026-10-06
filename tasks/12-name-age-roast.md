# Task 12: Playful teasing lines for the name and age

Branch: `task/12-name-age-roast`, from `task/11-sound-effects`. This file is its first commit.
No npm dependencies, no external requests. Read `PLAN.md` (copy rules, banned phrases) and the
**test context rule**. Everything from tasks 06, 08–11 still holds; nothing is stored or sent.

Owner request (#devteam, 2026-10-07): "Make fun of their input name with the catchphrases" and
"Make fun with their input age with the catchphrases". Tone decision: affectionate barkada
teasing (charot-level), never about looks, weight, gender, religion or region. Copy below is
final; use it exactly.

## 1. `src/roast.js` (no DOM)
```js
export const NAME_ROASTS = [
  "{name}? Pangalan pa lang, pang-main character na",
  "Uy {name}, lodi! Petmalu ang pangalan mo",
  "{name}? Sana all may ganyang pangalan",
  "Hello {name}! Pwede nang mangarap, charot",
  "{name}... parang pangalan ng crush ko dati, awit",
  "Si {name} na naman? Edi wow, ikaw na",
  "{name}, pak ganern! Slay ang pangalan",
  "Kilala ka namin, {name}. Laging late, char",
  "{name}? It's giving teleserye bida",
  "{name}, kumain ka na ba? Charot, bunot muna"
];
export const LONG_NAME_ROASTS = [   // name longer than 14 characters
  "{name}? Ang haba, pang-roll call sa graduation",
  "Hingal kami sa pangalan mo, {name}. Charot",
  "{name}: buong pangalan talaga? Ganern, formal"
];
export const SHORT_NAME_ROASTS = [  // name of 1-3 characters
  "{name}? Tipid sa letters, galante sa vibes",
  "{name} lang? Short pero solid, ganern",
  "{name}! Isang hinga lang, tapos na. Sana all"
];
export const AGE_ROASTS = [
  { min: 18, max: 21, lines: [
    "{age}? Bagets pa! May baon pa ba kay Mama?",
    "{age} ka pa lang? Batang TikTok, ganern",
    "Fresh na fresh sa {age}, sana all",
    "{age}? Kakalegal lang, chill lang muna bes" ] },
  { min: 22, max: 29, lines: [
    "{age}? Quarter-life crisis era, kapit lang",
    "{age} ka? Adulting is real, awit",
    "Sa {age}, pwede nang mangarap",
    "{age}? Prime mo 'to, bes. Slay!" ] },
  { min: 30, max: 39, lines: [
    "{age}? Welcome sa tita/tito era",
    "{age} na pero pang-20s ang aura, charot",
    "Sa {age}, bawal na mapuyat, bes",
    "{age}? Masakit na likod pero go pa rin" ] },
  { min: 40, max: 49, lines: [
    "{age}? Fine wine ka, bes. Lalong gumaganda",
    "{age} pero ang lakas pa rin ng dating",
    "Sa {age}, meron din naman palang ganda ang buhay",
    "{age}? Lodi ng buong barangay" ] },
  { min: 50, max: 59, lines: [
    "{age}? Batang 90s ka pa rin sa puso",
    "{age} na? Petmalu, walang kupas",
    "Sa {age}, ikaw na ang boss, bes",
    "{age}? Senior discount soon, charot" ] },
  { min: 60, max: 120, lines: [
    "{age}? Senior discount unlocked!",
    "{age} at blooming pa rin, sana all",
    "Sa {age}, ikaw ang OG lodi",
    "{age}? Ang dami nang napagdaanan, werpa!" ] }
];
export function fill(template, key, value)  // template.split(`{${key}}`).join(String(value))
                                            // NEVER String.replace with a string replacement ($& etc.)
export function nameRoast(name)   // '' -> null; length by Array.from(name).length:
                                  // >14 LONG, <=3 SHORT, else NAME_ROASTS; random via randomInt
export function ageRoast(age)     // null -> null; bucket by min/max; random via randomInt
export function roastLines({ name, age })  // [nameRoast, ageRoast] without nulls (0, 1 or 2 lines)
```

## 2. Markup + style
Right after `#for-name`: `<ul id="roast" class="roast" hidden></ul>`.
`.roast`: no bullets, margin 0, padding 0, centred, `color: var(--pink)`, weight 600, .95rem,
`display:grid; gap:.25rem`. No sideways scroll at 360px with a 30-character name.

## 3. Wiring (`src/app.js`)
- Use the profile captured at the start of `draw()` (same as `currentName`).
- After a completed draw (same place `#for-name` is shown): clear `#roast`, append one `<li>` per
  line from `roastLines(profile)` using `createElement` + **`textContent` only**; unhide if there
  are lines, else keep it hidden.
- Hide and clear `#roast` at the start of `draw()` and in `applyGame()`.
- Share text unchanged (the teasing stays on screen only).

## 4. Service worker
Add `src/roast.js` to precache; bump `CACHE` to `"swertres-v8"`; update the cache-name test.

## 5. Tests
- `test/roast.test.js` (node:test):
  - every template in all pools has its placeholder exactly once, is trimmed, ≤ 50 chars, no
    duplicates within a pool; no banned phrase (same BANNED list as `ui.test.js`, case-insensitive).
  - `AGE_ROASTS` buckets cover 18..120 with no gaps or overlaps.
  - 200 runs each: `nameRoast('Bea')` comes from SHORT and contains `Bea`; `nameRoast('Bea Cruz')`
    from NAME_ROASTS; `nameRoast('Maria Clara Santos')` from LONG; `ageRoast(18)` from 18–21 and
    contains `18`; `ageRoast(21)`, `22`, `39`, `40`, `60`, `120` land in the right bucket.
  - `roastLines({name:'',age:null})` → `[]`; `({name:'Jo',age:null})` → 1 line; both → 2 lines,
    name line first.
  - `fill('{name}!', 'name', '$&$1')` === `'$&$1!'`; `nameRoast('$&')` contains `$&` literally.
- `test/roast.browser.test.js` (Playwright, 375x812, reduced motion):
  1. Name `<i>Jo</i>`, age `33`, mood Chill, draw → `#roast` visible with 2 `li`; first contains
     the literal text `<i>Jo</i>`; `document.querySelector('#roast i') === null` (in evaluate);
     second contains `33` and is one of the 30–39 lines (filled with 33; import `AGE_ROASTS` in Node).
  2. No name, no age → `#roast` hidden after a draw.
  3. Only age `25` → exactly 1 `li`, from 22–29.
  4. After a draw, switch game → `#roast` hidden and empty.
  5. 360x740 with a 30-char name and age 99: no sideways scroll.

## Acceptance (`dt-test` passes, `dt-smoke` ok:true)
1. All tests green; report the count. Run `node --test test/roast.browser.test.js` 3 times, green.
2. Prove the checks bite (apply, run, copy failure, `git checkout -- <file>`; never commit):
   a. `src/app.js`: build `#roast` with `innerHTML` → privacy test and browser step 1 fail.
   b. `src/roast.js`: implement `fill` with `template.replace('{'+key+'}', value)` → the `$&` test fails.
   c. `src/roast.js`: change the 30–39 bucket max to 33 → bucket coverage test fails.
3. Screenshot `.smoke/roast-375.png` after a draw with name and age.
4. Diff touches only `index.html`, `styles.css`, `src/`, `sw.js`, `test/`, this task file.

## Report back
`RESULT:` line first, then branch, head sha, `dt-test` summary, `dt-smoke` JSON, the 3 runs,
break messages a-c, screenshot path.
