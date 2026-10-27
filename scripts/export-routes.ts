// Writes data/salish-osm-ferry-routes.geojson from the vendored OSM snapshot in
// data/salish-osm-ferry-routes.json: one MultiLineString feature per route,
// geometry unmodified. The snapshot's metadata (ODbL licence, sources) rides
// along as a top-level foreign member so the attribution stays with the data.
//
//   node scripts/export-routes.ts
import { readFileSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";

const INPUT_PATH = resolve("data/salish-osm-ferry-routes.json");
const OUTPUT_PATH = resolve("data/salish-osm-ferry-routes.geojson");

type Position = [number, number];

interface OsmFerryRoute {
  routeName: string;
  operator?: string;
  from?: string;
  to?: string;
  osmRelationIds?: number[];
  osmWayIds?: number[];
  coordinates: Position[][];
}

interface OsmFerryRoutes {
  metadata: Record<string, unknown>;
  routes: OsmFerryRoute[];
}

const snapshot = JSON.parse(readFileSync(INPUT_PATH, "utf8")) as OsmFerryRoutes;

const features = snapshot.routes.map((route) => ({
  type: "Feature",
  properties: {
    routeName: route.routeName,
    operator: route.operator ?? null,
    // Some routes carry "" rather than omitting the field; both mean unknown.
    from: route.from || null,
    to: route.to || null,
    ...(route.osmRelationIds && { osmRelationIds: route.osmRelationIds }),
    ...(route.osmWayIds && { osmWayIds: route.osmWayIds }),
  },
  geometry: { type: "MultiLineString", coordinates: route.coordinates },
}));

// One feature per line keeps the file small and its diffs readable.
const header = JSON.stringify({ type: "FeatureCollection", metadata: snapshot.metadata }, null, 2);
const body = features.map((feature) => `    ${JSON.stringify(feature)}`).join(",\n");
writeFileSync(OUTPUT_PATH, `${header.replace(/\n}$/, "")},\n  "features": [\n${body}\n  ]\n}\n`);

console.log(`${relative(process.cwd(), OUTPUT_PATH)}  ${features.length} routes`);
