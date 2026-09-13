# Working in this repository

A reference map of every ferry route across the Salish Sea — Washington
State Ferries, BC Ferries, Black Ball, Kitsap Transit, Victoria Clipper,
and the county-run ferries. Next.js App Router, TypeScript, Panda CSS,
MapLibre GL. The dataset is static and hand-curated.

## Commands

Install needs both flags or it fails outright:

```
npm ci --legacy-peer-deps --ignore-scripts
```

`--legacy-peer-deps` works around an npm bug in vitest 4's peer graph;
`--ignore-scripts` skips `@park-ui/panda-preset`'s broken postinstall. Both
are documented in `netlify.toml`.

Then, before you open a PR:

```
npm run typecheck   # panda codegen + tsc --noEmit
npm run lint        # eslint
npm test            # vitest run
```

All three must pass. `npm run maplibre-worker` stages the MapLibre worker
if a dev server needs it.

## Architecture

The domain is deliberately small, and everything else derives from it.

- `src/domain/ferry.ts` — the core types. A `Terminal` is a point; a
  `FerryRoute` is an ordered list of terminal ids sailed by one operator.
  Colors, filtering, and GeoJSON are all derived from those two shapes plus
  the operator catalogue.
- `src/data/{operators,terminals,routes}.ts` — the dataset. Plain
  `readonly` arrays with a `*_BY_ID` Map alongside.
- `src/domain/geojson.ts` — turns the dataset into GeoJSON for MapLibre,
  including the per-leg lane offsetting that keeps two operators on the
  same crossing from hiding one another.
- `src/components/map/ferry-map.tsx` — the MapLibre component.
- `src/app/api/vessels/route.ts` — the optional WSDOT live-vessel layer.

Prefer adding to the data files over adding machinery. If a feature can be
expressed as a new field on `Terminal` or `FerryRoute` and a derivation in
`src/domain/`, do it that way.

### Architecture docs are generated

`docs/architecture/workspace.dsl` is the source of truth for the C4 model.
Everything under `docs/architecture/generated/` — both the `.puml` and the
`.svg` — is build output that happens to be committed so GitHub can render it.
Edit the DSL and regenerate with the pinned commands in
`docs/architecture/README.md`; never hand-edit a generated file, and never add a
diagram the model doesn't produce.

Declare each relationship once, at the most specific level that is true, and let
Structurizr imply the container and system edges. Declaring the same edge at two
levels is what let the container and component views disagree about who calls
OpenStreetMap.

## Conventions

- **`readonly` throughout.** Data arrays, interface fields, and coordinate
  tuples are all `readonly`. Match it.
- **Coordinates are `[longitude, latitude]`**, GeoJSON order. Getting this
  backwards puts Puget Sound in Somalia and typechecks fine.
- **Ids are kebab-case** and descriptive: `seattle-colman-dock`,
  `wsf-edmonds-kingston`. Route ids are prefixed with the operator.
- **Operator colors are concrete hex**, not Panda tokens, because the same
  value drives a MapLibre paint expression and an inline legend swatch. A
  new operator's color has to stay distinguishable from the existing seven
  over an OSM basemap.
- **Comments explain why, not what.** The existing ones are the model: they
  record the reasoning, the upstream quirk, or the tradeoff. Don't add
  comments that restate the line below them.
- **Group data entries by operator** with a `// --- Operator name ---`
  banner, matching the existing files.

## Sourcing data

Terminal coordinates are compiled from operator route pages, Wikipedia, and
chart knowledge to roughly dock-level precision. If you add a terminal,
source it — don't produce coordinates from recall. A plausible-looking
coordinate a kilometre inland typechecks, passes the integrity tests, and
is wrong in a way nobody notices.

`src/data/__tests__/data-integrity.test.ts` catches unresolvable terminal
ids, unknown operators, duplicate ids, and routes with fewer than two
terminals. It does not check whether a coordinate is in the water.

Data files are excluded from Sonar's copy-paste detector (see
`.sonarcloud.properties`). Record-shaped data is repetitive by nature and
that repetition is the point — never restructure the dataset, or generate
it from a terser source, to satisfy a duplication metric.

## Scope

This is a route map, not a trip planner. **Schedules and fares are out of
scope** — several operators here publish no machine-readable feed, so
partial coverage would mislead someone standing at a dock. See issue #7.

The map is **not for navigation**: dock-level approximations, no soundings,
no rock clearance. Keep that caveat intact wherever it appears, and carry
it into anything new that draws route geometry.

<!-- mermaid-ai-skills:start -->
## Mermaid Diagrams

When the user asks to create, edit, or visualize a diagram, follow the
instructions in `.github/instructions/mermaid.instructions.md`.
<!-- mermaid-ai-skills:end -->
