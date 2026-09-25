"use client";

import { useMemo, useState } from "react";
import type { FerryRoute } from "@/domain/ferry";
import { buildSchematicDiagram, strokeToPixels } from "@/domain/schematic";
import { OPERATORS, OPERATORS_BY_ID } from "@/data/operators";
import { TERMINALS_BY_ID } from "@/data/terminals";
import {
  SCHEMATIC_BORDER,
  SCHEMATIC_LAND,
  SCHEMATIC_LAND_LINKS,
  SCHEMATIC_LAYOUT,
  SCHEMATIC_WATER_LABELS,
} from "@/data/schematic-layout";
import {
  CELL,
  LABEL_DIRECTIONS,
  LANE_WIDTH,
  LINE_WIDTH,
  diagramView,
  pathData,
  px,
  roundedOutline,
  terminalRadius,
} from "@/components/schematic/schematic-geometry";

const routeTitle = (route: FerryRoute): string => {
  const operator = OPERATORS_BY_ID.get(route.operatorId)?.name ?? route.operatorId;
  const status = route.status === "active" ? "" : ` (${route.status})`;
  return `${route.name}${status} — ${operator}`;
};

/** Zoom steps, as a fraction of the diagram's natural size. */
const ZOOM_STEPS = [0.5, 0.65, 0.8, 1, 1.25, 1.5, 2] as const;

const VIEW = diagramView(SCHEMATIC_LAYOUT);

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
            {line.strokes.map((stroke) => (
              <path
                key={`${stroke.points[0]}-${stroke.points.at(-1)}`}
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
          const linkPath = pathData([px(from), px(to)]);
          return (
            <g key={`${a}-${b}`}>
              <path className="schematic-land-link-outer" d={linkPath} />
              <path className="schematic-land-link-inner" d={linkPath} />
            </g>
          );
        })}
      </g>

      <g className="schematic-terminals">
        {diagram.terminals.map(({ terminalId, terminal, routeCount, maxLane }) => {
          const [x, y] = px(terminal.position);
          const interchange = routeCount > 1 || landLinked.has(terminalId);
          const radius = terminalRadius(interchange, maxLane);
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

/** Which color is which operator, for the operators currently drawn. */
function RouteLegend({ routes }: Readonly<{ routes: readonly FerryRoute[] }>) {
  const drawn = new Set(routes.map((route) => route.operatorId));
  const operators = OPERATORS.filter((operator) => drawn.has(operator.id));
  if (operators.length === 0) return null;
  return (
    <details className="schematic-legend" open>
      <summary>Operators</summary>
      <ul>
        {operators.map((operator) => (
          <li key={operator.id}>
            <svg viewBox="0 0 24 8" aria-hidden="true">
              <path d="M3 4h18" stroke={operator.color} strokeWidth={LINE_WIDTH} />
            </svg>
            {operator.shortName}
          </li>
        ))}
      </ul>
    </details>
  );
}

export function SchematicDiagram({ routes }: { routes: readonly FerryRoute[] }) {
  // "fit" is as wide as the panel, but never below 80% of natural size,
  // past which the labels stop being readable.
  const [zoom, setZoom] = useState<number | "fit">("fit");
  const zoomBy = (direction: 1 | -1) => {
    const current = zoom === "fit" ? 1 : zoom;
    const next = direction === 1
      ? ZOOM_STEPS.find((step) => step > current + 1e-6)
      : [...ZOOM_STEPS].reverse().find((step) => step < current - 1e-6);
    if (next !== undefined) setZoom(next);
  };
  const style = zoom === "fit"
    ? { width: "100%", minWidth: VIEW.width * 0.8, maxWidth: VIEW.width, height: "auto" }
    : { width: VIEW.width * zoom, height: "auto" };

  return (
    <div className="schematic-viewport">
      <div className="schematic-zoom" role="group" aria-label="Zoom">
        <button type="button" onClick={() => zoomBy(1)} aria-label="Zoom in" disabled={zoom === ZOOM_STEPS.at(-1)}>+</button>
        <button type="button" onClick={() => zoomBy(-1)} aria-label="Zoom out" disabled={zoom === ZOOM_STEPS[0]}>−</button>
        <button type="button" onClick={() => setZoom("fit")} aria-pressed={zoom === "fit"}>Fit</button>
      </div>
      <RouteLegend routes={routes} />
      <div className="schematic-scroller">
        <DiagramSvg routes={routes} style={style} />
      </div>
    </div>
  );
}
