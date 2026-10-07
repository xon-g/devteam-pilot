# Task 32: Draw schedule + "next draw" countdown

Branch: `task/32-draw-countdown` from latest `master` (14997f2). This file is its first commit.
Brief: `2026-10-06-swertres-analytics.md` item 6: "Next draw: Swertres 5PM, in 1h 12m" on the home
screen; schedule in **one JSON file** in the repo; correct next draw for every game at any time in
Asia/Manila; works offline. No npm dependencies. Read `PLAN.md` and the **test context rule**
(pure logic in DOM-free modules tested in Node; browser globals only inside `page.evaluate`).
Don't restyle the site.

## 1. Schedule file: `data/draw-schedule.json`
Times are Manila wall-clock (`HH:MM`, 24h). Days use JS numbering (0 = Sunday … 6 = Saturday).
```json
{
  "timezone": "Asia/Manila",
  "utcOffsetMinutes": 480,
  "note": "Mirrors how-to-play/. Owner verifies against PCSO before merge.",
  "games": {
    "2d":   { "days": [0,1,2,3,4,5,6], "times": ["14:00", "17:00", "21:00"] },
    "3d":   { "days": [0,1,2,3,4,5,6], "times": ["14:00", "17:00", "21:00"] },
    "4d":   { "days": [1,3,5], "times": ["21:00"] },
    "6d":   { "days": [2,4,6], "times": ["21:00"] },
    "6-42": { "days": [2,4,6], "times": ["21:00"] },
    "6-45": { "days": [1,3,5], "times": ["21:00"] },
    "6-49": { "days": [0,2,4], "times": ["21:00"] },
    "6-55": { "days": [1,3,6], "times": ["21:00"] },
    "6-58": { "days": [0,2,5], "times": ["21:00"] }
  }
}
```
No entry for `1-58` (not a PCSO game). Manila has no DST, so a fixed +08:00 offset is correct; don't
depend on `Intl` time-zone data.

## 2. Pure logic: `src/schedule.js` (DOM-free, no globals)
- `nextDraw(schedule, gameId, now)` → `{ at: Date, day: 0-6, time: 'HH:MM' }` for the first draw
  **strictly after** `now` (a `Date`), or `null` if the game has no schedule. Search up to 8 days ahead.
- `formatCountdown(ms)` → `"in 1h 12m"`, `"in 45m"`, `"in 2d 3h"` (≥ 24h: days + hours), `"in <1m"`
  under one minute. Minutes are floored.
- `formatDrawTime(time)` → `"2:00 PM"`, `"9:00 PM"`, `"12:00 PM"`.
- `drawLabel(draw, now)` → `"ngayong 5:00 PM"` if the draw is on the same Manila calendar day as
  `now`, `"bukas 9:00 PM"` if the next Manila day, otherwise `"Huwebes 9:00 PM"` (Filipino day names:
  Linggo, Lunes, Martes, Miyerkoles, Huwebes, Biyernes, Sabado).
- `loadSchedule()` → `fetch(new URL('../data/draw-schedule.json', import.meta.url))` then `.json()`;
  returns `null` on any error. This is the **only** `fetch(` in `src/`, and it's same-origin.

## 3. Home page
In `index.html`, directly **above** `#official-results`:
```html
<p id="next-draw" class="next-draw" hidden aria-live="off">
  Next draw: <strong id="next-draw-game"></strong> <span id="next-draw-when"></span>
  · <span id="next-draw-in"></span>
</p>
```
Example text: "Next draw: Swertres (3D) ngayong 5:00 PM · in 1h 12m".
- `src/app.js`: load the schedule once at start-up; in `applyGame` and every 30 s, update the row for
  the selected game. Hidden when the schedule failed to load or the game has none (`1-58`). No
  analytics event. Don't let a schedule failure break the rest of the app.
- Style: small, quiet, like `.fine-print` but readable (the countdown number may be bold). Wraps
  cleanly at 360px.

## 4. Offline + cache
`sw.js`: add `"data/draw-schedule.json"` and `"src/schedule.js"` to `ASSETS`; `CACHE` →
`"swertres-v28"`; bump every `og-image.png?v=27` to `?v=28` on all pages. Update tests that pin
either version.

## 5. Existing test
`test/results-links.test.js` forbids `fetch(` in `src/`. Change it to allow exactly one `fetch(` in
`src/schedule.js` whose argument is built from `import.meta.url` (no `http` literal in that file);
everything else still forbidden.

## Acceptance tests (runnable, `npm test`; no real network calls)
- `test/schedule.test.js` (node:test; read the JSON with `fs`, don't fetch):
  - JSON has an entry for every `GAMES` id except `1-58`; all days are 0–6, times match `^\d\d:\d\d$`,
    `utcOffsetMinutes` is 480.
  - Fixed instants (build them as UTC, e.g. `new Date('2026-10-07T05:59:00Z')` = Wed 13:59 Manila):
    - 3d at Wed 13:59 → Wed 14:00, `formatCountdown` "in 1m"; at Wed 14:00:00 exactly → Wed 17:00;
      at Wed 21:00:01 → Thu 14:00 (label "bukas 2:00 PM").
    - 3d at Manila 23:30 Sat (= Sat 15:30Z) → Sun 14:00 Manila (crosses UTC and Manila midnight correctly).
    - 4d at Wed 21:30 → Fri 21:00 (label "Biyernes 9:00 PM", "in 1d 23h").
    - 6-58 at Fri 21:00:30 → Sun 21:00; 6-49 at Thu 22:00 → Sun 21:00; 6-55 at Sat 21:01 → Mon 21:00.
    - For every game, a loop over every hour of one week (168 instants) returns a draw that is
      > now, ≤ 7 days ahead, on a listed day and time (checked by converting back to Manila).
    - `1-58` → `null`.
  - `formatCountdown`: 30_000 → "in <1m", 59 min → "in 59m", 72 min → "in 1h 12m", 51 h → "in 2d 3h".
  - `formatDrawTime`: "14:00" → "2:00 PM", "21:00" → "9:00 PM", "12:00" → "12:00 PM".
  - `how-to-play/index.html` lists the same draw days as the JSON for the five 6/xx games (table) so
    the two can't silently drift.
  - `sw.js` has `swertres-v28` and lists both new files.
- `test/schedule.browser.test.js` (Playwright, same `startServer` pattern as
  `test/results-links.browser.test.js`, `BASE_PATH=/devteam-pilot/`; abort `https://gc.zgo.at/**`;
  fix the clock with `page.clock.install({ time: new Date('2026-10-07T07:48:00Z') })` = Wed 15:48 Manila):
  - Default game: `#next-draw` visible, text contains "Swertres (3D)", "ngayong 5:00 PM", "in 1h 12m".
  - Select 4D → "Biyernes 9:00 PM"; select 1-58 → row hidden; select 6/42 → visible again.
  - `page.clock.fastForward('31:00')` (or `runFor`) → countdown text updates without reload.
  - If `**/data/draw-schedule.json` is routed to a 404, the page still works (draw button usable),
    row hidden, no uncaught errors.
  - At 360×740: `scrollWidth <= innerWidth`.
  - No console errors.
- **Commit, then run `npm test` on the committed head.** All tests pass; `dt-smoke` clean.

## Out of scope
Fetching anything from PCSO; showing results; editing the how-to-play copy or its [CHECK] marks;
notifications/reminders.
