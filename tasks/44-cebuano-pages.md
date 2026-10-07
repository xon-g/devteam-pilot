# Task 44: Cebuano on the content pages

Branch: `task/44-cebuano-pages`, based on `task/43-cebuano` (25e5817, PR #44 awaiting merge). This file is
its first commit. Owner request (2026-10-07): "Add new language, Cebuano". Task 43 added `ceb` to the home
page and `src/i18n.js`; this task adds it to `about/`, `contact/`, `how-to-play/`, `lucky-numbers/`,
`privacy/`, `responsible-gaming/`, following the task-40 pattern exactly.
Read `PLAN.md`, `tasks/40-lang-pages.md`, `tasks/43-cebuano.md` (voice) and the **test context rule**.

## Do
1. Each page: 4th radio `ceb` (label "Cebuano") in `#lang-picker`, same markup/CSS as the home page.
2. Each page: add `<div data-lang-block="ceb" lang="ceb" hidden>…</div>` after the `tl` block: a **full**
   Cebuano version (same headings, lists, links, order, `[CHECK: …]` marks with translated words, emails/
   URLs/hrefs identical, no English summary). Ids stay unique (suffix `-ceb`, e.g. `last-updated-ceb`).
3. Privacy page: the Cebuano version must say everything the Taglish one says (GoatCounter, future
   ads/Google cookies, language storage, rights/NPC, children, contact). No new or weaker promises.
4. `page-lang.js`: remove the task-43 fallback special case only if it's no longer needed; keep the
   generic "no block for this language → Taglish" safety.
5. Chrome (nav, not-affiliated, footer) already has `ceb` strings from task 43; reuse them.
6. `sw.js` `CACHE` → `swertres-v38` (+ `?v=38` pins the og test demands).

## Acceptance tests (`npm test` passes in full; existing tests change only for version pins and
language lists gaining `ceb`)
- `test/lang-pages.test.js` covers `ceb` like `en`/`tl`: one `ceb` block per page with `lang="ceb"`,
  hidden; same `<h2>`/`<li>` counts, `[CHECK` count and `href` set as the other translated blocks; 4 radios;
  no duplicate ids.
- `test/lang-pages.browser.test.js`: choose Cebuano on `/about/`, open `/privacy/`: `ceb` block visible,
  others hidden, `<html lang>` `ceb`, visible text has none of `Tungkol`, `namin`, `Walang`, `We `;
  then open `/` : Cebuano radio checked. 360px on every page: no horizontal scroll, 4 picker labels
  ≥ 44px and unclipped. Remove/adjust the task-43 "about falls back to Taglish for ceb" assertion.
Then `dt-test` and `dt-smoke` pass; include a 360px screenshot of `/privacy/` in Cebuano.
