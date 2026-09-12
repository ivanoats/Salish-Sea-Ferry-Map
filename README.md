# Salish Sea Ferry Map

Live at **<https://salish-sea-ferry-map.netlify.app>**.

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
- **Victoria Clipper** — Seattle ↔ Victoria, passenger only
- **Skagit County** — the Guemes Island ferry
- **Whatcom County** — the *Whatcom Chief*, Gooseberry Point ↔ Lummi Island

## Stack

Next.js 16 (App Router) · TypeScript · [PandaCSS](https://panda-css.com) with the [Park UI](https://park-ui.com) preset · [Ark UI](https://ark-ui.com) for accessible primitives (the operator filter checkboxes) · [MapLibre GL JS](https://maplibre.org) for the map.

The codebase follows a light hexagonal layout, consistent with this author's other Salish Sea projects (`salish-nav-planner`, `reciprocal-clubs`):

```
src/domain/    — types (Operator, Terminal, FerryRoute) and pure helpers (GeoJSON builders)
src/data/      — the static dataset: operators.ts, terminals.ts, routes.ts
src/components/
  map/         — the MapLibre component and its constants
  panels/      — the operator filter
  layout/      — the app shell that wires state, filter, and map together
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

Coordinates are dock-level approximations, and every route is drawn as a straight line between its terminals — a reasonable schematic, not a sailing chart. **This map is not for navigation.**

The "WSF vessel positions (beta)" toggle adds a live layer on top of that static base, using WSDOT's public [Vessel Locations API](https://wsdot.wa.gov/traffic/api/) — the only operator in this dataset that publishes one. To enable it:

1. Request a free access code at <https://wsdot.wa.gov/traffic/api/>.
2. Create `.env.local` (see `.env.example`) with `WSF_API_KEY=<your code>`.
3. Restart `npm run dev`.

Without a key, the toggle still works — it just shows a note that live data isn't configured, and everything else on the map is unaffected. The key is only ever used server-side (`src/app/api/vessels/route.ts` proxies the WSDOT call), never sent to the browser. BC Ferries, Black Ball, and the county ferries don't expose an equivalent public feed, so they stay static-only.

## Known gaps / v2 ideas

- **PDF export** — the project brief calls for a printable map alongside the web app; this v1 ships the web app first (see the parent project notes).
- **Schedules/fares** — intentionally out of scope for v1, which is a route map, not a trip planner.

- **Pierce County's Anderson Island ferry** — missing from the dataset, and it shouldn't be: Steilacoom – Ketron Island – Anderson Island is a scheduled car ferry in south Puget Sound, which puts it squarely inside what this map claims to cover. Needs a new `pierce-county` operator id and color, three terminals (the Ketron Island call is by arrangement rather than every sailing — worth a `note`), and a line in "What it covers" above. Smallest of the three items here and the only one that's a straight coverage bug rather than a feature.

- **Route geometry over water** — routes are drawn as straight lines today, which is honest for an open-water crossing and wrong for anything threading islands. `~/code/salish-nav-planner` has already solved this: `public/data/salish-mesh.json` is a single connected network of deep-water corridors, tidal passes, and a per-harbour entrance spur (211 corridors, 968 edges), generated offline by rasterising the OSM coastline at 80 m and flood-filling from the open Pacific — see that repo's ADR 0002 for why it's built from data rather than hand-typed control points. `src/domain/mesh-route.ts` there exposes `buildMeshGraph` and `buildMeshRouteLineCoordinates`, which is most of the port.

  The work here is mapping each ferry terminal to its nearest mesh node and running terminal pairs through the graph at build time, so `src/data/` gains baked route geometry and nothing ships a 800 KB mesh to the browser. Worth most on the San Juan Islands and Southern Gulf Islands runs, where a straight line currently sails through several islands. Carry the mesh's own caution with it: it follows the middle of navigable water as OSM describes the shoreline, carries no soundings, and is still not for navigation.

- **Octolinear route display** — a second, schematic rendering mode in the spirit of Beck's London Underground map: every leg locked to 45° increments, terminal spacing evened out, geography abandoned in favour of legibility. The case for it is the same one Beck made — for the question this map actually answers (what connects to what, on whose boats, and where do I change), true geography is mostly noise, and the dense clusters where it matters most are precisely where the geographic map is least readable: the San Juans, the Southern Gulf Islands, the three Kitsap crossings into Seattle.

  This wants to be a view toggle over the same dataset rather than a fork of it — the operator filter, colors, and route records all carry over. Two pieces don't: terminals need schematic positions alongside their real coordinates (hand-placed is fine and probably better than solving for them), and the renderer is likely SVG rather than MapLibre, since an octolinear diagram has no basemap and no meaningful zoom-to-geography. The per-leg lane offsetting already in `routesToLineFeatureCollection` becomes much more load-bearing here: an octolinear map deliberately collapses routes onto shared corridors, so bundled legs go from a handful of cases to most of the map, and lane *ordering* — which route sits outermost through a bundle, so lines cross as rarely as possible — turns into a real problem rather than the stable-input-order approximation that suffices today.

## Testing

```bash
npm run test        # vitest
npm run typecheck    # tsc --noEmit (after panda codegen)
npm run lint
```

`src/data/__tests__/data-integrity.test.ts` checks that every route's terminal ids actually resolve — the cheapest possible guard against a typo in the hand-written dataset silently dropping a route from the map.
