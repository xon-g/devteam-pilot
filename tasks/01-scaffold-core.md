# Task 01: scaffold + core logic

Branch: `task/01-scaffold-core`. Read `PLAN.md` first. **No npm dependencies** (no `npm install` of anything).

## Do
1. `package.json`: `"name": "swertres-lucky-numbers"`, `"private": true`, `"type": "module"`,
   scripts: `"start": "node scripts/serve.js"`, `"test": "node --test test/"`. No dependencies.
2. `scripts/serve.js`: static file server using only `node:http`, `node:fs`, `node:path`.
   Serves files from the repo root, `PORT` env (default 4173), `/` → `index.html`, correct
   content types for .html .css .js .png .svg, 404 for missing files, and refuses path
   traversal (any resolved path outside the repo root → 403/404).
3. `index.html`: minimal placeholder for now (`<title>Swertres Lucky Numbers</title>`, `lang="fil"`,
   mobile viewport meta, links `styles.css`, loads `src/app.js` as `type="module"`).
   `styles.css` and `src/app.js` may be near-empty but must load with no console errors.
4. `src/reasons.js`: `export const REASONS = { 0: [...], 1: [...], ..., 9: [...] }`, at least
   3 Taglish strings per digit, playful horoscope style (lucky color/day, numerology vibe),
   e.g. `"7: swerte sa pera ngayong linggo"`-style but without the number prefix. **No** claims
   of better odds or sure wins (no "siguradong panalo", "guaranteed", "mas mataas ang tsansa", etc.).
5. `src/lucky.js` (pure, no DOM; works in browser and Node 24 via `globalThis.crypto`):
   - `randomInt(n)`: uniform integer 0..n-1 using `crypto.getRandomValues` with rejection
     sampling (no `Math.random`, no plain modulo bias).
   - `drawCombo()` → array of 3 digits 0-9.
   - `pickReason(digit)` → a random string from `REASONS[digit]`.
   - `formatStraight(combo)` → `"3-8-1"`.
   - `rambolitoCombos(combo)` → sorted array of unique permutations as strings
     (`[1,1,2]` → `["1-1-2","1-2-1","2-1-1"]`; `[5,5,5]` → `["5-5-5"]`; 3 distinct → 6).

## Acceptance tests (must all pass via `dt-test /home/node/projects/swertres`)
Write `test/lucky.test.js` and `test/serve.test.js` with `node:test` covering:
- `randomInt(10)` over 20 000 calls: every value 0-9 appears, each between 1 600 and 2 400 times.
- `drawCombo()` returns 3 integers 0-9; 50 calls are not all identical.
- `src/lucky.js` source contains `getRandomValues` and does not contain `Math.random`.
- `rambolitoCombos` for `[1,2,3]` (6 items), `[1,1,2]` (3 items above), `[5,5,5]` (1 item).
- `formatStraight([3,8,1]) === "3-8-1"`.
- every digit 0-9 has ≥ 3 non-empty reasons; `pickReason(d)` is always one of `REASONS[d]`.
- banned-phrase scan over `src/reasons.js`: case-insensitive, none of `guarantee`, `sigurado`,
  `siguradong panalo`, `tsansa`, `odds`, `better chance`, `sure win`, `jackpot ka na`.
- server test: start `scripts/serve.js` on a free port as a child process, `GET /` → 200 HTML,
  `GET /src/lucky.js` → 200 with a JavaScript content type, `GET /nope.txt` → 404,
  `GET /../package.json` (raw path) → not 200. Kill the server after.
Also must pass: `dt-smoke /home/node/projects/swertres` → `"ok": true`.

## Report back
Branch name, commit sha, full `dt-test` output, `dt-smoke` JSON. Commit on the branch only.
