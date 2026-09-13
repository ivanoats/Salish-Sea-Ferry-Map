/**
 * A graph over the navigable water of the Salish Sea, and the shortest way
 * through it between two points.
 *
 * Ported from `salish-nav-planner`'s `src/domain/mesh-route.ts`. The
 * dataset here says which terminals a route calls at; it says nothing
 * about the shape of the water, so a leg drawn from its endpoints runs
 * over whatever islands are in the way — most visibly on the San Juan
 * Islands and Southern Gulf Islands runs. Walking this graph turns a leg
 * into a line a boat could follow.
 *
 * The mesh itself lives in `data/salish-mesh.json`, outside `src/` and
 * `public/` so it cannot reach the client bundle: it is ~800 KB and is
 * build-time input only. See `data/README.md` for its provenance.
 *
 * Two differences from the original, both to match this repo: positions
 * are `[longitude, latitude]` tuples rather than `{lat, lon}` objects, and
 * the planner's route-walking entry point is left out — it was written
 * against `PlannedRoute`, and this repo's equivalent belongs next to
 * `routesToLineFeatureCollection` in `geojson.ts`.
 */

/** `[longitude, latitude]`, matching GeoJSON coordinate order. */
export type LonLat = readonly [number, number];

/** Mean Earth radius in nautical miles. */
const EARTH_RADIUS_NM = 3440.065;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

/** Great-circle distance in nautical miles. */
export const haversineNm = (a: LonLat, b: LonLat): number => {
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

/** The subset of the mesh file this needs. */
export interface MeshFeatureCollection {
  readonly features: readonly {
    readonly geometry:
      | { readonly type: "LineString"; readonly coordinates: readonly LonLat[] }
      | { readonly type: "Point"; readonly coordinates: LonLat };
    readonly properties: Readonly<Record<string, unknown>>;
  }[];
}

interface MeshNode {
  readonly at: LonLat;
  /** Neighbour index and the distance to it. */
  readonly edges: { to: number; nm: number }[];
}

export interface MeshGraph {
  readonly nodes: readonly MeshNode[];
  /** Node index by rounded "lon,lat", the form the mesh file stores. */
  readonly byKey: ReadonlyMap<string, number>;
}

const key = (point: LonLat): string => `${point[0]},${point[1]}`;
const samePoint = (a: LonLat, b: LonLat): boolean =>
  a[0] === b[0] && a[1] === b[1];

/**
 * Indexes the mesh once, so many legs can be walked without rebuilding it.
 * Vertices shared between features are the same node by construction: the
 * mesh build splits a corridor wherever anything joins it, so a spur's
 * first coordinate *is* a coordinate of the corridor it hangs off.
 */
export const buildMeshGraph = (mesh: MeshFeatureCollection): MeshGraph => {
  const nodes: MeshNode[] = [];
  const byKey = new Map<string, number>();

  const nodeAt = (point: LonLat): number => {
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
      const from = nodeAt(line[at] as LonLat);
      const to = nodeAt(line[at + 1] as LonLat);
      if (from === to) continue;
      const nm = haversineNm((nodes[from] as MeshNode).at, (nodes[to] as MeshNode).at);
      (nodes[from] as MeshNode).edges.push({ to, nm });
      (nodes[to] as MeshNode).edges.push({ to: from, nm });
    }
  }

  return { nodes, byKey };
};

/**
 * How far a position may be from the network and still be considered on
 * it. Snapping a point further out than this would draw a confident line
 * from somewhere it never was — better to report no path and let the
 * caller keep the straight line, which is at least honestly wrong.
 *
 * Ferry terminals are *not* the planner's harbours, so unlike there, no
 * terminal here is guaranteed its own spur. Expect the scan below to do
 * real work, and expect some terminals to need a mesh patch or a hand
 * placed approach point.
 */
export const MAX_SNAP_NM = 2;

/** Nearest mesh node to a position, or null when none is close enough. */
export const nearestNode = (graph: MeshGraph, at: LonLat): number | null => {
  const exact = graph.byKey.get(
    key([Math.round(at[0] * 1e5) / 1e5, Math.round(at[1] * 1e5) / 1e5])
  );
  if (exact !== undefined) return exact;

  let best: number | null = null;
  let bestNm = MAX_SNAP_NM;
  for (let index = 0; index < graph.nodes.length; index++) {
    const nm = haversineNm((graph.nodes[index] as MeshNode).at, at);
    if (nm < bestNm) {
      bestNm = nm;
      best = index;
    }
  }
  return best;
};

/** Binary heap over (distance, node), so a long leg does not sort per pop. */
class Frontier {
  private readonly heap: [number, number][] = [];

  push(entry: [number, number]) {
    this.heap.push(entry);
    let at = this.heap.length - 1;
    while (at > 0) {
      const parent = (at - 1) >> 1;
      if ((this.heap[parent] as [number, number])[0] <= (this.heap[at] as [number, number])[0]) break;
      [this.heap[parent], this.heap[at]] = [this.heap[at] as [number, number], this.heap[parent] as [number, number]];
      at = parent;
    }
  }

  pop(): [number, number] | undefined {
    const top = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0 && last !== undefined) {
      this.heap[0] = last;
      let at = 0;
      for (;;) {
        const left = 2 * at + 1;
        const right = left + 1;
        let smallest = at;
        if (left < this.heap.length && (this.heap[left] as [number, number])[0] < (this.heap[smallest] as [number, number])[0]) smallest = left;
        if (right < this.heap.length && (this.heap[right] as [number, number])[0] < (this.heap[smallest] as [number, number])[0]) smallest = right;
        if (smallest === at) break;
        [this.heap[smallest], this.heap[at]] = [this.heap[at] as [number, number], this.heap[smallest] as [number, number]];
        at = smallest;
      }
    }
    return top;
  }

  get size() {
    return this.heap.length;
  }
}

/** Follows the came-from trail back from the goal, and turns it around. */
const walkBack = (cameFrom: Int32Array, start: number, goal: number): number[] => {
  const path: number[] = [];
  for (let at = goal; at !== -1; at = cameFrom[at] as number) {
    path.push(at);
    if (at === start) break;
  }
  return path.reverse();
};

/** Dijkstra between two nodes, as node indices. */
const shortestNodePath = (graph: MeshGraph, start: number, goal: number): number[] | null => {
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
    for (const edge of (graph.nodes[at] as MeshNode).edges) {
      const candidate = cost + edge.nm;
      if (candidate < (distance[edge.to] as number)) {
        distance[edge.to] = candidate;
        cameFrom[edge.to] = at;
        frontier.push([candidate, edge.to]);
      }
    }
  }

  return settled[goal] === 1 ? walkBack(cameFrom, start, goal) : null;
};

/**
 * The shortest way through the water from one position to another, or null
 * when the mesh cannot serve the pair — which the caller should treat as
 * "fall back to the straight line", not as an error.
 */
export const meshPathCoordinates = (
  graph: MeshGraph,
  from: LonLat,
  to: LonLat
): LonLat[] | null => {
  const start = nearestNode(graph, from);
  const goal = nearestNode(graph, to);
  if (start === null || goal === null || start === goal) return null;

  const path = shortestNodePath(graph, start, goal);
  if (path === null) return null;

  const coordinates = path.map((index) => {
    const node = graph.nodes[index] as MeshNode;
    return node.at;
  });

  if (!samePoint(from, coordinates[0] as LonLat)) coordinates.unshift(from);
  if (!samePoint(to, coordinates[coordinates.length - 1] as LonLat)) {
    coordinates.push(to);
  }
  return coordinates;
};
