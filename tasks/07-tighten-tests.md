# Task 07: tighten the task 06 tests

Branch: `task/07-tighten-tests` (already created from master; this file is its first commit).
**Tests only.** Do not change `index.html`, `styles.css`, `src/`, `sw.js` or the manifest.
No npm dependencies. Test context rule: browser globals only inside `page.evaluate`.

Review of task 06 found three tests that can pass when the app is wrong. Fix them.

## 1. Catchphrase data test: import the module, don't regex the source
- Delete the `lucky.js REASONS content` test from `test/design.test.js` (and the `fs` import if
  nothing else uses it).
- Add to `test/lucky.test.js`: `import { REASONS } from '../src/reasons.js';` then assert:
  - `Object.keys(REASONS)` sorted equals `['0','1',...,'9']`.
  - for each digit: `Array.isArray(REASONS[d])`, `REASONS[d].length >= 4`, every item is a
    `string`, `item.trim().length > 0`, `item.length <= 48`, and no duplicates within the digit
    (`new Set(list).size === list.length`).
  - `Object.values(REASONS).flat()` includes `"Pwede nang mangarap"` and
    `"Meron din naman palang ganda ang buhay"` (exact items, not substrings of the file).

## 2. Mode toggle: click the visible label text, like a user
In `test/design.test.js` step 6, replace both `page.check(...)` calls with clicks on the visible
text: `await page.locator('.segmented span', { hasText: /^Rambolito$/ }).click();` (same for
`Straight`). After each click assert in Node:
`await page.isChecked('input[name="mode"][value="rambolito"]') === true` (resp. `straight`) and
the other is unchecked, then the existing `#combo-output` format checks.

## 3. Disclaimer: must be on screen and pinned to the bottom
Replace the step 4 disclaimer bottom assertion (currently `bottom >= vh - 0.5`, which passes
when the disclaimer is pushed below the screen). Write a helper that, given the rect, asserts
`top >= 0`, `bottom <= vh + 0.5` and `bottom >= vh - 1`, plus the existing `left <= 0.5` and
`width >= vw - 1`. Call it **before and after** `window.scrollTo(0, document.documentElement.scrollHeight)`.
Keep the "bottom of `#share` <= top of `#disclaimer`" check after scrolling.

## Acceptance (`dt-test` passes, `dt-smoke` ok:true)
1. All tests green on the unchanged app; test count reported.
2. Prove each tightened check bites. For each break below: apply it temporarily, run
   `node --test <file>`, copy the failing assertion message into your report, then
   `git checkout -- <file>` to undo. **None of these breaks may be committed.**
   - a. `src/reasons.js`: add a 49-character string to digit 3 → lucky test fails.
   - b. `src/reasons.js`: remove one item from digit 5 (leaving 3) → lucky test fails.
   - c. `index.html`: unwrap the Rambolito radio from its `<label>` (keep the `<input>` and the
     `<span>Rambolito</span>` as siblings, no label) → clicking the text no longer checks the
     input, so the toggle test fails.
   - d. `styles.css`: change the disclaimer `position:fixed` to `position:static` → disclaimer
     test fails at 1280x800 (or report at which viewports it fails).
3. `git diff --stat master...HEAD` only lists files under `test/` plus this task file.

## Report back
`RESULT:` line first, then branch, head sha, `dt-test` output (summary lines), `dt-smoke` JSON,
and the four failure messages from acceptance 2 (a, b, c, d).
