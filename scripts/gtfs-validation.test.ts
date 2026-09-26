import { describe, expect, it } from "vitest";
import { validateGtfs, type Feed, type Mapping } from "./gtfs-validation";
import type { FerryRoute, Terminal } from "../src/domain/ferry";

const route: FerryRoute = { id: "route", name: "Crossing", operatorId: "wsf", mode: "vehicle", status: "active", terminalIds: ["dock"] };
const terminals: Terminal[] = [{ id: "dock", name: "Dock", jurisdiction: "WA", coordinates: [-123, 48] }];
const feed: Feed = { operatorId: "wsf", referenceDate: "2026-09-26", skipReason: null, routes: [{ id: "f", serviceDates: ["20260927"] }], stops: [{ id: "s", coordinates: [-123, 48] }] };
const mapping: Mapping = { routeId: "route", gtfsRouteIds: ["f"], stopIds: { dock: "s" } };
const check = (f = feed, r = route, m = mapping) => validateGtfs([r], terminals, [f], [m]);

describe("GTFS drift validation", () => {
  it("accepts a matching route using snapshot time, not wall-clock time", () => expect(check().errors).toEqual([]));
  it("fails if a pinned route id disappears", () => expect(check({ ...feed, routes: [] }).errors).toContain("route: GTFS route f missing"));
  it("fails if a mapped stop moves more than the tolerance", () => {
    expect(check({ ...feed, stops: [{ id: "s", coordinates: [-124, 48] }] }).errors.join()).toContain("differs from stop");
  });
  it("does not silently rematch a missing stop to a nearby one", () => {
    expect(check({ ...feed, stops: [{ id: "other", coordinates: [-123, 48] }] }).errors.join()).toContain("stop s missing");
  });
  it("rejects scheduled service on a suspended route", () => expect(check(feed, { ...route, status: "suspended" }).errors).toContain("route: suspended route has scheduled service"));
  it("rejects an active route with no remaining service", () => expect(check({ ...feed, routes: [{ id: "f", serviceDates: ["20260925"] }] }).errors).toContain("route: active route has no service on or after snapshot date"));
  it("allows seasonal service earlier in the snapshot without asserting year-round status", () => {
    const report = check({ ...feed, routes: [{ id: "f", serviceDates: ["20260925"] }] }, { ...route, status: "seasonal" });
    expect(report.errors).toEqual([]);
    expect(report.warnings.join()).toContain("manual verification");
  });
  it("warns and skips an expired or unavailable feed", () => {
    const report = check({ ...feed, skipReason: "Expired", routes: [], stops: [] });
    expect(report.errors).toEqual([]);
    expect(report.checkedRoutes).toBe(0);
    expect(report.warnings).toEqual(["wsf: Expired"]);
  });
  it("requires exceptions to be removed when service data returns", () => {
    expect(check(feed, route, { ...mapping, calendarSkipReason: "Incomplete calendar" }).errors.join()).toContain("exception is obsolete");
  });
  it("fails rather than silently skipping a newly curated route", () => {
    expect(validateGtfs([route], terminals, [feed], []).errors).toContain("route: missing explicit GTFS mapping");
  });
});
