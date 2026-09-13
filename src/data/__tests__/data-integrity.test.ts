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
});
