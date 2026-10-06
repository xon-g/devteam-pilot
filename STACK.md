# STACK: Swertres Lucky Numbers

Decision (Architect, 2026-10-06, reviewed at the task 02 → 03 boundary): **keep the current stack.**
It is the default for a one-page static site and still fits every requirement in the brief and
the owner's scope additions. No change proposed, no owner approval needed.

## Stack
| Layer | Choice | Version |
| --- | --- | --- |
| Page | Plain HTML + CSS (variables, grid) + JavaScript ES modules, no build step | — |
| Offline/install | Web App Manifest + hand-written service worker (task 04) | — |
| Randomness | `crypto.getRandomValues` + rejection sampling | built in |
| Dev server | `scripts/serve.js` on `node:http` (`npm start`, `$PORT`, default 4173, `BASE_PATH`) | Node 24.21.0 (LTS) |
| Unit tests | `node:test` (`npm test`) | Node 24.21.0 |
| Browser check | Playwright already on the machine (`/usr/local/lib/node_modules/playwright`), not a project dependency; plus `dt-smoke` | 1.63.0, Apache-2.0 |
| Lint/format | none (no build step, no TypeScript; per team defaults) | — |
| Runtime npm dependencies | **none** (no `package-lock.json` needed) | — |

## Why it still fits
- One screen, no routing, no accounts, no data, no server: a framework would add build steps and
  dependencies without removing real work.
- GitHub Pages: static files with relative URLs serve from a subpath as-is; no build output to publish.
- PWA and SEO/Open Graph (tasks 04-05) are a manifest, a service worker and `<meta>` tags; no library helps here.
- The Builder (local model) is most reliable on plain DOM/ES-module code it has seen often.
- Zero dependencies = zero supply-chain surface and nothing to keep updated.

## Facts checked today (2026-10-06)
- `npm view playwright`: 1.63.0, Apache-2.0, last published 2026-10-06; ~418M downloads/month. Maintained and mainstream.
- Node 24.21.0 on the build host; `node:test` is stable.

## When to revisit
Re-evaluate only if the brief grows: multiple screens/routes (→ Astro static), heavy shared UI
state (→ Vite + TypeScript), or accounts/server data (→ SvelteKit/Next.js). Any change goes to
the owner as a proposal first and lands at a task boundary.
