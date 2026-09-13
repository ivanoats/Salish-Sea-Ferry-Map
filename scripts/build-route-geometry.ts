import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ROUTES } from "../src/data/routes.ts";
import { TERMINALS_BY_ID } from "../src/data/terminals.ts";
import type { RouteLegGeometry } from "../src/domain/route-leg-geometry.ts";
import {
  buildMeshGraph,
  haversineNm,
  meshPathCoordinates,
  meshPathCoordinatesFromNodes,
  type LonLat,
  nearestNode,
  type MeshFeatureCollection,
} from "../src/domain/mesh.ts";

const OSM_FERRY_ROUTES_PATH = resolve("data/salish-osm-ferry-routes.json");
const MESH_PATH = resolve("data/salish-mesh.json");
const OUTPUT_PATH = resolve("src/data/route-leg-geometry.ts");
const MAX_OSM_ENDPOINT_NM = 1.25;

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
    readonly routeName?: string;
    readonly operator?: string;
    readonly from?: string;
    readonly to?: string;
    readonly osmRelationIds?: readonly number[];
    readonly coordinates: readonly (readonly LonLat[])[];
  }[];
}

const loadOsmFerryRoutes = (): OsmFerryRouteSnapshot =>
  JSON.parse(readFileSync(OSM_FERRY_ROUTES_PATH, "utf8")) as OsmFerryRouteSnapshot;

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

const routeLinesToMesh = (
  lines: readonly (readonly LonLat[])[]
): MeshFeatureCollection => ({
  features: lines.map((coordinates) => ({
    geometry: { type: "LineString", coordinates },
    properties: {},
  })),
});

interface OsmRouteCandidate {
  readonly coordinates: readonly LonLat[];
  readonly endpointNm: number;
  readonly lineNm: number;
}

interface OsmRouteGraph {
  readonly graph: ReturnType<typeof buildMeshGraph>;
  readonly snapsByTerminalId: ReadonlyMap<
    string,
    {
      readonly node: number;
      readonly nm: number;
    }
  >;
}

const buildOsmRouteGraph = (
  lines: readonly (readonly LonLat[])[]
): OsmRouteGraph => {
  const graph = buildMeshGraph(routeLinesToMesh(lines));
  const snapsByTerminalId = new Map<
    string,
    {
      readonly node: number;
      readonly nm: number;
    }
  >();

  for (const terminal of TERMINALS_BY_ID.values()) {
    const node = nearestNode(graph, terminal.coordinates);
    if (node === null) continue;

    const matchedNode = graph.nodes[node];
    if (matchedNode === undefined) continue;

    const nm = haversineNm(terminal.coordinates, matchedNode.at);
    if (nm <= MAX_OSM_ENDPOINT_NM) {
      snapsByTerminalId.set(terminal.id, { node, nm });
    }
  }

  return { graph, snapsByTerminalId };
};

const osmRouteCoordinates = (
  routeGraphs: readonly OsmRouteGraph[],
  fromId: string,
  from: LonLat,
  toId: string,
  to: LonLat
): readonly LonLat[] | null => {
  let best: OsmRouteCandidate | null = null;
  for (const { graph, snapsByTerminalId } of routeGraphs) {
    const start = snapsByTerminalId.get(fromId);
    const goal = snapsByTerminalId.get(toId);
    if (start === undefined || goal === undefined) continue;

    const coordinates = meshPathCoordinatesFromNodes(
      graph,
      from,
      start.node,
      to,
      goal.node
    );
    if (coordinates === null) continue;

    const candidate = {
      coordinates,
      endpointNm: start.nm + goal.nm,
      lineNm: lineDistanceNm(coordinates),
    };
    if (
      best === null ||
      candidate.endpointNm < best.endpointNm ||
      (candidate.endpointNm === best.endpointNm &&
        candidate.lineNm < best.lineNm)
    ) {
      best = candidate;
    }
  }

  return best?.coordinates ?? null;
};

export const buildRouteLegGeometryByDirectedTerminalIds = (): Readonly<
  Record<string, RouteLegGeometry>
> => {
  const osmFerryRoutes = loadOsmFerryRoutes();
  const osmRouteGraphs = osmFerryRoutes.routes.map((route) =>
    buildOsmRouteGraph(route.coordinates)
  );
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
        osmRouteGraphs,
        from.id,
        from.coordinates,
        to.id,
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

  return `import type { RouteLegGeometry } from "@/domain/route-leg-geometry";
export type {
  RouteLegCoordinate,
  RouteLegGeometry,
  RouteLegGeometrySource,
} from "@/domain/route-leg-geometry";

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
