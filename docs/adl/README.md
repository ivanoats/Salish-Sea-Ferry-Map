# Architecture decision log

This log records the current architecture decisions that have been reconstructed
from the README, source tree, issue history, and the visible git history.

| ADR | Status | Summary |
| --- | --- | --- |
| [ADR 0001](../adr/0001-static-hand-curated-dataset.md) | Accepted | Use a static, hand-curated ferry dataset as the source of truth |
| [ADR 0002](../adr/0002-small-domain-derived-views.md) | Accepted | Keep the core domain model small and derive map views from it |
| [ADR 0003](../adr/0003-nextjs-maplibre-and-server-proxy.md) | Accepted | Use Next.js App Router with a client-side MapLibre map and a server-side vessel proxy |
| [ADR 0004](../adr/0004-route-map-scope.md) | Accepted | Keep the product scoped to route mapping rather than trip planning or navigation |
