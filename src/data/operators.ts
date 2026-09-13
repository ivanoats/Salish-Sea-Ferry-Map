import type { Operator } from "@/domain/ferry";

/**
 * Operator colors are concrete hex values (rather than Panda tokens) so the
 * same value can drive both a MapLibre paint expression and a legend
 * swatch's inline style without resolving CSS custom properties at
 * runtime. Picked to stay distinguishable at a glance over an OSM basemap
 * and over each other.
 */
export const OPERATORS: readonly Operator[] = [
  {
    id: "wsf",
    name: "Washington State Ferries",
    shortName: "WSF",
    color: "#2563eb",
    website: "https://wsdot.wa.gov/travel/washington-state-ferries",
  },
  {
    id: "bc-ferries",
    name: "BC Ferries",
    shortName: "BC Ferries",
    color: "#7c3aed",
    website: "https://www.bcferries.com",
  },
  {
    id: "black-ball",
    name: "Black Ball Ferry Line",
    shortName: "Black Ball",
    color: "#dc2626",
    website: "https://www.cohoferry.com",
  },
  {
    id: "king-county-water-taxi",
    name: "King County Water Taxi",
    shortName: "King County Water Taxi",
    color: "#0284c7",
    website: "https://kingcounty.gov/en/dept/metro/travel-options/water-taxi",
  },
  {
    id: "kitsap-transit",
    name: "Kitsap Transit Fast Ferries",
    shortName: "Kitsap Transit",
    color: "#16a34a",
    website: "https://www.kitsaptransit.com",
  },
  {
    id: "pierce-county",
    name: "Pierce County Ferry",
    shortName: "Pierce County",
    color: "#db2777",
    website: "https://www.piercecountywa.gov/1793/Ferry",
  },
  {
    id: "victoria-clipper",
    name: "Victoria Clipper",
    shortName: "Victoria Clipper",
    color: "#d97706",
    website: "https://www.clippervacations.com",
  },
  {
    id: "skagit-county",
    name: "Skagit County Public Works (Guemes Island Ferry)",
    shortName: "Guemes Ferry",
    color: "#0f766e",
    website: "https://www.skagitcounty.net",
  },
  {
    id: "whatcom-county",
    name: "Whatcom County (Lummi Island Ferry)",
    shortName: "Whatcom Chief",
    color: "#57534e",
    website: "https://www.whatcomcounty.us/382/Lummi-Island-Ferry",
  },
];

export const OPERATORS_BY_ID = new Map(OPERATORS.map((o) => [o.id, o] as const));
