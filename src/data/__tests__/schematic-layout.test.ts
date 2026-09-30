import { describe, expect, it } from "vitest";
import { ROUTES } from "@/data/routes";
import { TERMINALS } from "@/data/terminals";
import {
  SCHEMATIC_INSETS,
  SCHEMATIC_LAND,
  SCHEMATIC_LAND_LINKS,
  SCHEMATIC_LAYOUT,
  type SchematicInset,
} from "@/data/schematic-layout";
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

/** The inset whose box a point falls in, if any. */
const insetAt = ([x, y]: GridPoint): SchematicInset | undefined =>
  SCHEMATIC_INSETS.find(({ box }) => box.min[0] <= x && x <= box.max[0] && box.min[1] <= y && y <= box.max[1]);

/** Inside an inset's box only its own land counts; the main land it covers is hidden there. */
const landAt = (point: GridPoint) => insetAt(point)?.land ?? SCHEMATIC_LAND;

/** Every separately drawn set of land: the main diagram's, then each inset's. */
const landSets = [SCHEMATIC_LAND, ...SCHEMATIC_INSETS.map((inset) => inset.land)];

const distanceToCoast = (point: GridPoint): number =>
  Math.min(
    ...landAt(point).flatMap(({ outline }) =>
      outline.map((a, i) => distanceToSegment(point, a, outline[(i + 1) % outline.length] ?? a))
    )
  );

/** How far past a coast a terminal marker still reaches, in grid units. */
const MARKER_REACH = 0.2;
/** The narrowest water that still reads as a channel between two landmasses. */
const MIN_CHANNEL = 0.25;

const distanceToLand = (point: GridPoint): number =>
  landAt(point).some(({ outline }) => insidePolygon(point, outline)) ? 0 : distanceToCoast(point);

type Segment = readonly [GridPoint, GridPoint];

const edgesOf = (outline: readonly GridPoint[]): Segment[] =>
  outline.map((p, i) => [p, outline[(i + 1) % outline.length] ?? p] as const);

/** Whether two segments cross or touch, including collinear overlap. */
const segmentsMeet = ([p, q]: Segment, [r, s]: Segment): boolean => {
  const turn = (a: GridPoint, b: GridPoint, c: GridPoint) =>
    Math.sign((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
  const within = (a: GridPoint, b: GridPoint, c: GridPoint) =>
    Math.min(a[0], b[0]) <= c[0] && c[0] <= Math.max(a[0], b[0]) &&
    Math.min(a[1], b[1]) <= c[1] && c[1] <= Math.max(a[1], b[1]);
  const [d1, d2, d3, d4] = [turn(r, s, p), turn(r, s, q), turn(p, q, r), turn(p, q, s)];
  if (d1 !== d2 && d3 !== d4) return true;
  return (d1 === 0 && within(r, s, p)) || (d2 === 0 && within(r, s, q)) ||
    (d3 === 0 && within(p, q, r)) || (d4 === 0 && within(p, q, s));
};

/**
 * Shortest distance between two polygon outlines, or 0 where they overlap:
 * one inside the other, or any pair of edges crossing. A corner test alone
 * misses shapes that cross like a plus sign, with every corner outside.
 */
const distanceBetween = (a: readonly GridPoint[], b: readonly GridPoint[]): number => {
  const [edgesA, edgesB] = [edgesOf(a), edgesOf(b)];
  if (edgesA.some((e) => edgesB.some((f) => segmentsMeet(e, f)))) return 0;
  if (a.some((p) => insidePolygon(p, b)) || b.some((p) => insidePolygon(p, a))) return 0;
  const toOutline = (point: GridPoint, edges: readonly Segment[]) =>
    Math.min(...edges.map(([p, q]) => distanceToSegment(point, p, q)));
  return Math.min(...a.map((p) => toOutline(p, edgesB)), ...b.map((p) => toOutline(p, edgesA)));
};

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
    const skewed = landSets.flat().flatMap(({ name, outline }) =>
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
        const land = landAt(middle).find(({ outline }) => insidePolygon(middle, outline));
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

  // A marker is 4.5–5.5 px across plus its stroke, about 0.2 grid units, so
  // a terminal further than that from land draws as a circle in the water.
  it("puts every terminal on its land, not in the water beside it", () => {
    const afloat = Object.entries(SCHEMATIC_LAYOUT.terminals)
      .filter(([, terminal]) => distanceToLand(terminal.position) > MARKER_REACH)
      .map(([id, terminal]) => `${id} is ${distanceToLand(terminal.position).toFixed(2)} out in the water`);
    expect(afloat).toEqual([]);
  });

  it("measures outlines whose edges cross as touching, even with no corner inside the other", () => {
    const across: GridPoint[] = [[0, 1], [3, 1], [3, 2], [0, 2]];
    const down: GridPoint[] = [[1, 0], [2, 0], [2, 3], [1, 3]];
    expect(distanceBetween(across, down)).toBe(0);

    const sideBySide: GridPoint[] = [[3, 1], [4, 1], [4, 2], [3, 2]];
    expect(distanceBetween(across, sideBySide)).toBe(0);
    const offshore: GridPoint[] = [[3.5, 1], [4, 1], [4, 2], [3.5, 2]];
    expect(distanceBetween(across, offshore)).toBeCloseTo(0.5);
  });

  it("keeps separate landmasses visibly apart", () => {
    const touching = landSets.flatMap((land) =>
      land.flatMap((a, i) =>
        land.slice(i + 1)
          .filter((b) => distanceBetween(a.outline, b.outline) < MIN_CHANNEL)
          .map((b) => `${a.name} and ${b.name} are ${distanceBetween(a.outline, b.outline).toFixed(2)} apart`)
      )
    );
    expect(touching).toEqual([]);
  });

  // An inset hides the main land under its box, so a route may not cross the
  // frame: it would run from one geography into another. Everything a route
  // touches is either in one inset or clear of all of them.
  it("keeps each route wholly inside one inset or clear of them all", () => {
    const straddling = legs.flatMap(({ route, fromId, toId }) => {
      const where = unitSteps(legVertices(fromId, toId, SCHEMATIC_LAYOUT) ?? []).map((p) => insetAt(p)?.title ?? "main");
      return new Set(where).size > 1 ? [`${route.id} (${fromId}>${toId}) crosses an inset frame`] : [];
    });
    expect(straddling).toEqual([]);
  });


  it("draws Deception Pass as a narrows between Whidbey and Fidalgo", () => {
    const land = (name: string) => SCHEMATIC_LAND.find((l) => l.name === name)?.outline ?? [];
    const pass = distanceBetween(land("Whidbey Island"), land("Mainland"));
    // Open water, but narrow: neither a land bridge nor a wide strait.
    expect(pass).toBeGreaterThanOrEqual(MIN_CHANNEL);
    expect(pass).toBeLessThanOrEqual(0.4);
  });
});
