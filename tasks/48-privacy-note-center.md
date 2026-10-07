# Task 48: Centre the home privacy note

Branch: `task/48-privacy-note-center` from latest `master` (2f4e8a2). This file is its first commit.
Owner report in #devteam (2026-10-07): `#privacy-note` on the home page "isn't centered properly".
Read the **test context rule**. CSS-only fix plus a test; no other visual changes.

## Cause (Architect measurement)
`.about-games p` has `max-width: 65ch` with only `margin-block`, so the note (smaller font, centred text)
is a box narrower than the column, pinned to the left. At 768px the note spans 112–611 while the section
spans 112–656; at 1280px it spans 368–867 vs 368–912. At 360px it fills the column, so it looks fine.

## Do
- In `styles.css`, centre the fine-print box itself: `.about-games p.fine-print { margin-inline: auto; }`
  (keep its `margin-block`). This applies to `#privacy-note`, `-en`, `-tl`, `-ceb`.
- Check the other centred fine-print lines on home and content pages (`#official-results`, `#not-affiliated`,
  `.hire`) for the same problem and fix any with the same pattern. Don't change left-aligned body text.
- `sw.js` `CACHE` → `swertres-v41` (+ `?v=41` pins the og test demands).

## Acceptance tests (`npm test` passes; existing tests change only for version pins)
New `test/fine-print-center.browser.test.js` (DOM reads only inside `page.evaluate`): at 360, 768 and 1280,
for each language (taglish, en, tl, ceb), the visible privacy note's box is centred in `#about-games*`
(|left gap − right gap| ≤ 2px), and so are `#official-results`, `#not-affiliated` and `#hire` within their
containers. Then `dt-test` and `dt-smoke` pass; include a 1280px screenshot of the FAQ end + privacy note.
