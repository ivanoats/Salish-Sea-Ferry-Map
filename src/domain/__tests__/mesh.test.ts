import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildMeshGraph,
  haversineNm,
  meshPathCoordinates,
  nearestNode,
  type LonLat,
  type MeshFeatureCollection,
} from "@/domain/mesh";
import { TERMINALS } from "@/data/terminals";

/**
 * The mesh is read from disk rather than imported, for the same reason it
 * lives outside `src/` — an import would pull ~800 KB into whatever bundle
 * traced it.
 */
const mesh = JSON.parse(
  readFileSync("data/salish-mesh.json", "utf8")
) as MeshFeatureCollection;

const graph = buildMeshGraph(mesh);

describe("salish mesh graph", () => {
  it("collapses shared vertices into single nodes", () => {
    const vertexCount = mesh.features
      .filter((f) => f.geometry.type === "LineString")
      .reduce((total, f) => total + f.geometry.coordinates.length, 0);

    // The port depends on corridors and spurs meeting at *identical*
    // coordinates rather than merely nearby ones — that is what makes the
    // network one connected graph. 21,323 vertices collapsing to 8,189
    // nodes is that sharing; if a mesh rebuild stopped snapping joins, this
    // ratio would move toward 1 and paths would silently stop connecting.
    expect(graph.nodes).toHaveLength(8_189);
    expect(vertexCount).toBeGreaterThan(graph.nodes.length * 2);
    expect(graph.byKey.size).toBe(graph.nodes.length);
  });

  it("keeps the vendored mesh graph fully connected", () => {
    const seen = new Set<number>([0]);
    const frontier = [0];

    while (frontier.length > 0) {
      const at = frontier.pop();
      if (at === undefined) continue;
      for (const edge of graph.nodes[at]?.edges ?? []) {
        if (seen.has(edge.to)) continue;
        seen.add(edge.to);
        frontier.push(edge.to);
      }
    }

    expect(seen.size).toBe(graph.nodes.length);
  });

  it("routes Anacortes to Friday Harbor around the islands, not through them", () => {
    const anacortes: LonLat = [-122.6789, 48.5077];
    const fridayHarbor: LonLat = [-123.0163, 48.5352];

    const path = meshPathCoordinates(graph, anacortes, fridayHarbor);
    if (path === null) {
      throw new Error("no mesh path between Anacortes and Friday Harbor");
    }

    // A straight line here sails over Lopez and Shaw. The mesh path has to
    // be both longer than the direct distance and made of real geometry
    // rather than the two endpoints.
    const along = (points: readonly LonLat[]): number => {
      let total = 0;
      for (let at = 1; at < points.length; at++) {
        const previous = points[at - 1];
        const current = points[at];
        if (previous === undefined || current === undefined) continue;
        total += haversineNm(previous, current);
      }
      return total;
    };

    expect(path.length).toBeGreaterThan(2);
    expect(path[0]).toEqual(anacortes);
    expect(path.at(-1)).toEqual(fridayHarbor);
    expect(along(path)).toBeGreaterThan(haversineNm(anacortes, fridayHarbor));
  });

  it("keeps the requested endpoints when both positions snap to one mesh node", () => {
    const localGraph = buildMeshGraph({
      features: [
        {
          geometry: {
            type: "LineString",
            coordinates: [
              [-123, 49],
              [-122.99, 49],
              [-122.98, 49],
            ],
          },
          properties: {},
        },
      ],
    });
    const from: LonLat = [-122.9904, 49.0006];
    const to: LonLat = [-122.9896, 48.9994];

    const path = meshPathCoordinates(localGraph, from, to);

    expect(path).toEqual([from, [-122.99, 49], to]);
  });

  it("does not duplicate endpoints that already round to snapped mesh vertices", () => {
    const localGraph = buildMeshGraph({
      features: [
        {
          geometry: {
            type: "LineString",
            coordinates: [
              [-123, 49],
              [-122.99, 49],
            ],
          },
          properties: {},
        },
      ],
    });
    const from: LonLat = [-123.000000001, 49.000000001];
    const to: LonLat = [-122.990000001, 49.000000001];

    const path = meshPathCoordinates(localGraph, from, to);

    expect(path).toEqual([
      [-123, 49],
      [-122.99, 49],
    ]);
  });

  /**
   * The count is asserted rather than the whole list so that improving the
   * mesh coverage fails this test loudly and gets the documented figure
   * updated with it. The four are Comox, Gambier Island, Lasqueti Island,
   * and Cortes Island — all noted in data/README.md.
   */
  it("snaps all but four terminals to the network", () => {
    const unreachable = TERMINALS.filter(
      (t) => nearestNode(graph, t.coordinates) === null
    )
      .map((t) => t.id)
      .sort();

    expect(unreachable).toHaveLength(4);
    expect(unreachable).toEqual([
      "comox",
      "cortes-island",
      "gambier-island",
      "lasqueti-island",
    ]);
  });
});
