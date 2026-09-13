export type RouteLegCoordinate = readonly [number, number];
export type RouteLegGeometrySource = "osm" | "mesh" | "straight";

export interface RouteLegGeometry {
  readonly source: RouteLegGeometrySource;
  readonly coordinates: readonly RouteLegCoordinate[];
}
