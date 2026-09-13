# ADR 0004: Keep the product scoped to route mapping rather than trip planning or navigation

- Status: Accepted
- Date: 2026-09-13
- Reconstructed from: `README.md`, issue [#7](https://github.com/ivanoats/Salish-Sea-Ferry-Map/issues/7), top-level `data/README.md`

## Context

The current dataset is well-suited to route coverage, terminal locations, and
approximate geometry. It is not a reliable foundation for cross-operator
schedules, fares, or navigational guidance.

## Decision

Keep the application scoped to showing ferry routes and optional live WSF vessel
positions. Do not expand v1 into a schedule/fare planner or present the route
geometry as navigationally authoritative.

## Consequences

- The map avoids giving users partial or misleading trip-planning information.
- "Not for navigation" remains a required caveat wherever route geometry is presented.
- Future schedule or fare work would require a separate decision and a broader data source strategy.

## Evidence

- `README.md` says schedules and fares are intentionally out of scope and that the map is not for navigation.
- Issue [#7](https://github.com/ivanoats/Salish-Sea-Ferry-Map/issues/7) records the scope decision explicitly.
- The top-level `data/README.md` repeats the caution that geometry inputs are planning aids rather than charts.
