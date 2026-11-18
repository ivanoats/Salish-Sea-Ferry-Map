"use client";

import {
  Map as MapLibreMap,
  NavigationControl,
  Popup,
  setWorkerUrl,
  type ExpressionSpecification,
  type GeoJSONSource,
  type LayerSpecification,
  type MapGeoJSONFeature,
  type SourceSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import { BASEMAPS, type BasemapId } from "./basemaps";
import {
  createMosquitoFleetPopup,
  MOSQUITO_FLEET_LAYERS,
  MOSQUITO_FLEET_SOURCE,
  MOSQUITO_FLEET_SOURCE_ID,
} from "./mosquito-fleet";
import type { OperatorId } from "@/domain/ferry";
import { routesToLineFeatureCollection, terminalsToPointFeatureCollection } from "@/domain/geojson";
import type { RouteLegGeometrySource } from "@/data/route-leg-geometry";
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

interface MapClickChoice {
  key: string;
  label: string;
  content: string | HTMLElement;
  coordinates?: [number, number];
  historical: boolean;
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
  readonly basemapId: BasemapId;
  /** Operator ids currently switched on in the filter panel. */
  readonly visibleOperatorIds: ReadonlySet<OperatorId>;
  /** Whether suspended/seasonal-inactive routes should still be drawn (faded). */
  readonly showInactiveRoutes: boolean;
  readonly showMosquitoFleet: boolean;
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

const geometrySourceLabel = (source: RouteLegGeometrySource): string => {
  switch (source) {
    case "osm":
      return "OSM ferry-route geometry";
    case "mesh":
      return "mesh fallback";
    default:
      return "straight-line fallback";
  }
};

const routeLegGeometrySource = (
  value: unknown
): RouteLegGeometrySource | null => {
  switch (value) {
    case "osm":
    case "mesh":
    case "straight":
      return value;
    default:
      return null;
  }
};

const MOSQUITO_FLEET_LAYER_IDS = MOSQUITO_FLEET_LAYERS.map((layer) => layer.id);

const pointCoordinates = (
  feature: MapGeoJSONFeature
): [number, number] | undefined => {
  if (feature.geometry.type !== "Point") return undefined;
  const [longitude, latitude] = feature.geometry.coordinates;
  if (longitude === undefined || latitude === undefined) return undefined;
  return [longitude, latitude];
};

const routeClickChoice = (
  feature: MapGeoJSONFeature,
  name: string
): MapClickChoice => {
  const status = String(feature.properties.status);
  const geometrySource = routeLegGeometrySource(feature.properties.geometrySource);
  const labelBase =
    status === "suspended"
      ? `${name} (suspended)`
      : status === "seasonal"
        ? `${name} (seasonal)`
        : name;
  const label =
    geometrySource === null
      ? labelBase
      : `${labelBase} — ${geometrySourceLabel(geometrySource)}`;
  return {
    key: `route:${String(feature.properties.routeId ?? name)}:${status}:${geometrySource ?? ""}`,
    label: `Current route: ${labelBase}`,
    content: label,
    historical: false,
  };
};

const terminalClickChoice = (
  feature: MapGeoJSONFeature,
  name: string
): MapClickChoice | undefined => {
  const coordinates = pointCoordinates(feature);
  if (coordinates === undefined) return undefined;
  return {
    key: `terminal:${String(feature.properties.terminalId ?? name)}`,
    label: `Current terminal: ${name}`,
    content: name,
    coordinates,
    historical: false,
  };
};

const vesselClickChoice = (
  feature: MapGeoJSONFeature,
  name: string
): MapClickChoice => {
  const props = feature.properties as Partial<VesselProperties>;
  const route =
    props.departingTerminal && props.arrivingTerminal
      ? `${props.departingTerminal} → ${props.arrivingTerminal}`
      : undefined;
  const speed = typeof props.speed === "number" ? `${props.speed.toFixed(1)} kn` : undefined;
  return {
    key: `vessel:${name}`,
    label: `Live vessel: ${name}`,
    content: [name, route, speed].filter(Boolean).join(" — "),
    historical: false,
  };
};

const historicalClickChoice = (
  feature: MapGeoJSONFeature,
  name: string
): MapClickChoice => {
  const isLanding = feature.geometry.type === "Point";
  const coordinates = pointCoordinates(feature);
  return {
    key: `historical:${feature.layer.id}:${name}`,
    label: `${isLanding ? "1908 landing" : "1908 run"}: ${name}`,
    content: createMosquitoFleetPopup({ ...feature.properties, name }, isLanding),
    ...(coordinates === undefined ? {} : { coordinates }),
    historical: true,
  };
};

const mapClickChoice = (feature: MapGeoJSONFeature): MapClickChoice | undefined => {
  const name = feature.properties.name;
  if (typeof name !== "string") return undefined;

  switch (feature.layer.id) {
    case ROUTES_LAYER_ID:
      return routeClickChoice(feature, name);
    case TERMINALS_LAYER_ID:
      return terminalClickChoice(feature, name);
    case VESSEL_LAYER_ID:
      return vesselClickChoice(feature, name);
    default:
      return MOSQUITO_FLEET_LAYER_IDS.includes(feature.layer.id)
        ? historicalClickChoice(feature, name)
        : undefined;
  }
};

const createMapFeatureChoices = (
  choices: readonly MapClickChoice[],
  onSelect: (choice: MapClickChoice) => void
): HTMLElement => {
  const content = document.createElement("div");
  content.className = "map-feature-choices";
  const heading = document.createElement("strong");
  heading.textContent = "Choose a map feature";
  content.append(heading);
  for (const choice of choices) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = choice.label;
    button.addEventListener("click", () => onSelect(choice));
    content.append(button);
  }
  return content;
};

/** MapLibre `match` expression pairing each operator id with its display color. */
const operatorColorExpression: unknown[] = ["match", ["get", "operatorId"]];
for (const operator of OPERATORS) {
  operatorColorExpression.push(operator.id, operator.color);
}
operatorColorExpression.push("#64748b"); // fallback

export function FerryMap({ basemapId, visibleOperatorIds, showInactiveRoutes, showMosquitoFleet, vessels }: FerryMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const popupRef = useRef<Popup | null>(null);
  const historicalPopupRef = useRef<Popup | null>(null);
  const restoreStyleLayersWhenReadyRef = useRef<((requestedBasemapId: BasemapId, loadStyle?: () => void) => void) | null>(null);
  const [styleRevision, setStyleRevision] = useState(0);
  const requestedBasemapId = useRef(basemapId);

  // Map creation — runs once.
  useEffect(() => {
    if (containerRef.current === null || mapRef.current !== null) return undefined;
    ensureWorkerUrl();

    const sources: Record<string, SourceSpecification> = {
      [ROUTES_SOURCE_ID]: { type: "geojson", data: emptyFeatureCollection() },
      [TERMINALS_SOURCE_ID]: { type: "geojson", data: emptyFeatureCollection() },
      [VESSELS_SOURCE_ID]: { type: "geojson", data: emptyFeatureCollection() },
    };

    const layers: LayerSpecification[] = [
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
      style: BASEMAPS[requestedBasemapId.current].style,
    });
    map.addControl(new NavigationControl(), "top-right");

    const clickableLayerIds = [
      ROUTES_LAYER_ID,
      TERMINALS_LAYER_ID,
      VESSEL_LAYER_ID,
      ...MOSQUITO_FLEET_LAYER_IDS,
    ];
    map.on("click", clickableLayerIds, (event) => {
      const choices = new Map<string, MapClickChoice>();
      for (const feature of event.features ?? []) {
        const choice = mapClickChoice(feature);
        if (choice !== undefined && !choices.has(choice.key)) {
          choices.set(choice.key, choice);
        }
      }

      const availableChoices = [...choices.values()];
      if (availableChoices.length === 0) return;
      popupRef.current?.remove();
      historicalPopupRef.current = null;
      const popup = new Popup().setLngLat(event.lngLat);
      const showChoice = (choice: MapClickChoice) => {
        popup.setLngLat(choice.coordinates ?? event.lngLat);
        if (typeof choice.content === "string") {
          popup.setText(choice.content);
        } else {
          popup.setDOMContent(choice.content);
        }
        popup.addTo(map);
        popupRef.current = popup;
        historicalPopupRef.current = choice.historical ? popup : null;
      };

      if (availableChoices.length === 1) {
        const [choice] = availableChoices;
        if (choice !== undefined) showChoice(choice);
        return;
      }

      popup.setDOMContent(createMapFeatureChoices(availableChoices, showChoice)).addTo(map);
      popupRef.current = popup;
      historicalPopupRef.current = availableChoices.some((choice) => choice.historical)
        ? popup
        : null;
    });
    for (const layerId of clickableLayerIds) {
      map.on("mouseenter", layerId, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", layerId, () => {
        map.getCanvas().style.cursor = "";
      });
    }

    const restoreStyleLayers = () => {
      for (const [id, source] of Object.entries(sources)) {
        if (!map.getSource(id)) map.addSource(id, source);
      }
      for (const layer of layers) {
        if (!map.getLayer(layer.id)) map.addLayer(layer);
      }
      setStyleRevision((revision) => revision + 1);
    };
    const restoreStyleLayersWhenReady = (nextBasemapId: BasemapId, loadStyle?: () => void) => {
      let restored = false;
      const handleStyleLoad = () => {
        if (restored || nextBasemapId !== requestedBasemapId.current) return;
        restored = true;
        restoreStyleLayers();
      };
      if (loadStyle === undefined && map.isStyleLoaded()) {
        handleStyleLoad();
        return;
      }
      map.once("style.load", handleStyleLoad);
      loadStyle?.();
      if (map.isStyleLoaded()) {
        map.off("style.load", handleStyleLoad);
        handleStyleLoad();
      }
    };

    restoreStyleLayersWhenReadyRef.current = restoreStyleLayersWhenReady;
    mapRef.current = map;
    // setStyle removes custom sources and layers. Rebuild them above each basemap,
    // then trigger data effects with the latest filters and vessel positions.
    restoreStyleLayersWhenReady(requestedBasemapId.current);

    return () => {
      restoreStyleLayersWhenReadyRef.current = null;
      popupRef.current?.remove();
      popupRef.current = null;
      historicalPopupRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (basemapId === requestedBasemapId.current) return;
    requestedBasemapId.current = basemapId;
    popupRef.current?.remove();
    popupRef.current = null;
    historicalPopupRef.current = null;
    const map = mapRef.current;
    if (map === null) return;
    restoreStyleLayersWhenReadyRef.current?.(basemapId, () => {
      map.setStyle(BASEMAPS[basemapId].style, { diff: false });
    });
  }, [basemapId]);

  useEffect(() => {
    const map = mapRef.current;
    if (map === null || !map.getSource(ROUTES_SOURCE_ID)) return;

    if (showMosquitoFleet) {
      if (!map.getSource(MOSQUITO_FLEET_SOURCE_ID)) {
        map.addSource(MOSQUITO_FLEET_SOURCE_ID, MOSQUITO_FLEET_SOURCE);
        for (const layer of MOSQUITO_FLEET_LAYERS) map.addLayer(layer);
      }
      return;
    }

    if (historicalPopupRef.current && popupRef.current === historicalPopupRef.current) {
      popupRef.current.remove();
      popupRef.current = null;
    }
    historicalPopupRef.current = null;
    if (!map.getSource(MOSQUITO_FLEET_SOURCE_ID)) return;
    for (const layer of MOSQUITO_FLEET_LAYERS) map.removeLayer(layer.id);
    map.removeSource(MOSQUITO_FLEET_SOURCE_ID);
  }, [showMosquitoFleet, styleRevision]);

  // Push filtered data into the sources whenever the filter changes.
  useEffect(() => {
    const map = mapRef.current;
    if (map === null || !map.getSource(ROUTES_SOURCE_ID)) return;

    const visibleRoutes = ROUTES.filter((route) => {
      if (!visibleOperatorIds.has(route.operatorId)) return false;
      if (route.status === "suspended" && !showInactiveRoutes) return false;
      return true;
    });

    const routesSource = map.getSource<GeoJSONSource>(ROUTES_SOURCE_ID);
    routesSource?.setData(routesToLineFeatureCollection(visibleRoutes, TERMINALS_BY_ID));

    const terminalsSource = map.getSource<GeoJSONSource>(TERMINALS_SOURCE_ID);
    terminalsSource?.setData(terminalsToPointFeatureCollection(visibleRoutes, TERMINALS_BY_ID));
  }, [visibleOperatorIds, showInactiveRoutes, styleRevision]);

  // Live vessel positions — pushed independently since they refresh on their own poll cadence.
  useEffect(() => {
    const map = mapRef.current;
    if (map === null || !map.getSource(VESSELS_SOURCE_ID)) return;
    const vesselsSource = map.getSource<GeoJSONSource>(VESSELS_SOURCE_ID);
    vesselsSource?.setData(vesselsToFeatureCollection(vessels));
  }, [vessels, styleRevision]);

  return <div aria-label="Salish Sea ferry route map" role="region" ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
