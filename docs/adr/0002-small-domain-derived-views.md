# ADR 0002: Keep the core domain model small and derive map views from it

- Status: Accepted
- Date: 2026-09-13
- Reconstructed from: `README.md`, `src/domain/ferry.ts`, `src/domain/geojson.ts`

## Context

The project answers a narrow question: what ferry routes connect which terminals,
and which operator runs them. The UI still needs colors, filtering, route
geometry, and map-ready GeoJSON.

## Decision

Keep the core domain deliberately small — `Terminal` as a point and `FerryRoute`
as an ordered list of terminal ids — and derive the rest of the map-facing data
from those records plus the operator catalogue.

## Consequences

- Domain logic remains concentrated in `src/domain/` instead of being duplicated in UI code.
- New behavior is usually added by extending the data model or its derivations rather than adding framework machinery.
- Build-time and runtime helpers can share the same domain vocabulary.

## Evidence

- `README.md` calls the layout a light hexagonal structure with `src/domain/` and `src/data/` at the center.
- `src/domain/ferry.ts` explicitly says the UI should derive what it needs from those small shapes.
- `src/domain/geojson.ts` turns routes and terminals into the GeoJSON consumed by the map.
