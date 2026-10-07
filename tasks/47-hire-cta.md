# Task 47: "Need a website?" call-to-action (xonicbox hire block)

Branch: `task/47-hire-cta` from latest `master` (26085d4). This file is its first commit.
Owner request in #devteam (2026-10-07): "each website has like a selling point 'Like this website? or like
this web design? or do you need a website?' to email xonicbox so we can make a deal … As a first try.
lets apply this now to lotto.xonicbox.com". Read `PLAN.md` and the **test context rule**.
No dependencies, no forms, no new network requests, no price on the page (pricing is Ledger's, later).

## Do
1. A small, quiet card on **all 7 pages** (home + the 6 content pages), placed just above the
   `.site-links` nav (after `#about-games*` on home, after `</main>` on content pages; never between
   `#draw` and the result, never inside the ad slot):
   ```html
   <aside id="hire" class="hire" aria-labelledby="hire-title">
     <p id="hire-title" class="hire-title">Like this website?</p>
     <p class="hire-text">Need a website for your business, shop or idea? xonicbox builds fast, simple sites like this one.</p>
     <a class="hire-link" href="mailto:hello@xonicbox.com?subject=…&body=…">Email xonicbox</a>
   </aside>
   ```
   Texts in all 4 languages via `STRINGS` keys `hireTitle`, `hireText`, `hireCta`, `hireSubject`, `hireBody`
   (translated by `app.js` on home and `page-lang.js` on content pages, like the nav):
   - taglish: "Bet mo ba 'tong website?" · "Kailangan mo ba ng website para sa negosyo, shop o idea mo? Gumagawa ang xonicbox ng mabilis at simpleng sites gaya nito." · "I-email ang xonicbox"
   - en: "Like this website?" · "Need a website for your business, shop or idea? xonicbox builds fast, simple sites like this one." · "Email xonicbox"
   - tl: "Gusto mo ba ang website na ito?" · "Kailangan mo ba ng website para sa negosyo, tindahan o ideya mo? Gumagawa ang xonicbox ng mabilis at simpleng website na tulad nito." · "Mag-email sa xonicbox"
   - ceb: "Ganahan ka ani nga website?" · "Kinahanglan ka og website para sa imong negosyo, tindahan o ideya? Naghimo ang xonicbox og paspas ug simple nga mga site sama ani." · "I-email ang xonicbox"
   - mailto subject (same in all languages): `Website inquiry (from lotto.xonicbox.com)`; body per language,
     short, e.g. en "Hi xonicbox! I'd like a website. What I need: " (tl/taglish/ceb equivalents).
     Build the href with `encodeURIComponent` from a pure helper `hireMailto(lang)` in a DOM-free module
     (`src/hire.js`), so the subject/body are testable in Node. The static HTML href is the Taglish one
     (works without JS).
2. Look: a card like `.about-games details` (card background, `--line` border, radius), centred, same width
   as the column, spacing tokens from task 45, link styled as a secondary pill button ≥ 44px tall. Quiet:
   no gold-filled button, no animation, smaller than the Draw button.
3. Analytics: clicking the link sends `track(window.goatcounter, eventPath('hire-click'))`
   → path `hire-click` (add the case to `eventPath`). Content pages: send the same event from `page-lang.js`
   only if `window.goatcounter` exists (no import of app.js there; reuse `analytics.js`).
4. Privacy: nothing new is collected (mailto opens the visitor's own mail app). No privacy-page change.
5. `sw.js`: add `src/hire.js` to `ASSETS`, `CACHE` → `swertres-v40` (+ `?v=40` pins the og test demands).

## Acceptance tests (`npm test` passes; existing tests change only for pins and pinned markup counts)
- Node `test/hire.test.js`: `hireMailto(lang)` for all 4 languages starts with `mailto:hello@xonicbox.com?subject=`,
  decodes to subject `Website inquiry (from lotto.xonicbox.com)` and the language's body; `STRINGS` has the
  5 keys in every language; every page's HTML has exactly one `#hire` with a `mailto:hello@xonicbox.com`
  link, placed before `.site-links`; `eventPath('hire-click') === 'hire-click'`; `sw.js` has `src/hire.js`, v40.
- Browser `test/hire.browser.test.js` (DOM/globals only in `page.evaluate`/`addInitScript`):
  - Home and `/about/`: `#hire` visible after scrolling to it; link ≥ 44px tall; no horizontal scroll at
    320 and 1280; the card is above the footer nav and fully visible above the fixed disclaimer when scrolled
    to the bottom.
  - Switch to English / Tagalog / Cebuano: title, text, link label and the link's `href` body change to
    that language.
  - With a GoatCounter stub, clicking the link (intercept navigation so the mail app isn't opened, e.g.
    `preventDefault` in a capture listener added by the test) records `hire-click` once, on home and on `/about/`.
Then `dt-test` and `dt-smoke` pass; include 360px and 1280px screenshots of the card on home.
