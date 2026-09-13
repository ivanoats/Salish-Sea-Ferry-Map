import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ROUTE_LEG_GEOMETRY_BY_DIRECTED_TERMINAL_IDS } from "@/data/route-leg-geometry";
import {
  buildRouteLegGeometryByDirectedTerminalIds,
  renderRouteLegGeometryModule,
} from "../../../scripts/build-route-geometry.mjs";

describe("baked route-leg geometry", () => {
  it("matches a fresh build from the vendored mesh and current route data", () => {
    const fresh = buildRouteLegGeometryByDirectedTerminalIds();

    expect(fresh).toEqual(ROUTE_LEG_GEOMETRY_BY_DIRECTED_TERMINAL_IDS);
    expect(
      renderRouteLegGeometryModule(fresh)
    ).toBe(
      readFileSync(resolve("src/data/route-leg-geometry.ts"), "utf8")
    );
  });
});
