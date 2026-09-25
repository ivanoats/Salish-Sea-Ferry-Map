import type { FerryRoute } from "@/domain/ferry";

/**
 * The octolinear route diagram: the same routes as the geographic map,
 * redrawn in the spirit of Beck's Underground map. Every terminal sits on
 * a hand-placed grid point, every leg runs horizontally, vertically, or at
 * 45°, and routes that sail a common corridor are drawn as parallel lanes.
 *
 * Grid coordinates are x to the right and y *down*, matching SVG, so the
 * renderer can multiply by a cell size and draw without flipping anything.
 */

export type GridPoint = readonly [x: number, y: number];

/** Which side of its marker a terminal's label sits on. */
export type LabelSide = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";

export interface SchematicTerminal {
  readonly position: GridPoint;
  /** Short label for the diagram; the full name lives on the Terminal record. */
  readonly label: string;
  readonly labelSide: LabelSide;
}

export interface SchematicLayout {
  readonly terminals: Readonly<Record<string, SchematicTerminal>>;
  /**
   * Bend points for legs that shouldn't take the default single bend, keyed
   * `from>to` in the direction the points are listed. A leg sailed the other
   * way uses the same points reversed.
   */
  readonly legVias: Readonly<Record<string, readonly GridPoint[]>>;
}

export interface SchematicLine {
  readonly route: FerryRoute;
  /**
   * Continuous runs of unit grid steps. Almost always one per route; a route
   * that repeats a leg (A → B → A) is split rather than drawn twice.
   */
  readonly strokes: readonly SchematicStroke[];
}

export interface SchematicStroke {
  /** Every grid point the stroke passes, one unit step apart. */
  readonly points: readonly GridPoint[];
  /**
   * Lane per step (length `points.length - 1`), in lane widths to the right
   * of this stroke's own direction of travel. 0 when a step is drawn alone.
   */
  readonly lanes: readonly number[];
}

export interface SchematicTerminalMarker {
  readonly terminalId: string;
  readonly terminal: SchematicTerminal;
  /** How many of the drawn routes call here. Two or more makes it an interchange. */
  readonly routeCount: number;
  /** The widest lane offset of any step touching this terminal, in lane widths. */
  readonly maxLane: number;
}

export interface SchematicDiagram {
  readonly lines: readonly SchematicLine[];
  readonly terminals: readonly SchematicTerminalMarker[];
}

const pointKey = (point: GridPoint): string => `${point[0]},${point[1]}`;

const samePoint = (a: GridPoint, b: GridPoint): boolean =>
  a[0] === b[0] && a[1] === b[1];

/** True when a → b is a single horizontal, vertical, or 45° segment. */
export const isOctolinear = (a: GridPoint, b: GridPoint): boolean => {
  const dx = Math.abs(b[0] - a[0]);
  const dy = Math.abs(b[1] - a[1]);
  return (dx !== 0 || dy !== 0) && (dx === 0 || dy === 0 || dx === dy);
};

/**
 * The corner for a leg that can't be drawn straight: the diagonal part runs
 * from the western end (the northern one if they share a column), then a
 * straight run finishes the leg. Tied to position rather than sailing order
 * so a leg bends the same way whichever direction a route lists it.
 */
const defaultBend = (a: GridPoint, b: GridPoint): GridPoint => {
  const aFirst = a[0] < b[0] || (a[0] === b[0] && a[1] <= b[1]);
  const [from, to] = aFirst ? [a, b] : [b, a];
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const diagonal = Math.min(Math.abs(dx), Math.abs(dy));
  return [from[0] + diagonal * Math.sign(dx), from[1] + diagonal * Math.sign(dy)];
};

/**
 * The corner points of one leg, ends included: the hand-placed vias if the
 * layout has any, with a default bend inserted wherever two consecutive
 * points still aren't octolinear. Undefined if either terminal is missing
 * from the layout.
 */
export function legVertices(
  fromId: string,
  toId: string,
  layout: SchematicLayout
): readonly GridPoint[] | undefined {
  const from = layout.terminals[fromId]?.position;
  const to = layout.terminals[toId]?.position;
  if (from === undefined || to === undefined) return undefined;

  const vias =
    layout.legVias[`${fromId}>${toId}`] ??
    [...(layout.legVias[`${toId}>${fromId}`] ?? [])].reverse();

  const vertices: GridPoint[] = [from];
  for (const next of [...vias, to]) {
    const previous = vertices.at(-1) ?? from;
    if (!isOctolinear(previous, next)) vertices.push(defaultBend(previous, next));
    vertices.push(next);
  }
  return vertices;
}

/**
 * Expand octolinear corner points into every grid point between them, so
 * that two routes sharing any stretch of a corridor share whole unit steps
 * and the lane logic can see the overlap. Corner points must be integers.
 */
export function unitSteps(vertices: readonly GridPoint[]): GridPoint[] {
  const first = vertices[0];
  if (first === undefined) return [];
  const points: GridPoint[] = [first];
  for (const vertex of vertices.slice(1)) {
    const start = points.at(-1) ?? first;
    const dx = Math.sign(vertex[0] - start[0]);
    const dy = Math.sign(vertex[1] - start[1]);
    let [x, y] = start;
    while (x !== vertex[0] || y !== vertex[1]) {
      x += dx;
      y += dy;
      points.push([x, y]);
    }
  }
  return points;
}

/** An undirected unit step, keyed the same whichever way it is walked. */
const stepKey = (a: GridPoint, b: GridPoint): string => {
  const [ka, kb] = [pointKey(a), pointKey(b)];
  return ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
};

/** Whether walking a → b follows the step's canonical direction (see stepKey). */
const isCanonical = (a: GridPoint, b: GridPoint): boolean =>
  pointKey(a) < pointKey(b);

interface RouteStrokePoints {
  readonly route: FerryRoute;
  readonly routeIndex: number;
  readonly points: readonly GridPoint[];
}

/** Each route's grid path, split wherever it would retrace a leg it already sailed. */
const routeStrokes = (
  routes: readonly FerryRoute[],
  layout: SchematicLayout
): RouteStrokePoints[] => {
  const strokes: RouteStrokePoints[] = [];

  routes.forEach((route, routeIndex) => {
    const ids = route.terminalIds.filter((id) => layout.terminals[id] !== undefined);
    const sailed = new Set<string>();
    let current: GridPoint[] = [];
    const flush = () => {
      if (current.length > 1) strokes.push({ route, routeIndex, points: current });
      current = [];
    };

    let previous: string | undefined;
    for (const id of ids) {
      const fromId = previous;
      previous = id;
      if (fromId === undefined) continue;
      const leg = fromId < id ? `${fromId}\0${id}` : `${id}\0${fromId}`;
      const vertices = legVertices(fromId, id, layout);
      if (sailed.has(leg) || vertices === undefined) {
        flush();
        continue;
      }
      sailed.add(leg);
      const steps = unitSteps(vertices);
      current = current.length === 0 ? steps : [...current, ...steps.slice(1)];
    }
    flush();
  });

  return strokes;
};

/** One stroke's pass over one unit step. */
interface StepOccurrence {
  readonly stroke: number;
  /** Index of the step within the stroke: points[index] → points[index + 1]. */
  readonly index: number;
  /** True when the stroke walks this step against its canonical direction. */
  readonly reversed: boolean;
}

/**
 * Signed turn from heading `h` onto vector `v`, in radians: 0 for straight
 * on, positive for a turn to the right as drawn (y points down), up to π.
 */
const turn = (h: GridPoint, v: GridPoint): number =>
  Math.atan2(h[0] * v[1] - h[1] * v[0], h[0] * v[0] + h[1] * v[1]);

const minus = (a: GridPoint, b: GridPoint): GridPoint => [a[0] - b[0], a[1] - b[1]];

/**
 * Put two strokes that share a step in lane order: negative if `p` belongs
 * to the left of `q` (looking along the step's canonical direction),
 * positive if to the right.
 *
 * This is the crossing-avoidance rule from metro-map layout. Follow both
 * strokes forward from the shared step until they part company; whichever
 * turns further right there should already be on the right, or the two
 * lines have to cross to get where they're going. If they run out together
 * in that direction (both end at the same terminal), look backward instead,
 * where the sides flip. Because every step in a shared run reaches the same
 * parting points, the whole run agrees on the order and lines don't swap
 * sides mid-corridor. Strokes that never part are ordered by the route list.
 */
const compareLanes = (
  strokes: readonly RouteStrokePoints[],
  p: StepOccurrence,
  q: StepOccurrence
): number => {
  // Relative position k along the step's canonical direction: 0 is its
  // canonical start, 1 its end, 2 the next point beyond, -1 the one before.
  const at = (o: StepOccurrence, k: number): GridPoint | undefined => {
    const points = strokes[o.stroke]?.points ?? [];
    return o.reversed ? points[o.index + 1 - k] : points[o.index + k];
  };

  const parting = (direction: 1 | -1): number | undefined => {
    for (let k = direction === 1 ? 2 : -1; ; k += direction) {
      const nextP = at(p, k);
      const nextQ = at(q, k);
      if (nextP === undefined || nextQ === undefined) return undefined;
      if (samePoint(nextP, nextQ)) continue;
      const here = at(p, k - direction);
      const behind = at(p, k - 2 * direction);
      if (here === undefined || behind === undefined) return undefined;
      const heading = minus(here, behind);
      const difference = turn(heading, minus(nextP, here)) - turn(heading, minus(nextQ, here));
      // Walking backward, a right turn means the stroke sits on the left.
      return Math.sign(difference) * direction;
    }
  };

  return (
    parting(1) ||
    parting(-1) ||
    (strokes[p.stroke]?.routeIndex ?? 0) - (strokes[q.stroke]?.routeIndex ?? 0)
  );
};

/** Assign every step of every stroke a lane, bundling steps that routes share. */
const assignLanes = (strokes: readonly RouteStrokePoints[]): number[][] => {
  const occurrences = new Map<string, StepOccurrence[]>();
  strokes.forEach((stroke, strokeIndex) => {
    // A stroke only counts once per step; one that loops back over a step
    // (none do today) keeps the lane of its first pass.
    const seen = new Set<string>();
    for (let index = 0; index < stroke.points.length - 1; index += 1) {
      const from = stroke.points[index];
      const to = stroke.points[index + 1];
      if (from === undefined || to === undefined) continue;
      const key = stepKey(from, to);
      if (seen.has(key)) continue;
      seen.add(key);
      const list = occurrences.get(key) ?? [];
      list.push({ stroke: strokeIndex, index, reversed: !isCanonical(from, to) });
      occurrences.set(key, list);
    }
  });

  const lanes = strokes.map((stroke) => new Array<number>(Math.max(stroke.points.length - 1, 0)).fill(0));
  for (const list of occurrences.values()) {
    if (list.length < 2) continue;
    const ordered = [...list].sort((p, q) => compareLanes(strokes, p, q));
    ordered.forEach((occurrence, rank) => {
      const lane = rank - (ordered.length - 1) / 2;
      const strokeLanes = lanes[occurrence.stroke];
      if (strokeLanes !== undefined) strokeLanes[occurrence.index] = occurrence.reversed ? -lane : lane;
    });
  }
  return lanes;
};

/**
 * Lay out the given routes as an octolinear diagram. Lanes are worked out
 * over the routes passed in, not the whole catalogue, so hiding an operator
 * re-centers whatever still shares its corridors.
 */
export function buildSchematicDiagram(
  routes: readonly FerryRoute[],
  layout: SchematicLayout
): SchematicDiagram {
  const strokes = routeStrokes(routes, layout);
  const lanes = assignLanes(strokes);

  const lines: SchematicLine[] = routes.map((route) => ({ route, strokes: [] }));
  const strokesByRoute = new Map<FerryRoute, SchematicStroke[]>();
  strokes.forEach((stroke, i) => {
    const list = strokesByRoute.get(stroke.route) ?? [];
    list.push({ points: stroke.points, lanes: lanes[i] ?? [] });
    strokesByRoute.set(stroke.route, list);
  });

  const maxLaneAt = new Map<string, number>();
  strokes.forEach((stroke, i) => {
    stroke.points.forEach((point, index) => {
      const touching = [lanes[i]?.[index - 1], lanes[i]?.[index]].filter((l) => l !== undefined);
      const widest = Math.max(0, ...touching.map(Math.abs));
      const key = pointKey(point);
      maxLaneAt.set(key, Math.max(maxLaneAt.get(key) ?? 0, widest));
    });
  });

  const routeCounts = new Map<string, number>();
  for (const route of routes) {
    for (const id of new Set(route.terminalIds)) {
      routeCounts.set(id, (routeCounts.get(id) ?? 0) + 1);
    }
  }

  const terminals: SchematicTerminalMarker[] = [];
  for (const [terminalId, routeCount] of routeCounts) {
    const terminal = layout.terminals[terminalId];
    if (terminal === undefined) continue;
    terminals.push({
      terminalId,
      terminal,
      routeCount,
      maxLane: maxLaneAt.get(pointKey(terminal.position)) ?? 0,
    });
  }

  return {
    lines: lines
      .map((line) => ({ ...line, strokes: strokesByRoute.get(line.route) ?? [] }))
      .filter((line) => line.strokes.length > 0),
    terminals,
  };
}

/**
 * Turn a stroke into drawable points: grid → pixels, each step pushed
 * sideways by its lane. Straight runs in one lane collapse to a single
 * segment; where the lane changes on a straight run, the line shifts over
 * at 45° centered on the grid point; at a corner the two offset segments
 * meet at their intersection, which keeps parallel lanes evenly spaced
 * all the way around a bend.
 */
export function strokeToPixels(
  stroke: SchematicStroke,
  cellSize: number,
  laneWidth: number
): [number, number][] {
  interface Segment { from: GridPoint; to: GridPoint; dir: [number, number]; offset: number }
  const segments: Segment[] = [];
  for (let i = 0; i < stroke.points.length - 1; i += 1) {
    const from = stroke.points[i];
    const to = stroke.points[i + 1];
    if (from === undefined || to === undefined) continue;
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const length = Math.hypot(dx, dy);
    const dir: [number, number] = [dx / length, dy / length];
    const offset = (stroke.lanes[i] ?? 0) * laneWidth;
    const last = segments.at(-1);
    if (last !== undefined && last.dir[0] === dir[0] && last.dir[1] === dir[1] && last.offset === offset) {
      last.to = to;
    } else {
      segments.push({ from, to, dir, offset });
    }
  }

  const px = (p: GridPoint): [number, number] => [p[0] * cellSize, p[1] * cellSize];
  // Right-hand normal of a heading, with y pointing down.
  const shifted = (p: GridPoint, dir: [number, number], offset: number): [number, number] => {
    const [x, y] = px(p);
    return [x - dir[1] * offset, y + dir[0] * offset];
  };

  const first = segments[0];
  if (first === undefined) return [];
  const result: [number, number][] = [shifted(first.from, first.dir, first.offset)];

  for (let i = 0; i < segments.length - 1; i += 1) {
    const current = segments[i];
    const next = segments[i + 1];
    if (current === undefined || next === undefined) continue;
    const cross = current.dir[0] * next.dir[1] - current.dir[1] * next.dir[0];
    if (Math.abs(cross) < 1e-9) {
      // Same heading, new lane: slide across at 45°.
      const half = Math.abs(next.offset - current.offset) / 2;
      const [cx, cy] = px(current.to);
      result.push(
        [cx - current.dir[0] * half - current.dir[1] * current.offset, cy - current.dir[1] * half + current.dir[0] * current.offset],
        [cx + next.dir[0] * half - next.dir[1] * next.offset, cy + next.dir[1] * half + next.dir[0] * next.offset]
      );
      continue;
    }
    // Intersect the two offset lines: pa + along·da = pb + u·db.
    const pa = shifted(current.to, current.dir, current.offset);
    const pb = shifted(current.to, next.dir, next.offset);
    const along = ((pb[0] - pa[0]) * next.dir[1] - (pb[1] - pa[1]) * next.dir[0]) / cross;
    result.push([pa[0] + along * current.dir[0], pa[1] + along * current.dir[1]]);
  }

  const last = segments.at(-1) ?? first;
  result.push(shifted(last.to, last.dir, last.offset));
  return result;
}
