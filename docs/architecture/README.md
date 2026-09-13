# Architecture overview

This project is a small, static-first map of ferry routes across the Salish Sea.
The core model stays deliberately narrow:

- `Terminal` is a point
- `FerryRoute` is an ordered list of terminal ids sailed by one operator
- map styling, filtering, and GeoJSON are derived from that dataset

That keeps most change in `src/data/` and `src/domain/` instead of spreading
route knowledge across UI code.

## C4 views

Following the [C4 model](https://c4model.com/), zooming in one level at a time.
The source of truth is [`workspace.dsl`](./workspace.dsl), and committed SVG
exports are rendered directly by GitHub without cloning.

| Level | View | Scope |
| --- | --- | --- |
| 1 | [System context](./generated/plantuml/structurizr-system-context.svg) | The map, its people, and the two external systems it depends on |
| 2 | [Container view](./generated/plantuml/structurizr-container-view.svg) | The Next.js app, the browser map UI, and the vessel proxy |
| 3 | [Component view](./generated/plantuml/structurizr-component-view.svg) | Inside the Next.js app: data, domain, and UI components |

Level 4 (code) is deliberately omitted — the type definitions in `src/domain/`
already serve that purpose and would only go stale if duplicated here.

The curated dataset is a *component* rather than a container: it compiles into
the application bundle and is not a separately running thing, which is what
[C4 means by a container](https://c4model.com/abstractions/container).

### Regenerating diagrams from the DSL

Edit `workspace.dsl`, then regenerate diagrams deliberately (not as part of
`npm run build` or Netlify deploys):

```bash
# from the repository root
mkdir -p docs/architecture/generated/plantuml

docker run --rm \
  -v "$PWD":/workspace \
  -w /workspace \
  structurizr/cli:latest export \
  -workspace docs/architecture/workspace.dsl \
  -format plantuml/c4plantuml \
  -output docs/architecture/generated/plantuml

docker run --rm \
  -v "$PWD":/workspace \
  -w /workspace \
  plantuml/plantuml:latest \
  -tsvg docs/architecture/generated/plantuml/structurizr-system-context.puml \
  docs/architecture/generated/plantuml/structurizr-container-view.puml \
  docs/architecture/generated/plantuml/structurizr-component-view.puml
```

## Key runtime pieces

- `src/data/{operators,terminals,routes}.ts` — the hand-curated source of truth
- `src/domain/geojson.ts` — derives map-ready GeoJSON, including shared-leg offsets
- `src/components/map/ferry-map.tsx` — renders the MapLibre map in the browser
- `src/app/api/vessels/route.ts` — optional server-side proxy for WSDOT live vessels

## Data and geometry flow

1. Operators, terminals, and routes are maintained as readonly TypeScript data.
2. Build-time route-leg geometry prefers vendored OSM ferry routes, then mesh
   paths through navigable water, then straight lines as a final fallback.
   This runs in `scripts/build-route-geometry.ts`, which is why `src/domain/mesh.ts`
   appears in no runtime view — it is only reached at build time.
3. The client map consumes the derived GeoJSON and draws routes, terminals, and
   optional live WSF vessels on top of OpenStreetMap tiles.

## Scope boundaries

- This is a **route map, not a trip planner**: schedules and fares stay out of scope.
- This is **not for navigation**: dock-level coordinates and route geometry are
  mapping aids, not charted tracks.

## Notes on the ADRs

The repository history is still shallow, so the ADRs in [`../adr/`](../adr/)
are reconstructed from the README, current source layout, the existing scope
issue for schedules/fares, and the visible git history rather than copied from
older records.
