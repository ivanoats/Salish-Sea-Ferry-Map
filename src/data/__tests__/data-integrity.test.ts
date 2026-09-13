import { describe, expect, it } from "vitest";
import { ROUTES } from "@/data/routes";
import { TERMINALS_BY_ID } from "@/data/terminals";
import { OPERATORS_BY_ID } from "@/data/operators";
import { ROUTE_LEG_GEOMETRY_BY_DIRECTED_TERMINAL_IDS } from "@/data/route-leg-geometry";

describe("ferry dataset integrity", () => {
  it("every route references terminal ids that exist", () => {
    const missing: string[] = [];
    for (const route of ROUTES) {
      for (const terminalId of route.terminalIds) {
        if (!TERMINALS_BY_ID.has(terminalId)) {
          missing.push(`${route.id} -> ${terminalId}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it("every route references an operator that exists", () => {
    const missing = ROUTES.filter((r) => !OPERATORS_BY_ID.has(r.operatorId)).map((r) => r.id);
    expect(missing).toEqual([]);
  });

  it("every route has at least two terminals", () => {
    const tooShort = ROUTES.filter((r) => r.terminalIds.length < 2).map((r) => r.id);
    expect(tooShort).toEqual([]);
  });

  it("has no duplicate route ids", () => {
    const ids = ROUTES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has no duplicate terminal ids", () => {
    const ids = [...TERMINALS_BY_ID.keys()];
    expect(new Set(ids).size).toBe(ids.length);
  });

  /**
   * Several terminals once sat kilometres from the actual dock while still
   * satisfying every structural test in this file. These explicit fixtures
   * make a repeat drift visible without waiting for an external audit to
   * spot it.
   */
  it("keeps known dock-level terminal coordinates on the terminal itself", () => {
    const expectedByTerminalId: Readonly<Record<string, readonly [number, number]>> = {
      "buckley-bay": [-124.84655, 49.52639],
      "comox": [-124.92382, 49.73991],
      "cortes-island": [-125.05386, 50.10974],
      "denman-island-east": [-124.70882, 49.49393],
      "duke-point": [-123.89177, 49.16001],
      "french-creek": [-124.35662, 49.34895],
      "gabriola-island": [-123.85838, 49.1778],
      "gambier-island": [-123.43958, 49.44999],
      "gooseberry-point": [-122.6702, 48.73123],
      "hornby-island": [-124.70454, 49.51125],
      "keats-island": [-123.4332, 49.39556],
      "lasqueti-island": [-124.35159, 49.49144],
      "mayne-island": [-123.32328, 48.84454],
      "mill-bay": [-123.51777, 48.61399],
      "pender-island": [-123.31561, 48.80052],
      "penelakut-island": [-123.66127, 48.97073],
      "saltery-bay": [-124.1771, 49.78142],
      "saturna-island": [-123.20138, 48.79809],
      "texada-island": [-124.62007, 49.79482],
      "thetis-island": [-123.67824, 48.98096],
      "vesuvius-bay": [-123.57339, 48.88125],
    };

    for (const [terminalId, coordinates] of Object.entries(expectedByTerminalId)) {
      const terminal = TERMINALS_BY_ID.get(terminalId);
      if (terminal === undefined) {
        throw new Error(`missing terminal ${terminalId}`);
      }
      expect(terminal.coordinates).toEqual(coordinates);
    }
  });

  /**
   * Steilacoom, then Ketron, then Anderson runs steadily west. A leg that
   * doubles back is the shape a misplaced terminal makes, and the first
   * version of this route shipped with two coordinates about three
   * kilometres out — which typechecked, and which every other test here
   * passed, because none of them can tell whether a point is in the water.
   */
  it("the Pierce County Anderson Island route progresses westward without doubling back", () => {
    const route = ROUTES.find((candidate) => candidate.id === "pierce-county-steilacoom-anderson");
    if (route === undefined) {
      throw new Error("pierce-county-steilacoom-anderson is missing from ROUTES");
    }

    // Resolved by throwing rather than with `?.`, so `longitudes` is
    // number[] and the comparator below needs no assertions. Referential
    // integrity has its own test above; an unresolved id here is a broken
    // precondition, not this test's subject.
    const longitudes = route.terminalIds.map((terminalId) => {
      const terminal = TERMINALS_BY_ID.get(terminalId);
      if (terminal === undefined) {
        throw new Error(`route references unknown terminal id ${terminalId}`);
      }
      return terminal.coordinates[0];
    });

    expect(longitudes).toEqual([...longitudes].sort((a, b) => b - a));
  });

  it("includes the King County Water Taxi Seattle–West Seattle (Alki) route", () => {
    const route = ROUTES.find((candidate) => candidate.id === "kcwt-seattle-west-seattle");
    expect(route).toMatchObject({
      operatorId: "king-county-water-taxi",
      terminalIds: ["seattle-colman-dock", "west-seattle-seacrest"],
      mode: "passenger",
      status: "active",
    });
  });

  it("includes baked geometry for the Seattle–West Seattle Water Taxi leg", () => {
    const geometry = ROUTE_LEG_GEOMETRY_BY_DIRECTED_TERMINAL_IDS["seattle-colman-dock\0west-seattle-seacrest"];
    const reverseGeometry =
      ROUTE_LEG_GEOMETRY_BY_DIRECTED_TERMINAL_IDS["west-seattle-seacrest\0seattle-colman-dock"];
    expect(geometry).toBeDefined();
    expect(geometry?.coordinates[0]).toEqual(
      TERMINALS_BY_ID.get("seattle-colman-dock")?.coordinates
    );
    expect(geometry?.coordinates.at(-1)).toEqual(
      TERMINALS_BY_ID.get("west-seattle-seacrest")?.coordinates
    );
    expect(reverseGeometry).toBeUndefined();
  });
});
