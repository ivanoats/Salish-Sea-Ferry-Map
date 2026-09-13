import { describe, expect, it } from "vitest";
import { ROUTE_LEG_GEOMETRY_BY_DIRECTED_TERMINAL_IDS } from "@/data/route-leg-geometry";
import { buildRouteLegGeometryByDirectedTerminalIds } from "../../../scripts/build-route-geometry.ts";

describe("baked route-leg geometry", () => {
  it("matches a fresh build from the vendored mesh and current route data", () => {
    const fresh = buildRouteLegGeometryByDirectedTerminalIds();

    expect(fresh).toEqual(ROUTE_LEG_GEOMETRY_BY_DIRECTED_TERMINAL_IDS);
  });
});
