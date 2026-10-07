# Task 33: smoother, more fluid animations

Branch: `task/33-smooth-animations`, from `master`. This file is its first commit. No npm
dependencies, no image files, no external requests, no animation libraries. Read `PLAN.md` and the
**test context rule** (browser globals only inside `page.evaluate`). Owner request, #devteam,
2026-10-07: "Anyway you can make the animations smoother or more fluid?"
(Numbered 33 because 27–32 are reserved for phase 2.)

## What is jerky today
- `.digit.rolling` uses `wobble 120ms infinite` with hard ±10° steps, so the balls look like they're shaking.
- `draw()` in `src/app.js` changes numbers at a fixed 70ms for 8 frames, then each ball snaps to
  its final number with no motion.
- The "Para kay", roast, and reasons blocks appear instantly (`hidden` toggled), and the pills/buttons have no
  hover/press transitions.

## Change
- `styles.css`
  - Replace `wobble` with a gentle tumble: keyframes that animate **only `transform`** (a small
    translateY bob + ≤6° rotate), duration 360–600ms, `ease-in-out`, `infinite`.
    `will-change: transform` only while `.rolling`.
  - New `.digit.landed` "pop" landing: `@keyframes` on `transform` (and optionally `opacity`) only, about 260–360ms,
    overshoot easing such as `cubic-bezier(.34,1.56,.64,1)` (scale ~1.12 → 1).
  - Fade/slide-in (`opacity` 0→1, `translateY(6px)`→0, about 220–320ms, ease-out) for `#for-name`, `#roast`,
    and `.reasons` when they are shown. Use a class or `@starting-style`/animation on show; `hidden` must still really hide them.
  - Game/mood pills, the Bunot na button and the share button: `transition` on
    `background-color, color, border-color, box-shadow, transform` 150–200ms ease; `:active` press
    `transform: scale(.97)`. Never transition `width/height/top/left/margin/padding`.
  - Extend the existing `@media (prefers-reduced-motion: reduce)` block so the tumble, landing, and fade-ins all become
    `animation: none` and the transitions become `transition: none`.
- `src/app.js` (`draw()`), non-reduced-motion path only:
  - Roll with **decelerating** frame delays (e.g. ~45ms rising to ~140ms with an ease-out curve,
    about 10–12 frames, total roll 0.8–1.2s). Keep one `sound.play('tick')` per frame.
  - Settle left to right: set the final number, remove `rolling`, add `landed` (remove it and
    force reflow before re-adding so it replays on every draw), keep `sound.play('ding', i)`,
    stagger 110–150ms. Whole draw (click → last ball landed) ≤ 2.0s for 6 balls.
  - Reduced-motion path unchanged (instant result, no classes added).
  - Don't change the draw logic, the randomness, the sounds, the analytics, or the share flow.
- `sw.js`: bump `CACHE` from `swertres-v20` to `swertres-v21` (update tests that pin it).

## Acceptance tests (runnable)
1. `npm test` passes (all existing tests still green).
2. New Playwright `test/animations.browser.test.js` (375 and 1280 wide):
   a. Inside `page.evaluate`, walk `document.styleSheets` and return every `@keyframes` rule's
      animated property names. Assert in Node: only `transform` and `opacity` appear.
   b. Start a Swertres draw; while rolling, return `getComputedStyle(ball).animationDuration` and
      `animationTimingFunction` of a `.digit.rolling`. Assert duration ≥ 0.36s and ≤ 0.6s and timing
      not `linear`.
   c. Record `Date.now()` at click and poll until all balls have `.landed` and none `.rolling`; for 6/58
      assert elapsed ≤ 2000ms; assert each ball's `animationName` is the landing keyframes name.
   d. Draw twice: the second draw replays the landing (`animationName` is the landing name again
      after the second draw, and `.landed` was absent during the roll).
   e. After the draw, `.reasons`, `#roast` (if it has items) and `#for-name` (if it has a name) are visible with
      final computed `opacity` "1" (wait for `animationend`, or poll for ≤ 600ms).
   f. A game pill and the Bunot na button have a `transitionProperty` that includes `transform`
      and `transitionDuration` > 0 and ≤ 0.2s.
   g. With `page.emulateMedia({ reducedMotion: 'reduce' })`: a draw finishes in ≤ 300ms, every
      `.digit` has `animationName` "none", and pills have `transitionDuration` "0s".
   h. No horizontal overflow (`scrollWidth <= clientWidth`) during and after a draw at 375.
3. `dt-smoke` passes with no console errors.
