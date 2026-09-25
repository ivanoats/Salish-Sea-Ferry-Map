import { describe, expect, it } from "vitest";
import { ROUTES } from "@/data/routes";
import { TERMINALS } from "@/data/terminals";
import { SCHEMATIC_LAND, SCHEMATIC_LAND_LINKS, SCHEMATIC_LAYOUT } from "@/data/schematic-layout";
import { isOctolinear, legVertices, unitSteps, type GridPoint } from "@/domain/schematic";

const key = (point: readonly [number, number]) => `${point[0]},${point[1]}`;

/** Even-odd ray cast; points exactly on an edge may land either way. */
const insidePolygon = ([x, y]: GridPoint, outline: readonly GridPoint[]): boolean => {
  let inside = false;
  outline.forEach(([xi, yi], i) => {
    const [xj, yj] = outline[(i + outline.length - 1) % outline.length] ?? [xi, yi];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  });
  return inside;
};

const distanceToSegment = ([x, y]: GridPoint, [ax, ay]: GridPoint, [bx, by]: GridPoint): number => {
  const [dx, dy] = [bx - ax, by - ay];
  const along = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - (ax + along * dx), y - (ay + along * dy));
};

const distanceToCoast = (point: GridPoint): number =>
  Math.min(
    ...SCHEMATIC_LAND.flatMap(({ outline }) =>
      outline.map((a, i) => distanceToSegment(point, a, outline[(i + 1) % outline.length] ?? a))
    )
  );

/** isOctolinear, allowing for the float error in fractional coastline points. */
const isOctolinearEdge = ([ax, ay]: GridPoint, [bx, by]: GridPoint): boolean => {
  const [dx, dy] = [Math.abs(bx - ax), Math.abs(by - ay)];
  const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;
  return !(near(dx, 0) && near(dy, 0)) && (near(dx, 0) || near(dy, 0) || near(dx, dy));
};

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

  it("draws every coastline with horizontal, vertical, and 45° edges", () => {
    const skewed = SCHEMATIC_LAND.flatMap(({ name, outline }) =>
      outline
        .map((a, i) => [a, outline[(i + 1) % outline.length] ?? a] as const)
        .filter(([a, b]) => !isOctolinearEdge(a, b))
        .map(([a, b]) => `${name}: ${a} → ${b}`)
    );
    expect(skewed).toEqual([]);
  });

  it("keeps every route on the water", () => {
    const aground = legs.flatMap(({ route, fromId, toId }) => {
      const points = unitSteps(legVertices(fromId, toId, SCHEMATIC_LAYOUT) ?? []);
      return points.slice(1).flatMap((end, i) => {
        const start = points[i] ?? end;
        const middle: GridPoint = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];
        const land = SCHEMATIC_LAND.find(({ outline }) => insidePolygon(middle, outline));
        return land === undefined ? [] : [`${route.id} crosses ${land.name} at ${middle}`];
      });
    });
    expect(aground).toEqual([]);
  });

  it("puts every terminal on a coast", () => {
    const inland = Object.entries(SCHEMATIC_LAYOUT.terminals)
      .filter(([, terminal]) => distanceToCoast(terminal.position) > 0.5)
      .map(([id, terminal]) => `${id} is ${distanceToCoast(terminal.position).toFixed(2)} from the coast`);
    expect(inland).toEqual([]);
  });
});
