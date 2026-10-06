# Task 03: Copy / Share

Branch: `task/03-copy-share`. Builds on task 02. No npm dependencies.

## Do
1. `src/lucky.js`: `shareText(combo, mode)` → Taglish text with the combo in the chosen
   format, e.g. `"Swertres lucky numbers ko: 3-8-1 (Straight) 🍀 For entertainment only. 18+."`;
   rambolito lists all combos. Must not imply better odds.
2. `<button id="share">` (disabled until the first draw). On tap: if `navigator.share` exists use
   it; otherwise `navigator.clipboard.writeText`. Show a short Taglish status in `#share-status`
   (`aria-live="polite"`), e.g. "Nakopya na!"; on failure, a friendly error. User cancel of the
   share sheet is not an error.

## Acceptance tests (`dt-test` must pass; `dt-smoke` ok:true)
- unit: `shareText([3,8,1],"straight")` contains `3-8-1`; rambolito for `[1,2,3]` contains all 6
  combos; output passes the banned-phrase scan (exact disclaimer sentence excluded).
- browser (375x667, context permissions `clipboard-read`,`clipboard-write`, `navigator.share`
  removed via `addInitScript`): `#share` disabled before draw; after draw + click, clipboard text
  contains the shown combo and `#share-status` is non-empty. With a stubbed `navigator.share`
  that records its argument, clicking calls it once with text containing the combo.
- banned-phrase scan (disclaimer sentence excluded) over `index.html` and `src/*.js` still passes; disclaimer still visible.

## Report back
Branch, sha, `dt-test` output, `dt-smoke` JSON.
