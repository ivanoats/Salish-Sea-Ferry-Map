# ADR 0006: Draw the octolinear route diagram as a separate SVG page over the same dataset

- Status: Accepted
- Date: 2026-09-24
- Informed by: issue [#5](https://github.com/ivanoats/Salish-Sea-Ferry-Map/issues/5) and its follow-up comment

## Context

The geographic map is hardest to read in exactly the places where the
question "what connects to what, and where do I change?" matters most: the San
Juans, the Southern Gulf Islands, and the Kitsap crossings that all land on a
few pixels of Elliott Bay. A Beck-style diagram, with every leg at a multiple
of 45° and terminal spacing evened out, trades geography for legibility there.

Issue #5 first proposed a view toggle inside the existing map. The follow-up
comment asked for a separate page instead, so the map page doesn't grow more
complicated.

## Decision

- The diagram lives at `/schematic`. It shares the sidebar (brand, operator
  filter, suspended-route toggle) with the map through
  `src/components/layout/sidebar.tsx`, and a Map / Route diagram switch links
  the two.
- It reads the same `ROUTES`, `TERMINALS`, and `OPERATORS` records. The only
  new data is `src/data/schematic-layout.ts`: a hand-placed grid position and
  a short label for each terminal, bend points for the few legs that need
  them, the land links between docks in the same town, the border line, and
  simplified 45° land outlines drawn in light green behind the routes, in the
  way Beck stylized the Thames.
  Positions are hand-placed rather than solved for, since octolinear layout is
  NP-hard in general and this dataset is small.
- It renders as plain SVG, not MapLibre. A diagram has no basemap and no
  geographic zoom, so MapLibre would add weight and give nothing back.
- Lane ordering is decided per unit grid step in `src/domain/schematic.ts`.
  Where two routes share a corridor, they are followed to the point where they
  part, and the one that turns further right takes the right-hand lane. That
  replaces the input-order assignment the geographic map uses, which only
  works when bundles are rare.

## Consequences

- Adding a terminal now also means placing it in `schematic-layout.ts`.
  `src/data/__tests__/schematic-layout.test.ts` fails until you do. It also
  fails if a leg leaves the 45° grid, runs through a terminal it doesn't call
  at, or crosses land, or if a terminal is placed away from the coast.
- The map page keeps its current shape. Filter state is not shared between
  the pages; each starts from all operators visible.
- The geographic map's `routesToLineFeatureCollection` still assigns lanes by
  input order. It could adopt the diagram's ordering later if its bundles grow.

## Evidence

- Issue #5 describes the diagram, hand-placed positions, SVG rendering, and
  lane ordering as the hard part. Its comment asks for a separate page.
- `src/domain/schematic.ts`, `src/data/schematic-layout.ts`, and
  `src/app/schematic/page.tsx` implement it.
