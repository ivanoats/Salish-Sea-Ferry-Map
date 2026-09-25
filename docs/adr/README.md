# Architecture decision records

One file per decision. An Accepted record reflects what is true today; a
Proposed one describes a decision that has been worked out but not yet made,
and stays in the table so the reasoning is reviewable before it is adopted.

Records 0001–0004 were reconstructed from the repository itself, since no prior
`docs/adr/` directory existed. Every record cites what it was derived from in
its **Evidence** section, reconstructed or not.

For the chronological history of status changes, see
[`../adl/`](../adl/).

| ADR | Status | Decision |
| --- | --- | --- |
| [0001](./0001-static-hand-curated-dataset.md) | Accepted | Use a static, hand-curated ferry dataset as the source of truth |
| [0002](./0002-small-domain-derived-views.md) | Accepted | Keep the core domain model small and derive map views from it |
| [0003](./0003-nextjs-maplibre-and-server-proxy.md) | Accepted | Use Next.js App Router with a client-side MapLibre map and a server-side vessel proxy |
| [0004](./0004-route-map-scope.md) | Accepted | Keep the product scoped to route mapping rather than trip planning or navigation |
| [0005](./0005-gtfs-as-build-time-input.md) | Proposed | Treat GTFS feeds as build-time inputs, not a runtime data source |
| [0006](./0006-octolinear-diagram-as-separate-page.md) | Accepted | Draw the octolinear route diagram as a separate SVG page over the same dataset |
