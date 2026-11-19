import { act, render } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { FerryMap } from "./ferry-map";
import { OPERATORS } from "@/data/operators";
import { BASEMAPS } from "./basemaps";

const mock = vi.hoisted(() => {
  const sources = new Map<string, { setData: ReturnType<typeof vi.fn> }>();
  const layers = new Map<string, unknown>();
  const handlers = new Map<string, Array<() => void>>();
  const clickHandlers: Array<{ layers: string | string[]; handler: (event: unknown) => void }> = [];
  const popups: Array<{
    remove: ReturnType<typeof vi.fn>;
    setLngLat: ReturnType<typeof vi.fn>;
    setText: ReturnType<typeof vi.fn>;
    setDOMContent: ReturnType<typeof vi.fn>;
    addTo: ReturnType<typeof vi.fn>;
  }> = [];
  const createPopup = () => {
    const popup = {
      remove: vi.fn(),
      setLngLat: vi.fn(),
      setText: vi.fn(),
      setDOMContent: vi.fn(),
      addTo: vi.fn(),
    };
    popup.setLngLat.mockReturnValue(popup);
    popup.setText.mockReturnValue(popup);
    popup.setDOMContent.mockReturnValue(popup);
    popup.addTo.mockReturnValue(popup);
    return popup;
  };
  const queueHandler = (event: string, handler: () => void) => {
    handlers.set(event, [...(handlers.get(event) ?? []), handler]);
  };
  const emitNext = (event: string) => {
    const [handler, ...rest] = handlers.get(event) ?? [];
    handlers.set(event, rest);
    handler?.();
  };
  const map = {
    addControl: vi.fn(),
    on: vi.fn((event: string, ...args: unknown[]) => {
      if (args.length === 1) queueHandler(event, args[0] as () => void);
      if (event === "click" && args.length === 2) {
        clickHandlers.push({
          layers: args[0] as string | string[],
          handler: args[1] as (event: unknown) => void,
        });
      }
    }),
    once: vi.fn((event: string, handler: () => void) => queueHandler(event, handler)),
    isStyleLoaded: vi.fn(() => false),
    getSource: vi.fn((id: string) => sources.get(id)),
    addSource: vi.fn((id: string) => sources.set(id, { setData: vi.fn() })),
    getLayer: vi.fn((id: string) => layers.get(id)),
    addLayer: vi.fn((layer: { id: string }) => layers.set(layer.id, layer)),
    removeLayer: vi.fn((id: string) => layers.delete(id)),
    removeSource: vi.fn((id: string) => sources.delete(id)),
    setStyle: vi.fn(() => { sources.clear(); layers.clear(); }),
    off: vi.fn(),
    remove: vi.fn(),
  };
  return { emitNext, sources, layers, handlers, clickHandlers, popups, createPopup, map };
});

vi.mock("maplibre-gl", () => ({
  Map: vi.fn(function (this: typeof mock.map) {
    Object.assign(this, mock.map);
  }),
  NavigationControl: vi.fn(),
  Popup: vi.fn(function () {
    const popup = mock.createPopup();
    mock.popups.push(popup);
    return popup;
  }),
  setWorkerUrl: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mock.sources.clear();
  mock.layers.clear();
  mock.handlers.clear();
  mock.clickHandlers.length = 0;
  mock.popups.length = 0;
  mock.map.isStyleLoaded.mockReturnValue(false);
});

it("restores overlays and the latest filters after switching basemaps", () => {
  const props = {
    visibleOperatorIds: new Set(OPERATORS.map((operator) => operator.id)),
    showInactiveRoutes: false,
    showMosquitoFleet: false,
    vessels: [],
  };
  mock.map.isStyleLoaded.mockReturnValue(true);
  const { rerender } = render(<FerryMap {...props} basemapId="osm" />);
  expect(mock.sources.get("ferry-routes")?.setData.mock.lastCall?.[0].features.length).toBeGreaterThan(0);

  rerender(<FerryMap {...props} basemapId="dark" />);
  expect(mock.map.setStyle).toHaveBeenCalledWith(BASEMAPS.dark.style, { diff: false });
  // Filters may change while the new remote style is loading.
  rerender(<FerryMap {...props} basemapId="dark" visibleOperatorIds={new Set()} />);
  act(() => mock.emitNext("style.load"));
  expect(mock.layers.size).toBe(3);
  for (const id of ["ferry-routes", "ferry-terminals", "wsf-vessels"]) {
    expect(mock.sources.get(id)?.setData).toHaveBeenLastCalledWith({ type: "FeatureCollection", features: [] });
  }

  rerender(<FerryMap {...props} basemapId="osm" />);
  act(() => mock.emitNext("style.load"));
  expect(mock.sources.get("ferry-routes")?.setData.mock.lastCall?.[0].features.length).toBeGreaterThan(0);
});

it("ignores superseded basemap style loads", () => {
  const props = {
    visibleOperatorIds: new Set(OPERATORS.map((operator) => operator.id)),
    showInactiveRoutes: false,
    showMosquitoFleet: false,
    vessels: [],
  };
  const { rerender } = render(<FerryMap {...props} basemapId="osm" />);
  act(() => mock.emitNext("style.load"));
  expect(mock.sources.get("ferry-routes")?.setData.mock.lastCall?.[0].features.length).toBeGreaterThan(0);

  rerender(<FerryMap {...props} basemapId="dark" visibleOperatorIds={new Set()} />);
  rerender(<FerryMap {...props} basemapId="fiord" />);
  act(() => mock.emitNext("style.load"));
  expect(mock.layers.size).toBe(0);
  expect(mock.sources.size).toBe(0);

  act(() => mock.emitNext("style.load"));
  expect(mock.layers.size).toBe(3);
  expect(mock.sources.get("ferry-routes")?.setData.mock.lastCall?.[0].features.length).toBeGreaterThan(0);
});

it("loads the fleet only when enabled and restores it after a basemap change", () => {
  const props = {
    visibleOperatorIds: new Set(OPERATORS.map((operator) => operator.id)),
    showInactiveRoutes: false,
    vessels: [],
  };
  const { rerender } = render(<FerryMap {...props} basemapId="osm" showMosquitoFleet={false} />);
  act(() => mock.emitNext("style.load"));
  expect(mock.sources.has("mosquito-fleet-1908")).toBe(false);

  rerender(<FerryMap {...props} basemapId="osm" showMosquitoFleet />);
  expect(mock.map.addSource).toHaveBeenCalledWith("mosquito-fleet-1908", expect.objectContaining({
    type: "geojson",
    data: "/data/mosquito-fleet-1908.geojson",
  }));

  rerender(<FerryMap {...props} basemapId="dark" showMosquitoFleet />);
  act(() => mock.emitNext("style.load"));
  expect(mock.sources.has("mosquito-fleet-1908")).toBe(true);
  expect(mock.layers.has("mosquito-fleet-runs")).toBe(true);
  expect(mock.layers.has("mosquito-fleet-ports")).toBe(true);

  rerender(<FerryMap {...props} basemapId="dark" showMosquitoFleet={false} />);
  expect(mock.layers.has("mosquito-fleet-runs")).toBe(false);
  expect(mock.layers.has("mosquito-fleet-ports")).toBe(false);
  expect(mock.sources.has("mosquito-fleet-1908")).toBe(false);
  expect(mock.sources.has("ferry-routes")).toBe(true);
});

it("offers current and historical details when terminal markers overlap", () => {
  const props = {
    visibleOperatorIds: new Set(OPERATORS.map((operator) => operator.id)),
    showInactiveRoutes: false,
    showMosquitoFleet: true,
    vessels: [],
  };
  render(<FerryMap {...props} basemapId="osm" />);
  const clickHandler = mock.clickHandlers.find(({ layers }) =>
    Array.isArray(layers) && layers.includes("mosquito-fleet-ports")
  );
  expect(clickHandler).toBeDefined();

  act(() => clickHandler?.handler({
    lngLat: [-122.5, 48.5],
    features: [
      {
        layer: { id: "ferry-terminals-circles" },
        properties: { terminalId: "guemes-island", name: "Guemes Island" },
        geometry: { type: "Point", coordinates: [-122.5, 48.5] },
      },
      {
        layer: { id: "mosquito-fleet-ports" },
        properties: { name: "Guemes Island", approximate: true },
        geometry: { type: "Point", coordinates: [-122.5, 48.5] },
      },
    ],
  }));

  const popup = mock.popups[0];
  const chooser = popup?.setDOMContent.mock.calls[0]?.[0] as HTMLElement | undefined;
  expect(chooser?.textContent).toContain("Current terminal: Guemes Island");
  expect(chooser?.textContent).toContain("1908 landing: Guemes Island");

  const currentChoice = [...(chooser?.querySelectorAll("button") ?? [])]
    .find((button) => button.textContent === "Current terminal: Guemes Island");
  act(() => currentChoice?.click());
  expect(popup?.setText).toHaveBeenCalledWith("Guemes Island");
});

it("offers distinct choices for coincident historical runs", () => {
  const props = {
    visibleOperatorIds: new Set(OPERATORS.map((operator) => operator.id)),
    showInactiveRoutes: false,
    showMosquitoFleet: true,
    vessels: [],
  };
  render(<FerryMap {...props} basemapId="osm" />);
  const clickHandler = mock.clickHandlers.find(({ layers }) =>
    Array.isArray(layers) && layers.includes("mosquito-fleet-runs")
  );

  act(() => clickHandler?.handler({
    lngLat: [-122.4, 47.6],
    features: [
      {
        layer: { id: "mosquito-fleet-runs" },
        properties: { name: "Seattle – Victoria", stops: "Seattle – Port Townsend – Victoria" },
        geometry: { type: "LineString", coordinates: [] },
      },
      {
        layer: { id: "mosquito-fleet-runs" },
        properties: { name: "Seattle – Victoria", stops: "duplicate segment" },
        geometry: { type: "LineString", coordinates: [] },
      },
      {
        layer: { id: "mosquito-fleet-runs" },
        properties: { name: "Seattle – Neah Bay", stops: "Seattle – Port Townsend – Neah Bay" },
        geometry: { type: "LineString", coordinates: [] },
      },
    ],
  }));

  const popup = mock.popups[0];
  const chooser = popup?.setDOMContent.mock.calls[0]?.[0] as HTMLElement | undefined;
  expect(chooser?.querySelectorAll("button")).toHaveLength(2);
  expect(chooser?.textContent).toContain("1908 run: Seattle – Victoria");
  expect(chooser?.textContent).toContain("1908 run: Seattle – Neah Bay");

  const victoriaChoice = [...(chooser?.querySelectorAll("button") ?? [])]
    .find((button) => button.textContent === "1908 run: Seattle – Victoria");
  act(() => victoriaChoice?.click());
  const details = popup?.setDOMContent.mock.calls[1]?.[0] as HTMLElement | undefined;
  expect(details?.textContent).toContain("Seattle – Port Townsend – Victoria");
});
