import { describe, expect, it } from "vitest";
import { ROUTES } from "@/data/routes";
import { TERMINALS } from "@/data/terminals";
import { SCHEMATIC_LAND_LINKS, SCHEMATIC_LAYOUT } from "@/data/schematic-layout";
import { isOctolinear, legVertices, unitSteps } from "@/domain/schematic";

const key = (point: readonly [number, number]) => `${point[0]},${point[1]}`;

const legs = ROUTES.flatMap((route) =>
  route.terminalIds.slice(1).map((toId, i) => ({
    route,
    fromId: route.terminalIds[i] ?? "",
    toId,
  }))
);

describe("schematic layout", () => {
  it("places every terminal, and nothing that isn't one", () => {
    expect(Object.keys(SCHEMATIC_LAYOUT.terminals).sort()).toEqual(
      TERMINALS.map((terminal) => terminal.id).sort()
    );
  });

  it("gives every terminal its own grid point", () => {
    const seen = new Map<string, string>();
    for (const [id, terminal] of Object.entries(SCHEMATIC_LAYOUT.terminals)) {
      const at = key(terminal.position);
      expect(seen.get(at), `${id} shares ${at}`).toBeUndefined();
      seen.set(at, id);
      expect(terminal.position.every(Number.isInteger), `${id} is off-grid`).toBe(true);
    }
  });

  it("only has vias for legs some route actually sails", () => {
    const sailed = new Set(legs.flatMap(({ fromId, toId }) => [`${fromId}>${toId}`, `${toId}>${fromId}`]));
    for (const leg of Object.keys(SCHEMATIC_LAYOUT.legVias)) {
      expect(sailed.has(leg), leg).toBe(true);
    }
  });

  it("draws every leg with horizontal, vertical, and 45° segments only", () => {
    for (const { fromId, toId } of legs) {
      const vertices = legVertices(fromId, toId, SCHEMATIC_LAYOUT) ?? [];
      expect(vertices.length, `${fromId}>${toId}`).toBeGreaterThanOrEqual(2);
      vertices.slice(1).forEach((vertex, i) => {
        const previous = vertices[i];
        expect(previous !== undefined && isOctolinear(previous, vertex), `${fromId}>${toId}`).toBe(true);
      });
    }
  });

  it("never runs a route through a terminal it doesn't call at", () => {
    const terminalAt = new Map(
      Object.entries(SCHEMATIC_LAYOUT.terminals).map(([id, t]) => [key(t.position), id])
    );
    for (const { route, fromId, toId } of legs) {
      const inner = unitSteps(legVertices(fromId, toId, SCHEMATIC_LAYOUT) ?? []).slice(1, -1);
      for (const point of inner) {
        const hit = terminalAt.get(key(point));
        expect(hit, `${route.id} (${fromId}>${toId}) runs through ${hit}`).toBeUndefined();
      }
    }
  });

  it("only links terminals that are placed", () => {
    for (const [a, b] of SCHEMATIC_LAND_LINKS) {
      expect(SCHEMATIC_LAYOUT.terminals[a], a).toBeDefined();
      expect(SCHEMATIC_LAYOUT.terminals[b], b).toBeDefined();
    }
  });
});
