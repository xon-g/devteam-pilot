# Task 03 review: copy / share

Head: a3a8003052c3ddf78f486071263bfdcbbe3ca6ef on `task/03-copy-share`

## Summary
`shareText(combo, mode)` in src/lucky.js (straight or all rambolito combos + disclaimer),
`#share` button (disabled until first draw) and `#share-status` (aria-live polite) in index.html,
share handler in src/app.js: `navigator.share` when present, else clipboard; AbortError
(user cancel) is silent; other failures show a short Taglish error. Unit tests in
test/lucky.test.js, Playwright test in test/share.test.js. Builder, after a test fix and a
comment cleanup retry.

## Checked
- Acceptance: unit `shareText([3,8,1],"straight")` exact text with `3-8-1`; rambolito `[1,2,3]`
  contains all 6 combos; banned-phrase scan on share text. Browser at 375x667: share disabled
  before draw; clipboard context (permissions granted, `navigator.share` deleted by init script)
  gets text containing the shown combo and non-empty status; stubbed `navigator.share` called
  once with the combo. Existing banned-phrase scan of index.html + src/*.js still passes;
  disclaimer test from task 02 still passes.
- Test context rule: every browser global read inside `page.evaluate`/`waitForFunction`/init
  scripts; server and browser closed in `finally`.
- Security: no eval/innerHTML, text set via textContent, no network calls, no new dependencies.
- Wording does not imply better odds.

## Results
- dt-test: 17 pass, 0 fail
- dt-smoke: {"ok":true,"status":200,"consoleErrors":[]}

## Known limits
- `#share-status` is not cleared on the next draw (stale "Nakopya na!" stays until next share).
- Error text "Hindi maibahagi" is terse; could add "subukan ulit".
- Real share sheet / clipboard on phones not tested (stubbed in headless Chromium).
