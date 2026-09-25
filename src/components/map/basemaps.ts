import type { StyleSpecification } from "maplibre-gl";

// No-key street basemaps from https://madewithmaplibre.com/basemaps/gallery.
// Retain the original OSM view; provider styles carry their own attribution.
export const BASEMAPS = {
  osm: {
    label: "OpenStreetMap (original)",
    style: {
      version: 8,
      sources: {
        basemap: {
          type: "raster",
          tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
          tileSize: 256,
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
        },
      },
      layers: [{ id: "basemap", type: "raster", source: "basemap" }],
    },
  },
  liberty: { label: "Liberty · OpenFreeMap", style: "https://tiles.openfreemap.org/styles/liberty" },
  bright: { label: "Bright · OpenFreeMap", style: "https://tiles.openfreemap.org/styles/bright" },
  positron: { label: "Positron · OpenFreeMap", style: "https://tiles.openfreemap.org/styles/positron" },
  dark: { label: "Dark · OpenFreeMap", style: "https://tiles.openfreemap.org/styles/dark" },
  fiord: { label: "Fiord · OpenFreeMap", style: "https://tiles.openfreemap.org/styles/fiord" },
  colorful: { label: "Colorful · VersaTiles", style: "https://tiles.versatiles.org/assets/styles/colorful/style.json" },
} satisfies Record<string, { label: string; style: string | StyleSpecification }>;

export type BasemapId = keyof typeof BASEMAPS;
