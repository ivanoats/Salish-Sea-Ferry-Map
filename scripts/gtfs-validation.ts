import type { FerryRoute, Terminal } from "../src/domain/ferry.ts";
import { haversineNm } from "../src/domain/mesh.ts";

interface FeedRoute {
  id: string;
  serviceDates: string[];
  stops: { id: string }[];
}
export interface Feed {
  operatorId: string;
  referenceDate: string | null;
  skipReason: string | null;
  routes: FeedRoute[];
  stops?: { id: string; coordinates: number[] }[];
}
export interface Mapping {
  routeId: string;
  gtfsRouteIds?: string[];
  stopIds?: Partial<Record<string, string>>;
  stopMembershipSkipReasons?: Partial<Record<string, string>>;
  skipReason?: string;
  calendarSkipReason?: string;
}
interface Report {
  errors: string[];
  warnings: string[];
  checkedRoutes: number;
}

// Terminal-area displacement only; dock-level OSM checks remain separate.
export const TERMINAL_TOLERANCE_METRES = 1000;

function checkMappings(routes: readonly FerryRoute[], mappings: readonly Mapping[], report: Report) {
  const seen = new Set<string>();
  for (const mapping of mappings) {
    if (!routes.some((route) => route.id === mapping.routeId)) report.errors.push(`Stale mapping: ${mapping.routeId}`);
    if (seen.has(mapping.routeId)) report.errors.push(`Duplicate mapping: ${mapping.routeId}`);
    seen.add(mapping.routeId);
  }
}

function matchRoutes(route: FerryRoute, feed: Feed, mapping: Mapping, report: Report): FeedRoute[] {
  const matched: FeedRoute[] = [];
  if (!mapping.gtfsRouteIds?.length) report.errors.push(`${route.id}: empty GTFS route mapping`);
  for (const id of mapping.gtfsRouteIds ?? []) {
    const found = feed.routes.find((candidate) => candidate.id === id);
    if (found) matched.push(found);
    else report.errors.push(`${route.id}: GTFS route ${id} missing`);
  }
  return matched;
}

function checkMembership(terminalId: string, stopId: string, matched: readonly FeedRoute[], mapping: Mapping, report: Report) {
  const served = matched.some((candidate) => candidate.stops.some((stop) => stop.id === stopId));
  const exception = mapping.stopMembershipSkipReasons?.[terminalId];
  if (exception) {
    if (served) report.errors.push(`${mapping.routeId}: ${terminalId} stop membership exception is obsolete; review mapping`);
    else report.warnings.push(`${mapping.routeId}: ${terminalId}: ${exception}`);
  } else if (!served) {
    report.errors.push(`${mapping.routeId}: stop ${stopId} for ${terminalId} is not served by matched GTFS routes`);
  }
}

function coordinatesValid(coordinates: number[]): coordinates is [number, number] {
  const [lon, lat] = coordinates;
  return coordinates.length === 2 && lon !== undefined && lat !== undefined &&
    Number.isFinite(lon) && Number.isFinite(lat) && Math.abs(lon) <= 180 && Math.abs(lat) <= 90;
}

function checkTerminals(route: FerryRoute, terminals: readonly Terminal[], feed: Feed, mapping: Mapping, matched: readonly FeedRoute[], report: Report) {
  for (const terminalId of route.terminalIds) {
    const stopId = mapping.stopIds?.[terminalId];
    const terminal = terminals.find((candidate) => candidate.id === terminalId);
    const stop = feed.stops?.find((candidate) => candidate.id === stopId);
    if (!terminal || !stop) {
      report.errors.push(`${route.id}: terminal ${terminalId} / stop ${stopId} missing`);
      continue;
    }
    checkMembership(terminalId, stop.id, matched, mapping, report);
    if (!coordinatesValid(stop.coordinates)) {
      report.errors.push(`${route.id}: invalid coordinates for stop ${stopId}`);
      continue;
    }
    const distance = haversineNm(terminal.coordinates, stop.coordinates) * 1852;
    if (distance > TERMINAL_TOLERANCE_METRES) report.errors.push(`${route.id}: ${terminalId} differs from stop ${stopId} by ${Math.round(distance)} m`);
  }
}

function checkCalendar(route: FerryRoute, referenceDate: string | null, matched: readonly FeedRoute[], mapping: Mapping, report: Report) {
  if (!referenceDate) {
    report.errors.push(`${route.id}: missing snapshot date`);
    return;
  }
  const reference = referenceDate.replaceAll("-", "");
  const hasService = matched.some((candidate) => candidate.serviceDates.some((date) => date >= reference));
  if (mapping.calendarSkipReason) {
    if (hasService) report.errors.push(`${route.id}: calendar exception is obsolete; review mapping`);
    else report.warnings.push(`${route.id}: ${mapping.calendarSkipReason}`);
    return;
  }
  switch (route.status) {
    case "suspended":
      if (hasService) report.errors.push(`${route.id}: suspended route has scheduled service`);
      break;
    case "active":
      if (!hasService) report.errors.push(`${route.id}: active route has no service on or after snapshot date`);
      break;
    case "seasonal":
      if (!matched.some((candidate) => candidate.serviceDates.length)) report.errors.push(`${route.id}: seasonal route has no service in snapshot`);
      report.warnings.push(`${route.id}: seasonal classification still requires manual verification`);
      break;
  }
}

function checkRoute(route: FerryRoute, terminals: readonly Terminal[], feeds: readonly Feed[], mappings: readonly Mapping[], report: Report) {
  const feed = feeds.find((candidate) => candidate.operatorId === route.operatorId);
  if (!feed) { report.errors.push(`${route.id}: operator missing from manifest`); return; }
  if (feed.skipReason) return;
  const mapping = mappings.find((candidate) => candidate.routeId === route.id);
  if (!mapping) { report.errors.push(`${route.id}: missing explicit GTFS mapping`); return; }
  if (mapping.skipReason) { report.warnings.push(`${route.id}: ${mapping.skipReason}`); return; }
  report.checkedRoutes++;
  const matched = matchRoutes(route, feed, mapping, report);
  checkTerminals(route, terminals, feed, mapping, matched, report);
  checkCalendar(route, feed.referenceDate, matched, mapping, report);
}

export function validateGtfs(
  routes: readonly FerryRoute[], terminals: readonly Terminal[],
  feeds: readonly Feed[], mappings: readonly Mapping[],
): Report {
  const report: Report = { errors: [], warnings: [], checkedRoutes: 0 };
  for (const feed of feeds) {
    if (feed.skipReason) report.warnings.push(`${feed.operatorId}: ${feed.skipReason}`);
  }
  checkMappings(routes, mappings, report);
  for (const route of routes) checkRoute(route, terminals, feeds, mappings, report);
  return report;
}
