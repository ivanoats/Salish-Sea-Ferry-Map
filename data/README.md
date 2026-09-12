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

The planner's harbours are not this project's ferry terminals, so a
terminal is not guaranteed its own entrance spur. Measured against the
current `src/data/terminals.ts`, 61 of 65 terminals fall within
`MAX_SNAP_NM` (2 nm) of a mesh vertex. Four do not:

| Terminal | Nearest vertex |
| --- | --- |
| `comox` (Comox / Little River) | 3.49 nm |
| `gambier-island` (New Brighton) | 2.82 nm |
| `lasqueti-island` (False Bay) | 2.33 nm |
| `cortes-island` (Whaletown) | 2.15 nm |

These need either a mesh patch or a hand-placed approach point. Until then
`meshPathCoordinates` returns `null` for legs touching them, which callers
must treat as "keep the straight line" rather than as an error.

### Licensing

Derived from OpenStreetMap coastline data, which is ODbL. Keep the
attribution with any published artifact drawn from it.

## Updating

Re-copy from `salish-nav-planner` rather than editing in place, and update
the coverage table above by running the mesh tests — see
`src/domain/__tests__/mesh.test.ts`.
