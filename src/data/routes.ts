import type { FerryRoute } from "../domain/ferry";

/**
 * Every ferry route in scope: Washington State Ferries, BC Ferries (bounded
 * to the Salish Sea proper — excludes Discovery Passage north of Quadra/
 * Cortes, the Sunshine Coast north of Powell River, and every Vancouver
 * Island west-coast / north-coast / Haida Gwaii route), Black Ball Ferry
 * Line, Kitsap Transit's passenger-only fast ferries, Victoria Clipper, and
 * the three county-run ferries (Guemes Island, Lummi Island, Anderson Island).
 *
 * Route legs use mesh-baked geometry through navigable water where the mesh
 * can serve that terminal pair, and fall back to straight lines where it
 * cannot. The mesh follows the middle of water as OSM describes the
 * shoreline and carries no soundings or rock clearance. This is a reference
 * map, not a navigational chart.
 */
export const ROUTES: readonly FerryRoute[] = [
  // --- Washington State Ferries (vehicle) ---
  {
    id: "wsf-seattle-bainbridge",
    name: "Seattle – Bainbridge Island",
    operatorId: "wsf",
    mode: "vehicle",
    status: "active",
    terminalIds: ["seattle-colman-dock", "bainbridge-island"],
    note: "~35 min crossing",
  },
  {
    id: "wsf-seattle-bremerton",
    name: "Seattle – Bremerton",
    operatorId: "wsf",
    mode: "vehicle",
    status: "active",
    terminalIds: ["seattle-colman-dock", "bremerton"],
    note: "~1 hr crossing",
  },
  {
    id: "wsf-fauntleroy-vashon-southworth",
    name: "Fauntleroy – Vashon – Southworth",
    operatorId: "wsf",
    mode: "vehicle",
    status: "active",
    terminalIds: ["fauntleroy", "vashon-north", "southworth"],
    note: "Triangle route",
  },
  {
    id: "wsf-point-defiance-tahlequah",
    name: "Point Defiance – Tahlequah",
    operatorId: "wsf",
    mode: "vehicle",
    status: "active",
    terminalIds: ["point-defiance", "tahlequah"],
  },
  {
    id: "wsf-edmonds-kingston",
    name: "Edmonds – Kingston",
    operatorId: "wsf",
    mode: "vehicle",
    status: "active",
    terminalIds: ["edmonds", "kingston"],
  },
  {
    id: "wsf-mukilteo-clinton",
    name: "Mukilteo – Clinton",
    operatorId: "wsf",
    mode: "vehicle",
    status: "active",
    terminalIds: ["mukilteo", "clinton"],
  },
  {
    id: "wsf-port-townsend-coupeville",
    name: "Port Townsend – Coupeville",
    operatorId: "wsf",
    mode: "vehicle",
    status: "active",
    terminalIds: ["port-townsend", "coupeville"],
  },
  {
    id: "wsf-san-juan-islands",
    name: "Anacortes – San Juan Islands",
    operatorId: "wsf",
    mode: "vehicle",
    status: "active",
    terminalIds: ["anacortes", "lopez-island", "shaw-island", "orcas-island", "friday-harbor"],
    note: "Not every sailing calls at every island",
  },
  {
    id: "wsf-anacortes-sidney",
    name: "Anacortes – Sidney, BC",
    operatorId: "wsf",
    mode: "vehicle",
    status: "suspended",
    terminalIds: ["anacortes", "friday-harbor", "sidney-bc"],
    note: "Suspended since 2020 — no confirmed restart date as of 2026",
  },

  // --- Kitsap Transit (passenger fast ferry) ---
  {
    id: "kt-bremerton-seattle",
    name: "Bremerton – Seattle (fast ferry)",
    operatorId: "kitsap-transit",
    mode: "passenger",
    status: "active",
    terminalIds: ["bremerton", "seattle-colman-dock"],
  },
  {
    id: "kt-kingston-seattle",
    name: "Kingston – Seattle (fast ferry)",
    operatorId: "kitsap-transit",
    mode: "passenger",
    status: "active",
    terminalIds: ["kingston", "seattle-colman-dock"],
  },
  {
    id: "kt-southworth-seattle",
    name: "Southworth – Seattle (fast ferry)",
    operatorId: "kitsap-transit",
    mode: "passenger",
    status: "active",
    terminalIds: ["southworth", "seattle-colman-dock"],
  },

  // --- Black Ball Ferry Line ---
  {
    id: "blackball-port-angeles-victoria",
    name: "Port Angeles – Victoria, BC (MV Coho)",
    operatorId: "black-ball",
    mode: "vehicle",
    status: "active",
    terminalIds: ["port-angeles", "victoria-belleville"],
    note: "~90 min crossing, Strait of Juan de Fuca",
  },

  // --- Victoria Clipper ---
  {
    id: "clipper-seattle-victoria",
    name: "Seattle – Victoria, BC (passenger only)",
    operatorId: "victoria-clipper",
    mode: "passenger",
    status: "active",
    terminalIds: ["seattle-pier-69", "victoria-belleville"],
  },

  // --- Pierce County ---
  {
    id: "pierce-county-steilacoom-anderson",
    name: "Steilacoom – Ketron Island – Anderson Island",
    operatorId: "pierce-county",
    mode: "vehicle",
    status: "active",
    terminalIds: ["steilacoom-landing", "ketron-island", "anderson-island-yoman"],
    note: "Ketron Island stop is by reservation/request, not on every sailing",
  },

  // --- County ferries ---
  {
    id: "skagit-guemes",
    name: "Anacortes – Guemes Island",
    operatorId: "skagit-county",
    mode: "vehicle",
    status: "active",
    terminalIds: ["anacortes-guemes-dock", "guemes-island"],
  },
  {
    id: "whatcom-lummi",
    name: "Gooseberry Point – Lummi Island (Whatcom Chief)",
    operatorId: "whatcom-county",
    mode: "vehicle",
    status: "active",
    terminalIds: ["gooseberry-point", "lummi-island"],
  },

  // --- BC Ferries: major Strait of Georgia routes ---
  {
    id: "bcf-tsawwassen-swartzbay",
    name: "Tsawwassen – Swartz Bay",
    operatorId: "bc-ferries",
    mode: "vehicle",
    status: "active",
    terminalIds: ["tsawwassen", "swartz-bay"],
    note: "Route 1",
  },
  {
    id: "bcf-departurebay-horseshoebay",
    name: "Departure Bay (Nanaimo) – Horseshoe Bay",
    operatorId: "bc-ferries",
    mode: "vehicle",
    status: "active",
    terminalIds: ["departure-bay", "horseshoe-bay"],
    note: "Route 2",
  },
  {
    id: "bcf-tsawwassen-dukepoint",
    name: "Tsawwassen – Duke Point (Nanaimo)",
    operatorId: "bc-ferries",
    mode: "vehicle",
    status: "active",
    terminalIds: ["tsawwassen", "duke-point"],
    note: "Route 30",
  },

  // --- BC Ferries: Sunshine Coast / Howe Sound ---
  {
    id: "bcf-horseshoebay-langdale",
    name: "Horseshoe Bay – Langdale",
    operatorId: "bc-ferries",
    mode: "vehicle",
    status: "active",
    terminalIds: ["horseshoe-bay", "langdale"],
    note: "Route 3",
  },
  {
    id: "bcf-earlscove-salterybay",
    name: "Earls Cove – Saltery Bay",
    operatorId: "bc-ferries",
    mode: "vehicle",
    status: "active",
    terminalIds: ["earls-cove", "saltery-bay"],
    note: "Route 7",
  },
  {
    id: "bcf-langdale-gambier-keats",
    name: "Langdale – Gambier Island – Keats Island",
    operatorId: "bc-ferries",
    mode: "passenger",
    status: "active",
    terminalIds: ["langdale", "gambier-island", "keats-island"],
    note: "Route 13, passenger-only",
  },
  {
    id: "bcf-horseshoebay-bowen",
    name: "Horseshoe Bay – Bowen Island",
    operatorId: "bc-ferries",
    mode: "vehicle",
    status: "active",
    terminalIds: ["horseshoe-bay", "bowen-island"],
    note: "Route 8",
  },
  {
    id: "bcf-comox-powellriver",
    name: "Comox – Powell River",
    operatorId: "bc-ferries",
    mode: "vehicle",
    status: "active",
    terminalIds: ["comox", "powell-river"],
    note: "Route 17",
  },
  {
    id: "bcf-powellriver-texada",
    name: "Powell River – Texada Island",
    operatorId: "bc-ferries",
    mode: "vehicle",
    status: "active",
    terminalIds: ["powell-river", "texada-island"],
    note: "Route 18",
  },

  // --- BC Ferries: Southern Gulf Islands ---
  {
    id: "bcf-swartzbay-fulford",
    name: "Swartz Bay – Fulford Harbour (Salt Spring Island)",
    operatorId: "bc-ferries",
    mode: "vehicle",
    status: "active",
    terminalIds: ["swartz-bay", "fulford-harbour"],
    note: "Route 4",
  },
  {
    id: "bcf-swartzbay-southerngulfislands",
    name: "Swartz Bay – Galiano – Mayne – Pender – Saturna",
    operatorId: "bc-ferries",
    mode: "vehicle",
    status: "active",
    terminalIds: ["swartz-bay", "galiano-island", "mayne-island", "pender-island", "saturna-island"],
    note: "Route 5/5A, not every sailing calls at every island",
  },
  {
    id: "bcf-crofton-vesuvius",
    name: "Crofton – Vesuvius Bay (Salt Spring Island)",
    operatorId: "bc-ferries",
    mode: "vehicle",
    status: "active",
    terminalIds: ["crofton", "vesuvius-bay"],
    note: "Route 6",
  },
  {
    id: "bcf-tsawwassen-southerngulfislands",
    name: "Tsawwassen – Southern Gulf Islands",
    operatorId: "bc-ferries",
    mode: "vehicle",
    status: "seasonal",
    terminalIds: ["tsawwassen", "galiano-island", "mayne-island", "pender-island", "saturna-island"],
    note: "Route 9/9A, seasonal circuit",
  },

  // --- BC Ferries: Central Vancouver Island ---
  {
    id: "bcf-brentwoodbay-millbay",
    name: "Brentwood Bay – Mill Bay",
    operatorId: "bc-ferries",
    mode: "vehicle",
    status: "active",
    terminalIds: ["brentwood-bay", "mill-bay"],
    note: "Route 12",
  },
  {
    id: "bcf-nanaimo-gabriola",
    name: "Nanaimo Harbour – Gabriola Island",
    operatorId: "bc-ferries",
    mode: "vehicle",
    status: "active",
    terminalIds: ["nanaimo-harbour", "gabriola-island"],
    note: "Route 19",
  },
  {
    id: "bcf-chemainus-thetis-penelakut",
    name: "Chemainus – Thetis Island – Penelakut Island",
    operatorId: "bc-ferries",
    mode: "vehicle",
    status: "active",
    terminalIds: ["chemainus", "thetis-island", "penelakut-island"],
    note: "Route 20",
  },
  {
    id: "bcf-buckleybay-denman",
    name: "Buckley Bay – Denman Island",
    operatorId: "bc-ferries",
    mode: "vehicle",
    status: "active",
    terminalIds: ["buckley-bay", "denman-island-west"],
    note: "Route 21",
  },
  {
    id: "bcf-denman-hornby",
    name: "Denman Island – Hornby Island",
    operatorId: "bc-ferries",
    mode: "vehicle",
    status: "active",
    terminalIds: ["denman-island-east", "hornby-island"],
    note: "Route 22",
  },
  {
    id: "bcf-campbellriver-quadra",
    name: "Campbell River – Quadra Island",
    operatorId: "bc-ferries",
    mode: "vehicle",
    status: "active",
    terminalIds: ["campbell-river", "quadra-quathiaski"],
    note: "Route 23 — northern edge of the Salish Sea",
  },
  {
    id: "bcf-quadra-cortes",
    name: "Quadra Island – Cortes Island",
    operatorId: "bc-ferries",
    mode: "vehicle",
    status: "active",
    terminalIds: ["quadra-heriot-bay", "cortes-island"],
    note: "Route 24 — northern edge of the Salish Sea",
  },
  {
    id: "bcf-frenchcreek-lasqueti",
    name: "French Creek – Lasqueti Island",
    operatorId: "bc-ferries",
    mode: "vehicle",
    status: "active",
    terminalIds: ["french-creek", "lasqueti-island"],
    note: "Route 55",
  },
];
