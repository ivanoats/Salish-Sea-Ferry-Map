import { describe, expect, it } from "vitest";
import type { FerryRoute } from "@/domain/ferry";
import {
  buildSchematicDiagram,
  isOctolinear,
  legVertices,
  strokeToPixels,
  unitSteps,
  type GridPoint,
  type SchematicLayout,
} from "@/domain/schematic";

const route = (id: string, terminalIds: string[]): FerryRoute => ({
  id,
  name: id,
  operatorId: "wsf",
  mode: "vehicle",
  status: "active",
  terminalIds,
});

const layout = (
  positions: Record<string, GridPoint>,
  legVias: SchematicLayout["legVias"] = {}
): SchematicLayout => ({
  terminals: Object.fromEntries(
    Object.entries(positions).map(([id, position]) => [id, { position, label: id, labelSide: "e" as const }])
  ),
  legVias,
});

const lanesOf = (diagram: ReturnType<typeof buildSchematicDiagram>, routeId: string) =>
  diagram.lines.find((line) => line.route.id === routeId)?.strokes[0]?.lanes;

describe("isOctolinear", () => {
  it("accepts horizontal, vertical, and 45° segments", () => {
    expect(isOctolinear([0, 0], [3, 0])).toBe(true);
    expect(isOctolinear([0, 0], [0, -2])).toBe(true);
    expect(isOctolinear([0, 0], [-2, 2])).toBe(true);
  });

  it("rejects other angles and zero-length segments", () => {
    expect(isOctolinear([0, 0], [3, 1])).toBe(false);
    expect(isOctolinear([1, 1], [1, 1])).toBe(false);
  });
});

describe("legVertices", () => {
  it("draws an already-octolinear leg as one segment", () => {
    expect(legVertices("a", "b", layout({ a: [0, 0], b: [2, 2] }))).toEqual([[0, 0], [2, 2]]);
  });

  it("bends other legs once, diagonal first from the western end, whichever way they're sailed", () => {
    const testLayout = layout({ a: [0, 0], b: [4, 2] });
    expect(legVertices("a", "b", testLayout)).toEqual([[0, 0], [2, 2], [4, 2]]);
    expect(legVertices("b", "a", testLayout)).toEqual([[4, 2], [2, 2], [0, 0]]);
  });

  it("follows hand-placed vias in either direction", () => {
    const testLayout = layout({ a: [0, 0], b: [4, 2] }, { "a>b": [[0, 2]] });
    expect(legVertices("a", "b", testLayout)).toEqual([[0, 0], [0, 2], [4, 2]]);
    expect(legVertices("b", "a", testLayout)).toEqual([[4, 2], [0, 2], [0, 0]]);
  });

  it("is undefined for a terminal the layout doesn't place", () => {
    expect(legVertices("a", "missing", layout({ a: [0, 0] }))).toBeUndefined();
  });
});

describe("unitSteps", () => {
  it("fills in every grid point along each segment", () => {
    expect(unitSteps([[0, 0], [2, 0], [0, 2]])).toEqual([[0, 0], [1, 0], [2, 0], [1, 1], [0, 2]]);
  });
});

describe("buildSchematicDiagram", () => {
  it("draws a leg alone in the center lane", () => {
    const diagram = buildSchematicDiagram([route("r", ["a", "b"])], layout({ a: [0, 0], b: [2, 0] }));
    expect(lanesOf(diagram, "r")).toEqual([0, 0]);
  });

  it("splits a shared leg into lanes on opposite sides, whichever way each route sails it", () => {
    const diagram = buildSchematicDiagram(
      [route("out", ["a", "b"]), route("back", ["b", "a"])],
      layout({ a: [0, 0], b: [2, 0] })
    );
    const out = lanesOf(diagram, "out") ?? [];
    const back = lanesOf(diagram, "back") ?? [];
    // Each is measured to the right of its own heading, so opposite
    // headings on opposite sides show up as the same sign.
    expect(out).toEqual([-0.5, -0.5]);
    expect(back).toEqual([-0.5, -0.5]);
  });

  it("puts the route that turns right at the end of a shared corridor in the right-hand lane", () => {
    //   a ── m ── n ─ ─ r (keeps east)
    //             │
    //             s (turns south, i.e. right)
    const testLayout = layout({ a: [0, 0], n: [2, 0], r: [4, 0], s: [2, 2] });
    const diagram = buildSchematicDiagram(
      // Listed so the fallback input order would put them the wrong way round.
      [route("turns-right", ["a", "n", "s"]), route("straight", ["a", "n", "r"])],
      testLayout
    );
    // Heading east, right is south: positive lanes.
    expect(lanesOf(diagram, "turns-right")?.slice(0, 2)).toEqual([0.5, 0.5]);
    expect(lanesOf(diagram, "straight")?.slice(0, 2)).toEqual([-0.5, -0.5]);
  });

  it("looks backward when two routes share a corridor all the way to its end", () => {
    // Both end at t, having joined at g from different directions:
    //        n
    //        │
    //   w ── g ── t
    const testLayout = layout({ w: [0, 0], g: [2, 0], t: [4, 0], n: [2, -2] });
    const diagram = buildSchematicDiagram(
      [route("from-west", ["w", "g", "t"]), route("from-north", ["n", "g", "t"])],
      testLayout
    );
    // Heading east from g, the route that came down from the north should
    // sit on the north (left, negative) side so neither crosses the other.
    const fromNorth = lanesOf(diagram, "from-north") ?? [];
    const fromWest = lanesOf(diagram, "from-west") ?? [];
    expect(fromNorth.slice(-2)).toEqual([-0.5, -0.5]);
    expect(fromWest.slice(-2)).toEqual([0.5, 0.5]);
  });

  it("recenters lanes on the routes it is given", () => {
    const testLayout = layout({ a: [0, 0], b: [2, 0] });
    const both = buildSchematicDiagram([route("x", ["a", "b"]), route("y", ["a", "b"])], testLayout);
    const one = buildSchematicDiagram([route("x", ["a", "b"])], testLayout);
    expect(lanesOf(both, "x")?.[0]).not.toBe(0);
    expect(lanesOf(one, "x")).toEqual([0, 0]);
  });

  it("counts routes per terminal and reports the widest lane touching it", () => {
    const diagram = buildSchematicDiagram(
      [route("x", ["a", "b"]), route("y", ["a", "b", "c"])],
      layout({ a: [0, 0], b: [2, 0], c: [2, 2] })
    );
    const byId = new Map(diagram.terminals.map((t) => [t.terminalId, t]));
    expect(byId.get("b")?.routeCount).toBe(2);
    expect(byId.get("c")?.routeCount).toBe(1);
    expect(byId.get("b")?.maxLane).toBe(0.5);
    expect(byId.get("c")?.maxLane).toBe(0);
  });

  it("doesn't draw a leg twice when a route sails back over it", () => {
    const diagram = buildSchematicDiagram([route("r", ["a", "b", "a"])], layout({ a: [0, 0], b: [2, 0] }));
    const strokes = diagram.lines[0]?.strokes ?? [];
    // One stroke covering the a → b leg once, as unit grid steps; the
    // b → a return sails the same water and adds nothing to draw.
    expect(strokes).toHaveLength(1);
    expect(strokes[0]?.points).toEqual([[0, 0], [1, 0], [2, 0]]);
  });
});

describe("strokeToPixels", () => {
  it("scales a lone straight stroke to one segment", () => {
    const stroke = { points: [[0, 0], [1, 0], [2, 0]] as GridPoint[], lanes: [0, 0] };
    expect(strokeToPixels(stroke, 10, 4)).toEqual([[0, 0], [20, 0]]);
  });

  it("pushes a lane to the right of the heading, and meets offset segments at a corner", () => {
    // East then south, one lane to the right (south, then west).
    const stroke = { points: [[0, 0], [1, 0], [1, 1]] as GridPoint[], lanes: [1, 1] };
    const points = strokeToPixels(stroke, 10, 4);
    expect(points[0]).toEqual([0, 4]);
    expect(points[1]?.[0]).toBeCloseTo(6);
    expect(points[1]?.[1]).toBeCloseTo(4);
    expect(points[2]).toEqual([6, 10]);
  });
});
