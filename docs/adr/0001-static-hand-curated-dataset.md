# ADR 0001: Use a static, hand-curated ferry dataset as the source of truth

- Status: Accepted
- Date: 2026-09-13
- Reconstructed from: `README.md`, `src/data/`, top-level `data/README.md`

## Context

The map spans multiple ferry operators across Washington and British Columbia.
Some operators publish no machine-readable feeds at all, while route geometry
and terminal locations change slowly enough to curate by hand.

## Decision

Keep operators, terminals, and routes as readonly TypeScript data in `src/data/`
and treat that dataset as the source of truth for the application.

[ADR 0005](./0005-gtfs-as-build-time-input.md) adds pinned GTFS validation
where usable feeds exist. It amends the sourcing process, not this ownership:
feed disagreements require review, never automatic changes to curated records.

## Consequences

- The application stays fast and reliable without depending on uneven external feeds.
- Most feature work can be expressed as data changes plus derivations in `src/domain/`.
- Accuracy depends on careful sourcing and review of terminal coordinates and route data.

## Evidence

- `README.md` describes the dataset as static and hand-curated.
- `src/data/operators.ts`, `src/data/terminals.ts`, and `src/data/routes.ts` hold the core records.
- The top-level `data/README.md` documents the build-time geometry inputs that support the curated dataset.
