# Task 21: Favicon: the yellow lotto ball

Branch: `task/21-favicon`, from `master`. This file is its first commit. No npm dependencies,
no external requests. Read `PLAN.md` and the **test context rule** (browser globals only
inside `page.evaluate`). Owner request, #devteam, 2026-10-07: "Add a favicon. Same yellowish
circle as with the lotto numbers."

## Look
Match the `.digit` ball in `styles.css`: a circle filled with
`radial-gradient(circle at 35% 30%, #fff 0%, #fff3c4 35%, #ffc93c 70%, #ff9f1c 100%)`.
Plain ball, no digit or text, transparent background outside the circle.

## Change
- `assets/icons/favicon.svg`: hand-written SVG, `viewBox="0 0 64 64"`, one `<circle>` filling
  the box (r ≈ 31) with a `<radialGradient>` using the four stops above (cx/cy ≈ 35%/30%,
  r ≈ 75%). No scripts, no external refs. Keep it small (< 1 KB).
- `assets/icons/favicon-32.png`: 32×32 PNG of the same SVG, plus `favicon.ico` at the
  repo root (a single 32×32 PNG wrapped in an ICO container; browsers ask for `/favicon.ico`).
  Generate both with a new `scripts/make-favicon.js` that uses the same Playwright import as
  `scripts/make-icons.js` for the PNG and writes the ICO header by hand with `Buffer`
  (6-byte ICONDIR + 16-byte ICONDIRENTRY + the PNG bytes). Commit the generated files.
- `index.html` `<head>`, next to the manifest link, using relative paths (site also runs
  under `/devteam-pilot/`):
  `<link rel="icon" href="assets/icons/favicon.svg" type="image/svg+xml">`
  `<link rel="icon" href="assets/icons/favicon-32.png" type="image/png" sizes="32x32">`
- `sw.js`: add `assets/icons/favicon.svg` and `assets/icons/favicon-32.png` to the precache
  list and bump `CACHE` from `swertres-v14` to `swertres-v15`.
- Do not change the existing PWA icons, the manifest, or any copy.

## Acceptance tests (runnable)
1. `npm test` passes (all existing tests, plus the new ones below).
2. New Node test `test/favicon.test.js`:
   - `index.html` has both `<link rel="icon">` tags above, with relative hrefs (no leading `/`).
   - `favicon.svg` parses as text containing `<svg`, `radialGradient`, `#ffc93c` and
     `#ff9f1c`, contains no `<script` and no `http` other than the SVG xmlns, is < 1024 bytes.
   - `favicon-32.png` starts with the PNG signature and its IHDR width and height are 32.
   - `favicon.ico` starts with bytes `00 00 01 00 01 00`, the entry says 32×32, and the
     embedded image starts with the PNG signature at the offset the entry gives.
   - `sw.js` contains `swertres-v15`, `assets/icons/favicon.svg` and `assets/icons/favicon-32.png`.
3. New Playwright check: load the page, then in `page.evaluate` return the hrefs of
   `link[rel="icon"]`; in Node, fetch each (same origin) and assert status 200 and content
   types `image/svg+xml` and `image/png`. Also fetch `/favicon.ico` → 200.
4. `dt-smoke` passes with no console errors.
