import type { GridPoint, SchematicLayout } from "@/domain/schematic";

/**
 * Hand-placed positions for the octolinear route diagram (see
 * src/domain/schematic.ts). One grid unit is one cell; y runs down.
 *
 * Placed by eye rather than solved for. Octolinear layout is NP-hard in
 * general and this dataset is small enough that a person does it better:
 * north stays roughly north, but the empty water of the Strait of Georgia
 * is squeezed and the crowded places are pulled apart — the San Juans, the
 * Southern Gulf Islands, and Seattle, where six routes meet at one dock.
 *
 * `src/data/__tests__/schematic-layout.test.ts` checks that every terminal
 * has a place, no two share one, and no route runs through a terminal it
 * doesn't call at.
 */
const terminals: SchematicLayout["terminals"] = {
  // --- Discovery Islands ---
  "campbell-river": { position: [2, 3], label: "Campbell River", labelSide: "w" },
  "quadra-quathiaski": { position: [5, 3], label: "Quathiaski Cove", labelSide: "s" },
  "quadra-heriot-bay": { position: [7, 1], label: "Heriot Bay", labelSide: "n" },
  "cortes-island": { position: [10, 1], label: "Cortes Island", labelSide: "e" },

  // --- Northern Strait of Georgia ---
  comox: { position: [2, 7], label: "Comox", labelSide: "w" },
  "powell-river": { position: [7, 7], label: "Powell River", labelSide: "ne" },
  "texada-island": { position: [7, 9], label: "Texada Island", labelSide: "e" },
  "saltery-bay": { position: [11, 6], label: "Saltery Bay", labelSide: "n" },
  "earls-cove": { position: [13, 8], label: "Earls Cove", labelSide: "e" },
  "buckley-bay": { position: [2, 11], label: "Buckley Bay", labelSide: "w" },
  "denman-island-west": { position: [4, 11], label: "Denman West", labelSide: "n" },
  "denman-island-east": { position: [6, 13], label: "Denman East", labelSide: "s" },
  "hornby-island": { position: [9, 13], label: "Hornby Island", labelSide: "n" },
  "french-creek": { position: [4, 18], label: "French Creek", labelSide: "w" },
  "lasqueti-island": { position: [7, 15], label: "Lasqueti Island", labelSide: "e" },

  // --- Howe Sound ---
  langdale: { position: [15, 13], label: "Langdale", labelSide: "s" },
  "gambier-island": { position: [15, 11], label: "Gambier Island", labelSide: "w" },
  "keats-island": { position: [17, 11], label: "Keats Island", labelSide: "e" },
  "horseshoe-bay": { position: [19, 13], label: "Horseshoe Bay", labelSide: "e" },
  "bowen-island": { position: [19, 15], label: "Bowen Island", labelSide: "e" },

  // --- Nanaimo ---
  "departure-bay": { position: [6, 20], label: "Departure Bay", labelSide: "w" },
  "nanaimo-harbour": { position: [6, 22], label: "Nanaimo Harbour", labelSide: "w" },
  "gabriola-island": { position: [9, 22], label: "Gabriola Island", labelSide: "e" },
  "duke-point": { position: [6, 24], label: "Duke Point", labelSide: "w" },

  // --- Central Vancouver Island and Salt Spring ---
  "thetis-island": { position: [6, 27], label: "Thetis Island", labelSide: "n" },
  chemainus: { position: [4, 29], label: "Chemainus", labelSide: "w" },
  "penelakut-island": { position: [8, 29], label: "Penelakut Island", labelSide: "e" },
  crofton: { position: [4, 32], label: "Crofton", labelSide: "w" },
  "vesuvius-bay": { position: [6, 32], label: "Vesuvius Bay", labelSide: "s" },
  "fulford-harbour": { position: [9, 30], label: "Fulford Harbour", labelSide: "w" },

  // --- Southern Gulf Islands and the Saanich Peninsula ---
  tsawwassen: { position: [22, 21], label: "Tsawwassen", labelSide: "e" },
  "galiano-island": { position: [15, 26], label: "Galiano Island", labelSide: "nw" },
  "mayne-island": { position: [15, 29], label: "Mayne Island", labelSide: "w" },
  "pender-island": { position: [15, 31], label: "Pender Island", labelSide: "w" },
  "saturna-island": { position: [17, 31], label: "Saturna Island", labelSide: "s" },
  "swartz-bay": { position: [11, 32], label: "Swartz Bay", labelSide: "w" },
  "sidney-bc": { position: [11, 34], label: "Sidney", labelSide: "e" },
  "brentwood-bay": { position: [10, 36], label: "Brentwood Bay", labelSide: "e" },
  "mill-bay": { position: [8, 36], label: "Mill Bay", labelSide: "w" },
  "victoria-belleville": { position: [12, 40], label: "Victoria", labelSide: "w" },
  "port-angeles": { position: [12, 44], label: "Port Angeles", labelSide: "w" },

  // --- North Puget Sound and the San Juans ---
  "lummi-island": { position: [25, 24], label: "Lummi Island", labelSide: "w" },
  "gooseberry-point": { position: [27, 24], label: "Gooseberry Point", labelSide: "e" },
  "guemes-island": { position: [32, 28], label: "Guemes Island", labelSide: "e" },
  "anacortes-guemes-dock": { position: [32, 30], label: "Anacortes (6th St.)", labelSide: "e" },
  anacortes: { position: [30, 30], label: "Anacortes", labelSide: "n" },
  "lopez-island": { position: [27, 30], label: "Lopez", labelSide: "n" },
  "shaw-island": { position: [25, 30], label: "Shaw", labelSide: "s" },
  "orcas-island": { position: [25, 28], label: "Orcas", labelSide: "n" },
  "friday-harbor": { position: [22, 31], label: "Friday Harbor", labelSide: "nw" },
  "friday-harbor-spring-street": { position: [22, 33], label: "Spring Street", labelSide: "e" },

  // --- Admiralty Inlet and Whidbey Island ---
  "port-townsend-point-hudson": { position: [22, 38], label: "Point Hudson", labelSide: "e" },
  "port-townsend": { position: [22, 40], label: "Port Townsend", labelSide: "w" },
  coupeville: { position: [25, 40], label: "Coupeville", labelSide: "e" },
  langley: { position: [28, 43], label: "Langley", labelSide: "w" },
  "hat-island": { position: [30, 41], label: "Hat Island", labelSide: "n" },
  "everett-marina": { position: [32, 43], label: "Everett", labelSide: "e" },
  clinton: { position: [28, 45], label: "Clinton", labelSide: "w" },
  mukilteo: { position: [30, 45], label: "Mukilteo", labelSide: "e" },

  // --- Central Puget Sound ---
  kingston: { position: [26, 48], label: "Kingston", labelSide: "w" },
  edmonds: { position: [30, 48], label: "Edmonds", labelSide: "e" },
  "seattle-pier-69": { position: [30, 51], label: "Pier 69", labelSide: "e" },
  "seattle-colman-dock": { position: [29, 52], label: "Seattle", labelSide: "e" },
  "bainbridge-island": { position: [25, 52], label: "Bainbridge Island", labelSide: "n" },
  bremerton: { position: [22, 54], label: "Bremerton", labelSide: "w" },
  "west-seattle-seacrest": { position: [30, 53], label: "West Seattle", labelSide: "e" },

  // --- South Puget Sound ---
  fauntleroy: { position: [31, 57], label: "Fauntleroy", labelSide: "e" },
  "vashon-north": { position: [28, 57], label: "Vashon", labelSide: "s" },
  southworth: { position: [24, 57], label: "Southworth", labelSide: "w" },
  tahlequah: { position: [28, 60], label: "Tahlequah", labelSide: "e" },
  "point-defiance": { position: [28, 62], label: "Point Defiance", labelSide: "e" },
  "steilacoom-landing": { position: [28, 65], label: "Steilacoom", labelSide: "e" },
  "ketron-island": { position: [26, 65], label: "Ketron", labelSide: "s" },
  "anderson-island-yoman": { position: [24, 65], label: "Anderson Island", labelSide: "w" },
};

const legVias: Record<string, readonly GridPoint[]> = {
  // Across the Strait of Georgia below Howe Sound, clear of Langdale.
  "departure-bay>horseshoe-bay": [[12, 14], [18, 14]],
  // Duke Point joins the Swartz Bay run for the last stretch into Tsawwassen.
  "duke-point>tsawwassen": [[19, 24]],
  // The two Southern Gulf Islands runs meet at Galiano and share the trunk
  // south from there; the Tsawwassen–Swartz Bay mainline cuts across it
  // between Galiano and Mayne, which is roughly where Active Pass is.
  "tsawwassen>galiano-island": [[15, 21]],
  "swartz-bay>galiano-island": [[11, 26]],
  // Suspended, but still drawn when asked for: kept off the Lopez–Shaw line
  // it would otherwise run straight through.
  "anacortes>friday-harbor": [[29, 31]],
  "friday-harbor>sidney-bc": [[19, 34]],
  // Down Admiralty Inlet, between Port Townsend and Kingston.
  "seattle-pier-69>victoria-belleville": [[21, 42], [14, 42]],
  // Out of Seattle to the southwest, then west across the Sound.
  "seattle-colman-dock>bremerton": [[27, 54]],
  "seattle-colman-dock>vashon-north": [[29, 56]],
};

export const SCHEMATIC_LAYOUT: SchematicLayout = { terminals, legVias };

/**
 * Terminals a traveller can get between without a boat, drawn as the
 * interchange connectors on a transit map: separate docks in the same
 * town, or two landings on one island joined by its road.
 */
export const SCHEMATIC_LAND_LINKS: readonly (readonly [string, string])[] = [
  ["quadra-quathiaski", "quadra-heriot-bay"],
  ["denman-island-west", "denman-island-east"],
  ["departure-bay", "nanaimo-harbour"],
  ["nanaimo-harbour", "duke-point"],
  ["swartz-bay", "sidney-bc"],
  ["anacortes", "anacortes-guemes-dock"],
  ["friday-harbor", "friday-harbor-spring-street"],
  ["port-townsend", "port-townsend-point-hudson"],
  ["langley", "clinton"],
  ["seattle-colman-dock", "seattle-pier-69"],
  ["vashon-north", "tahlequah"],
];

/**
 * The international boundary, schematically: along the 49th parallel,
 * down Boundary Pass and Haro Strait between the Gulf Islands and the San
 * Juans, then west out the Strait of Juan de Fuca. Only there so the
 * crossings that clear customs read as crossings.
 */
export const SCHEMATIC_BORDER: {
  readonly line: readonly GridPoint[];
  readonly labels: readonly { readonly text: string; readonly position: GridPoint }[];
} = {
  line: [[35, 22.5], [21.5, 22.5], [19.5, 24.5], [19.5, 40], [16.5, 43], [0, 43]],
  labels: [
    { text: "CANADA", position: [35, 21.9] },
    { text: "UNITED STATES", position: [35, 23.3] },
  ],
};

/** Names of the open water, set in the gaps between routes. */
export const SCHEMATIC_WATER_LABELS: readonly { readonly text: string; readonly position: GridPoint }[] = [
  { text: "Strait of Georgia", position: [12, 17.5] },
  { text: "Strait of Juan de Fuca", position: [7, 41.5] },
  { text: "San Juan Islands", position: [27, 34] },
  { text: "Puget Sound", position: [33, 60] },
];
