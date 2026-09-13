/**
 * Core domain types for the Salish Sea ferry map.
 *
 * Kept deliberately small: a `Terminal` is a point, a `FerryRoute` is an
 * ordered list of terminal ids sailed by one operator, and everything the
 * UI needs (colors, filtering, GeoJSON) is derived from those two shapes
 * plus the `Operator` catalogue below.
 */

/** Every ferry operator represented on the map. */
export type OperatorId =
  | "wsf"
  | "bc-ferries"
  | "black-ball"
  | "king-county-water-taxi"
  | "kitsap-transit"
  | "pierce-county"
  | "victoria-clipper"
  | "skagit-county"
  | "whatcom-county";

export interface Operator {
  readonly id: OperatorId;
  readonly name: string;
  readonly shortName: string;
  /** Concrete hex color used for this operator's routes on the map and in the legend. */
  readonly color: string;
  readonly website: string;
}

/** Whether a vessel carries vehicles or passengers/bicycles only. */
export type FerryMode = "vehicle" | "passenger";

/** Current service state of a route. */
export type RouteStatus = "active" | "seasonal" | "suspended";

export interface Terminal {
  readonly id: string;
  readonly name: string;
  /** [longitude, latitude], matching GeoJSON coordinate order. */
  readonly coordinates: readonly [number, number];
  /** "WA" | "BC" — which side of the border the terminal is on. */
  readonly jurisdiction: "WA" | "BC";
}

export interface FerryRoute {
  readonly id: string;
  readonly name: string;
  readonly operatorId: OperatorId;
  readonly mode: FerryMode;
  readonly status: RouteStatus;
  /**
   * Terminal ids in sailing order. Two ids for a simple crossing; three or
   * more for a route that calls at intermediate islands (e.g. the WSF San
   * Juan Islands run, or a BC Ferries Gulf Islands circuit).
   */
  readonly terminalIds: readonly string[];
  /** Short human note shown in the route list — crossing time, vessel name, caveats. */
  readonly note?: string;
}

export const isRouteActive = (route: FerryRoute): boolean => route.status !== "suspended";

/** All terminal ids a route touches, in order, with duplicates removed while preserving first occurrence. */
export const routeTerminalIds = (route: FerryRoute): readonly string[] => [
  ...new Set(route.terminalIds),
];
