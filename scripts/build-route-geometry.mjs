import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const MESH_PATH = resolve("data/salish-mesh.json");
const OUTPUT_PATH = resolve("src/data/route-leg-geometry.ts");

const directedLegKey = (fromId, toId) => `${fromId}\0${toId}`;
const compareCodeUnits = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const EARTH_RADIUS_NM = 3440.065;
const MAX_SNAP_NM = 2;

const loadModule = (path) => {
  const source = readFileSync(path, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  });
  const commonJsModule = { exports: {} };
  runInNewContext(
    outputText,
    { module: commonJsModule, exports: commonJsModule.exports },
    { filename: path }
  );
  return commonJsModule.exports;
};

const { ROUTES } = loadModule(resolve("src/data/routes.ts"));
const { TERMINALS_BY_ID } = loadModule(resolve("src/data/terminals.ts"));

const toRadians = (degrees) => (degrees * Math.PI) / 180;
const haversineNm = (a, b) => {
  const dLat = toRadians(b[1] - a[1]);
  const dLon = toRadians(b[0] - a[0]);
  const lat1 = toRadians(a[1]);
  const lat2 = toRadians(b[1]);

  const halfChordSquared =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return (
    2 * EARTH_RADIUS_NM * Math.asin(Math.min(1, Math.sqrt(halfChordSquared)))
  );
};

const key = (point) => `${point[0]},${point[1]}`;
const roundPoint = (point) => [
  Math.round(point[0] * 1e5) / 1e5,
  Math.round(point[1] * 1e5) / 1e5,
];
const roundsTo = (point, node) => key(roundPoint(point)) === key(node);

const buildMeshGraph = (mesh) => {
  const nodes = [];
  const byKey = new Map();

  const nodeAt = (point) => {
    const found = byKey.get(key(point));
    if (found !== undefined) return found;
    const index = nodes.length;
    nodes.push({ at: point, edges: [] });
    byKey.set(key(point), index);
    return index;
  };

  for (const feature of mesh.features) {
    if (feature.geometry.type !== "LineString") continue;
    const line = feature.geometry.coordinates;
    for (let at = 0; at + 1 < line.length; at++) {
      const from = nodeAt(line[at]);
      const to = nodeAt(line[at + 1]);
      if (from === to) continue;
      const nm = haversineNm(nodes[from].at, nodes[to].at);
      nodes[from].edges.push({ to, nm });
      nodes[to].edges.push({ to: from, nm });
    }
  }

  return { nodes, byKey };
};

const nearestNode = (graph, at) => {
  const exact = graph.byKey.get(key(roundPoint(at)));
  if (exact !== undefined) return exact;

  let best = null;
  let bestNm = MAX_SNAP_NM;
  for (let index = 0; index < graph.nodes.length; index++) {
    const nm = haversineNm(graph.nodes[index].at, at);
    if (nm < bestNm) {
      bestNm = nm;
      best = index;
    }
  }
  return best;
};

class Frontier {
  heap = [];

  push(entry) {
    this.heap.push(entry);
    let at = this.heap.length - 1;
    while (at > 0) {
      const parent = (at - 1) >> 1;
      if (this.heap[parent][0] <= this.heap[at][0]) break;
      [this.heap[parent], this.heap[at]] = [this.heap[at], this.heap[parent]];
      at = parent;
    }
  }

  pop() {
    const top = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0 && last !== undefined) {
      this.heap[0] = last;
      let at = 0;
      for (;;) {
        const left = 2 * at + 1;
        const right = left + 1;
        let smallest = at;
        if (left < this.heap.length && this.heap[left][0] < this.heap[smallest][0]) {
          smallest = left;
        }
        if (right < this.heap.length && this.heap[right][0] < this.heap[smallest][0]) {
          smallest = right;
        }
        if (smallest === at) break;
        [this.heap[smallest], this.heap[at]] = [this.heap[at], this.heap[smallest]];
        at = smallest;
      }
    }
    return top;
  }

  get size() {
    return this.heap.length;
  }
}

const walkBack = (cameFrom, start, goal) => {
  const path = [];
  for (let at = goal; at !== -1; at = cameFrom[at]) {
    path.push(at);
    if (at === start) break;
  }
  return path.reverse();
};

const shortestNodePath = (graph, start, goal) => {
  const distance = new Float64Array(graph.nodes.length).fill(Number.POSITIVE_INFINITY);
  const cameFrom = new Int32Array(graph.nodes.length).fill(-1);
  const settled = new Uint8Array(graph.nodes.length);
  distance[start] = 0;

  const frontier = new Frontier();
  frontier.push([0, start]);
  while (frontier.size > 0) {
    const next = frontier.pop();
    if (next === undefined) break;
    const [cost, at] = next;
    if (settled[at] === 1) continue;
    settled[at] = 1;
    if (at === goal) break;
    for (const edge of graph.nodes[at].edges) {
      const candidate = cost + edge.nm;
      if (candidate < distance[edge.to]) {
        distance[edge.to] = candidate;
        cameFrom[edge.to] = at;
        frontier.push([candidate, edge.to]);
      }
    }
  }

  return settled[goal] === 1 ? walkBack(cameFrom, start, goal) : null;
};

const meshPathCoordinates = (graph, from, to) => {
  const start = nearestNode(graph, from);
  const goal = nearestNode(graph, to);
  if (start === null || goal === null) return null;

  if (start === goal) {
    const node = graph.nodes[start].at;
    const coordinates = [from];
    if (!roundsTo(from, node) && !roundsTo(to, node)) coordinates.push(node);
    coordinates.push(to);
    return coordinates;
  }

  const nodePath = shortestNodePath(graph, start, goal);
  if (nodePath === null) return null;

  const coordinates = nodePath.map((index) => graph.nodes[index].at);
  if (!roundsTo(from, graph.nodes[start].at)) coordinates.unshift(from);
  if (!roundsTo(to, graph.nodes[goal].at)) coordinates.push(to);
  return coordinates;
};

const loadMesh = () => JSON.parse(readFileSync(MESH_PATH, "utf8"));

export const buildRouteLegGeometryByDirectedTerminalIds = () => {
  const graph = buildMeshGraph(loadMesh());
  const geometryByDirectedTerminalIds = {};

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

      const key = directedLegKey(from.id, to.id);
      if (geometryByDirectedTerminalIds[key] !== undefined) continue;

      const coordinates = meshPathCoordinates(graph, from.coordinates, to.coordinates);
      if (coordinates !== null) {
        geometryByDirectedTerminalIds[key] = coordinates;
      }
    }
  }

  return geometryByDirectedTerminalIds;
};

export const renderRouteLegGeometryModule = (geometryByDirectedTerminalIds) => {
  const renderedEntries = Object.entries(geometryByDirectedTerminalIds)
    .sort(([leftKey], [rightKey]) => compareCodeUnits(leftKey, rightKey))
    .map(([key, coordinates]) => {
      const renderedCoordinates = coordinates
        .map(([longitude, latitude]) => `    [${longitude}, ${latitude}],`)
        .join("\n");
      return `  ${JSON.stringify(key)}: [\n${renderedCoordinates}\n  ],`;
    })
    .join("\n");

  return `export type RouteLegCoordinate = readonly [number, number];

/**
 * Build-time baked mesh geometry keyed by directed terminal pair, as
 * "fromTerminalId\\0toTerminalId".
 *
 * Generated by \`npm run build-route-geometry\` from \`data/salish-mesh.json\`;
 * legs not present here fall back to straight lines. Keeping this in
 * \`src/data\` avoids shipping the ~800 KB mesh to the client bundle.
 */
export const ROUTE_LEG_GEOMETRY_BY_DIRECTED_TERMINAL_IDS: Readonly<Record<string, readonly RouteLegCoordinate[]>> = {
${renderedEntries}
};
`;
};

export const writeRouteLegGeometryModule = () => {
  const geometryByDirectedTerminalIds = buildRouteLegGeometryByDirectedTerminalIds();
  const moduleSource = renderRouteLegGeometryModule(geometryByDirectedTerminalIds);
  writeFileSync(OUTPUT_PATH, moduleSource);
};

if (process.argv[1]?.endsWith("scripts/build-route-geometry.mjs")) {
  writeRouteLegGeometryModule();
}
