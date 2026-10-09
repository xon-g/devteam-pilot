# 55 · "More xonicbox tools" from the shared list (live site)
Branch `task/55-more-sites` from master (the live site; the held Astro chain 50–54 gets the same block when it's
rebased). Owner request 2026-10-09: every xonicbox site shows "More xonicbox tools": live sites as links, upcoming
ones "(soon)", read from `https://xonicbox.com/sites.json` (`{version: 1, sites: [{id, name, tagline, url, status}]}`).
The reference implementation is the kit 1.1.0 `more-sites.js` built in xon-g/sulit-leave task 19 (PR #23).
## Do
- `src/more-sites.js`: port of kit 1.1.0 `more-sites.js` (same behaviour: `parseSites`, `loadSites` with a 3 s timeout,
  credentials omitted, fallback on any failure, `moreSitesModel` dropping self `lotto`). Fallback list = the 5 sites
  exactly as in sites.json.
- On every page (index, lucky-numbers, how-to-play, about, contact, privacy, responsible-gaming): a "More xonicbox
  tools" block between the hire card and the footer. Static HTML fallback list in the page (so it works without JS),
  then JS replaces it with the loaded list. Live → link, soon → "Name (soon)". textContent/createElement only.
  Labels in Tagalog/English following the site's existing i18n (`src/i18n.js`).
- Add `/src/more-sites.js` to the service worker shell list and bump its version, as the repo's sw tests require.
- If the site sets a CSP anywhere (meta tag or headers), add `https://xonicbox.com` to `connect-src` only.
## Acceptance (runnable)
- `npm test` passes, incl. unit tests for parseSites/loadSites/moreSitesModel (fake fetch: error, timeout, bad JSON,
  bad version) and a drift test (fallback == fixture copy of the live sites.json).
- Playwright at 360 px (route xonicbox.com/sites.json to the fixture): Sulit Leave PH is a link, KitaKita/Hayag
  Cebu/Clara show "(soon)", Lotto itself isn't listed; with the route failing, the static fallback shows; no horizontal
  scroll. Every page has the block (static test).
- `dt-smoke` passes; no new dependencies; the AdSense/GoatCounter tags and the disclaimer are unchanged.
