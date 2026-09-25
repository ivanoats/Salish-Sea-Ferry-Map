import { act, render } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { FerryMap } from "./ferry-map";
import { OPERATORS } from "@/data/operators";
import { BASEMAPS } from "./basemaps";

const mock = vi.hoisted(() => {
  const sources = new Map<string, { setData: ReturnType<typeof vi.fn> }>();
  const layers = new Map<string, unknown>();
  const handlers = new Map<string, () => void>();
  const map = {
    addControl: vi.fn(),
    on: vi.fn((event: string, ...args: unknown[]) => {
      if (args.length === 1) handlers.set(event, args[0] as () => void);
    }),
    getSource: vi.fn((id: string) => sources.get(id)),
    addSource: vi.fn((id: string) => sources.set(id, { setData: vi.fn() })),
    getLayer: vi.fn((id: string) => layers.get(id)),
    addLayer: vi.fn((layer: { id: string }) => layers.set(layer.id, layer)),
    setStyle: vi.fn(() => { sources.clear(); layers.clear(); }),
    remove: vi.fn(),
  };
  return { sources, layers, handlers, map };
});

vi.mock("maplibre-gl", () => ({
  Map: vi.fn(function (this: typeof mock.map) {
    Object.assign(this, mock.map);
  }),
  NavigationControl: vi.fn(),
  Popup: vi.fn(),
  setWorkerUrl: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mock.sources.clear();
  mock.layers.clear();
  mock.handlers.clear();
});

it("restores overlays and the latest filters after switching basemaps", () => {
  const props = {
    visibleOperatorIds: new Set(OPERATORS.map((operator) => operator.id)),
    showInactiveRoutes: false,
    vessels: [],
  };
  const { rerender } = render(<FerryMap {...props} basemapId="osm" />);
  act(() => mock.handlers.get("style.load")?.());
  expect(mock.sources.get("ferry-routes")?.setData.mock.lastCall?.[0].features.length).toBeGreaterThan(0);

  rerender(<FerryMap {...props} basemapId="dark" />);
  expect(mock.map.setStyle).toHaveBeenCalledWith(BASEMAPS.dark.style, { diff: false });
  // Filters may change while the new remote style is loading.
  rerender(<FerryMap {...props} basemapId="dark" visibleOperatorIds={new Set()} />);
  act(() => mock.handlers.get("style.load")?.());
  expect(mock.layers.size).toBe(3);
  for (const id of ["ferry-routes", "ferry-terminals", "wsf-vessels"]) {
    expect(mock.sources.get(id)?.setData).toHaveBeenLastCalledWith({ type: "FeatureCollection", features: [] });
  }

  rerender(<FerryMap {...props} basemapId="osm" />);
  act(() => mock.handlers.get("style.load")?.());
  expect(mock.sources.get("ferry-routes")?.setData.mock.lastCall?.[0].features.length).toBeGreaterThan(0);
});
