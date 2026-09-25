"use client";

import { useMemo, useState } from "react";
import type { FerryRoute } from "@/domain/ferry";
import { buildSchematicDiagram, strokeToPixels, type GridPoint, type LabelSide } from "@/domain/schematic";
import { OPERATORS_BY_ID } from "@/data/operators";
import { TERMINALS_BY_ID } from "@/data/terminals";
import {
  SCHEMATIC_BORDER,
  SCHEMATIC_LAND,
  SCHEMATIC_LAND_LINKS,
  SCHEMATIC_LAYOUT,
  SCHEMATIC_WATER_LABELS,
} from "@/data/schematic-layout";

/** Pixels per grid unit. */
const CELL = 26;
/** Center-to-center distance between parallel lanes. */
const LANE_WIDTH = 5;
const LINE_WIDTH = 4;
/** Room around the outermost terminals for their labels. */
const MARGIN = { top: 36, right: 150, bottom: 36, left: 150 };

const LABEL_DIRECTIONS: Record<LabelSide, { dx: number; dy: number; anchor: "start" | "middle" | "end" }> = {
  n: { dx: 0, dy: -1, anchor: "middle" },
  ne: { dx: 0.7, dy: -0.7, anchor: "start" },
  e: { dx: 1, dy: 0, anchor: "start" },
  se: { dx: 0.7, dy: 0.7, anchor: "start" },
  s: { dx: 0, dy: 1, anchor: "middle" },
  sw: { dx: -0.7, dy: 0.7, anchor: "end" },
  w: { dx: -1, dy: 0, anchor: "end" },
  nw: { dx: -0.7, dy: -0.7, anchor: "end" },
};

const px = ([x, y]: GridPoint): [number, number] => [x * CELL, y * CELL];

const pathData = (points: readonly (readonly [number, number])[]): string =>
  points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");

/** How far back from each corner a coastline starts to curve, in pixels. */
const COAST_CORNER_RADIUS = 11;

/**
 * A closed outline with every corner eased into a curve, the way Beck
 * softened the Thames. The curve never eats more than half of either edge,
 * so short edges still meet cleanly.
 */
const roundedOutline = (points: readonly (readonly [number, number])[]): string => {
  const toward = (from: readonly [number, number], to: readonly [number, number], distance: number) => {
    const length = Math.hypot(to[0] - from[0], to[1] - from[1]) || 1;
    const t = Math.min(distance, length / 2) / length;
    return `${(from[0] + (to[0] - from[0]) * t).toFixed(1)} ${(from[1] + (to[1] - from[1]) * t).toFixed(1)}`;
  };
  const corners = points.map((corner, i) => {
    const previous = points[(i + points.length - 1) % points.length] ?? corner;
    const next = points[(i + 1) % points.length] ?? corner;
    const at = `${corner[0].toFixed(1)} ${corner[1].toFixed(1)}`;
    return `${toward(corner, previous, COAST_CORNER_RADIUS)} Q ${at} ${toward(corner, next, COAST_CORNER_RADIUS)}`;
  });
  return `M ${corners.join(" L ")} Z`;
};

const routeTitle = (route: FerryRoute): string => {
  const operator = OPERATORS_BY_ID.get(route.operatorId)?.name ?? route.operatorId;
  const status = route.status === "active" ? "" : ` (${route.status})`;
  return `${route.name}${status} — ${operator}`;
};

/** Zoom steps, as a fraction of the diagram's natural size. */
const ZOOM_STEPS = [0.5, 0.65, 0.8, 1, 1.25, 1.5, 2] as const;

/** The diagram's extent in pixels: every terminal, plus room for labels. */
const VIEW = (() => {
  const points = Object.values(SCHEMATIC_LAYOUT.terminals).map((t) => t.position);
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
})();

function DiagramSvg({ routes, style }: { routes: readonly FerryRoute[]; style: React.CSSProperties }) {
  const diagram = useMemo(() => buildSchematicDiagram(routes, SCHEMATIC_LAYOUT), [routes]);

  const shownTerminalIds = new Set(diagram.terminals.map((t) => t.terminalId));
  const landLinks = SCHEMATIC_LAND_LINKS.filter(([a, b]) => shownTerminalIds.has(a) && shownTerminalIds.has(b));
  const landLinked = new Set(landLinks.flat());

  return (
    <svg
      className="schematic-svg"
      viewBox={`${VIEW.minX} ${VIEW.minY} ${VIEW.width} ${VIEW.height}`}
      width={VIEW.width}
      height={VIEW.height}
      style={style}
      role="img"
      aria-labelledby="schematic-title schematic-desc"
    >
      <title id="schematic-title">Salish Sea ferry route diagram</title>
      <desc id="schematic-desc">
        {`A schematic, not-to-scale diagram of ${diagram.lines.length} ferry routes and the ${diagram.terminals.length} terminals they serve, with every route drawn at 45° angles.`}
      </desc>

      <g className="schematic-land" aria-hidden="true">
        {SCHEMATIC_LAND.map(({ name, outline }) => (
          <path key={name} d={roundedOutline(outline.map(px))} />
        ))}
      </g>

      <g className="schematic-water-labels" aria-hidden="true">
        {SCHEMATIC_WATER_LABELS.map(({ text, position }) => {
          const [x, y] = px(position);
          return <text key={text} x={x} y={y} textAnchor="middle">{text}</text>;
        })}
      </g>

      <g aria-hidden="true">
        <path className="schematic-border" d={pathData(SCHEMATIC_BORDER.line.map(px))} />
        {SCHEMATIC_BORDER.labels.map(({ text, position }) => {
          const [x, y] = px(position);
          return <text key={text} className="schematic-border-label" x={x} y={y} textAnchor="end">{text}</text>;
        })}
      </g>

      <g className="schematic-routes">
        {diagram.lines.map((line) => (
          <g key={line.route.id} className="schematic-route" data-route-id={line.route.id} data-status={line.route.status}>
            <title>{routeTitle(line.route)}</title>
            {line.strokes.map((stroke, i) => (
              <path
                key={i}
                d={pathData(strokeToPixels(stroke, CELL, LANE_WIDTH))}
                stroke={OPERATORS_BY_ID.get(line.route.operatorId)?.color}
                strokeWidth={LINE_WIDTH}
              />
            ))}
          </g>
        ))}
      </g>

      <g className="schematic-land-links" aria-hidden="true">
        {landLinks.map(([a, b]) => {
          const from = SCHEMATIC_LAYOUT.terminals[a]?.position;
          const to = SCHEMATIC_LAYOUT.terminals[b]?.position;
          if (from === undefined || to === undefined) return null;
          const d = pathData([px(from), px(to)]);
          return (
            <g key={`${a}-${b}`}>
              <path className="schematic-land-link-outer" d={d} />
              <path className="schematic-land-link-inner" d={d} />
            </g>
          );
        })}
      </g>

      <g className="schematic-terminals">
        {diagram.terminals.map(({ terminalId, terminal, routeCount, maxLane }) => {
          const [x, y] = px(terminal.position);
          const interchange = routeCount > 1 || landLinked.has(terminalId);
          const radius = Math.max(interchange ? 5.5 : 4.5, maxLane * LANE_WIDTH + LINE_WIDTH / 2 + 2);
          const soleRoute = interchange ? undefined : routes.find((r) => r.terminalIds.includes(terminalId));
          const ring = soleRoute === undefined ? undefined : OPERATORS_BY_ID.get(soleRoute.operatorId)?.color;
          const label = LABEL_DIRECTIONS[terminal.labelSide];
          const gap = radius + 5;
          return (
            <g key={terminalId} className={interchange ? "schematic-terminal interchange" : "schematic-terminal"} data-terminal-id={terminalId}>
              <title>{TERMINALS_BY_ID.get(terminalId)?.name ?? terminal.label}</title>
              <circle cx={x} cy={y} r={radius} style={ring === undefined ? undefined : { stroke: ring }} />
              <text
                x={x + label.dx * gap}
                y={y + label.dy * gap}
                textAnchor={label.anchor}
                dominantBaseline="central"
              >
                {terminal.label}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}

export function SchematicDiagram({ routes }: { routes: readonly FerryRoute[] }) {
  // Undefined means "fit": as wide as the panel, but never below 80% of
  // natural size, past which the labels stop being readable.
  const [zoom, setZoom] = useState<number | undefined>(undefined);
  const zoomBy = (direction: 1 | -1) => {
    const current = zoom ?? 1;
    const next = direction === 1
      ? ZOOM_STEPS.find((step) => step > current + 1e-6)
      : [...ZOOM_STEPS].reverse().find((step) => step < current - 1e-6);
    if (next !== undefined) setZoom(next);
  };
  const style = zoom === undefined
    ? { width: "100%", minWidth: VIEW.width * 0.8, maxWidth: VIEW.width, height: "auto" }
    : { width: VIEW.width * zoom, height: "auto" };

  return (
    <div className="schematic-viewport">
      <div className="schematic-zoom" role="group" aria-label="Zoom">
        <button type="button" onClick={() => zoomBy(1)} aria-label="Zoom in" disabled={zoom === ZOOM_STEPS.at(-1)}>+</button>
        <button type="button" onClick={() => zoomBy(-1)} aria-label="Zoom out" disabled={zoom === ZOOM_STEPS[0]}>−</button>
        <button type="button" onClick={() => setZoom(undefined)} aria-pressed={zoom === undefined}>Fit</button>
      </div>
      <div className="schematic-scroller">
        <DiagramSvg routes={routes} style={style} />
      </div>
    </div>
  );
}
