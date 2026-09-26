import type { FerryRoute, Terminal } from "../src/domain/ferry.ts";
import { haversineNm } from "../src/domain/mesh.ts";

export interface Feed {
  operatorId: string;
  referenceDate: string | null;
  skipReason: string | null;
  routes: { id: string; serviceDates: string[] }[];
  stops?: { id: string; coordinates: number[] }[];
}
export interface Mapping {
  routeId: string;
  gtfsRouteIds?: string[];
  stopIds?: Partial<Record<string, string>>;
  skipReason?: string;
  calendarSkipReason?: string;
}

// GTFS may locate the terminal building, berth, or older dock. This is a
// coarse displacement check, not a replacement for the dock-level OSM audit.
export const TERMINAL_TOLERANCE_METRES = 1000;

export function validateGtfs(
  routes: readonly FerryRoute[], terminals: readonly Terminal[],
  feeds: readonly Feed[], mappings: readonly Mapping[],
): { errors: string[]; warnings: string[]; checkedRoutes: number } {
  const errors: string[] = [];
  const warnings: string[] = [];
  let checkedRoutes = 0;
  for (const feed of feeds) {
    if (feed.skipReason) warnings.push(`${feed.operatorId}: ${feed.skipReason}`);
  }
  for (const mapping of mappings) {
    if (!routes.some((route) => route.id === mapping.routeId)) errors.push(`Stale mapping: ${mapping.routeId}`);
    if (mappings.filter((other) => other.routeId === mapping.routeId).length !== 1) errors.push(`Duplicate mapping: ${mapping.routeId}`);
  }
  for (const route of routes) {
    const feed = feeds.find((candidate) => candidate.operatorId === route.operatorId);
    if (!feed) { errors.push(`${route.id}: operator missing from manifest`); continue; }
    if (feed.skipReason) continue;
    const mapping = mappings.find((candidate) => candidate.routeId === route.id);
    if (!mapping) { errors.push(`${route.id}: missing explicit GTFS mapping`); continue; }
    if (mapping.skipReason) { warnings.push(`${route.id}: ${mapping.skipReason}`); continue; }
    checkedRoutes++;
    if (!mapping.gtfsRouteIds?.length) errors.push(`${route.id}: empty GTFS route mapping`);
    const matched = (mapping.gtfsRouteIds ?? []).map((id) => {
      const found = feed.routes.find((candidate) => candidate.id === id);
      if (!found) errors.push(`${route.id}: GTFS route ${id} missing`);
      return found;
    });
    for (const terminalId of route.terminalIds) {
      const stopId = mapping.stopIds?.[terminalId];
      const terminal = terminals.find((candidate) => candidate.id === terminalId);
      const stop = feed.stops?.find((candidate) => candidate.id === stopId);
      if (!terminal || !stop) { errors.push(`${route.id}: terminal ${terminalId} / stop ${stopId} missing`); continue; }
      const [lon, lat] = stop.coordinates;
      if (lon === undefined || lat === undefined || !Number.isFinite(lon) || !Number.isFinite(lat) || Math.abs(lon) > 180 || Math.abs(lat) > 90) {
        errors.push(`${route.id}: invalid coordinates for stop ${stopId}`); continue;
      }
      const distance = haversineNm(terminal.coordinates, [lon, lat]) * 1852;
      if (distance > TERMINAL_TOLERANCE_METRES) errors.push(`${route.id}: ${terminalId} differs from stop ${stopId} by ${Math.round(distance)} m`);
    }
    if (!feed.referenceDate) { errors.push(`${route.id}: missing snapshot date`); continue; }
    const reference = feed.referenceDate.replaceAll("-", "");
    const hasService = matched.some((candidate) => candidate?.serviceDates.some((date) => date >= reference));
    if (mapping.calendarSkipReason) {
      // Exceptions cannot silently survive a feed repair.
      if (hasService) errors.push(`${route.id}: calendar exception is obsolete; review mapping`);
      else warnings.push(`${route.id}: ${mapping.calendarSkipReason}`);
    } else if (route.status === "suspended" && hasService) {
      errors.push(`${route.id}: suspended route has scheduled service`);
    } else if (route.status === "active" && !hasService) {
      errors.push(`${route.id}: active route has no service on or after snapshot date`);
    } else if (route.status === "seasonal") {
      // A short feed cannot establish year-round seasonality. Only corroborate
      // that service exists somewhere in its published window.
      if (!matched.some((candidate) => candidate?.serviceDates.length)) errors.push(`${route.id}: seasonal route has no service in snapshot`);
      warnings.push(`${route.id}: seasonal classification still requires manual verification`);
    }
  }
  return { errors, warnings, checkedRoutes };
}
