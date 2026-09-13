"use client";

import {
  Map as MapLibreMap,
  NavigationControl,
  Popup,
  setWorkerUrl,
  type ExpressionSpecification,
  type GeoJSONSource,
  type LayerSpecification,
  type SourceSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import type { OperatorId } from "@/domain/ferry";
import { routesToLineFeatureCollection, terminalsToPointFeatureCollection } from "@/domain/geojson";
import type { VesselPosition } from "@/domain/vessel";
import { ROUTES } from "@/data/routes";
import { TERMINALS_BY_ID } from "@/data/terminals";
import { OPERATORS } from "@/data/operators";
import {
  SALISH_SEA_CENTER,
  SALISH_SEA_ZOOM,
  ROUTES_SOURCE_ID,
  ROUTES_LAYER_ID,
  TERMINALS_SOURCE_ID,
  TERMINALS_LAYER_ID,
  TERMINAL_DOT_COLOR,
  TERMINAL_DOT_STROKE_COLOR,
  TERMINAL_DOT_RADIUS,
  ROUTE_LINE_WIDTH,
  ROUTE_OFFSET_SPACING,
  SUSPENDED_LINE_OPACITY,
  ACTIVE_LINE_OPACITY,
  VESSELS_SOURCE_ID,
  VESSEL_LAYER_ID,
  VESSEL_DOT_COLOR,
  VESSEL_DOT_STROKE_COLOR,
  VESSEL_DOT_RADIUS,
} from "./map-constants";

interface VesselProperties {
  name: string;
  speed: number;
  heading: number;
  departingTerminal: string;
  arrivingTerminal: string;
}

const vesselsToFeatureCollection = (
  vessels: readonly VesselPosition[]
): GeoJSON.FeatureCollection<GeoJSON.Point, VesselProperties> => ({
  type: "FeatureCollection",
  features: vessels.map((vessel) => ({
    type: "Feature",
    properties: {
      name: vessel.name,
      speed: vessel.speed,
      heading: vessel.heading,
      departingTerminal: vessel.departingTerminal ?? "",
      arrivingTerminal: vessel.arrivingTerminal ?? "",
    },
    geometry: { type: "Point", coordinates: [vessel.coordinates[0], vessel.coordinates[1]] },
  })),
});

interface FerryMapProps {
  /** Operator ids currently switched on in the filter panel. */
  readonly visibleOperatorIds: ReadonlySet<OperatorId>;
  /** Whether suspended/seasonal-inactive routes should still be drawn (faded). */
  readonly showInactiveRoutes: boolean;
  /** Live WSF vessel positions, or empty when the live layer is off/unavailable. */
  readonly vessels: readonly VesselPosition[];
}

// See scripts/copy-maplibre-worker.mjs for why this file exists and why
// maplibre's default worker resolution doesn't work under Turbopack.
let workerUrlSet = false;
const ensureWorkerUrl = () => {
  if (workerUrlSet) return;
  setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
  workerUrlSet = true;
};

const emptyFeatureCollection = (): GeoJSON.FeatureCollection => ({
  type: "FeatureCollection",
  features: [],
});

const geometrySourceLabel = (source: string): string => {
  switch (source) {
    case "osm":
      return "OSM ferry-route geometry";
    case "mesh":
      return "mesh fallback";
    default:
      return "straight-line fallback";
  }
};

/** MapLibre `match` expression pairing each operator id with its display color. */
const operatorColorExpression: unknown[] = ["match", ["get", "operatorId"]];
for (const operator of OPERATORS) {
  operatorColorExpression.push(operator.id, operator.color);
}
operatorColorExpression.push("#64748b"); // fallback

export function FerryMap({ visibleOperatorIds, showInactiveRoutes, vessels }: FerryMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const popupRef = useRef<Popup | null>(null);
  const [styleLoaded, setStyleLoaded] = useState(false);

  // Map creation — runs once.
  useEffect(() => {
    if (containerRef.current === null || mapRef.current !== null) return undefined;
    ensureWorkerUrl();

    const sources: Record<string, SourceSpecification> = {
      basemap: {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        attribution: "© OpenStreetMap contributors",
      },
      [ROUTES_SOURCE_ID]: { type: "geojson", data: emptyFeatureCollection() },
      [TERMINALS_SOURCE_ID]: { type: "geojson", data: emptyFeatureCollection() },
      [VESSELS_SOURCE_ID]: { type: "geojson", data: emptyFeatureCollection() },
    };

    const layers: LayerSpecification[] = [
      { id: "basemap", type: "raster", source: "basemap" },
      {
        id: ROUTES_LAYER_ID,
        type: "line",
        source: ROUTES_SOURCE_ID,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": operatorColorExpression as unknown as ExpressionSpecification,
          "line-width": ["interpolate", ["linear"], ["zoom"], ...ROUTE_LINE_WIDTH.flat()],
          // Nudge routes that share both terminals into parallel lanes, so
          // e.g. the WSF car ferry and the Kitsap Transit fast ferry to
          // Bremerton are both visible instead of one sitting on the other.
          "line-offset": [
            "interpolate",
            ["linear"],
            ["zoom"],
            ...ROUTE_OFFSET_SPACING.flatMap(([zoom, gap]) => [zoom, ["*", ["get", "offsetIndex"], gap]]),
          ] as unknown as ExpressionSpecification,
          "line-opacity": [
            "case",
            ["==", ["get", "status"], "suspended"],
            SUSPENDED_LINE_OPACITY,
            ACTIVE_LINE_OPACITY,
          ],
          "line-dasharray": ["case", ["==", ["get", "status"], "suspended"], ["literal", [2, 1.5]], ["literal", [1, 0]]],
        },
      },
      {
        id: TERMINALS_LAYER_ID,
        type: "circle",
        source: TERMINALS_SOURCE_ID,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], ...TERMINAL_DOT_RADIUS.flat()],
          "circle-color": TERMINAL_DOT_COLOR,
          "circle-opacity": 0.9,
          "circle-stroke-width": 1.5,
          "circle-stroke-color": TERMINAL_DOT_STROKE_COLOR,
        },
      },
      {
        id: VESSEL_LAYER_ID,
        type: "circle",
        source: VESSELS_SOURCE_ID,
        paint: {
          "circle-radius": VESSEL_DOT_RADIUS,
          "circle-color": VESSEL_DOT_COLOR,
          "circle-stroke-width": 2,
          "circle-stroke-color": VESSEL_DOT_STROKE_COLOR,
        },
      },
    ];

    const map = new MapLibreMap({
      container: containerRef.current,
      center: [SALISH_SEA_CENTER[0], SALISH_SEA_CENTER[1]],
      zoom: SALISH_SEA_ZOOM,
      style: { version: 8, sources, layers },
    });
    map.addControl(new NavigationControl(), "top-right");

    map.on("click", ROUTES_LAYER_ID, (event) => {
      const feature = event.features?.[0];
      if (feature === undefined) return;
      const name = String(feature.properties.name);
      const status = String(feature.properties.status);
      const geometrySource = String(feature.properties.geometrySource ?? "straight");
      const labelBase =
        status === "suspended"
          ? `${name} (suspended)`
          : status === "seasonal"
            ? `${name} (seasonal)`
            : name;
      const label = `${labelBase} — ${geometrySourceLabel(geometrySource)}`;
      popupRef.current?.remove();
      popupRef.current = new Popup().setLngLat(event.lngLat).setText(label).addTo(map);
    });
    map.on("click", TERMINALS_LAYER_ID, (event) => {
      const feature = event.features?.[0];
      if (feature === undefined || feature.geometry.type !== "Point") return;
      const [lon, lat] = feature.geometry.coordinates;
      if (lon === undefined || lat === undefined) return;
      popupRef.current?.remove();
      popupRef.current = new Popup().setLngLat([lon, lat]).setText(String(feature.properties.name)).addTo(map);
    });
    map.on("click", VESSEL_LAYER_ID, (event) => {
      const feature = event.features?.[0];
      if (feature === undefined || feature.geometry.type !== "Point") return;
      const props = feature.properties as Partial<VesselProperties>;
      const route =
        props.departingTerminal && props.arrivingTerminal
          ? `${props.departingTerminal} → ${props.arrivingTerminal}`
          : undefined;
      const speed = typeof props.speed === "number" ? `${props.speed.toFixed(1)} kn` : undefined;
      const label = [props.name, route, speed].filter(Boolean).join(" — ");
      popupRef.current?.remove();
      popupRef.current = new Popup().setLngLat(event.lngLat).setText(label).addTo(map);
    });
    for (const layerId of [ROUTES_LAYER_ID, TERMINALS_LAYER_ID, VESSEL_LAYER_ID]) {
      map.on("mouseenter", layerId, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", layerId, () => {
        map.getCanvas().style.cursor = "";
      });
    }

    mapRef.current = map;
    setStyleLoaded(Boolean(map.isStyleLoaded()));
    map.on("style.load", () => setStyleLoaded(true));

    return () => {
      popupRef.current?.remove();
      popupRef.current = null;
      map.remove();
      mapRef.current = null;
      setStyleLoaded(false);
    };
  }, []);

  // Push filtered data into the sources whenever the filter changes.
  useEffect(() => {
    const map = mapRef.current;
    if (map === null || !styleLoaded) return;

    const visibleRoutes = ROUTES.filter((route) => {
      if (!visibleOperatorIds.has(route.operatorId)) return false;
      if (route.status === "suspended" && !showInactiveRoutes) return false;
      return true;
    });

    const routesSource = map.getSource<GeoJSONSource>(ROUTES_SOURCE_ID);
    routesSource?.setData(routesToLineFeatureCollection(visibleRoutes, TERMINALS_BY_ID));

    const terminalsSource = map.getSource<GeoJSONSource>(TERMINALS_SOURCE_ID);
    terminalsSource?.setData(terminalsToPointFeatureCollection(visibleRoutes, TERMINALS_BY_ID));
  }, [visibleOperatorIds, showInactiveRoutes, styleLoaded]);

  // Live vessel positions — pushed independently since they refresh on their own poll cadence.
  useEffect(() => {
    const map = mapRef.current;
    if (map === null || !styleLoaded) return;
    const vesselsSource = map.getSource<GeoJSONSource>(VESSELS_SOURCE_ID);
    vesselsSource?.setData(vesselsToFeatureCollection(vessels));
  }, [vessels, styleLoaded]);

  return <div aria-label="Salish Sea ferry route map" role="region" ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
