# Salish Sea Ferry Map

Live at **<https://salishseaferrymap.com/>**.
[![Netlify Status](https://api.netlify.com/api/v1/badges/b0b761aa-2acb-41c3-93d1-a54f398c1245/deploy-status)](https://app.netlify.com/projects/salish-sea-ferry-map/deploys)

Architecture and ADR docs live in [`docs/`](./docs/).

## Why this exists

I'm a transportation nerd, and I went looking for a good map of ferry routes around the Salish Sea — car ferries and passenger-only, every operator, one map. It doesn't exist. WSF publishes its own routes, BC Ferries publishes its own, and so does everyone else — Black Ball, Kitsap Transit, the Victoria Clipper, Skagit County, Whatcom County — each on its own site, in its own format. If you want to see all your options at once, you piece it together by hand.

I plan a lot of bike-and-ferry trips — this map exists so I can look at a loop like Kingston to Bainbridge Island and see every leg of it, across every agency, at a glance.

It's also drawn at the scale I actually think in. I see this region as the Salish Sea before I see it as Washington or British Columbia, and the map follows that: one shape, one border-crossing sea, not a set of state and provincial fragments.

## What it covers

An interactive map of every ferry route across the Salish Sea — Puget Sound, the Strait of Georgia, and the Strait of Juan de Fuca — spanning both car and passenger-only service:

- **Washington State Ferries (WSF)** — all 8 active routes plus the currently-suspended Anacortes–Sidney, BC run
- **BC Ferries** — every route within the Salish Sea proper: the three major Strait of Georgia crossings, the Sunshine Coast/Howe Sound routes, the Southern Gulf Islands, and the smaller central-Vancouver-Island crossings
- **Black Ball Ferry Line** — the MV *Coho*, Port Angeles ↔ Victoria
- **Kitsap Transit** — the Bremerton, Kingston, and Southworth fast passenger ferries to Seattle
- **Pierce County** — the Steilacoom ↔ Anderson Island car ferry, with the Ketron Island stop by request
- **Victoria Clipper** — Seattle ↔ Victoria, passenger only
- **Skagit County** — the Guemes Island ferry
- **Whatcom County** — the *Whatcom Chief*, Gooseberry Point ↔ Lummi Island
- **Puget Sound Express** — Port Townsend ↔ Friday Harbor, passenger only, seasonal
- **Harbor Hopper** — the Ports of Everett and South Whidbey's summer foot ferry, Everett ↔ Langley
- **Hat Island Ferry** — the *Another Holiday*, Everett ↔ Hat Island (Gedney)

## Route diagram

[`/schematic`](https://salishseaferrymap.com/schematic) draws the same routes as an octolinear diagram, in the spirit of Beck's London Underground map. Every leg runs at a multiple of 45°, the terminals are spaced out by hand, and routes that share a corridor run side by side in parallel lanes. For "what connects to what, on whose boats, and where do I change," true geography is mostly noise. The places where that question is hardest to answer on the real map are the San Juans, the Southern Gulf Islands, and Seattle's six-route waterfront, and the diagram gives each of them room.

It reads the same route records as the map. The only extra data is `src/data/schematic-layout.ts`. It gives each terminal a grid position, a short label, and which side the label sits on, and it holds the land: hand-drawn 45° coastlines with softened corners, the way Beck drew the Thames. When you add a terminal, place it there as well: `src/data/__tests__/schematic-layout.test.ts` fails until every terminal has a place, and it also fails if a leg leaves the 45° grid, runs through a terminal it doesn't stop at, or crosses land, or if a terminal ends up away from the coast. Lane order through shared corridors is worked out in `src/domain/schematic.ts`: each pair of routes is followed to where they part, so lines don't cross inside a bundle. See [ADR 0006](./docs/adr/0006-octolinear-diagram-as-separate-page.md).

## Stack

Next.js 16 (App Router) · TypeScript · [PandaCSS](https://panda-css.com) with the [Park UI](https://park-ui.com) preset · [Ark UI](https://ark-ui.com) for accessible primitives (the operator filter checkboxes) · [MapLibre GL JS](https://maplibre.org) for the map.

The codebase follows a light hexagonal layout, consistent with this author's other Salish Sea projects (`salish-nav-planner`, `reciprocal-clubs`):

```
src/domain/    — types (Operator, Terminal, FerryRoute) and pure helpers (GeoJSON builders, schematic layout)
src/data/      — the static dataset: operators.ts, terminals.ts, routes.ts, schematic-layout.ts
src/components/
  map/         — the MapLibre component and its constants
  schematic/   — the SVG route diagram and its page shell
  panels/      — the operator filter
  layout/      — the app shell and the sidebar pieces both pages share
src/app/       — Next.js routes
```

## Getting started

```bash
npm install --legacy-peer-deps --ignore-scripts
npm run dev
```

Then open http://localhost:3000.

Two flags are needed there, both upstream quirks rather than anything specific to this repo:

- `--legacy-peer-deps` works around an npm 10 bug (`Cannot read properties of null (reading 'edgesOut')`) triggered by vitest 4's peer-dependency graph. Safe here — nothing in this project actually has conflicting peer requirements.
- `--ignore-scripts` skips `@park-ui/panda-preset`'s own broken `postinstall` (it tries to rebuild itself with `bun`/`tsup`, which aren't part of its published dependency tree — the prebuilt `dist/` it ships is what actually gets used regardless). This also skips this project's own `postinstall`, so run `npm run maplibre-worker` once by hand afterward (or just run `npm run dev` / `npm run build`, which both do it automatically as their first step).

`npm run dev` and `npm run build` both run `scripts/copy-maplibre-worker.mjs` first — MapLibre's default worker-URL resolution doesn't survive Turbopack bundling, so the worker script — and the `maplibre-gl-shared.mjs` chunk it imports, without which the worker silently fails to start and every GeoJSON layer renders blank — is staged into `public/maplibre/` and pointed at directly (see the comment in `ferry-map.tsx`).

## Data approach

Route lines and terminal coordinates are a **static, hand-curated dataset** (`src/data/`), compiled from each operator's own route pages and cross-checked against Wikipedia, in September 2026. This keeps the map fast and reliable without depending on feeds that several of these operators (BC Ferries, Black Ball, the county ferries) simply don't publish.

Coordinates are dock-level approximations. Route legs prefer vendored ferry-route geometry from OSM (`data/salish-osm-ferry-routes.json`), fall back to mesh-baked geometry through navigable water (`src/data/route-leg-geometry.ts`, generated by `npm run build-route-geometry` from the vendored build-time datasets in `data/`), and fall back again to straight lines where neither source can serve a terminal pair. Those geometries are mapped approximations rather than charted tracks. **This map is not for navigation.**

The "WSF vessel positions (beta)" toggle adds a live layer on top of that static base, using WSDOT's public [Vessel Locations API](https://wsdot.wa.gov/traffic/api/) — the only operator in this dataset that publishes one. To enable it:

1. Request a free access code at <https://wsdot.wa.gov/traffic/api/>.
2. Create `.env.local` (see `.env.example`) with `WSF_API_KEY=<your code>`.
3. Restart `npm run dev`.

Without a key, the toggle still works — it just shows a note that live data isn't configured, and everything else on the map is unaffected. The key is only ever used server-side (`src/app/api/vessels/route.ts` proxies the WSDOT call), never sent to the browser. BC Ferries, Black Ball, and the county ferries don't expose an equivalent public feed, so they stay static-only.

## Known gaps / v2 ideas

- **PDF export** — the project brief calls for a printable map alongside the web app; this v1 ships the web app first (see the parent project notes).
- **Schedules/fares** — intentionally out of scope for v1, which is a route map, not a trip planner.

## Testing

```bash
npm run build-route-geometry   # refresh src/data/route-leg-geometry.ts from data/*
npm run test        # vitest
npm run typecheck    # tsc --noEmit (after panda codegen)
npm run lint
```

`src/data/__tests__/data-integrity.test.ts` checks that every route's terminal ids actually resolve — the cheapest possible guard against a typo in the hand-written dataset silently dropping a route from the map.
