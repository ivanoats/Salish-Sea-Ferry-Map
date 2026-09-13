import type { FerryRoute, Terminal } from "@/domain/ferry";
import { ROUTE_LEG_GEOMETRY_BY_DIRECTED_TERMINAL_IDS } from "@/data/route-leg-geometry";

export interface RouteLineProperties {
  routeId: string;
  name: string;
  operatorId: string;
  mode: string;
  status: string;
  /** Which leg of the route this is, counting from 0 in sailing order. */
  legIndex: number;
  /**
   * Which parallel lane this leg occupies when other routes sail the same
   * stretch of water — Seattle–Bremerton, for instance, is served by both
   * a WSF car ferry and a Kitsap Transit fast ferry, and drawn plainly
   * one hides the other entirely. Lanes are centered on the true line: 0
   * when a leg is drawn alone, -0.5/+0.5 for a pair, -1/0/+1 for three.
   * The map multiplies this by a pixel gap to get `line-offset` (see
   * ROUTE_OFFSET_SPACING).
   */
  offsetIndex: number;
}

export interface TerminalPointProperties {
  terminalId: string;
  name: string;
  jurisdiction: string;
}

/**
 * Identifies a stretch of water between two terminals, ignoring which way
 * a route sails it. WSF lists Seattle→Bremerton and Kitsap Transit lists
 * Bremerton→Seattle; it is the same crossing and it gets the same key.
 * NUL is the separator because no terminal id can contain one.
 */
const legKey = (fromId: string, toId: string): string =>
  [fromId, toId]
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    .join("\0");
const directedLegKey = (fromId: string, toId: string): string =>
  `${fromId}\0${toId}`;

/**
 * Reverse a leg, if needed, so it runs west to east (south to north when
 * its ends share a longitude).
 *
 * `line-offset` shifts a line relative to its own direction of travel, so
 * two routes sailing one stretch in opposite directions would be pushed
 * to the *same* side and go on overlapping. Putting them on a common
 * heading first makes their offsets land on opposite sides. A LineString
 * renders identically either way, so this is only applied to legs that
 * are actually being offset.
 */
const orientWestToEast = (
  coordinates: readonly (readonly [number, number])[]
): readonly (readonly [number, number])[] => {
  const from = coordinates[0];
  const to = coordinates.at(-1);
  if (from === undefined || to === undefined) return coordinates;
  const backwards = from[0] > to[0] || (from[0] === to[0] && from[1] > to[1]);
  return backwards ? [...coordinates].reverse() : coordinates;
};

interface RouteLeg {
  readonly route: FerryRoute;
  readonly legIndex: number;
  readonly key: string;
  readonly coordinates: readonly (readonly [number, number])[];
}

type RouteLegGeometryByDirectedTerminalIds = Readonly<
  Record<string, readonly (readonly [number, number])[]>
>;

const routeLegCoordinates = (
  from: Terminal,
  to: Terminal,
  routeLegGeometryByDirectedTerminalIds: RouteLegGeometryByDirectedTerminalIds
): readonly (readonly [number, number])[] => {
  const direct = routeLegGeometryByDirectedTerminalIds[
    directedLegKey(from.id, to.id)
  ];
  if (direct !== undefined) return direct;

  const reverse = routeLegGeometryByDirectedTerminalIds[
    directedLegKey(to.id, from.id)
  ];
  if (reverse !== undefined) return [...reverse].reverse();

  return [from.coordinates, to.coordinates];
};

/**
 * Split each route into its terminal-to-terminal legs, dropping terminal
 * ids that don't resolve (a typo in the dataset) and any leg a route
 * repeats — a circuit that calls at A, B, then A again sails one stretch
 * of water, not two.
 */
const routeLegs = (
  routes: readonly FerryRoute[],
  terminalsById: ReadonlyMap<string, Terminal>,
  routeLegGeometryByDirectedTerminalIds: RouteLegGeometryByDirectedTerminalIds
): RouteLeg[] => {
  const legs: RouteLeg[] = [];

  for (const route of routes) {
    const terminals = route.terminalIds
      .map((id) => terminalsById.get(id))
      .filter((t): t is Terminal => t !== undefined);

    const seen = new Set<string>();
    for (let i = 0; i < terminals.length - 1; i++) {
      const from = terminals[i]!;
      const to = terminals[i + 1]!;
      const key = legKey(from.id, to.id);
      if (seen.has(key)) continue;
      seen.add(key);
      legs.push({
        route,
        // `seen` has just grown to the number of legs kept for this route.
        legIndex: seen.size - 1,
        key,
        coordinates: routeLegCoordinates(
          from,
          to,
          routeLegGeometryByDirectedTerminalIds
        ),
      });
    }
  }

  return legs;
};

/**
 * One LineString feature per leg of each route, in sailing order. A route
 * that resolves to fewer than two terminals contributes nothing — a
 * single point can't be drawn as a line, and that terminal likely has a
 * typo in its id.
 *
 * Legs rather than whole routes because overlap is a per-leg question.
 * Two routes can share part of a path without sharing all of it: both BC
 * Ferries Southern Gulf Islands runs thread Galiano–Mayne–Pender–Saturna
 * but reach it from different mainland terminals. Bundling by leg lets
 * them run as parallel lanes through the islands and rejoin their own
 * lines on either side, the way a transit map draws shared track.
 *
 * Lanes are numbered over the routes passed in rather than the whole
 * catalogue, so filtering an operator out re-centers whatever is left
 * back onto its terminals.
 */
export function routesToLineFeatureCollection(
  routes: readonly FerryRoute[],
  terminalsById: ReadonlyMap<string, Terminal>,
  routeLegGeometryByDirectedTerminalIds: RouteLegGeometryByDirectedTerminalIds = ROUTE_LEG_GEOMETRY_BY_DIRECTED_TERMINAL_IDS
): GeoJSON.FeatureCollection<GeoJSON.LineString, RouteLineProperties> {
  const legs = routeLegs(
    routes,
    terminalsById,
    routeLegGeometryByDirectedTerminalIds
  );

  const laneCounts = new Map<string, number>();
  for (const leg of legs) {
    laneCounts.set(leg.key, (laneCounts.get(leg.key) ?? 0) + 1);
  }

  // Lanes are handed out in the order routes appear, so two routes that
  // share several legs in a row keep the same side the whole way instead
  // of swapping across each other at every terminal.
  const lanesTaken = new Map<string, number>();
  const features: GeoJSON.Feature<GeoJSON.LineString, RouteLineProperties>[] = [];

  for (const leg of legs) {
    const laneCount = laneCounts.get(leg.key) ?? 1;
    const lane = lanesTaken.get(leg.key) ?? 0;
    lanesTaken.set(leg.key, lane + 1);

    const shared = laneCount > 1;
    const coordinates = shared ? orientWestToEast(leg.coordinates) : leg.coordinates;

    features.push({
      type: "Feature",
      properties: {
        routeId: leg.route.id,
        name: leg.route.name,
        operatorId: leg.route.operatorId,
        mode: leg.route.mode,
        status: leg.route.status,
        legIndex: leg.legIndex,
        offsetIndex: shared ? lane - (laneCount - 1) / 2 : 0,
      },
      geometry: {
        type: "LineString",
        coordinates: coordinates.map((point) => [point[0], point[1]]),
      },
    });
  }

  return { type: "FeatureCollection", features };
}

/** One Point feature per terminal that at least one of the given routes touches. */
export function terminalsToPointFeatureCollection(
  routes: readonly FerryRoute[],
  terminalsById: ReadonlyMap<string, Terminal>
): GeoJSON.FeatureCollection<GeoJSON.Point, TerminalPointProperties> {
  const touchedIds = new Set(routes.flatMap((r) => r.terminalIds));

  const features: GeoJSON.Feature<GeoJSON.Point, TerminalPointProperties>[] = [];
  for (const id of touchedIds) {
    const terminal = terminalsById.get(id);
    if (terminal === undefined) continue;
    features.push({
      type: "Feature",
      properties: { terminalId: terminal.id, name: terminal.name, jurisdiction: terminal.jurisdiction },
      geometry: { type: "Point", coordinates: [terminal.coordinates[0], terminal.coordinates[1]] },
    });
  }

  return { type: "FeatureCollection", features };
}
