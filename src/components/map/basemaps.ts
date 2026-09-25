import type { StyleSpecification } from "maplibre-gl";

const stadiaApiKey = process.env.NEXT_PUBLIC_STADIA_MAPS_API_KEY?.trim();
const stadiaAuth = stadiaApiKey ? `?api_key=${encodeURIComponent(stadiaApiKey)}` : "";

// Provider styles carry their own attribution; inline raster styles include it below.
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
  "stamen-terrain": {
    label: "Stamen Terrain · Stadia Maps",
    style: {
      version: 8,
      sources: {
        basemap: {
          type: "raster",
          tiles: [`https://tiles.stadiamaps.com/tiles/stamen_terrain/{z}/{x}/{y}@2x.png${stadiaAuth}`],
          tileSize: 256,
          maxzoom: 20,
          attribution: '© <a href="https://stadiamaps.com/attribution/">Stadia Maps</a> © <a href="https://stamen.com/">Stamen Design</a> © <a href="https://openmaptiles.org/">OpenMapTiles</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
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
