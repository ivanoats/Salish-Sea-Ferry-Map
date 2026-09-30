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
  {
    id: "harbor-hopper",
    name: "Harbor Hopper (Ports of Everett and South Whidbey)",
    shortName: "Harbor Hopper",
    color: "#0891b2",
    website: "https://www.portofeverett.com/visit_the_waterfront/harbor_hopper.php",
  },
  {
    id: "hat-island-ferry",
    name: "Hat Island Community Association",
    shortName: "Hat Island Ferry",
    color: "#65a30d",
    website: "https://hatisland.org/ferry/",
  },
  {
    id: "puget-sound-express",
    name: "Puget Sound Express",
    shortName: "Puget Sound Express",
    color: "#a21caf",
    website: "https://www.pugetsoundexpress.com",
  },
  {
    id: "hullo",
    name: "Hullo",
    shortName: "Hullo",
    color: "#ea580c",
    website: "https://hullo.com",
  },
  {
    id: "translink",
    name: "TransLink SeaBus",
    shortName: "SeaBus",
    color: "#854d0e",
    website: "https://www.translink.ca/schedules-and-maps/seabus",
  },
  {
    id: "aquabus",
    name: "The Aquabus",
    shortName: "Aquabus",
    color: "#e11d48",
    website: "https://www.theaquabus.com",
  },
  {
    id: "false-creek-ferries",
    name: "False Creek Ferries",
    shortName: "False Creek Ferries",
    color: "#4f46e5",
    website: "https://granvilleislandferries.bc.ca",
  },
  {
    id: "port-of-everett",
    name: "Port of Everett (Jetty Island Ferry)",
    shortName: "Jetty Island Ferry",
    color: "#ca8a04",
    website: "https://www.portofeverett.com",
  },
  {
    id: "herron-island",
    name: "Herron Maintenance Co. (Herron Island Ferry)",
    shortName: "Herron Island Ferry",
    color: "#9a3412",
    website: "https://www.herronisland.org",
  },
  {
    id: "drayton-harbor-maritime",
    name: "Drayton Harbor Maritime (Plover Ferry)",
    shortName: "Plover Ferry",
    color: "#15803d",
    website: "https://www.draytonharbormaritime.org",
  },
];

export const OPERATORS_BY_ID = new Map(OPERATORS.map((o) => [o.id, o] as const));
