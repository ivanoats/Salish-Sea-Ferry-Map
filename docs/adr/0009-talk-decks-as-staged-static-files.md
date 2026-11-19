# ADR 0009: Serve talk decks as static files staged at build time

- Status: Accepted
- Date: 2026-10-22
- Reconstructed from: PRs #75 and #76, `scripts/copy-talks.mjs`, `next.config.ts`

## Context

The project's CUGOS lightning talk is a self-contained reveal.js deck, with its
own HTML, CSS, JavaScript and images. It should be reachable at a stable URL on
the map's own domain (`/talks/cugos`), and its source should stay in the
repository next to the code it describes. Rebuilding it as React pages would
mean maintaining two versions of the slides.

## Decision

- Keep each deck's source in `talks/<folder>/web/`. That folder is the only
  copy in git.
- At `npm run dev` and `npm run build`, `scripts/copy-talks.mjs` copies each
  deck into `public/talks/<slug>/`. `public/talks/` is gitignored, the same
  way the staged MapLibre worker in `public/maplibre/` is.
- `next.config.ts` rewrites the bare `/talks/<slug>` path to its
  `index.html`, since Next serves `public/` files by exact path only.
- The decks are outside the C4 model. They are static assets served by the web
  app, and they don't import application code.

## Consequences

- Adding a talk means adding an entry to `TALKS` in `copy-talks.mjs` and a
  matching rewrite in `next.config.ts`.
- The build fails early if a registered deck has no `index.html`, rather than
  deploying a link that 404s.
- Deck assets ship with every deploy and count toward the site's page weight
  only when someone opens a deck.

## Evidence

- PR #75 added the deck under `talks/2026-10-cugos/`. PR #76 added the
  staging script and the rewrite.
- `package.json` runs `npm run talks` in both `dev` and `build`.
