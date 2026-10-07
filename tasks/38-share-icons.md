# Task 38: Brand icons on the share buttons

Branch: `task/38-share-icons` from latest `master` (e61ebd1). This file and the vendored SVGs are its
first commit. Owner request in #devteam (2026-10-07): "Share socmed buttons should have their brand icons".
Read `PLAN.md` and the **test context rule** (pure logic in DOM-free modules tested in Node; browser
globals only inside `page.evaluate`). No npm dependencies, no icon fonts, no external requests, no
`<img>` hotlinks. Don't restyle anything outside `.share-row`.

## Source icons (already committed on this branch)
`assets/icons/brands/{facebook,messenger,viber,whatsapp,telegram,x}.svg` from Simple Icons 16.34.0
(CC0-1.0, `assets/icons/brands/LICENSE-simple-icons.md`). Use these path data exactly; don't redraw.

## Do
1. In `index.html`, put an **inline** `<svg>` before the text of each share link: copy the `<path d>`
   from the matching file, `viewBox="0 0 24 24"`, `width="20" height="20"`, `aria-hidden="true"`,
   `focusable="false"`, class `share-icon`, no `<title>`. Keep the visible text label after it
   (Facebook, Messenger, Viber, WhatsApp, Telegram, X, Copy link, Save image), so the accessible
   name stays the plain label.
2. Icon colour (`fill` on the svg via CSS, per `data-share`): fb `#0866FF`, msgr `#0866FF`,
   viber `#7360F2`, wa `#25D366`, tg `#26A5E4`, x `currentColor` (the site is dark; black X would vanish).
3. Copy link: a simple inline "link" glyph (two chain links, stroke `currentColor`, 24×24 viewBox,
   draw it yourself in ≤ 3 paths). Save image: a simple "download" glyph (arrow into tray), same style.
4. CSS in the `.share-row` block only: `gap: 0.4rem` between icon and label, icon `flex: none`. Tap
   targets stay ≥ 44px tall; no horizontal scroll at 360px; the row may wrap.
5. Bump `sw.js` `CACHE` to `swertres-v31`. Don't add the brand SVG files to `ASSETS` (they're inlined).
6. Add `assets/icons/brands` to `.assetsignore` (source files only; the site uses the inlined copies).

## Acceptance tests (runnable: `npm test` must pass in full)
Extend `test/share-row.browser.test.js` (Playwright, all DOM reads inside `page.evaluate`/`$$eval`):
- After a draw, every `#share-row [data-share]` contains exactly one `svg.share-icon` with
  `aria-hidden="true"`, and its rendered width and height are both 20px.
- Each element's `textContent.trim()` still equals its label (existing labels assertion keeps passing).
- Computed `fill` of the fb icon is `rgb(8, 102, 255)`, wa `rgb(37, 211, 102)`, tg `rgb(38, 165, 228)`,
  viber `rgb(115, 96, 242)`; the x icon's fill equals the link's computed `color`.
- At 360px viewport width: `document.documentElement.scrollWidth <= 360`, and every visible share
  control is ≥ 44px tall (existing check keeps passing).
New Node test `test/share-icons.test.js` (reads files only):
- For each of the six brands, the `d` attribute in `assets/icons/brands/<slug>.svg` appears verbatim
  inside `index.html`.
- `index.html` has no `<img` inside `#share-row`, and no `https://` URL in any `<svg` inside it.
- `sw.js` CACHE is `swertres-v31`.
Then `dt-test` and `dt-smoke` pass; include a 360px screenshot of the drawn share row in your report.
