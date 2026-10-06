# Task 13: SEO + AI-search (AIO) optimization

Branch: `task/13-seo-aio` (from latest `master`). **No npm dependencies.** Read `PLAN.md`
(GitHub Pages rule: relative paths, site lives under `/devteam-pilot/`).

Origin (single source, already in the `<head>` comment): `https://xon-g.github.io/devteam-pilot/`.

Goal: search engines and AI answer engines (Google, Bing, ChatGPT/Perplexity/Claude search) can
read, understand and quote the page without running JavaScript. Today the page is almost all
interactive widgets with very little crawlable text, and the header still says "Swertres · 3D".

## Do
1. **Head tags** (update the existing ones, keep each exactly once):
   - `<title>` ≤ 60 chars, contains "PCSO" and "Lucky Number Generator", e.g.
     `PCSO Lucky Number Generator – Swertres, EZ2, Lotto`.
   - `meta description` 70–160 chars: free random number generator for the PCSO games, fun only.
   - `og:title` = `twitter:title` = `<title>`; `og:description` = `twitter:description` = description.
   - Keep canonical, robots, og:image etc. as they are.
2. **Header**: the eyebrow "Swertres · 3D" is stale → static text `Lucky Number Generator`.
   Exactly one `<h1>` (keep "PCSO Lucky Numbers").
3. **Crawlable content**, a new `<section id="about-games">` placed **after `</main>` and before
   the ad slot / footer** (the app stays first on screen), plain static HTML, Taglish ok, short:
   - `<h2>` intro (1–2 sentences: what the tool does — random numbers for fun, picks by mood/name/age, not a prediction).
   - `<h2>` "Mga laro" + one `<li>` per game in `GAMES` (`src/games.js`), in the same order, each
     with the exact `name` from `GAMES` and its format derived from the data, e.g.
     "Swertres (3D): 3 digits, 0–9 bawat isa", "EZ2 (2D): 2 numbers, 1–31",
     "Ultra Lotto 6/58: 6 numbers, 1–58, walang ulit". **No draw schedules, prize amounts or
     claims about PCSO** (they change and we can't verify them).
   - `<h2>` "FAQ" with 5–6 `<details><summary>question</summary><p>answer</p></details>`:
     what it is; is it free; does it predict / help you win (answer: no, purely random — say it
     without the banned words); which games; is it official PCSO (no, not affiliated); is my name/age stored or sent anywhere
     (check `src/profile.js` and answer truthfully).
   Answers: 1–3 plain sentences, self-contained (AI engines quote single answers).
   Style it with existing CSS variables; readable on mobile; no layout shift for the app above.
4. **Structured data**: in `<head>`, `<script type="application/ld+json">` blocks (static JSON, no JS generation):
   - `WebApplication`: `name`, `url` (= origin), `description` (= meta description),
     `applicationCategory` "EntertainmentApplication", `operatingSystem` "Any", `inLanguage`
     `["fil","en"]`, `isAccessibleForFree` true, `offers` {`@type` Offer, `price` "0", `priceCurrency` "PHP"}.
   - `FAQPage` whose `mainEntity` questions/answers are **exactly** the visible FAQ text (same order).
5. **`sitemap.xml`** at repo root: one `<url>` with `<loc>` = origin and `<lastmod>` (YYYY-MM-DD).
   **`robots.txt`**: keep allow-all, add `Sitemap: https://xon-g.github.io/devteam-pilot/sitemap.xml`.
6. **`llms.txt`** at repo root (llmstxt.org format): `# PCSO Lucky Numbers`, a `>` one-line
   summary, short sections: what it is, the games (same list/format as step 3), the FAQ answers
   in brief, the disclaimer sentence verbatim, and the origin URL.
7. `sw.js`: `index.html` changed → bump `CACHE` to `swertres-v9` (update the test that pins it).
   Don't precache sitemap/robots/llms.txt.
8. Update `test/pwa.test.js` relative-URL check only as far as needed: absolute URLs stay
   allowed only in canonical/og/twitter tags and JSON-LD; everything else relative.

## Acceptance tests (`dt-test` passes, `dt-smoke` ok:true)
New `test/seo-aio.test.js` (node, string/regex parsing, no deps):
- title ≤ 60, contains "PCSO" and "Lucky Number Generator"; description 70–160; og/twitter
  title & description equal title/description; each tag present exactly once.
- exactly one `<h1>`; `#about-games` exists after `</main>` and has ≥ 3 `<h2>`; eyebrow text is
  `Lucky Number Generator` (no "Swertres · 3D" left in index.html).
- every `GAMES` entry (imported from `src/games.js`) appears in `#about-games` with its exact
  `name`, in order, and its count and min–max numbers appear in the same `<li>`.
- every `ld+json` block `JSON.parse`s; WebApplication has all fields above with `url` = origin
  and `offers.price` "0"; FAQPage question/answer count = visible `<details>` count (5–6) and each
  `name` / `acceptedAnswer.text` equals the visible summary / answer text (whitespace-normalized).
- `sitemap.xml`: exactly one `<loc>` = origin, `<lastmod>` matches `^\d{4}-\d{2}-\d{2}$`.
- `robots.txt` contains the exact `Sitemap:` line and no `Disallow: /`.
- `llms.txt` starts with `# `, has a `> ` line, contains origin, the exact disclaimer sentence,
  and every `GAMES` name.
- banned-phrase scan (same list as `test/seo.test.js`, exact disclaimer sentence excluded) over
  `#about-games` text, all JSON-LD strings, and `llms.txt`: passes.
- no `/Users/` or other host paths in any new file.
Browser (`test/seo-aio.browser.test.js`, Playwright; browser globals only inside `page.evaluate`):
- with **JavaScript disabled** (`javaScriptEnabled: false` context), the FAQ summaries and the
  games list text are present in the page.
- with JS on: clicking a FAQ `<summary>` opens it; app still draws numbers (existing flow);
  no console errors; at 375px width no horizontal scroll (`scrollWidth <= innerWidth`).
- all previous tests still pass (update only the `CACHE` pin and the allowed-absolute-URL list).

## Report back
Branch, sha (`git log -1`), full `dt-test` output, `dt-smoke` JSON.
