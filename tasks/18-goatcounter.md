# Task 18: GoatCounter analytics (cookieless) + short privacy note

Branch: `task/18-goatcounter`, stacked on `task/17-rename-domain` (PR #19, not merged yet; it
touches the same `<head>`). This file is its first commit. Brief: analytics brief items 1 and 3.
Owner approved GoatCounter (2026-10-06) and supplied the site code `lottoluckynumbersph`
(2026-10-07). No npm dependencies. Read `PLAN.md` and the **test context rule** (browser globals
only inside `page.evaluate`; pure logic in DOM-free modules).

## 1. Script tag (`index.html`) — the only place the site code lives
Exactly once, at the end of `<head>` (after the JSON-LD, never before the redirect script):
`<script data-goatcounter="https://lottoluckynumbersph.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script>`
Use `https://` (not `//gc.zgo.at`). This gives page views + referrer automatically.

## 2. Events (`src/analytics.js`, DOM-free + small wiring in `src/app.js`)
- `eventPath(kind, data)` pure, returns a string or `null`:
  - `('draw', {game, mood, mode})` → `draw/<game>/<mood>/<mode>`; `game` must be a known game id
    from `games.js`, `mood` one of the 6 radio values (`masaya pagod stressed kinikilig chill ewan`),
    `mode` `straight|rambolito`; anything else becomes `other`. Never accepts or emits free text.
  - `('share-tap')` → `share-tap`; `('share-done', {via})` → `share-done/native|copy` (else `other`).
  - `('pwa-install')` → `pwa-install`. Unknown kind → `null`.
- `track(gc, path)`: if `path` and `gc && typeof gc.count === 'function'`, calls
  `gc.count({ path, title: path, event: true })` inside try/catch; never throws.
  In `app.js` call it with `window.goatcounter` (may be undefined: blocked, offline, localhost).
- Wire: after a successful draw (once the numbers are shown), `draw` with game/mood/mode
  (`currentMode()`); share button click → `share-tap`; after `navigator.share` resolves →
  `share-done/native`, after clipboard copy → `share-done/copy` (not on AbortError/failure);
  `window` `appinstalled` → `pwa-install`.
- **Never** pass the name, age, or any typed text to analytics. No cookies, no localStorage/
  sessionStorage writes added by our code.

## 3. Privacy note (visible, phone-sized screens)
Under the existing footer disclaimer, a short `<p id="privacy-note">`:
`Privacy: anonymous at pinagsama-samang bilang lang ng bisita ang kinokolekta namin gamit ang GoatCounter (walang cookies). Hindi namin ipinapadala ang pangalan, edad o anumang tina-type mo.`
Keep `#not-affiliated` and the footer disclaimer unchanged.

## 4. Service worker
`sw.js`: bump `CACHE` to `"swertres-v13"`. It already ignores cross-origin requests; don't cache `gc.zgo.at`.

## Acceptance tests (runnable, `npm test`; tests must make no real network calls)
- `test/analytics.test.js` (node:test): `eventPath` cases above incl. unknown game/mood/mode →
  `other`, a name-like string as mood → `.../other/...`, unknown kind → `null`; `track` with
  `undefined`, `{}`, a throwing `count`, and a recording stub (asserts `{path,title,event:true}`).
- Static test: `index.html` contains the GoatCounter tag exactly once with the exact endpoint and
  `https://gc.zgo.at/count.js`, `async`, inside `<head>` after the redirect script; no `//gc.zgo.at`
  without `https:`; `#privacy-note` present with "GoatCounter" and "walang cookies".
- `test/analytics.browser.test.js` (Playwright): `page.route('https://gc.zgo.at/**')` fulfils a stub
  script that sets `window.goatcounter = { count: (o) => window.__gc.push(o) }` (init `__gc` in the
  stub). Fill name "Juanita", age 30, mood, draw Swertres Straight, then share (stub
  `navigator.clipboard`/`navigator.share` via `addInitScript`). Read `window.__gc` via
  `page.evaluate`, assert paths include `draw/swertres/<mood>/straight`, `share-tap`,
  `share-done/...`, and JSON of all calls contains neither "Juanita" nor "30". Assert
  `context.cookies()` is empty and `localStorage.length` / `sessionStorage.length` (read inside
  `page.evaluate`) are unchanged by the draw. Same flow with `gc.zgo.at` aborted: no console
  errors, draw still works.
- Existing tests all still pass; `dt-smoke` clean.
