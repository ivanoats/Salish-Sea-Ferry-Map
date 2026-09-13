# Architecture decision records

One file per decision, reflecting what is true today. These were reconstructed
from the repository itself, since no prior `docs/adr/` directory existed — each
record cites the files it was derived from in its **Evidence** section.

For the chronological history of status changes, see
[`../adl/`](../adl/).

| ADR | Status | Decision |
| --- | --- | --- |
| [0001](./0001-static-hand-curated-dataset.md) | Accepted | Use a static, hand-curated ferry dataset as the source of truth |
| [0002](./0002-small-domain-derived-views.md) | Accepted | Keep the core domain model small and derive map views from it |
| [0003](./0003-nextjs-maplibre-and-server-proxy.md) | Accepted | Use Next.js App Router with a client-side MapLibre map and a server-side vessel proxy |
| [0004](./0004-route-map-scope.md) | Accepted | Keep the product scoped to route mapping rather than trip planning or navigation |
