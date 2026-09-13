import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ROUTE_LEG_GEOMETRY_BY_DIRECTED_TERMINAL_IDS } from "@/data/route-leg-geometry";
import { TERMINALS_BY_ID } from "@/data/terminals";
import { haversineNm } from "@/domain/mesh";
import { buildRouteLegGeometryByDirectedTerminalIds } from "../../../scripts/build-route-geometry.ts";

/**
 * Read from disk rather than imported, for the same reason the file lives
 * outside `src/` — an import would pull the whole extract into whatever
 * bundle traced it.
 */
const OSM_FERRY_ROUTES = JSON.parse(
  readFileSync("data/salish-osm-ferry-routes.json", "utf8")
) as {
  readonly routes: readonly {
    readonly coordinates: readonly (readonly (readonly [number, number])[])[];
  }[];
};

const vertexKey = ([longitude, latitude]: readonly [number, number]): string =>
  `${longitude},${latitude}`;

const lineDistanceNm = (
  coordinates: readonly (readonly [number, number])[]
): number => {
  let total = 0;
  for (let at = 1; at < coordinates.length; at++) {
    const from = coordinates[at - 1];
    const to = coordinates[at];
    if (from === undefined || to === undefined) continue;
    total += haversineNm(from, to);
  }
  return total;
};

describe("baked route-leg geometry", () => {
  it("prefers vendored OSM geometry for Seattle–Bainbridge", () => {
    const fresh = buildRouteLegGeometryByDirectedTerminalIds();
    const seattleToBainbridge =
      fresh["seattle-colman-dock\0bainbridge-island"];

    expect(seattleToBainbridge).toBeDefined();
    expect(seattleToBainbridge?.source).toBe("osm");
    expect(seattleToBainbridge?.coordinates).not.toContainEqual([
      -122.39089,
      47.62763,
    ]);
    expect(lineDistanceNm(seattleToBainbridge?.coordinates ?? [])).toBeLessThan(
      7.5
    );
  });

  it("uses OSM subpaths for intermediate-stop Washington sailings and keeps them dock-anchored", () => {
    const fresh = buildRouteLegGeometryByDirectedTerminalIds();
    const lopezToShaw = fresh["lopez-island\0shaw-island"];
    const vashonToSouthworth = fresh["vashon-north\0southworth"];

    expect(lopezToShaw?.source).toBe("osm");
    expect(vashonToSouthworth?.source).toBe("osm");
    expect(lopezToShaw?.coordinates[0]).toEqual(
      TERMINALS_BY_ID.get("lopez-island")?.coordinates
    );
    expect(lopezToShaw?.coordinates.at(-1)).toEqual(
      TERMINALS_BY_ID.get("shaw-island")?.coordinates
    );
    expect(vashonToSouthworth?.coordinates[0]).toEqual(
      TERMINALS_BY_ID.get("vashon-north")?.coordinates
    );
    expect(vashonToSouthworth?.coordinates.at(-1)).toEqual(
      TERMINALS_BY_ID.get("southworth")?.coordinates
    );
  });

  /**
   * The guard against stitching. A leg may only take OSM geometry when one
   * vendored route reaches both of its terminals; two terminals each
   * covered by a *different* route must never be joined into a line no
   * ferry sails. Asserted over every OSM leg rather than pinned to a leg
   * that currently falls back — southworth->seattle-colman-dock was pinned
   * here until the Southworth Fast Ferry way was vendored, and it is real
   * geometry now. A leg's first and last positions are the terminals
   * themselves, which the builder adds; every position between them must
   * come from one route, and the two ends must be the terminals — a
   * budget of "at most two positions from anywhere" would let a short
   * stitched segment through as long as it stayed under the count.
   */
  it("draws each OSM leg from a single vendored route, never stitched across two", () => {
    const fresh = buildRouteLegGeometryByDirectedTerminalIds();
    const vertexSetsByRoute = OSM_FERRY_ROUTES.routes.map(
      (route) => new Set(route.coordinates.flat().map(vertexKey))
    );
    const osmLegs = Object.entries(fresh).filter(
      ([, { source }]) => source === "osm"
    );

    expect(osmLegs.length).toBeGreaterThan(0);
    for (const [directedKey, leg] of osmLegs) {
      const [fromId = "", toId = ""] = directedKey.split("\0");
      const between = leg.coordinates.slice(1, -1);
      const drawnFromOneRoute = vertexSetsByRoute.some((vertices) =>
        between.every((position) => vertices.has(vertexKey(position)))
      );

      expect(drawnFromOneRoute, directedKey).toBe(true);
      expect(leg.coordinates[0], directedKey).toEqual(
        TERMINALS_BY_ID.get(fromId)?.coordinates
      );
      expect(leg.coordinates.at(-1), directedKey).toEqual(
        TERMINALS_BY_ID.get(toId)?.coordinates
      );
    }
  });

  /**
   * OSM maps both Kitsap Transit fast ferries as a bare `route=ferry` way
   * with no parent relation, so a relation-only extract cannot see them
   * and both legs fell back to the mesh. The mesh answer was not merely
   * coarse: it rounded Alki Point and ran 14.7 nm for a 9 nm sailing.
   */
  it("uses the standalone-way geometry for the Kitsap Transit fast ferries", () => {
    const fresh = buildRouteLegGeometryByDirectedTerminalIds();
    const southworthToSeattle = fresh["southworth\0seattle-colman-dock"];
    const kingstonToSeattle = fresh["kingston\0seattle-colman-dock"];

    expect(southworthToSeattle?.source).toBe("osm");
    expect(kingstonToSeattle?.source).toBe("osm");
    expect(
      lineDistanceNm(southworthToSeattle?.coordinates ?? [])
    ).toBeLessThan(10);
  });

  it("covers substantially more than the single Seattle–Bainbridge leg with vendored OSM geometry", () => {
    const fresh = buildRouteLegGeometryByDirectedTerminalIds();
    const osmLegs = Object.values(fresh).filter(
      ({ source }) => source === "osm"
    );

    expect(osmLegs.length).toBeGreaterThan(10);
  });

  /**
   * Asserts the shape of a straight-line fallback rather than naming the
   * legs that currently need one. Which legs fall back changes every time
   * the vendored OSM extract grows — comox->powell-river and
   * langdale->gambier-island were both pinned here until BC Ferries
   * relations were added, and both are real geometry now. The invariant
   * that matters is that a fallback is two points and says so.
   */
  it("records straight-line fallbacks explicitly, as a two-point line", () => {
    const fresh = buildRouteLegGeometryByDirectedTerminalIds();
    const straight = Object.values(fresh).filter(
      ({ source }) => source === "straight"
    );

    for (const leg of straight) {
      expect(leg.coordinates).toHaveLength(2);
    }
    // A leg with more than two points must have come from a real source.
    for (const leg of Object.values(fresh)) {
      if (leg.coordinates.length > 2) expect(leg.source).not.toBe("straight");
    }
  });

  it("matches a fresh build from the vendored mesh and current route data", () => {
    const fresh = buildRouteLegGeometryByDirectedTerminalIds();

    expect(fresh).toEqual(ROUTE_LEG_GEOMETRY_BY_DIRECTED_TERMINAL_IDS);
  });
});
