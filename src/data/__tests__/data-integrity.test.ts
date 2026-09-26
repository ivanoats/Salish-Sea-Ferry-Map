import { describe, expect, it } from "vitest";
import { ROUTES } from "@/data/routes";
import { haversineNm } from "@/domain/mesh";
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
  /**
   * A terminal that drifts to the wrong side of its own crossing still
   * satisfies every structural check above: the ids resolve, the route has
   * two terminals, and the builder bakes a line between them without
   * complaint. Distance is what gives it away. `lummi-island` sat 70 m from
   * `gooseberry-point` — on the mainland, not the island — so the Whatcom
   * Chief drew a stub that never left the dock.
   *
   * The floor is also the rule the two Everett docks were merged under: a
   * pair closer than this renders as one smudge at every zoom this map
   * uses, so it belongs in one terminal rather than two. The closest
   * legitimate pair is Friday Harbor's WSF dock and Spring Street landing,
   * at 0.098 nm.
   */
  it("keeps distinct terminals far enough apart to be distinct places", () => {
    const minimumSeparationNm = 0.05;
    const terminals = [...TERMINALS_BY_ID.values()];
    const tooClose: string[] = [];

    for (let at = 0; at < terminals.length; at++) {
      for (let against = at + 1; against < terminals.length; against++) {
        const terminal = terminals[at];
        const other = terminals[against];
        if (terminal === undefined || other === undefined) continue;

        const separationNm = haversineNm(terminal.coordinates, other.coordinates);
        if (separationNm < minimumSeparationNm) {
          tooClose.push(
            `${terminal.id} <-> ${other.id} (${separationNm.toFixed(3)} nm)`
          );
        }
      }
    }

    expect(tooClose).toEqual([]);
  });

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
      "lummi-island": [-122.68131, 48.72044],
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

  it("includes both King County Water Taxi routes", () => {
    expect(ROUTES.find((candidate) => candidate.id === "kcwt-seattle-west-seattle")).toMatchObject({
      operatorId: "king-county-water-taxi",
      terminalIds: ["seattle-colman-dock", "west-seattle-seacrest"],
      mode: "passenger",
      status: "active",
    });
    expect(ROUTES.find((candidate) => candidate.id === "kcwt-seattle-vashon")).toMatchObject({
      operatorId: "king-county-water-taxi",
      terminalIds: ["seattle-colman-dock", "vashon-north"],
      mode: "passenger",
      status: "active",
    });
  });

  // The builder wraps the vendored OSM way in the two terminal coordinates, so
  // a leg starts and ends on its docks with the sailed line in between. A leg
  // whose interior is just its own endpoints would mean the vendored geometry
  // was the terminal pair rather than the way.
  it.each([
    ["seattle-colman-dock", "west-seattle-seacrest"],
    ["seattle-colman-dock", "vashon-north"],
  ])("bakes OSM geometry for the %s to %s Water Taxi leg", (fromId, toId) => {
    const geometry = ROUTE_LEG_GEOMETRY_BY_DIRECTED_TERMINAL_IDS[`${fromId}\0${toId}`];
    const from = TERMINALS_BY_ID.get(fromId)?.coordinates;
    const to = TERMINALS_BY_ID.get(toId)?.coordinates;

    expect(geometry?.source).toBe("osm");
    expect(geometry?.coordinates[0]).toEqual(from);
    expect(geometry?.coordinates.at(-1)).toEqual(to);
    expect(geometry?.coordinates.length).toBeGreaterThan(2);
    expect(geometry?.coordinates.slice(1, -1)).not.toEqual([]);
  });
});

// Only tests import this generated snapshot; the application keeps curated data.
describe("pinned GTFS corroboration (ADR 0005)", () => {
  it("checks mapped route ids, terminal displacement, and service evidence", async () => {
    const { GTFS } = await import("../generated/gtfs");
    const { default: mappings } = await import("../../../data/gtfs/mappings.json");
    const { validateGtfs } = await import("../../../scripts/gtfs-validation");
    const report = validateGtfs(ROUTES, [...TERMINALS_BY_ID.values()], GTFS, mappings);
    for (const warning of report.warnings) console.warn(`GTFS coverage: ${warning}`);
    // A feed refresh may change coverage, but that change must be reviewed.
    expect(report.checkedRoutes).toBe(32);
    expect(report.errors).toEqual([]);
  });
});
