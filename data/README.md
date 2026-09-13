# `data/` — build-time inputs

Files here are **not** part of the client bundle. They live outside `src/`
and `public/` so nothing can import or serve them by accident: the mesh
alone is ~800 KB, and it is only needed when route geometry is generated.

## `salish-mesh.json`

Vendored from [`salish-nav-planner`](https://github.com/ivanoats/salish-nav-planner)
(`public/data/salish-mesh.json`), a single connected network of navigable
water: 211 deep-water corridors, 968 edges, and an entrance spur for each
of 220 harbours.

Generated there by `scripts/build-mesh.ts`, which rasterises the OSM
`natural=coastline` at 80 m and flood-fills inward from the open Pacific —
so what the flood reaches is water connected to the sea. A short list of
named patches reopens channels narrower than one cell (lock chambers, the
Fremont and Montlake cuts, the Swinomish channel).

That repo's ADR 0002 records why the network is derived from data rather
than hand-typed control points: hand-authored coordinates fail quietly,
because a control point a kilometre inland still looks plausible at small
scale.

### Caution, carried across from the mesh's own metadata

> A planning aid, not a chart. Corridors follow the middle of navigable
> water as OSM describes the shoreline; they carry no soundings and clear
> no rocks.

The map stays **not for navigation**. Anything built on this file inherits
that caveat and must keep it visible.

### Terminal coverage

Measured against the current `src/data/terminals.ts`, 66 of 68 terminals
fall within `MAX_SNAP_NM` (2 nm) of a mesh vertex. Two do not:

| Terminal | Nearest vertex |
| --- | --- |
| `comox` (Comox / Little River) | 3.90 nm |
| `gambier-island` (New Brighton) | 2.14 nm |

`meshPathCoordinates` returns `null` for legs touching these, which callers
must treat as "keep the straight line" rather than as an error.

**Reaching the mesh is not a test of whether a coordinate is right.** This
network was built for sailing — deep-water corridors and tidal passes for a
boat picking its way through, with an entrance spur per harbour in *that*
project's list. It is not a ferry network and has no authority over where a
ferry dock is. A correctly placed terminal can sit outside `MAX_SNAP_NM`
simply because no sailing route happens to pass that way, which is exactly
what `comox` and `gambier-island` show: both verified at the ferry terminal
itself, both still out of range.

So don't read the table above as a defect list. Don't patch the mesh to
reach one of these, don't hand-place an approach point, and don't widen
`MAX_SNAP_NM` — that last would draw a confident line from somewhere the
ferry never was, the exact failure the constant exists to prevent.

**OpenStreetMap is the authority for ferry terminals and ferry routes.**
`amenity=ferry_terminal` gives the docks and `route=ferry` gives the
sailing lines, both mapped as ferries rather than inferred from open water.
Check a terminal against OSM, not against this mesh.

Since the OSM ferry routes landed, the mesh is a fallback rather than the
primary source: 45 of 49 route legs use OSM geometry, 3 use the mesh
(`friday-harbor`–`sidney-bc` and the two Kitsap fast-ferry runs into
Seattle), and 1 falls back to a straight line.

### Licensing

Derived from OpenStreetMap coastline data, which is ODbL. Keep the
attribution with any published artifact drawn from it.

## `salish-osm-ferry-routes.json`

Real ferry-route geometry from OpenStreetMap, pulled through Overpass and
vendored unmodified. Each entry is one OSM ferry route as one or more
lines; `scripts/build-route-geometry.ts` builds a graph per entry and uses
it for a leg only when **both** of the leg's terminals sit within
`MAX_OSM_ENDPOINT_NM` (1.25 nm) of that one route's vertices. So a leg
either gets the line a ferry actually sails or it gets none — two
terminals covered by two different routes are never stitched together.
Geometry beats the mesh where it exists, which is 48 of the 49 legs.

### Relations first, bare ways only to fill gaps

Most ferry routes are mapped as a `type=route`, `route=ferry` **relation**,
and the two queries in the file's `metadata.sources` pull those. But OSM
also carries ferry routes as a lone `route=ferry` **way** with no parent
relation, which a relation query cannot see at all — that is why both
Kitsap Transit fast ferries and the Gambier–Keats crossing fell back to the
mesh long after every terminal they touch had real geometry nearby.

The third source query subtracts relation member ways from all ferry ways
in the region, leaving 66 standalone ones. Only three are vendored: the
ones carrying a route leg no relation reaches. The rest are either the same
crossing a relation already covers — and a duplicate can only displace
better geometry, since the builder breaks ties on snap distance — or berth
approaches, freight barges and water taxis this dataset does not model.

Adding a way here is therefore a deliberate act, not a sweep: check that
the leg has no relation coverage first.

### Licensing

OpenStreetMap, ODbL. Keep the attribution with anything published from it.

## Updating

Re-copy `salish-mesh.json` from `salish-nav-planner` rather than editing it
in place, then update the coverage table above by running the mesh tests —
see `src/domain/__tests__/mesh.test.ts`.

If the mesh, the OSM extract, terminal coordinates, or route terminal
order changes, run `npm run build-route-geometry` to refresh the baked
output in `src/data/route-leg-geometry.ts`. The route-leg geometry test compares that
checked-in file with a fresh build from the current mesh and dataset, so a
stale table fails in CI rather than silently drifting.

`src/domain/mesh.ts` is a different matter: it has diverged from the
upstream `mesh-route.ts` it was ported from, deliberately and in ways the
file's own header lists. Copying the upstream version over it would revert
those silently. Port individual upstream changes across by hand.
