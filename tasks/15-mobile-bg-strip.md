# Task 15: White strip at the bottom while scrolling on Android

Branch: `task/15-mobile-bg-strip`, from latest `master`. This file is its first commit.
No npm dependencies, no external requests. CSS-only fix plus tests and the cache bump.

Owner report (2026-10-07): on a Samsung S26 Ultra in Brave, a white rectangle appears at the
bottom of the page while scrolling.

Cause: `html` has no background, so the page canvas is white. `body` paints the gradient with
`background-attachment: fixed` and `min-height: 100dvh`. On Android Chromium browsers (Brave,
Chrome, Samsung Internet), the address bar collapses while you scroll and the viewport grows.
A fixed-attachment background is not repainted fast enough, so the newly exposed strip at the
bottom shows the white canvas. The translucent fixed footer (`backdrop-filter`) is right there,
so the strip is easy to see.

## 1. `styles.css`
- Add, before the `body` rule:
  ```css
  html {
    background-color: var(--bg);
    color-scheme: dark;
  }
  ```
- In `body`: remove `background` and `background-attachment: fixed` (keep everything else).
- Paint the gradient on a fixed layer sized to the *largest* viewport, so no strip is exposed
  when the toolbar hides:
  ```css
  body::before {
    content: "";
    position: fixed;
    inset: 0 0 auto 0;
    height: 100lvh;
    z-index: -1;
    pointer-events: none;
    background: radial-gradient(120% 80% at 50% 0%, var(--bg-2) 0%, var(--bg) 60%);
  }
  ```
  `body` must not create a stacking context that hides it (no `z-index`/`transform` on `body`).
  Check that `body::before` does not become a grid item that shifts the layout: a fixed
  element is out of flow, so it should not. Confirm in the browser test below.

## 2. Cache
`sw.js`: `CACHE` → `"swertres-v11"`. Update the CACHE check in `test/seo.test.js` to v11.

## Acceptance tests (runnable)
- `dt-test` passes (all existing tests, including `test/design.test.js`; update it only if it
  asserts the old `body` background, and say so in the report).
- Add `test/mobile-bg.browser.test.js` (Playwright, 360x780 viewport, every browser global read
  only inside `page.evaluate`):
  - `getComputedStyle(document.documentElement).backgroundColor` is `rgb(18, 6, 31)`;
  - `getComputedStyle(document.body).backgroundAttachment` is not `fixed`;
  - `getComputedStyle(document.body, "::before")` has `position` `fixed` and a
    `background-image` containing `radial-gradient`;
  - after resizing the viewport to 360x900 (simulating the toolbar hiding) and scrolling to the
    bottom, a screenshot clip of the bottom 120px above the footer contains no pure-white
    pixels (`#ffffff`), and the footer is still visible and at `bottom: 0`;
  - no horizontal scroll at 360px and 1280px; `main` has the same `offsetTop` as before the
    change (compare against the `header` height: `main` starts right after `header`).
- `dt-smoke` passes with no console errors.
- Known limit: the real Brave toolbar animation can't be reproduced headless; the owner
  re-checks on the phone after merge.
