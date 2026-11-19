# ADR 0008: Generate print files from the route diagram's own code

- Status: Accepted
- Date: 2026-09-25
- Reconstructed from: PR #54, `scripts/print-files.ts`, `scripts/export-print-files.ts`, `src/components/schematic/schematic-geometry.ts`

## Context

The [octolinear route diagram](./0006-octolinear-diagram-as-separate-page.md)
also works as artwork for printed merchandise (a tee and a tote via Printful).
Print has its own constraints: PNG in sRGB at 150 DPI or more, fixed print
areas, no semi-transparency for direct-to-garment printing, and a version for
dark fabric. If the print artwork were drawn separately, in a design tool or
as a fork of the SVG, it would fall out of date as soon as a route or terminal
changed.

## Decision

- Draw print files from the same code as the `/schematic` page.
  `scripts/print-files.ts` calls `buildSchematicDiagram` from
  `src/domain/schematic.ts` and reads `ROUTES`, `OPERATORS` and
  `src/data/schematic-layout.ts` directly.
- Keep the drawing constants and path helpers (cell size, lane width, label
  directions, box paths) in `src/components/schematic/schematic-geometry.ts`,
  which both the React diagram and the script import. That file has only type
  imports from `@/`, because the export script runs under plain Node, which
  can't resolve the alias for runtime values.
- Rasterize with `sharp`, a dev dependency, in a maintainer-run script
  (`npm run print-files`). This isn't part of `npm run build`.
- Don't commit the output. `print-files/` is gitignored and regenerated on
  demand.
- Print-only choices (themes, land as fill or coastline, the tote's crop to
  Puget Sound, no label halo on dark fabric) live in `scripts/print-files.ts`,
  not in the on-screen diagram.

## Consequences

- A data change reaches the print files the next time someone runs the script,
  and they still match the page.
- `schematic-geometry.ts` can't import runtime values through `@/`. A change
  that adds one would break the export script, not the site.
- `scripts/print-files.test.ts` checks print dimensions and PNG density, so
  changes to the diagram that would break Printful's requirements fail in CI.
- The site's runtime dependencies stay the same. `sharp` is only used by the
  script.

## Evidence

- PR #54 added `npm run print-files` and described the products, themes, and
  Printful constraints.
- `scripts/print-files.ts` imports `buildSchematicDiagram` and the schematic
  layout data. The header comment in `schematic-geometry.ts` explains the
  shared-module constraint.
- `.gitignore` lists `print-files/`.
