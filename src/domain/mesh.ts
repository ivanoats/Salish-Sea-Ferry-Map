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
 * Four deliberate divergences from the original:
 *
 * 1. Positions are `[longitude, latitude]` tuples rather than `{lat, lon}`
 *    objects, matching the rest of this repo.
 * 2. The planner's route-walking entry point is left out — it was written
 *    against `PlannedRoute`, and this repo's equivalent belongs next to
 *    `routesToLineFeatureCollection` in `geojson.ts`.
 * 3. A returned path begins and ends at the positions actually asked for,
 *    not at the mesh vertices they snapped to. Upstream that mattered
 *    less, because every harbour there has a spur ending on its exact
 *    published position; here a terminal can sit up to `MAX_SNAP_NM` from
 *    the network, and a route line that started a mile offshore of the
 *    dock would be wrong in a way the reader would notice.
 * 4. Two positions snapping to the same node returns that short path
 *    rather than null. Upstream treats it as "the mesh has nothing to say
 *    here"; the endpoints are still the honest answer, so there is no
 *    reason to make the caller re-derive them.
 *
 * Divergences 3 and 4 mean this file can no longer be refreshed by
 * copying the upstream one over it — see `data/README.md`.
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
const roundPoint = (point: LonLat): LonLat => [
  Math.round(point[0] * 1e5) / 1e5,
  Math.round(point[1] * 1e5) / 1e5,
];
const roundsTo = (point: LonLat, node: LonLat): boolean =>
  key(roundPoint(point)) === key(node);

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
  const exact = graph.byKey.get(key(roundPoint(at)));
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
 * The shortest way through the water from one position to another.
 *
 * The path runs `from` → mesh vertices → `to`, so it starts and ends where
 * the caller asked rather than at the snapped vertices; an endpoint that
 * already rounds onto its vertex is not repeated. Always two or more
 * positions, so the result is a valid LineString.
 *
 * Null means the mesh cannot serve the pair — either endpoint further than
 * `MAX_SNAP_NM` from the network, or no route between them. Callers should
 * treat that as "fall back to the straight line for this leg", not as an
 * error.
 */
export const meshPathCoordinates = (
  graph: MeshGraph,
  from: LonLat,
  to: LonLat
): LonLat[] | null => {
  const start = nearestNode(graph, from);
  const goal = nearestNode(graph, to);
  if (start === null || goal === null) return null;

  if (start === goal) {
    const node = (graph.nodes[start] as MeshNode).at;
    const coordinates: LonLat[] = [from];
    if (!roundsTo(from, node) && !roundsTo(to, node)) coordinates.push(node);
    // `to` is pushed even when it equals `from`: a one-position array is
    // not a LineString, and a caller asking for a zero-length leg should
    // get back a degenerate line rather than something it cannot render.
    coordinates.push(to);
    return coordinates;
  }

  const nodePath = shortestNodePath(graph, start, goal);
  if (nodePath === null) return null;

  const coordinates = nodePath.map((index) => {
    const node = graph.nodes[index] as MeshNode;
    return node.at;
  });

  if (!roundsTo(from, (graph.nodes[start] as MeshNode).at)) coordinates.unshift(from);
  if (!roundsTo(to, (graph.nodes[goal] as MeshNode).at)) {
    coordinates.push(to);
  }
  return coordinates;
};
