# Task 40: Language picker on the content pages

Branch: `task/40-lang-pages`, based on `task/39-lang-home` (3931ff2, PR #40, awaiting merge). This file
is its first commit. Owner request (2026-10-07): language picker Taglish (default) / English / Tagalog
on **every page** (owner chose option "b"). Task 39 did the home page and `src/i18n.js`; this task does
`about/`, `contact/`, `how-to-play/`, `lucky-numbers/`, `privacy/`, `responsible-gaming/`.
Read `PLAN.md`, `tasks/39-lang-home.md` (languages, voice, never-translate list) and the **test context
rule**. No dependencies, no build step, no network requests, no `innerHTML` with translated text.

## 1. Same picker, same storage
- Each page's `<header>` gets the exact picker markup from task 39 (`#lang-picker`, radios `name="lang"`),
  after the eyebrow. Same `localStorage` key `lang`, same `normalizeLang`, same `<html lang>` mapping, so a
  choice made on any page holds on every page.
- New `src/page-lang.js` (the only DOM code; imports `src/i18n.js`), loaded with
  `<script type="module" src="../src/page-lang.js"></script>` on all six pages. Keep `contact.js` as is.
- Translate the shared chrome with `STRINGS` keys (add keys only if missing, in all three languages):
  site-links nav (incl. "Home"; tl: "Simula"), `#not-affiliated`, footer disclaimer,
  home-link eyebrow stays "Lotto Lucky Numbers PH".

## 2. Page bodies
In each `<main class="page">`:
- Wrap the existing content (from `<h1>` through the existing `<section lang="en">` English summary) in
  `<div data-lang-block="taglish">…</div>`, unchanged inside.
- Add `<div data-lang-block="en" lang="en" hidden>…</div>`: a **full** English version of the page
  (same headings, lists, links, order; no "English summary" section in it).
- Add `<div data-lang-block="tl" lang="fil" hidden>…</div>`: a **full** Tagalog version (everyday
  Tagalog, minimal English; same structure; no English summary in it).
- Keep every `<mark class="check">[CHECK: …]</mark>` in all three versions (translate the words inside the
  brackets, keep "CHECK:"). Keep emails, URLs, phone numbers and hrefs identical. Ids that tests or
  scripts use (e.g. the contact email link, `#not-affiliated`) stay unique: put id'd elements outside the
  blocks, or suffix the copies (`-en`, `-tl`) and update `contact.js` only if it needs them all.
- `page-lang.js` shows the active block and hides the other two. No-JS shows Taglish.
- `<head>` (title, meta, OG, JSON-LD) stays unchanged.
- Privacy page: the English and Tagalog versions must say everything the Taglish one says, incl. the
  GoatCounter, future ads/Google cookies, and task 39's language-storage sentence. Don't weaken or add
  promises.

## 3. Service worker
Add `src/page-lang.js` to `ASSETS`; `CACHE` → `swertres-v33` (and `?v=33` wherever the og test pins it).

## Acceptance tests (`npm test` passes in full; existing tests unchanged except version pins)
New `test/lang-pages.test.js` (Node, reads files):
- Each of the six pages has exactly one `#lang-picker` with three radios `taglish|en|tl`, loads
  `../src/page-lang.js`, and has exactly one `data-lang-block` each of `taglish`, `en` (with `lang="en"`)
  and `tl` (with `lang="fil"`); `en` and `tl` blocks are `hidden` in the HTML.
- Per page: the count of `<h2>` and of `<li>` in the `en` and `tl` blocks equals the count in the
  `taglish` block minus the Taglish block's English-summary section; the count of `[CHECK` marks is
  equal across the three blocks; the set of `href` values is equal across the three blocks (ignoring
  hrefs inside the English summary).
- No duplicate `id` attributes in any page.
- `sw.js` has `src/page-lang.js` and `swertres-v33`.
New `test/lang-pages.browser.test.js` (Playwright, DOM/storage only inside `page.evaluate`):
- For each page, fresh context: Taglish block visible, other two not; `<html lang>` is `fil`.
- Choose English on `/about/`, then open `/privacy/`: English block visible, `<html lang>` `en`,
  `document.body.innerText` has none of `Tungkol`, `Hindi`, `namin`, `Walang`. Choose Tagalog there,
  then open `/` (home): Tagalog radio checked (task 39 behaviour).
- Tagalog on `/how-to-play/`: visible text has none of `Next draw`, `For entertainment only`.
- 360px on every page: `scrollWidth <= 360`; picker labels ≥ 44px tall.
- localStorage blocked (stub to throw via `addInitScript`): pages load in Taglish, no console errors.
Then `dt-test` and `dt-smoke` pass. Include 360px screenshots of `/privacy/` in English and Tagalog.
