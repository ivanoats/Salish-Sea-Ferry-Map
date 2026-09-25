import type { GridPoint, LabelSide, SchematicLayout } from "@/domain/schematic";

/*
 * Drawing constants and path helpers shared by the on-screen diagram and
 * scripts/export-print-files.ts, so a print file matches the page. Only
 * type imports here: the export script loads this file with plain Node,
 * which can't resolve the `@/` alias for runtime values.
 */

/** Pixels per grid unit. */
export const CELL = 26;
/** Center-to-center distance between parallel lanes. */
export const LANE_WIDTH = 5;
export const LINE_WIDTH = 4;
/** Room around the outermost terminals for their labels. */
export const MARGIN = { top: 36, right: 150, bottom: 36, left: 150 };

export const LABEL_DIRECTIONS: Record<LabelSide, { dx: number; dy: number; anchor: "start" | "middle" | "end" }> = {
  n: { dx: 0, dy: -1, anchor: "middle" },
  ne: { dx: 0.7, dy: -0.7, anchor: "start" },
  e: { dx: 1, dy: 0, anchor: "start" },
  se: { dx: 0.7, dy: 0.7, anchor: "start" },
  s: { dx: 0, dy: 1, anchor: "middle" },
  sw: { dx: -0.7, dy: 0.7, anchor: "end" },
  w: { dx: -1, dy: 0, anchor: "end" },
  nw: { dx: -0.7, dy: -0.7, anchor: "end" },
};

export const px = ([x, y]: GridPoint): [number, number] => [x * CELL, y * CELL];

export const pathData = (points: readonly (readonly [number, number])[]): string =>
  points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");

/** How far back from each corner a coastline starts to curve, in pixels. */
const COAST_CORNER_RADIUS = 11;

/**
 * A closed outline with every corner eased into a curve, the way Beck
 * softened the Thames. The curve never eats more than half of either edge,
 * so short edges still meet cleanly.
 */
export const roundedOutline = (points: readonly (readonly [number, number])[]): string => {
  const toward = (from: readonly [number, number], to: readonly [number, number], distance: number) => {
    const length = Math.hypot(to[0] - from[0], to[1] - from[1]) || 1;
    const fraction = Math.min(distance, length / 2) / length;
    return `${(from[0] + (to[0] - from[0]) * fraction).toFixed(1)} ${(from[1] + (to[1] - from[1]) * fraction).toFixed(1)}`;
  };
  const corners = points.map((corner, i) => {
    const previous = points[(i + points.length - 1) % points.length] ?? corner;
    const next = points[(i + 1) % points.length] ?? corner;
    const at = `${corner[0].toFixed(1)} ${corner[1].toFixed(1)}`;
    return `${toward(corner, previous, COAST_CORNER_RADIUS)} Q ${at} ${toward(corner, next, COAST_CORNER_RADIUS)}`;
  });
  return `M ${corners.join(" L ")} Z`;
};

export interface DiagramView {
  readonly minX: number;
  readonly minY: number;
  readonly width: number;
  readonly height: number;
}

/** The diagram's extent in pixels: every terminal, plus room for labels. */
export const diagramView = (layout: SchematicLayout): DiagramView => {
  const points = Object.values(layout.terminals).map((t) => t.position);
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const minX = Math.min(...xs) * CELL - MARGIN.left;
  const minY = Math.min(...ys) * CELL - MARGIN.top;
  return {
    minX,
    minY,
    width: Math.max(...xs) * CELL + MARGIN.right - minX,
    height: Math.max(...ys) * CELL + MARGIN.bottom - minY,
  };
};

/** A terminal marker is wide enough to cover every lane that reaches it. */
export const terminalRadius = (interchange: boolean, maxLane: number): number =>
  Math.max(interchange ? 5.5 : 4.5, maxLane * LANE_WIDTH + LINE_WIDTH / 2 + 2);
