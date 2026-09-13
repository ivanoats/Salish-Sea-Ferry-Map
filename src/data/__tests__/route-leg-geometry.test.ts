import { describe, expect, it } from "vitest";
import { ROUTE_LEG_GEOMETRY_BY_DIRECTED_TERMINAL_IDS } from "@/data/route-leg-geometry";
import { TERMINALS_BY_ID } from "@/data/terminals";
import { haversineNm } from "@/domain/mesh";
import { buildRouteLegGeometryByDirectedTerminalIds } from "../../../scripts/build-route-geometry.ts";

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

  it("does not promote nearby but unrelated OSM geometry over the mesh fallback", () => {
    const fresh = buildRouteLegGeometryByDirectedTerminalIds();

    expect(fresh["southworth\0seattle-colman-dock"]?.source).toBe("mesh");
  });

  it("covers substantially more than the single Seattle–Bainbridge leg with vendored OSM geometry", () => {
    const fresh = buildRouteLegGeometryByDirectedTerminalIds();
    const osmLegs = Object.values(fresh).filter(
      ({ source }) => source === "osm"
    );

    expect(osmLegs.length).toBeGreaterThan(10);
  });

  it("records straight-line fallbacks explicitly when neither vendored source can serve a leg", () => {
    const fresh = buildRouteLegGeometryByDirectedTerminalIds();

    expect(fresh["comox\0powell-river"]?.source).toBe("straight");
    expect(fresh["langdale\0gambier-island"]?.source).toBe("straight");
  });

  it("matches a fresh build from the vendored mesh and current route data", () => {
    const fresh = buildRouteLegGeometryByDirectedTerminalIds();

    expect(fresh).toEqual(ROUTE_LEG_GEOMETRY_BY_DIRECTED_TERMINAL_IDS);
  });
});
