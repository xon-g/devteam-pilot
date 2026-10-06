# Task 11: Sound effects during the draw (coins, ding, cashier)

Branch: `task/11-sound-effects`, from `task/10-rename-pcso` (PR #12, not merged yet). This file is
its first commit. No npm dependencies, **no audio files, no external requests**: every sound is
synthesized with the Web Audio API. Read `PLAN.md` (copy rules, banned phrases, relative URLs)
and the **test context rule** (browser globals only inside `page.evaluate`/init scripts; return
values to Node and assert there). Everything from tasks 06, 08, 09, 10 still holds.

Owner request (#devteam, 2026-10-07): "appropriate sound effects through the generation (coins,
cashier, etc.)".

## 1. `src/sound.js` (no DOM access at module load; must import cleanly in Node)
```js
export const SOUNDS = {
  tick:    { freqs: [2400, 3200], type: 'triangle', dur: 0.04, gain: 0.06 },  // coin clink, per roll frame
  ding:    { freqs: [1320],       type: 'sine',     dur: 0.15, gain: 0.10 },  // per settled ball; pitch rises
  chaching:{ freqs: [1800, 2700, 2093, 2637], type: 'triangle', dur: 0.45, gain: 0.12 } // cashier at the end
};
export function createSound(getContext)   // getContext: () => AudioContext-like | null
// returns { play(name, index = 0), setEnabled(bool), isEnabled() }
```
- The context is created **lazily on the first `play()`** (called from the click handler, a user
  gesture), never at load. If `getContext()` returns null or throws, `play` does nothing, forever.
- If `ctx.state === 'suspended'` call `ctx.resume()` (ignore its promise/errors).
- Use only this API surface (the tests fake it): `ctx.currentTime`, `ctx.destination`,
  `ctx.createOscillator()`, `ctx.createGain()`, `osc.type`, `osc.frequency.setValueAtTime(v,t)`,
  `gain.gain.setValueAtTime(v,t)`, `gain.gain.exponentialRampToValueAtTime(v,t)`, `connect()`,
  `osc.start(t)`, `osc.stop(t)`.
- `tick`: both freqs together, start now, gain from `gain` ramping to 0.0001 at `dur`.
- `ding`: frequency `1320 * 1.06 ** index`, same envelope.
- `chaching`: "cha" = 1800 at t, 2700 at t+0.06 (each 0.05 long), then "ching" = 2093 and 2637
  together at t+0.12, decaying over 0.33 (total ≤ 0.45 s).
- Every oscillator stops by `t + dur` (+0.01 max). No gain value above 0.2.
- `play` with an unknown name, or while disabled, does nothing. All of `play` is in try/catch:
  sound can never break or delay a draw.

## 2. Markup + style
In `header`, right after `.tagline`:
`<button id="sound" type="button" class="sound-toggle" aria-pressed="true">🔊 Tunog: On</button>`
Clicking toggles to `aria-pressed="false"` / `🔇 Tunog: Off` and back. Default On; state is
**not stored** anywhere (no localStorage etc.; the privacy test from task 08 must stay green).
Style: small pill, task 06 tokens (`--line` border, `--muted` text, radius 999px), `min-height:44px`,
`focus-visible` gold outline, must not cause sideways scroll at 360px.

## 3. Wiring (`src/app.js`)
`const sound = createSound(() => { const C = window.AudioContext || window.webkitAudioContext; return C ? new C() : null; });`
- Animated path: `play('tick')` once per roll frame (8 frames), `play('ding', i)` as each ball
  settles, `play('chaching')` once after the last ball.
- Reduced-motion path: only `play('chaching')` once.
- Toggle button calls `setEnabled` and updates text/aria-pressed.
- No other behaviour changes (game switch mid-draw, form checks, share text all unchanged).

## 4. Service worker
Add `src/sound.js` to the precache list; bump `CACHE` to `"swertres-v7"`; update the cache-name test.

## 5. Tests
- `test/sound.test.js` (node:test): import works in Node; with a fake context factory recording
  oscillator starts (freq, start, stop) and gain values: `tick` → 2 oscillators at 2400/3200;
  `ding` index 2 → 1320*1.06² (±0.01); `chaching` → 4 oscillators, last stop ≤ 0.46 s after
  start; no gain > 0.2 anywhere; factory not called until first `play`; factory returning null or
  throwing → `play` doesn't throw; `setEnabled(false)` → no oscillators; unknown name → none.
- `test/sound.browser.test.js` (Playwright, 375x812). Use `context.addInitScript` to replace
  `window.AudioContext` with a fake class that pushes to `window.__audio = { created: n, starts: [freq...] }`
  (test-only code; nothing like this in `src/`). Steps:
  1. After load, before any click: `created === 0`.
  2. Pick mood `Chill`, draw Swertres (animated): `created === 1`; count of 2400 starts === 8;
     count of 1320*1.06^i starts for i=0..2 === 3; count of 2093 starts === 1.
  3. Toggle off (text `🔇 Tunog: Off`, aria-pressed false), draw again → no new starts.
     Toggle on, draw → starts again.
  4. Pick Ultra Lotto 6/58, draw → 6 ding starts.
  5. Reduced motion context: draw → 0 ticks, 0 dings, 1 chaching.
  6. Init script that deletes `AudioContext` and `webkitAudioContext`: draw still completes,
     combo shown, no `pageerror`.
  7. 360x740: no sideways scroll; `#sound` box ≥ 44px tall.

## Acceptance (`dt-test` passes, `dt-smoke` ok:true)
1. All tests green; report the count. Run `node --test test/sound.browser.test.js` 3 times, green.
2. Prove the checks bite (apply, run, copy the failure, `git checkout -- <file>`; never commit):
   a. `src/app.js`: create the AudioContext at load → browser step 1 fails.
   b. `src/sound.js`: ignore the enabled flag → unit test and browser step 3 fail.
   c. `src/app.js`: drop the `chaching` call → browser step 2 fails.
3. Diff touches only `index.html`, `styles.css`, `src/`, `sw.js`, `test/`, this task file.

## Report back
`RESULT:` line first, then branch, head sha, `dt-test` summary, `dt-smoke` JSON, the 3 runs,
break messages a-c.
