/** Salish Sea map view constants shared across map components. */

/** Default center — roughly the middle of the Strait of Georgia / Puget Sound. */
export const SALISH_SEA_CENTER: readonly [number, number] = [-123.4, 48.8];

/** Default zoom level to show the full Salish Sea region. */
export const SALISH_SEA_ZOOM = 6.6;

export const ROUTES_SOURCE_ID = "ferry-routes";
export const ROUTES_LAYER_ID = "ferry-routes-lines";
export const TERMINALS_SOURCE_ID = "ferry-terminals";
export const TERMINALS_LAYER_ID = "ferry-terminals-circles";

export const SUSPENDED_LINE_OPACITY = 0.35;
export const ACTIVE_LINE_OPACITY = 0.85;

/** Route line width, as [zoom, px] stops. */
export const ROUTE_LINE_WIDTH: readonly (readonly [number, number])[] = [
  [5, 2],
  [10, 4],
];

/**
 * Perpendicular gap, in px, between routes sharing both terminals — one
 * lane apart (see `offsetIndex` in domain/geojson.ts). Kept at roughly
 * 1.5x ROUTE_LINE_WIDTH at the same zoom stops, so the two lines sit
 * shoulder to shoulder with a hairline of water between them however far
 * you zoom in.
 */
export const ROUTE_OFFSET_SPACING: readonly (readonly [number, number])[] = [
  [5, 3],
  [10, 6],
];

export const TERMINAL_DOT_COLOR = "#1e293b";
export const TERMINAL_DOT_STROKE_COLOR = "#ffffff";
export const TERMINAL_DOT_RADIUS: readonly (readonly [number, number])[] = [
  [5, 2.5],
  [8, 4],
  [12, 6],
];

export const FIT_BOUNDS_PADDING = 48;

export const VESSELS_SOURCE_ID = "wsf-vessels";
export const VESSEL_LAYER_ID = "wsf-vessels-circles";
export const VESSEL_DOT_COLOR = "#facc15";
export const VESSEL_DOT_STROKE_COLOR = "#1e293b";
export const VESSEL_DOT_RADIUS = 6;
