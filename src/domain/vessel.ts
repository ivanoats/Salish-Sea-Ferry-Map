/**
 * Live vessel positions — currently only WSF publishes a public feed for
 * this (the WSDOT Vessel Locations API). Everyone else in the dataset (BC
 * Ferries, Black Ball, the county ferries) has no equivalent public API, so
 * this stays WSF-only; see README.md.
 */
export interface VesselPosition {
  readonly vesselId: number;
  readonly name: string;
  /** [longitude, latitude] */
  readonly coordinates: readonly [number, number];
  /** Knots. */
  readonly speed: number;
  /** Degrees, 0-360, true heading. */
  readonly heading: number;
  readonly inService: boolean;
  readonly atDock: boolean;
  readonly departingTerminal: string | null;
  readonly arrivingTerminal: string | null;
}

/**
 * The WSDOT Vessel Locations API's response shape (subset of fields we use).
 * Everything is optional/nullable here because it's an external API we
 * don't control — `parseVesselLocations` drops any entry it can't make
 * sense of rather than throwing.
 */
export interface RawWsdotVesselLocation {
  readonly VesselID?: number;
  readonly VesselName?: string;
  readonly Latitude?: number;
  readonly Longitude?: number;
  readonly Speed?: number;
  readonly Heading?: number;
  readonly InService?: boolean;
  readonly AtDock?: boolean;
  readonly DepartingTerminalName?: string | null;
  readonly ArrivingTerminalName?: string | null;
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

/** Parses the WSDOT API's raw JSON into our domain shape, skipping malformed entries. */
export function parseVesselLocations(raw: readonly RawWsdotVesselLocation[]): VesselPosition[] {
  const vessels: VesselPosition[] = [];

  for (const entry of raw) {
    if (
      entry.VesselID === undefined ||
      entry.VesselName === undefined ||
      !isFiniteNumber(entry.Latitude) ||
      !isFiniteNumber(entry.Longitude)
    ) {
      continue;
    }

    vessels.push({
      vesselId: entry.VesselID,
      name: entry.VesselName,
      coordinates: [entry.Longitude, entry.Latitude],
      speed: isFiniteNumber(entry.Speed) ? entry.Speed : 0,
      heading: isFiniteNumber(entry.Heading) ? entry.Heading : 0,
      inService: entry.InService ?? true,
      atDock: entry.AtDock ?? false,
      departingTerminal: entry.DepartingTerminalName ?? null,
      arrivingTerminal: entry.ArrivingTerminalName ?? null,
    });
  }

  return vessels;
}
