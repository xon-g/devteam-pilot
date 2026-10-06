# Task 06: visual redesign (responsive) + new Taglish catchphrases

Branch: `task/06-redesign` (already created from master; this file is its first commit).
No npm dependencies, no external fonts/images/requests. Read `PLAN.md` (Layout, copy rules,
GitHub Pages rule) and the **test context rule**: browser globals only inside `page.evaluate`.

Owner feedback (2026-10-06): the look is weak, the layout isn't responsive, the phrases are corny.
Current problems seen at 375px and 1280px: digit boxes unevenly spaced (their width follows the
reason text), raw radio buttons, unstyled default "I-share" button, `max-width` on `<body>` makes
the disclaimer a narrow box on desktop, big empty area, no visual hierarchy.

## Keep (tests and app.js depend on them)
Ids `digit-0..2`, `reason-0..2`, `combo-output`, `draw`, `share`, `share-status`, `ad-slot`,
`disclaimer`; classes `.digit`, `.reason`; `input[name="mode"]` radios with values
`straight`/`rambolito`; `#draw` text "Bunot na!"; first-draw prompt still contains "Pindutin";
grid areas `header`/`main`/`banner`/`disclaimer`; ad slot rules; exact disclaimer text;
`prefers-reduced-motion` behaviour. Change `app.js` only if the new markup needs it.

## 1. Copy: replace `src/reasons.js` with exactly this
```js
export const REASONS = {
  0: ["Fresh start, bes. Zero stress muna.", "Walang imposible, charot!", "Reset button ng buhay mo 'to", "Kalma lang, chill lang"],
  1: ["Pwede nang mangarap", "Ikaw ang main character today", "Number one ka sa puso ko, ganern", "Solo flight pero solid"],
  2: ["Meron din naman palang ganda ang buhay", "Dalawa kayo? Sana all!", "Double the good vibes, bes", "Hatian tayo sa merienda"],
  3: ["Third time's the charm, sabi nila", "Laban lang, kapit lang", "Bet na bet ko 'tong energy mo", "It's giving good vibes"],
  4: ["Petmalu ang aura mo today", "Matatag ka, parang bahay ni lola", "Grounded pero G na G", "Push mo 'yan, lodi"],
  5: ["High five sa sarili mo!", "Slay ang energy mo ngayon", "Gitna ka? Ikaw ang balance, bes", "Pak ganern!"],
  6: ["Manifesting good vibes lang", "Dasurv mo ang pahinga at ice cream", "Ang ganda ng gising mo, aminin", "Aura points: +6,000"],
  7: ["Era mo 'to, bes", "Kilig levels: 7/7", "Main character energy unlocked", "Lucky seven, lucky ka sa friends"],
  8: ["Infinite good vibes, parang 8 na nakahiga", "Sana all blessed", "Kaya mo 'yan, werpa!", "Ang aliwalas ng mukha mo today"],
  9: ["Cloud nine ka today, ganern", "Ang taray mo, aminin", "Ikaw na! Ikaw na talaga!", "Lakas ng loob, lakas ng aura"]
};
```
First-draw prompt in `#combo-output`: `G ka na? Pindutin ang Bunot na!`
Add `'panalo'`, `'tatama'`, `'jackpot'` to the banned list in every banned-phrase test.

## 2. Design spec (`styles.css`, `index.html` markup)
Tokens in `:root`:
`--bg:#12061f; --bg-2:#2a0e4a; --gold:#ffc93c; --gold-2:#ff9f1c; --pink:#ff4f8b;
--text:#fff7e8; --muted:#c9b8e6; --line:rgba(255,255,255,.12); --card:rgba(255,255,255,.06);
--radius:20px; --font:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;`
- **Page**: `body` full width (remove `.container` max-width from body), background
  `radial-gradient(120% 80% at 50% 0%, var(--bg-2) 0%, var(--bg) 60%)` with
  `background-attachment: fixed`, `min-height:100dvh`. Content column = `header` and `main`
  each `width:min(100% - 2rem, 34rem); margin-inline:auto`.
- **Header**: small eyebrow line above the title, `Swertres · 3D` (uppercase, letter-spacing
  .2em, `--muted`, .75rem). Title `Swertres <span>Lucky</span> Numbers`, weight 900,
  `font-size:clamp(1.9rem, 7vw, 2.75rem)`, line-height 1.05, letter-spacing -.02em; the span
  has a gold gradient text (`--gold`→`--gold-2`, `background-clip:text`). One-line tagline under
  it in `--muted`: `Tatlong numero, isang tapik. Good vibes lang.`
- **Digits = lotto balls**: wrap the 3 `.digit` in `<div class="balls">` =
  `display:grid; grid-template-columns:repeat(3,1fr); gap:clamp(.75rem,4vw,1.5rem);
  justify-items:center`. Each `.digit`: `width:clamp(84px,24vw,128px); aspect-ratio:1;
  border-radius:50%; display:grid; place-items:center;
  font-size:clamp(2.6rem,11vw,4.25rem); font-weight:900; font-variant-numeric:tabular-nums;
  color:var(--bg-2); background:radial-gradient(circle at 35% 30%, #fff 0%, #fff3c4 35%,
  var(--gold) 70%, var(--gold-2) 100%); box-shadow:0 10px 30px rgba(255,159,28,.35),
  inset 0 -6px 12px rgba(0,0,0,.15)`. Empty ball (before first draw) shows `?` via CSS
  `.digit:empty::before{content:"?";opacity:.35}`. While rolling add class `rolling` to each
  ball (from app.js) → a 120ms wobble keyframe; no animation under reduced motion.
- **Reasons**: no longer under each ball. Below the balls, a card `<ol class="reasons">`
  (background `--card`, 1px `--line` border, `--radius`, padding 1rem) with 3 `<li>` rows; each
  row = a small gold circle (28px) showing that digit (`<span class="mini" id="mini-N">`) + the
  `.reason` text (`id="reason-N"`, 1rem, `--text`, line-height 1.35). Rows separated by a
  `--line` divider. Hidden (`hidden` attribute) until the first draw.
- **Combo output**: centered pill, `--card` bg, 1px `--line` border, radius 999px,
  `padding:.6rem 1.25rem`, gold text, weight 800, letter-spacing .12em, tabular nums;
  wraps nicely in rambolito mode (`text-wrap:balance`, max-width 100%). Prompt state uses
  normal letter-spacing and `--muted`.
- **Mode toggle = segmented control**: `<div class="segmented" role="radiogroup">`, each
  `<label><input type="radio" name="mode" ...><span>Straight</span></label>`. Inputs visually
  hidden (`position:absolute; opacity:0; width:1px; height:1px`), not `display:none`.
  Container: `--card` bg, 1px `--line`, radius 999px, padding 4px, 2 equal columns.
  `span`: block, min-height 44px, centered, radius 999px, `--muted`, weight 700;
  `input:checked + span`: gold background, `--bg` text; `input:focus-visible + span`: 2px
  `--gold` outline offset 2px.
- **Buttons**: `.actions` = grid, gap .75rem, width 100%, max-width 22rem, centered.
  `#draw`: min-height 60px, radius 999px, `linear-gradient(180deg,var(--gold),var(--gold-2))`,
  color `--bg`, 1.35rem, weight 900, shadow `0 10px 24px rgba(255,159,28,.35)`,
  `:active{transform:translateY(1px) scale(.98)}`, `:focus-visible` outline 3px #fff.
  `#share`: min-height 48px, radius 999px, transparent, 1.5px `--line` border, `--text`,
  weight 700; disabled → opacity .45. Both `cursor:pointer`, `font:inherit`.
- **Main**: flex column, `align-items:center`, `gap:1.25rem`, padding-top 1rem, bottom padding
  large enough to clear the disclaimer (`calc(5rem + env(safe-area-inset-bottom))`).
- **Disclaimer**: full viewport width, `position:fixed; inset-inline:0; bottom:0`, background
  `rgba(18,6,31,.92)` + `backdrop-filter:blur(8px)`, top border 1px `--line`, `--muted`
  text .75rem, centered, `padding:.75rem 1rem calc(.75rem + env(safe-area-inset-bottom))`.
  Keep it in grid area `disclaimer` in the markup order.
- **Desktop (≥768px)**: same single column, just larger via the clamps; main gets
  `padding-top:3rem`. No horizontal scroll at any width ≥320px.
- Colours: `index.html` `<meta name="theme-color">` and manifest `theme_color` and
  `background_color` → `#12061f`; update the pinned values in `test/pwa.test.js` and
  `test/seo.test.js` accordingly.
- **Service worker**: bump `CACHE` to `"swertres-v3"` (returning visitors must get the new CSS)
  and update the assertion in `test/seo.test.js`.

## Acceptance tests (`dt-test` must pass; `dt-smoke` ok:true)
Existing tests stay green (only the pinned values named above may change).
Add `test/design.test.js` (Playwright as in `test/ui.test.js`, reducedMotion "reduce"); for each
viewport 320x640, 375x667, 414x896, 768x1024, 1280x800: load, click `#draw`, wait for
`#combo-output` to match `^\d-\d-\d$`, then assert (read all values via `page.evaluate` or
`boundingBox()`, assert in Node):
1. `document.documentElement.scrollWidth <= viewport width`.
2. The 3 `.digit` boxes: equal width (±1px), equal height = width (±1px), same top (±1px);
   the middle ball's centre x within 2px of viewport width / 2.
3. `#draw`, `#share` and both segmented `span`s have height ≥ 44.
4. `#disclaimer` box: x ≤ 0.5, width ≥ viewport width − 1, bottom ≤ viewport height + 0.5;
   after `window.scrollTo(0, document.body.scrollHeight)` the bottom of `#share` is above the
   top of `#disclaimer`.
5. The 3 `.reason` are non-empty, `.reasons` is visible, and `#mini-N` text equals `#digit-N`.
6. Clicking the label text "Rambolito" checks `input[value="rambolito"]` and `#combo-output`
   becomes a comma list of `\d-\d-\d` items; clicking "Straight" restores `^\d-\d-\d$`.
7. Save `.smoke/design-<width>.png` (full page) for each viewport.
Unit test in `test/lucky.test.js`: every digit 0-9 has ≥ 4 reasons, each ≤ 48 characters, and
the list contains "Pwede nang mangarap" and "Meron din naman palang ganda ang buhay".

## Report back
`RESULT:` line first, then branch, head sha, `dt-test` output, `dt-smoke` JSON, and the paths of
the five `.smoke/design-*.png` files.
