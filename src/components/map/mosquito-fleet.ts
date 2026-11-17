import type { LayerSpecification, SourceSpecification } from "maplibre-gl";

export const LOWTIDE_URL = "https://midtide.github.io/Lowtide-Seattle/";
export const MOSQUITO_FLEET_SOURCE_ID = "mosquito-fleet-1908";
export const MOSQUITO_FLEET_SOURCE: SourceSpecification = {
  type: "geojson",
  data: "/data/mosquito-fleet-1908.geojson",
  attribution: `<a href="${LOWTIDE_URL}">Ted Sweeney · Lowtide Seattle</a> | © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>`,
};

const historicColor = "#a65e28";

export const MOSQUITO_FLEET_LAYERS = [
  {
    id: "mosquito-fleet-runs",
    type: "line",
    source: MOSQUITO_FLEET_SOURCE_ID,
    filter: ["==", ["geometry-type"], "LineString"],
    layout: { "line-join": "round" },
    paint: {
      "line-color": historicColor,
      "line-width": ["interpolate", ["linear"], ["zoom"], 5, 1.8, 10, 3],
      "line-dasharray": [2, 1.5],
    },
  },
  {
    id: "mosquito-fleet-ports",
    type: "circle",
    source: MOSQUITO_FLEET_SOURCE_ID,
    filter: ["==", ["geometry-type"], "Point"],
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 2.5, 10, 4.5],
      "circle-color": ["case", ["==", ["get", "approximate"], true], "#fffaf0", historicColor],
      "circle-stroke-color": ["case", ["==", ["get", "approximate"], true], historicColor, "#fffaf0"],
      "circle-stroke-width": 1.25,
    },
  },
] satisfies LayerSpecification[];

interface HistoricalFeatureProperties {
  name: string;
  stops?: string;
  notes?: string;
  approximate?: boolean;
  positionSource?: string;
  sheetUrl?: string;
  sheetCredit?: string;
}

export function createMosquitoFleetPopup(
  properties: HistoricalFeatureProperties,
  isLanding: boolean,
): HTMLElement {
  const content = document.createElement("div");
  content.className = "historical-popup";
  const title = document.createElement("strong");
  title.textContent = properties.name;
  content.append(title);

  const subtitle = isLanding
    ? (properties.approximate ? "1908 · Approximate landing" : "1908 · Port of call")
    : "1908 · Reconstructed steamer route";
  for (const text of [subtitle, properties.stops, properties.notes, properties.positionSource]) {
    if (!text) continue;
    const detail = document.createElement("p");
    detail.textContent = text;
    content.append(detail);
  }

  if (properties.sheetUrl?.startsWith("https://")) {
    const sheet = document.createElement("a");
    sheet.href = properties.sheetUrl;
    sheet.textContent = properties.sheetCredit ?? "Historical map sheet";
    sheet.target = "_blank";
    sheet.rel = "noreferrer";
    content.append(sheet);
  }
  return content;
}
