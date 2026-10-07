# Task 20: Cloudflare Worker name

Cloudflare Workers Builds expects the Worker to be named `lotto`, but `wrangler.jsonc`
says `devteam-pilot`, so every build warns and overrides the name.

## Change
- `wrangler.jsonc`: `"name": "lotto"`; `test/cloudflare.test.js` expects `lotto`. Nothing else.

## Acceptance (runnable)
- `node -e "const c=require('fs').readFileSync('wrangler.jsonc','utf8');if(JSON.parse(c).name!=='lotto')process.exit(1)"`
- `npm test` passes.
