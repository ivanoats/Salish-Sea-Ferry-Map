import { describe, expect, it } from "vitest";
import { ROUTES } from "@/data/routes";
import { TERMINALS_BY_ID } from "@/data/terminals";
import { OPERATORS_BY_ID } from "@/data/operators";

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

  it("the Pierce County Anderson Island route progresses westward without doubling back", () => {
    const route = ROUTES.find((candidate) => candidate.id === "pierce-county-steilacoom-anderson");
    expect(route).toBeDefined();

    const longitudes = route!.terminalIds.map((terminalId) => TERMINALS_BY_ID.get(terminalId)?.coordinates[0]);
    expect(longitudes).toEqual([...longitudes].sort((a, b) => b! - a!));
  });
});
