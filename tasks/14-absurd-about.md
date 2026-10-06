# Task 14: Absurd "Tungkol sa" lore

Branch: `task/14-absurd-about`, from latest `master`. This file is its first commit.
No npm dependencies, no external requests. Read `PLAN.md` (copy rules, banned phrases).

Owner request (#devteam, 2026-10-07): "Make the Tungkol sa Lucky Number Generator so absurd it
would be stupid to believe it ... mensahe mula sa mga anghel at diwata, kalawakan, etc."
Decision: the lore is obvious parody, and a plain "Ang totoo:" paragraph right after it keeps
the honest, crawlable statement (SEO/AIO and responsible-play). Copy below is final; use it exactly.

## 1. `index.html`, `#about-games`
Replace the single `<p>` under `<h2>Tungkol sa Lucky Number Generator</h2>` with these two
paragraphs (nothing else in the section changes; games list and FAQ stay identical):

```html
<p class="lore">Ayon sa aming mga mapagkakatiwalaang source (wala), bawat numero rito ay ipinapadala tuwing alas-tres ng madaling-araw ng Konseho ng mga Anghel, Diwata at Isang Kapreng Naka-tsinelas, na nagpupulong sa likod ng buwan. Ibinubulong muna ito sa isang kalabaw na nakatira sa singsing ng Saturn, isinusulat ng isang retiradong bulalakaw sa dahon ng saging, binabasbasan ng isang sirena habang nagkakaraoke, at saka ipinapasa sa Wi-Fi ng kapitbahay mo. Bago lumabas sa screen, tinitikman pa ito ni Lola Diwata, na nagbabasa ng latak ng kape mula pa noong panahon ng mga dinosaur.</p>
<p>Ang totoo: random na numero lang ito na ginagawa ng browser mo, para sa saya lang. Maaari kang pumili ayon sa mood, pangalan at edad, pero hindi ito hula sa resulta ng bola.</p>
```

## 2. `styles.css`
Add `.about-games .lore { font-style: italic; }` (only rule; keep existing styles).

## 3. Leave factual copies factual
`llms.txt`, JSON-LD and meta tags stay unchanged (AI summaries must not repeat the lore as fact).

## 4. Cache
`sw.js`: `CACHE` → `"swertres-v10"`; update the CACHE check in `test/seo.test.js` to v10
(fix its stale message too).

## Acceptance tests (runnable)
- `dt-test` passes, including existing `test/seo-aio.test.js` (banned phrases, ≥3 `<h2>`, FAQ = JSON-LD).
- Add to `test/seo-aio.test.js`: `#about-games` contains `p.lore` with "Kapreng Naka-tsinelas" and
  "Lola Diwata"; the paragraph after it starts with "Ang totoo:" and contains
  "hindi ito hula sa resulta ng bola"; `llms.txt` does not contain "Kapre" or "Diwata".
- `dt-smoke` passes; on 360px and 1280px the lore paragraph is visible with no horizontal scroll
  (Playwright, measure inside `page.evaluate`).
