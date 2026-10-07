# devteam-pilot
## Turning on AdSense

Everything is driven by `ads.config.json` (`adsensePublisherId`, `adsEnabled`, `adSlotId`); never edit `ads.txt`, the `<!-- adsense:* -->` head markers or the `<!-- adslot:* -->` slot markers by hand.

1. Set `adsensePublisherId` to `pub-` plus 16 digits, run `npm run ads`, run `npm test`, then open a PR. This writes `ads.txt` and the AdSense script into the head of the home, how-to-play, lucky-numbers, about and contact pages (never privacy or responsible-gaming). No ad is shown yet.
2. After AdSense approves the site, create one ad unit, set `adSlotId` (10 digits) and `adsEnabled: true`, run `npm run ads`, run `npm test`, then open a PR. The unit appears in `#ad-slot`, below the result and above the disclaimer.

With an empty ID nothing ad-related is served. Language variants share one URL, so the sitemap needs no extra entries.
