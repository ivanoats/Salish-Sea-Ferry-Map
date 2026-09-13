import { describe, expect, it } from "vitest";
import { routesToLineFeatureCollection, terminalsToPointFeatureCollection } from "@/domain/geojson";
import type { FerryRoute, Terminal } from "@/domain/ferry";
import { haversineNm } from "@/domain/mesh";
import { ROUTES } from "@/data/routes";
import { TERMINALS_BY_ID } from "@/data/terminals";
import { ROUTE_LEG_GEOMETRY_BY_DIRECTED_TERMINAL_IDS } from "@/data/route-leg-geometry";

const terminals: Terminal[] = [
  { id: "a", name: "A", coordinates: [-123, 48], jurisdiction: "WA" },
  { id: "b", name: "B", coordinates: [-124, 49], jurisdiction: "BC" },
  { id: "c", name: "C", coordinates: [-125, 50], jurisdiction: "BC" },
  { id: "d", name: "D", coordinates: [-122, 47], jurisdiction: "WA" },
];
const terminalsById = new Map(terminals.map((t) => [t.id, t] as const));

const route = (id: string, terminalIds: string[], over: Partial<FerryRoute> = {}): FerryRoute => ({
  id,
  name: `Route ${id}`,
  operatorId: "wsf",
  mode: "vehicle",
  status: "active",
  terminalIds,
  ...over,
});

const routes: FerryRoute[] = [
  route("r1", ["a", "b"], { name: "A to B" }),
  route("r2", ["a", "does-not-exist"], { name: "Broken route" }),
];

const toLonLat = (position: GeoJSON.Position): readonly [number, number] => [
  position[0] as number,
  position[1] as number,
];

const lineDistanceNm = (coordinates: readonly GeoJSON.Position[]): number => {
  let total = 0;
  for (let at = 1; at < coordinates.length; at++) {
    const from = coordinates[at - 1];
    const to = coordinates[at];
    if (from === undefined || to === undefined) continue;
    total += haversineNm(toLonLat(from), toLonLat(to));
  }
  return total;
};

describe("routesToLineFeatureCollection", () => {
  it("builds one LineString per resolvable route leg", () => {
    const fc = routesToLineFeatureCollection(routes, terminalsById);
    expect(fc.features).toHaveLength(1);
    expect(fc.features[0]?.properties.routeId).toBe("r1");
    expect(fc.features[0]?.geometry.coordinates).toEqual([
      [-123, 48],
      [-124, 49],
    ]);
  });

  it("splits a multi-stop route into one feature per leg", () => {
    const fc = routesToLineFeatureCollection([route("multi", ["a", "b", "c"])], terminalsById);
    expect(fc.features.map((f) => f.properties.legIndex)).toEqual([0, 1]);
    expect(fc.features.map((f) => f.geometry.coordinates)).toEqual([
      [
        [-123, 48],
        [-124, 49],
      ],
      [
        [-124, 49],
        [-125, 50],
      ],
    ]);
  });

  it("skips a route that resolves to fewer than two terminals", () => {
    const fc = routesToLineFeatureCollection([route("r", ["does-not-exist"])], terminalsById);
    expect(fc.features).toHaveLength(0);
  });

  it("bridges a leg whose intermediate terminal does not resolve", () => {
    const fc = routesToLineFeatureCollection([route("r", ["a", "typo", "c"])], terminalsById);
    expect(fc.features).toHaveLength(1);
    expect(fc.features[0]?.geometry.coordinates).toEqual([
      [-123, 48],
      [-125, 50],
    ]);
  });

  it("draws a leg a circuit repeats only once", () => {
    // A route that calls at A, B, then A again sails one stretch of
    // water, not two — without the dedupe it would be offset against
    // itself.
    const fc = routesToLineFeatureCollection([route("loop", ["a", "b", "a"])], terminalsById);
    expect(fc.features).toHaveLength(1);
    expect(fc.features[0]?.properties.offsetIndex).toBe(0);
  });

  it("leaves a leg drawn on its own at offset zero", () => {
    const fc = routesToLineFeatureCollection([routes[0]!], terminalsById);
    expect(fc.features[0]?.properties.offsetIndex).toBe(0);
  });

  it("offsets two routes over the same leg into opposite lanes", () => {
    // The real case: WSF's car ferry and Kitsap Transit's fast ferry both
    // run Seattle–Bremerton, and the operators list the pair in opposite
    // orders.
    const carFerry = route("car", ["a", "b"]);
    const fastFerry = route("fast", ["b", "a"], {
      operatorId: "kitsap-transit",
      mode: "passenger",
    });

    const fc = routesToLineFeatureCollection([carFerry, fastFerry], terminalsById);

    expect(fc.features.map((f) => f.properties.offsetIndex)).toEqual([-0.5, 0.5]);
    // Both are redrawn west-to-east, so opposite offsets really do put
    // them on opposite sides rather than stacking them again.
    expect(fc.features[0]?.geometry.coordinates).toEqual(fc.features[1]?.geometry.coordinates);
    expect(fc.features[0]?.geometry.coordinates).toEqual([
      [-124, 49],
      [-123, 48],
    ]);
  });

  it("reuses reverse-direction baked geometry and orients the full polyline for shared lanes", () => {
    const key = "a\0b";
    const prior = ROUTE_LEG_GEOMETRY_BY_DIRECTED_TERMINAL_IDS[key];
    (
      ROUTE_LEG_GEOMETRY_BY_DIRECTED_TERMINAL_IDS as Record<
        string,
        readonly (readonly [number, number])[]
      >
    )[key] = [
      [-124, 49],
      [-123.8, 48.8],
      [-123, 48],
    ];

    try {
      const carFerry = route("car", ["a", "b"]);
      const fastFerry = route("fast", ["b", "a"], {
        operatorId: "kitsap-transit",
        mode: "passenger",
      });
      const fc = routesToLineFeatureCollection([carFerry, fastFerry], terminalsById);

      expect(fc.features.map((f) => f.geometry.coordinates)).toEqual([
        [
          [-124, 49],
          [-123.8, 48.8],
          [-123, 48],
        ],
        [
          [-124, 49],
          [-123.8, 48.8],
          [-123, 48],
        ],
      ]);
      expect(fc.features.map((f) => f.properties.offsetIndex)).toEqual([-0.5, 0.5]);
    } finally {
      if (prior === undefined) {
        delete (ROUTE_LEG_GEOMETRY_BY_DIRECTED_TERMINAL_IDS as Record<string, unknown>)[
          key
        ];
      } else {
        (
          ROUTE_LEG_GEOMETRY_BY_DIRECTED_TERMINAL_IDS as Record<
            string,
            readonly (readonly [number, number])[]
          >
        )[key] = prior;
      }
    }
  });

  it("centers three routes sharing a leg on the true line", () => {
    const fc = routesToLineFeatureCollection(
      [route("x", ["a", "b"]), route("y", ["a", "b"]), route("z", ["a", "b"])],
      terminalsById
    );
    expect(fc.features.map((f) => f.properties.offsetIndex)).toEqual([-1, 0, 1]);
  });

  it("offsets only the legs two routes actually share", () => {
    // Both BC Ferries Southern Gulf Islands runs thread the same islands
    // but reach them from different mainland terminals: the shared middle
    // splits into lanes, the approaches stay on their own lines.
    const viaSwartzBay = route("swartz", ["d", "b", "c"]);
    const viaTsawwassen = route("tsawwassen", ["a", "b", "c"]);

    const fc = routesToLineFeatureCollection([viaSwartzBay, viaTsawwassen], terminalsById);
    const byLeg = fc.features.map((f) => ({
      routeId: f.properties.routeId,
      legIndex: f.properties.legIndex,
      offsetIndex: f.properties.offsetIndex,
    }));

    expect(byLeg).toEqual([
      { routeId: "swartz", legIndex: 0, offsetIndex: 0 }, // D–B, its own
      { routeId: "swartz", legIndex: 1, offsetIndex: -0.5 }, // B–C, shared
      { routeId: "tsawwassen", legIndex: 0, offsetIndex: 0 }, // A–B, its own
      { routeId: "tsawwassen", legIndex: 1, offsetIndex: 0.5 }, // B–C, shared
    ]);
  });

  it("keeps a route on one side along a run of shared legs", () => {
    // Two routes sharing B–C and C–D must not swap across each other at C.
    const first = route("first", ["a", "b", "c", "d"]);
    const second = route("second", ["b", "c", "d"]);

    const fc = routesToLineFeatureCollection([first, second], terminalsById);
    const offsetsFor = (routeId: string) =>
      fc.features.filter((f) => f.properties.routeId === routeId).map((f) => f.properties.offsetIndex);

    expect(offsetsFor("first")).toEqual([0, -0.5, -0.5]);
    expect(offsetsFor("second")).toEqual([0.5, 0.5]);
  });

  it("re-centers the survivor when its counterpart is filtered out", () => {
    const fastFerry = route("fast", ["b", "a"]);
    const fc = routesToLineFeatureCollection([fastFerry], terminalsById);
    expect(fc.features[0]?.properties.offsetIndex).toBe(0);
    // Drawn alone it keeps its own sailing order — nothing to line up with.
    expect(fc.features[0]?.geometry.coordinates).toEqual([
      [-124, 49],
      [-123, 48],
    ]);
  });
});

describe("terminalsToPointFeatureCollection", () => {
  it("includes every terminal touched by the given routes, deduplicated", () => {
    const fc = terminalsToPointFeatureCollection(routes, terminalsById);
    const ids = fc.features.map((f) => f.properties.terminalId).sort();
    expect(ids).toEqual(["a", "b"]);
  });
});

describe("routesToLineFeatureCollection with baked mesh legs", () => {
  const routeById = (id: string): FerryRoute => {
    const found = ROUTES.find((route) => route.id === id);
    if (found === undefined) throw new Error(`missing route ${id}`);
    return found;
  };

  it("draws Anacortes–Friday Harbor with mesh geometry longer than a straight line", () => {
    const route = routeById("wsf-anacortes-sidney");
    const fc = routesToLineFeatureCollection([route], TERMINALS_BY_ID);
    const leg = fc.features.find(
      (feature) =>
        feature.properties.routeId === "wsf-anacortes-sidney" &&
        feature.properties.legIndex === 0
    );

    expect(leg).toBeDefined();
    const coordinates = leg?.geometry.coordinates ?? [];
    expect(coordinates.length).toBeGreaterThan(2);
    expect(lineDistanceNm(coordinates)).toBeGreaterThan(
      haversineNm(
        TERMINALS_BY_ID.get("anacortes")!.coordinates,
        TERMINALS_BY_ID.get("friday-harbor")!.coordinates
      )
    );
  });

  it("keeps Southern Gulf shared legs as matching polylines with opposite offsets", () => {
    const swartz = routeById("bcf-swartzbay-southerngulfislands");
    const tsawwassen = routeById("bcf-tsawwassen-southerngulfislands");
    const fc = routesToLineFeatureCollection([swartz, tsawwassen], TERMINALS_BY_ID);

    for (const legIndex of [1, 2, 3]) {
      const swartzLeg = fc.features.find(
        (feature) =>
          feature.properties.routeId === swartz.id &&
          feature.properties.legIndex === legIndex
      );
      const tsawwassenLeg = fc.features.find(
        (feature) =>
          feature.properties.routeId === tsawwassen.id &&
          feature.properties.legIndex === legIndex
      );

      expect(swartzLeg).toBeDefined();
      expect(tsawwassenLeg).toBeDefined();

      const swartzCoordinates = swartzLeg?.geometry.coordinates ?? [];
      const tsawwassenCoordinates = tsawwassenLeg?.geometry.coordinates ?? [];
      expect(swartzCoordinates.length).toBeGreaterThan(2);
      expect(tsawwassenCoordinates.length).toBeGreaterThan(2);
      expect(swartzCoordinates).toEqual(tsawwassenCoordinates);

      expect(swartzLeg?.properties.offsetIndex).toBe(-0.5);
      expect(tsawwassenLeg?.properties.offsetIndex).toBe(0.5);

      const from = swartzCoordinates[0];
      const to = swartzCoordinates.at(-1);
      expect(from).toBeDefined();
      expect(to).toBeDefined();
      if (from === undefined || to === undefined) continue;
      expect(lineDistanceNm(swartzCoordinates)).toBeGreaterThan(
        haversineNm(toLonLat(from), toLonLat(to))
      );
    }
  });
});
