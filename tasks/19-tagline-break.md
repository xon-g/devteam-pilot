# Task 19: Put "For fun lang." on its own line in the tagline

Branch: `task/19-tagline-break`, from `task/18-goatcounter` (task 18 is not merged yet and
bumps the service-worker cache to v13; this task stacks on it). This file is its first commit.
No npm dependencies, no external requests. Read `PLAN.md` and the **test context rule**
(browser globals only inside `page.evaluate`). Owner request, #devteam, 2026-10-07.

## Change
- `index.html`, `.tagline` paragraph: keep the exact text but break the line before
  "For fun lang.":
  `<p class="tagline">Lucky numbers para sa Swertres, EZ2, 4D, 6D at Lotto 6/42–6/58.<br>For fun lang.</p>`
- Do not change any meta description, JSON-LD, `llms.txt` or other copy.
- `sw.js`: bump `CACHE` from `swertres-v13` to `swertres-v14` so installed users get the new HTML.

## Acceptance tests (runnable)
1. `npm test` passes (all existing tests, plus the new ones below).
2. New Node test (e.g. in `test/ui.test.js`): reading `index.html`, the `.tagline` paragraph
   contains `6/42–6/58.<br>For fun lang.` and the tagline text appears exactly once.
3. New Node test: `sw.js` contains `swertres-v14`.
4. New Playwright check: at 360px width, inside `page.evaluate`, the `.tagline` element contains
   exactly one `<br>`, and the bounding-box top of the text node "For fun lang." is lower
   than the top of the first text node (i.e. it renders on a separate line). No horizontal
   overflow (`document.documentElement.scrollWidth <= innerWidth`).
5. `dt-smoke` passes.
