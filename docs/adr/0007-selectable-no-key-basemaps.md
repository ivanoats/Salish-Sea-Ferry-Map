# ADR 0007: Offer a selectable set of hosted basemaps, defaulting to a no-key one

- Status: Accepted
- Date: 2026-09-24
- Reconstructed from: PRs #44 and #46, `src/components/map/basemaps.ts`, `README.md`

## Context

[ADR 0003](./0003-nextjs-maplibre-and-server-proxy.md) put the map in the
browser on OpenStreetMap raster tiles. Those tiles are busy at the zoom levels
where ferry routes matter: road labels and shields compete with the route
lines, and the OSM tile usage policy discourages heavy use from third-party
sites. Different readers also want different things underneath the routes:
a quiet grey canvas for reading the network, terrain for seeing why a route
bends around a headland, a dark style for night.

The project has no server-side tile pipeline and doesn't want one. Any
basemap has to be a hosted style or tile URL the browser can load directly.

## Decision

- Keep a fixed registry of basemaps in `src/components/map/basemaps.ts`. Each
  entry is either a hosted MapLibre style URL (OpenFreeMap's Liberty, Bright,
  Positron, Dark and Fiord, and VersaTiles' Colorful) or an inline raster style
  (OpenStreetMap, and Stadia Maps' Stamen Terrain).
- Default to OpenFreeMap Positron. It needs no key and stays out of the way of
  the route colors.
- Let the reader switch basemaps from the map sidebar. The choice is page
  state; it isn't persisted.
- Stadia Maps is the one provider that can take a key, and it doesn't require
  one: a deployment can register its domain with Stadia instead. When a key
  is set, it goes in `NEXT_PUBLIC_STADIA_MAPS_API_KEY`, which is public by
  construction: it ends up in the browser bundle and in every tile URL.
- Raster entries carry their own attribution. Hosted styles bring theirs.

## Consequences

- Basemaps add no server-side code. They are not routed through the
  [vessel proxy](./0003-nextjs-maplibre-and-server-proxy.md), because none of
  them needs a secret.
- `map.setStyle` drops custom sources and layers, so `ferry-map.tsx` rebuilds
  the route, terminal and vessel layers on top of each new style. Any new map
  layer has to join that rebuild.
- Each provider is another external dependency the map can lose. Positron is
  the default, so an OpenFreeMap outage is the one that shows on first load.
- Adding a provider that needs a *secret* key would need a different approach,
  such as a tile proxy. This decision doesn't cover that case.

## Evidence

- PR #44 added the selector with Positron as the default. PR #46 added Stamen
  Terrain from Stadia Maps.
- `src/components/map/basemaps.ts` holds the registry. `app-shell.tsx`
  defaults `basemapId` to `"positron"`.
- `README.md` documents `NEXT_PUBLIC_STADIA_MAPS_API_KEY` and Stadia's domain
  authentication.
