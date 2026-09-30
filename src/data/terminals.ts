import type { Terminal } from "@/domain/ferry";

/**
 * Terminal coordinates are compiled from operator route pages, Wikipedia,
 * and general chart knowledge to roughly dock-level precision — good
 * enough to place a marker and draw a route line at Salish Sea scale, but
 * NOT for navigation. See README.md.
 */
export const TERMINALS: readonly Terminal[] = [
  // --- Washington State Ferries ---
  { id: "seattle-colman-dock", name: "Seattle (Colman Dock)", coordinates: [-122.3393, 47.6021], jurisdiction: "WA" },
  { id: "bainbridge-island", name: "Bainbridge Island", coordinates: [-122.5108, 47.6229], jurisdiction: "WA" },
  // OSM node 648972987 (terminal audit: moved 630 m onto the dock)
  { id: "bremerton", name: "Bremerton", coordinates: [-122.62448, 47.56195], jurisdiction: "WA" },
  { id: "fauntleroy", name: "Fauntleroy (West Seattle)", coordinates: [-122.3959, 47.5228], jurisdiction: "WA" },
  { id: "vashon-north", name: "Vashon Island (Fauntleroy dock)", coordinates: [-122.4649, 47.5088], jurisdiction: "WA" },
  { id: "southworth", name: "Southworth", coordinates: [-122.5013, 47.5122], jurisdiction: "WA" },
  { id: "point-defiance", name: "Point Defiance (Tacoma)", coordinates: [-122.5145, 47.3054], jurisdiction: "WA" },
  { id: "tahlequah", name: "Tahlequah (Vashon Island)", coordinates: [-122.5069, 47.3336], jurisdiction: "WA" },
  // OSM node 1430380270 (terminal audit: moved 170 m onto the dock)
  { id: "edmonds", name: "Edmonds", coordinates: [-122.3833, 47.81271], jurisdiction: "WA" },
  { id: "kingston", name: "Kingston", coordinates: [-122.4956, 47.7968], jurisdiction: "WA" },
  // OSM node 11369005247 (terminal audit: moved 660 m onto the dock)
  { id: "mukilteo", name: "Mukilteo", coordinates: [-122.29704, 47.95067], jurisdiction: "WA" },
  { id: "clinton", name: "Clinton (Whidbey Island)", coordinates: [-122.3514, 47.9752], jurisdiction: "WA" },
  { id: "port-townsend", name: "Port Townsend", coordinates: [-122.7597, 48.1126], jurisdiction: "WA" },
  // OSM node 48286500 (terminal audit: moved 340 m onto the dock)
  { id: "coupeville", name: "Coupeville / Keystone (Whidbey Island)", coordinates: [-122.67271, 48.15913], jurisdiction: "WA" },
  { id: "anacortes", name: "Anacortes", coordinates: [-122.6789, 48.5077], jurisdiction: "WA" },
  { id: "lopez-island", name: "Lopez Island", coordinates: [-122.8834, 48.5706], jurisdiction: "WA" },
  { id: "shaw-island", name: "Shaw Island", coordinates: [-122.9308, 48.5836], jurisdiction: "WA" },
  { id: "orcas-island", name: "Orcas Landing (Orcas Island)", coordinates: [-122.9436, 48.5989], jurisdiction: "WA" },
  { id: "friday-harbor", name: "Friday Harbor (San Juan Island)", coordinates: [-123.0163, 48.5352], jurisdiction: "WA" },
  // OSM node 381793849 (terminal audit: moved 730 m onto the dock)
  { id: "sidney-bc", name: "Sidney, BC", coordinates: [-123.39672, 48.64315], jurisdiction: "BC" },

  // --- King County Water Taxi ---
  { id: "west-seattle-seacrest", name: "West Seattle (Seacrest Dock)", coordinates: [-122.3796, 47.5894], jurisdiction: "WA" },

  // --- Black Ball Ferry Line / Victoria Clipper ---
  // OSM node 8176177173 (terminal audit: moved 470 m onto the dock)
  { id: "port-angeles", name: "Port Angeles", coordinates: [-123.43073, 48.12184], jurisdiction: "WA" },
  { id: "victoria-belleville", name: "Victoria, BC (Belleville St. Terminal)", coordinates: [-123.3719, 48.4229], jurisdiction: "BC" },
  { id: "seattle-pier-69", name: "Seattle (Pier 69)", coordinates: [-122.3406, 47.6086], jurisdiction: "WA" },

  // --- Pierce County ---
  { id: "steilacoom-landing", name: "Steilacoom Landing", coordinates: [-122.6031, 47.17315], jurisdiction: "WA" },
  { id: "ketron-island", name: "Ketron Island", coordinates: [-122.6292, 47.16223], jurisdiction: "WA" },
  { id: "anderson-island-yoman", name: "Anderson Island (Yoman)", coordinates: [-122.67726, 47.17855], jurisdiction: "WA" },

  // --- Skagit County / Whatcom County ---
  // OSM node 243582118 (terminal audit: moved 850 m onto the dock)
  { id: "anacortes-guemes-dock", name: "Anacortes (6th St. dock)", coordinates: [-122.6236, 48.51907], jurisdiction: "WA" },
  // OSM node 2198540170 (terminal audit: moved 810 m onto the dock)
  { id: "guemes-island", name: "Guemes Island", coordinates: [-122.62466, 48.52803], jurisdiction: "WA" },
  { id: "gooseberry-point", name: "Gooseberry Point", coordinates: [-122.6702, 48.73123], jurisdiction: "WA" },
  { id: "lummi-island", name: "Lummi Island", coordinates: [-122.68131, 48.72044], jurisdiction: "WA" },

  // --- Everett-based passenger ferries (Harbor Hopper, Hat Island) ---
  // One Everett terminal, not two. OSM ends the Harbor Hopper and the Hat
  // Island Ferry 57 m apart, and both operators describe the same place —
  // the Port of Everett's south docks behind Anthony's. Two markers that
  // close render as one smudge at every zoom this map uses, so they share
  // a terminal; the OSM endpoint of each route is well inside the 1.25 nm
  // the geometry builder allows, so both legs still get real geometry.
  { id: "everett-marina", name: "Everett (Port of Everett Marina)", coordinates: [-122.22372, 47.99666], jurisdiction: "WA" },
  { id: "langley", name: "Langley (Whidbey Island)", coordinates: [-122.40197, 48.03864], jurisdiction: "WA" },
  { id: "hat-island", name: "Hat Island (Gedney Island)", coordinates: [-122.32259, 48.02016], jurisdiction: "WA" },

  // --- Port of Everett (Jetty Island Ferry) ---
  // The Jetty Island Ferry's two landings. OSM maps the crossing as a bare
  // route=ferry way (243013571) with no terminal nodes, so these are its end
  // nodes: 319262243 on the Everett waterfront, 850 m north of the marina
  // docks, and 12116363048 on Jetty Island.
  { id: "everett-jetty-landing", name: "Everett (Jetty Island Ferry landing)", coordinates: [-122.22313, 48.00429], jurisdiction: "WA" },
  { id: "jetty-island", name: "Jetty Island", coordinates: [-122.22647, 48.00336], jurisdiction: "WA" },

  // --- Puget Sound Express ---
  // Point Hudson is the operator's own dock, a mile up the shore from the
  // Port Townsend slip. At the other end the boat lands at Spring Street
  // Landing, a short walk from the WSF terminal, so it shares the
  // friday-harbor terminal rather than having one of its own.
  { id: "port-townsend-point-hudson", name: "Port Townsend (Point Hudson)", coordinates: [-122.75166, 48.11704], jurisdiction: "WA" },

  // --- BC Ferries ---
  { id: "tsawwassen", name: "Tsawwassen", coordinates: [-123.1306, 49.0062], jurisdiction: "BC" },
  { id: "swartz-bay", name: "Swartz Bay", coordinates: [-123.4106, 48.6889], jurisdiction: "BC" },
  { id: "departure-bay", name: "Departure Bay (Nanaimo)", coordinates: [-123.9556, 49.1934], jurisdiction: "BC" },
  { id: "horseshoe-bay", name: "Horseshoe Bay (West Vancouver)", coordinates: [-123.2716, 49.3763], jurisdiction: "BC" },
  { id: "duke-point", name: "Duke Point (Nanaimo)", coordinates: [-123.89177, 49.16001], jurisdiction: "BC" },
  // OSM node 2502620344 (issue #61: the old point was ~650 m out in Howe Sound)
  { id: "langdale", name: "Langdale (Sunshine Coast)", coordinates: [-123.47234, 49.43394], jurisdiction: "BC" },
  // OSM node 431362174 (terminal audit: moved 760 m onto the dock)
  { id: "earls-cove", name: "Earls Cove (Sunshine Coast)", coordinates: [-124.00884, 49.75315], jurisdiction: "BC" },
  { id: "saltery-bay", name: "Saltery Bay", coordinates: [-124.1771, 49.78142], jurisdiction: "BC" },
  { id: "gambier-island", name: "Gambier Island (New Brighton)", coordinates: [-123.43958, 49.44999], jurisdiction: "BC" },
  { id: "keats-island", name: "Keats Island (Eastbourne)", coordinates: [-123.4332, 49.39556], jurisdiction: "BC" },
  // OSM node 529748303 (issue #61: the old point was ~600 m south, out in the harbour)
  { id: "fulford-harbour", name: "Fulford Harbour (Salt Spring Island)", coordinates: [-123.45113, 48.76939], jurisdiction: "BC" },
  // Salt Spring's third terminal, on the northeast shore: Route 9 sailings to
  // Tsawwassen and the other Southern Gulf Islands, not the Swartz Bay run.
  { id: "long-harbour", name: "Long Harbour (Salt Spring Island)", coordinates: [-123.44578, 48.85211], jurisdiction: "BC" },
  // OSM node 1327617345 (terminal audit: moved 570 m onto the dock)
  { id: "galiano-island", name: "Sturdies Bay (Galiano Island)", coordinates: [-123.31487, 48.87657], jurisdiction: "BC" },
  { id: "mayne-island", name: "Village Bay (Mayne Island)", coordinates: [-123.32328, 48.84454], jurisdiction: "BC" },
  { id: "pender-island", name: "Otter Bay (Pender Island)", coordinates: [-123.31561, 48.80052], jurisdiction: "BC" },
  { id: "saturna-island", name: "Lyall Harbour (Saturna Island)", coordinates: [-123.20138, 48.79809], jurisdiction: "BC" },
  // OSM node 323412044 (terminal audit: moved 340 m onto the dock)
  { id: "crofton", name: "Crofton", coordinates: [-123.63764, 48.8657], jurisdiction: "BC" },
  { id: "vesuvius-bay", name: "Vesuvius Bay (Salt Spring Island)", coordinates: [-123.57339, 48.88125], jurisdiction: "BC" },
  // OSM node 582681660 (terminal audit: moved 470 m onto the dock)
  { id: "bowen-island", name: "Snug Cove (Bowen Island)", coordinates: [-123.33135, 49.37949], jurisdiction: "BC" },
  { id: "comox", name: "Comox (Little River)", coordinates: [-124.92382, 49.73991], jurisdiction: "BC" },
  // OSM node 431362030 (terminal audit: moved 280 m onto the dock)
  { id: "powell-river", name: "Powell River (Westview)", coordinates: [-124.53074, 49.83524], jurisdiction: "BC" },
  { id: "texada-island", name: "Blubber Bay (Texada Island)", coordinates: [-124.62007, 49.79482], jurisdiction: "BC" },
  // OSM node 2011487938 (terminal audit: moved 700 m onto the dock)
  { id: "brentwood-bay", name: "Brentwood Bay", coordinates: [-123.46734, 48.57725], jurisdiction: "BC" },
  { id: "mill-bay", name: "Mill Bay", coordinates: [-123.51777, 48.61399], jurisdiction: "BC" },
  // OSM node 1686416218 (terminal audit: moved 320 m onto the dock)
  { id: "nanaimo-harbour", name: "Nanaimo Harbour", coordinates: [-123.93071, 49.16619], jurisdiction: "BC" },
  { id: "gabriola-island", name: "Descanso Bay (Gabriola Island)", coordinates: [-123.85838, 49.1778], jurisdiction: "BC" },
  // OSM node 2879075873 (terminal audit: moved 240 m onto the dock)
  { id: "chemainus", name: "Chemainus", coordinates: [-123.7142, 48.92553], jurisdiction: "BC" },
  { id: "thetis-island", name: "Preedy Harbour (Thetis Island)", coordinates: [-123.67824, 48.98096], jurisdiction: "BC" },
  { id: "penelakut-island", name: "Penelakut Island", coordinates: [-123.66127, 48.97073], jurisdiction: "BC" },
  { id: "buckley-bay", name: "Buckley Bay", coordinates: [-124.84655, 49.52639], jurisdiction: "BC" },
  { id: "denman-island-west", name: "Denman Island (west landing)", coordinates: [-124.823743, 49.5344473], jurisdiction: "BC" },
  { id: "denman-island-east", name: "Gravelly Bay (Denman Island, east landing)", coordinates: [-124.70882, 49.49393], jurisdiction: "BC" },
  { id: "hornby-island", name: "Shingle Spit (Hornby Island)", coordinates: [-124.70454, 49.51125], jurisdiction: "BC" },
  { id: "campbell-river", name: "Campbell River", coordinates: [-125.242405, 50.0283191], jurisdiction: "BC" },
  { id: "quadra-quathiaski", name: "Quathiaski Cove (Quadra Island)", coordinates: [-125.2181, 50.0417], jurisdiction: "BC" },
  // OSM node 2099152884 (terminal audit: moved 400 m onto the dock)
  { id: "quadra-heriot-bay", name: "Heriot Bay (Quadra Island)", coordinates: [-125.21075, 50.10352], jurisdiction: "BC" },
  { id: "cortes-island", name: "Whaletown (Cortes Island)", coordinates: [-125.05386, 50.10974], jurisdiction: "BC" },
  { id: "french-creek", name: "French Creek", coordinates: [-124.35662, 49.34895], jurisdiction: "BC" },
  { id: "lasqueti-island", name: "False Bay (Lasqueti Island)", coordinates: [-124.35159, 49.49144], jurisdiction: "BC" },

  // --- Hullo (downtown Nanaimo – downtown Vancouver) ---
  // Hullo's own docks, not BC Ferries': the Nanaimo one is half a mile south
  // of the Gabriola ferry at Nanaimo Harbour, and the Vancouver one is at
  // Coal Harbour, a short walk west of the SeaBus.
  { id: "nanaimo-hullo", name: "Nanaimo (Hullo terminal)", coordinates: [-123.92249, 49.16354], jurisdiction: "BC" },
  { id: "vancouver-hullo", name: "Vancouver (Hullo terminal, Coal Harbour)", coordinates: [-123.11635, 49.29031], jurisdiction: "BC" },

  // --- TransLink SeaBus ---
  { id: "vancouver-waterfront", name: "Vancouver (Waterfront)", coordinates: [-123.10903, 49.28702], jurisdiction: "BC" },
  { id: "lonsdale-quay", name: "North Vancouver (Lonsdale Quay)", coordinates: [-123.08392, 49.30954], jurisdiction: "BC" },

  // --- False Creek (Aquabus and False Creek Ferries) ---
  // Docks that serve both operators are one terminal. Granville Island's two
  // docks (0.093 nm apart) are one, placed on the Aquabus dock; so are the
  // Aquabus dock at Hornby Street and False Creek Ferries' Aquatic Centre
  // dock (0.175 nm), placed at Hornby Street.
  // OSM node 728158415
  { id: "false-creek-maritime-museum", name: "Maritime Museum (Vanier Park)", coordinates: [-123.14701, 49.27871], jurisdiction: "BC" },
  // OSM node 638861821 (Aquabus Hornby Terminal; the Aquatic Centre dock is node 643885508)
  { id: "false-creek-hornby", name: "Hornby Street / Aquatic Centre (False Creek)", coordinates: [-123.13437, 49.27424], jurisdiction: "BC" },
  // OSM node 3456666797 (Aquabus dock; the False Creek Ferries dock is node 7323816655)
  { id: "granville-island", name: "Granville Island", coordinates: [-123.13394, 49.27249], jurisdiction: "BC" },
  // OSM node 3456659790
  { id: "false-creek-david-lam-park", name: "David Lam Park (False Creek)", coordinates: [-123.12519, 49.27048], jurisdiction: "BC" },
  // OSM node 3456696411
  { id: "false-creek-stamps-landing", name: "Stamps Landing (False Creek)", coordinates: [-123.11876, 49.26942], jurisdiction: "BC" },
  // OSM node 1356857891
  { id: "false-creek-yaletown", name: "Yaletown (False Creek)", coordinates: [-123.11795, 49.27171], jurisdiction: "BC" },
  // OSM node 3456702076
  { id: "false-creek-spyglass", name: "Spyglass Place (False Creek)", coordinates: [-123.11551, 49.27101], jurisdiction: "BC" },
  // OSM node 431234884
  { id: "false-creek-plaza-of-nations", name: "Plaza of Nations (False Creek)", coordinates: [-123.10982, 49.2742], jurisdiction: "BC" },
  // OSM node 431234943
  { id: "false-creek-village", name: "The Village (False Creek, by Science World)", coordinates: [-123.10565, 49.27249], jurisdiction: "BC" },
];

export const TERMINALS_BY_ID = new Map(TERMINALS.map((t) => [t.id, t] as const));
