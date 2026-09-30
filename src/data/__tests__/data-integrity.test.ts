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
   * A second, wider floor is the rule docks in the same town are merged
   * under: two docks a short walk apart, with no route calling at both, are
   * one place to a traveller, so they belong in one terminal. The two Everett
   * docks were merged this way, as were Friday Harbor's WSF terminal and
   * Spring Street Landing (0.098 nm), the two Granville Island docks
   * (0.093 nm), and Hornby Street with the Aquatic Centre (0.175 nm). The
   * closest unconnected pair kept separate is Colman Dock and Pier 69 in
   * Seattle, at 0.394 nm.
   *
   * Docks the same route calls at are different stops by definition, however
   * close: the Aquabus crosses False Creek from Granville Island to Hornby
   * Street in 0.107 nm, and calls at Stamps Landing and Yaletown, 0.141 nm
   * apart on opposite shores. They are held only to the first floor, which is
   * still what catches a terminal drifting onto the other end of its own
   * crossing.
   */
  it("keeps distinct terminals far enough apart to be distinct places", () => {
    const crossingFloorNm = 0.05;
    const sameTownFloorNm = 0.2;
    const pairKey = (a: string, b: string) => [a, b].sort().join("|");
    const onOneRoute = new Set(
      ROUTES.flatMap((route) =>
        route.terminalIds.flatMap((a, i) => route.terminalIds.slice(i + 1).map((b) => pairKey(a, b)))
      )
    );
    const terminals = [...TERMINALS_BY_ID.values()];
    const tooClose: string[] = [];

    for (let at = 0; at < terminals.length; at++) {
      for (let against = at + 1; against < terminals.length; against++) {
        const terminal = terminals[at];
        const other = terminals[against];
        if (terminal === undefined || other === undefined) continue;

        const separationNm = haversineNm(terminal.coordinates, other.coordinates);
        const sameRoute = onOneRoute.has(pairKey(terminal.id, other.id));
        const floorNm = sameRoute ? crossingFloorNm : sameTownFloorNm;
        if (separationNm < floorNm) {
          tooClose.push(
            `${terminal.id} <-> ${other.id} (${separationNm.toFixed(3)} nm${sameRoute ? ", on one route" : ""})`
          );
        }
      }
    }

    expect(tooClose).toEqual([]);
  });

  it("keeps known dock-level terminal coordinates on the terminal itself", () => {
    const expectedByTerminalId: Readonly<Record<string, readonly [number, number]>> = {
      "anacortes-guemes-dock": [-122.6236, 48.51907],
      "blaine-harbor": [-122.7586, 48.99398],
      "bowen-island": [-123.33135, 49.37949],
      "bremerton": [-122.62448, 47.56195],
      "brentwood-bay": [-123.46734, 48.57725],
      "buckley-bay": [-124.84655, 49.52639],
      "chemainus": [-123.7142, 48.92553],
      "comox": [-124.92382, 49.73991],
      "cortes-island": [-125.05386, 50.10974],
      "coupeville": [-122.67271, 48.15913],
      "crofton": [-123.63764, 48.8657],
      "denman-island-east": [-124.70882, 49.49393],
      "duke-point": [-123.89177, 49.16001],
      "earls-cove": [-124.00884, 49.75315],
      "edmonds": [-122.3833, 47.81271],
      "everett-jetty-landing": [-122.22313, 48.00429],
      "false-creek-david-lam-park": [-123.12519, 49.27048],
      "false-creek-hornby": [-123.13437, 49.27424],
      "false-creek-maritime-museum": [-123.14701, 49.27871],
      "false-creek-plaza-of-nations": [-123.10982, 49.2742],
      "false-creek-spyglass": [-123.11551, 49.27101],
      "false-creek-stamps-landing": [-123.11876, 49.26942],
      "false-creek-village": [-123.10565, 49.27249],
      "false-creek-yaletown": [-123.11795, 49.27171],
      "french-creek": [-124.35662, 49.34895],
      "fulford-harbour": [-123.45113, 48.76939],
      "gabriola-island": [-123.85838, 49.1778],
      "galiano-island": [-123.31487, 48.87657],
      "gambier-island": [-123.43958, 49.44999],
      "gooseberry-point": [-122.6702, 48.73123],
      "granville-island": [-123.13394, 49.27249],
      "guemes-island": [-122.62466, 48.52803],
      "herron-island": [-122.82747, 47.26699],
      "hornby-island": [-124.70454, 49.51125],
      "jetty-island": [-122.22647, 48.00336],
      "keats-island": [-123.4332, 49.39556],
      "key-peninsula-herron-landing": [-122.81578, 47.27558],
      "langdale": [-123.47234, 49.43394],
      "lasqueti-island": [-124.35159, 49.49144],
      "long-harbour": [-123.44578, 48.85211],
      "lonsdale-quay": [-123.08392, 49.30954],
      "lummi-island": [-122.68131, 48.72044],
      "mayne-island": [-123.32328, 48.84454],
      "mill-bay": [-123.51777, 48.61399],
      "mukilteo": [-122.29704, 47.95067],
      "nanaimo-harbour": [-123.93071, 49.16619],
      "nanaimo-hullo": [-123.92249, 49.16354],
      "pender-island": [-123.31561, 48.80052],
      "penelakut-island": [-123.66127, 48.97073],
      "port-angeles": [-123.43073, 48.12184],
      "port-orchard": [-122.63547, 47.54313],
      "port-orchard-annapolis": [-122.61641, 47.54958],
      "powell-river": [-124.53074, 49.83524],
      "quadra-heriot-bay": [-125.21075, 50.10352],
      "saltery-bay": [-124.1771, 49.78142],
      "saturna-island": [-123.20138, 48.79809],
      "semiahmoo": [-122.77007, 48.98464],
      "sidney-bc": [-123.39672, 48.64315],
      "texada-island": [-124.62007, 49.79482],
      "thetis-island": [-123.67824, 48.98096],
      "vancouver-hullo": [-123.11635, 49.29031],
      "vancouver-waterfront": [-123.10903, 49.28702],
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

  // The mesh is a sailing network, not a ferry one (data/README.md), so a leg
  // that falls back to it is drawn along water no ferry uses. The one
  // expected fallback is the suspended Sidney run. Anything else usually
  // means a leg the boats don't sail: a direct Long Harbour–Swartz Bay leg
  // drew a 20 nm loop east past Pender, when those sailings call at Otter Bay.
  it("falls back to the sailing mesh only for the suspended Friday Harbor–Sidney leg", () => {
    const meshLegs = Object.entries(ROUTE_LEG_GEOMETRY_BY_DIRECTED_TERMINAL_IDS)
      .filter(([, geometry]) => geometry.source === "mesh")
      .map(([legKey]) => legKey.replace("\0", " > "));
    expect(meshLegs).toEqual(["friday-harbor > sidney-bc"]);
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
    expect(report.checkedRoutes).toBe(36);
    expect(report.errors).toEqual([]);
  });
});
