import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ROUTES } from "../src/data/routes.ts";
import { TERMINALS_BY_ID } from "../src/data/terminals.ts";
import {
  buildMeshGraph,
  haversineNm,
  meshPathCoordinates,
  type LonLat,
  type MeshFeatureCollection,
} from "../src/domain/mesh.ts";

const OSM_FERRY_ROUTES_PATH = resolve("data/salish-osm-ferry-routes.json");
const MESH_PATH = resolve("data/salish-mesh.json");
const OUTPUT_PATH = resolve("src/data/route-leg-geometry.ts");
const MAX_OSM_ENDPOINT_NM = 1.5;

const directedLegKey = (fromId: string, toId: string): string =>
  `${fromId}\0${toId}`;

const compareCodeUnits = (a: string, b: string): number => {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
};

const loadMesh = (): MeshFeatureCollection =>
  JSON.parse(readFileSync(MESH_PATH, "utf8")) as MeshFeatureCollection;

interface OsmFerryRouteSnapshot {
  readonly routes: readonly {
    readonly operator?: string;
    readonly from?: string;
    readonly to?: string;
    readonly duration?: string;
    readonly coordinates: readonly LonLat[];
  }[];
}

const loadOsmFerryRoutes = (): OsmFerryRouteSnapshot =>
  JSON.parse(readFileSync(OSM_FERRY_ROUTES_PATH, "utf8")) as OsmFerryRouteSnapshot;

export type RouteLegGeometrySource = "osm" | "mesh" | "straight";

export interface RouteLegGeometry {
  readonly source: RouteLegGeometrySource;
  readonly coordinates: readonly LonLat[];
}

const lineDistanceNm = (coordinates: readonly LonLat[]): number => {
  let total = 0;
  for (let at = 1; at < coordinates.length; at++) {
    const from = coordinates[at - 1];
    const to = coordinates[at];
    if (from === undefined || to === undefined) continue;
    total += haversineNm(from, to);
  }
  return total;
};

const osmRouteCoordinates = (
  snapshot: OsmFerryRouteSnapshot,
  from: LonLat,
  to: LonLat
): readonly LonLat[] | null => {
  let bestCoordinates: readonly LonLat[] | null = null;
  let bestEndpointNm = Number.POSITIVE_INFINITY;
  let bestLineNm = Number.POSITIVE_INFINITY;

  for (const route of snapshot.routes) {
    const start = route.coordinates[0];
    const end = route.coordinates.at(-1);
    if (start === undefined || end === undefined || route.coordinates.length < 2) {
      continue;
    }

    for (const candidate of [
      {
        coordinates: route.coordinates,
        fromNm: haversineNm(from, start),
        toNm: haversineNm(to, end),
      },
      {
        coordinates: [...route.coordinates].reverse(),
        fromNm: haversineNm(from, end),
        toNm: haversineNm(to, start),
      },
    ]) {
      if (
        candidate.fromNm > MAX_OSM_ENDPOINT_NM ||
        candidate.toNm > MAX_OSM_ENDPOINT_NM
      ) {
        continue;
      }

      const endpointNm = candidate.fromNm + candidate.toNm;
      const lineNm = lineDistanceNm(candidate.coordinates);
      if (
        endpointNm < bestEndpointNm ||
        (endpointNm === bestEndpointNm && lineNm < bestLineNm)
      ) {
        bestCoordinates = candidate.coordinates;
        bestEndpointNm = endpointNm;
        bestLineNm = lineNm;
      }
    }
  }

  return bestCoordinates;
};

export const buildRouteLegGeometryByDirectedTerminalIds = (): Readonly<
  Record<string, RouteLegGeometry>
> => {
  const osmFerryRoutes = loadOsmFerryRoutes();
  const graph = buildMeshGraph(loadMesh());
  const geometryByDirectedTerminalIds = new Map<string, RouteLegGeometry>();

  for (const route of ROUTES) {
    for (let legIndex = 0; legIndex < route.terminalIds.length - 1; legIndex++) {
      const fromId = route.terminalIds[legIndex];
      const toId = route.terminalIds[legIndex + 1];
      if (fromId === undefined || toId === undefined) continue;

      const from = TERMINALS_BY_ID.get(fromId);
      if (from === undefined) {
        throw new Error(`unknown terminal id ${fromId} on route ${route.id}`);
      }

      const to = TERMINALS_BY_ID.get(toId);
      if (to === undefined) {
        throw new Error(`unknown terminal id ${toId} on route ${route.id}`);
      }

      const directedKey = directedLegKey(from.id, to.id);
      if (geometryByDirectedTerminalIds.has(directedKey)) continue;

      const osmCoordinates = osmRouteCoordinates(
        osmFerryRoutes,
        from.coordinates,
        to.coordinates
      );
      if (osmCoordinates !== null) {
        geometryByDirectedTerminalIds.set(directedKey, {
          source: "osm",
          coordinates: osmCoordinates,
        });
        continue;
      }

      const meshCoordinates = meshPathCoordinates(graph, from.coordinates, to.coordinates);
      if (meshCoordinates !== null) {
        geometryByDirectedTerminalIds.set(directedKey, {
          source: "mesh",
          coordinates: meshCoordinates,
        });
        continue;
      }

      geometryByDirectedTerminalIds.set(directedKey, {
        source: "straight",
        coordinates: [from.coordinates, to.coordinates],
      });
    }
  }

  return Object.fromEntries(
    [...geometryByDirectedTerminalIds.entries()].sort(([leftKey], [rightKey]) =>
      compareCodeUnits(leftKey, rightKey)
    )
  );
};

const renderRouteLegGeometryModule = (
  geometryByDirectedTerminalIds: Readonly<Record<string, RouteLegGeometry>>
): string => {
  const renderedEntries = Object.entries(geometryByDirectedTerminalIds)
    .map(([key, geometry]) => {
      const renderedCoordinates = geometry.coordinates
        .map(
          ([longitude, latitude]) =>
            `      [${longitude}, ${latitude}],`
        )
        .join("\n");
      return `  ${JSON.stringify(key)}: {\n    source: ${JSON.stringify(geometry.source)},\n    coordinates: [\n${renderedCoordinates}\n    ],\n  },`;
    })
    .join("\n");

  return `export type RouteLegCoordinate = readonly [number, number];
export type RouteLegGeometrySource = "osm" | "mesh" | "straight";

export interface RouteLegGeometry {
  readonly source: RouteLegGeometrySource;
  readonly coordinates: readonly RouteLegCoordinate[];
}

/**
 * Build-time baked route geometry keyed by directed terminal pair, as
 * "fromTerminalId\\0toTerminalId". Geometry prefers vendored OSM ferry
 * routes, then the navigable-water mesh, then a straight line fallback.
 *
 * Generated by \`npm run build-route-geometry\` from
 * \`data/salish-osm-ferry-routes.json\` and \`data/salish-mesh.json\`.
 * Keeping this in \`src/data\` avoids shipping either build-time dataset
 * to the client bundle.
 */
export const ROUTE_LEG_GEOMETRY_BY_DIRECTED_TERMINAL_IDS: Readonly<Record<string, RouteLegGeometry>> = {
${renderedEntries}
};
`;
};

export const writeRouteLegGeometryModule = (): void => {
  const geometryByDirectedTerminalIds = buildRouteLegGeometryByDirectedTerminalIds();
  writeFileSync(
    OUTPUT_PATH,
    renderRouteLegGeometryModule(geometryByDirectedTerminalIds)
  );
};

if (
  process.argv[1] !== undefined &&
  import.meta.url.startsWith("file:") &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  writeRouteLegGeometryModule();
}
