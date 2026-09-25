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
  "port-townsend-point-hudson": { position: [22, 38], label: "Point Hudson", labelSide: "w" },
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
  "west-seattle-seacrest": { position: [31, 54], label: "West Seattle", labelSide: "e" },

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
  // it would otherwise run straight through, and off San Juan Island.
  "anacortes>friday-harbor": [[28, 32]],
  "friday-harbor>sidney-bc": [[19, 31], [16, 34]],
  // Up Haro Strait, then down Admiralty Inlet between Port Townsend and
  // Whidbey, the way the boat actually goes.
  "seattle-pier-69>victoria-belleville": [[23, 44], [23, 37], [15, 37]],
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
  line: [[42, 22.5], [21.5, 22.5], [19.5, 24.5], [19.5, 40], [16.5, 43], [-8, 43]],
  labels: [
    { text: "CANADA", position: [35, 21.9] },
    { text: "UNITED STATES", position: [35, 23.3] },
  ],
};

/** Names of the open water, set in the gaps between routes. */
export const SCHEMATIC_WATER_LABELS: readonly { readonly text: string; readonly position: GridPoint }[] = [
  { text: "Strait of Georgia", position: [12, 17.5] },
  { text: "Strait of Juan de Fuca", position: [7, 41.5] },
  { text: "San Juan Islands", position: [27.3, 33.6] },
  { text: "Puget Sound", position: [31.3, 59.8] },
];

/**
 * The land, drawn the way Beck drew the Thames: octolinear, simplified, and
 * bent to fit the diagram rather than the chart. Each shape is a polygon of
 * grid points; the renderer rounds the corners. Terminals sit on the coast
 * and routes stay on the water, which the layout tests check.
 *
 * The mainland and the two big peninsulas run off the edge of the view, so
 * their outer corners are well outside it.
 */
export const SCHEMATIC_LAND: readonly { readonly name: string; readonly outline: readonly GridPoint[] }[] = [
  {
    name: "Vancouver Island",
    outline: [
      [-8, -4], [2, -4], [2, 16], [4, 18], [6, 20], [6, 24], [4, 26], [4, 32], [8, 36], [8, 38],
      [10, 38], [10, 33], [11, 32], [11, 34], [12, 35], [12, 40], [11, 41], [-8, 41],
    ],
  },
  {
    name: "Olympic and Kitsap Peninsulas",
    outline: [
      [-8, 44], [19, 44], [21, 42], [21, 39], [22, 38], [22, 44], [26, 48], [23, 48], [22, 49],
      [22, 54], [23, 55], [23, 56], [24, 57], [24, 59], [26, 61], [26, 62.5], [22, 62.5], [22, 70], [-8, 70],
    ],
  },
  {
    name: "Mainland",
    outline: [
      // British Columbia, north from Tsawwassen past Howe Sound and Jervis Inlet.
      [22, 21], [22, 17], [20, 15], [20, 14], [19, 13], [19, 9], [14, 9], [14, 12], [15, 13],
      [14.5, 13.5], [11.5, 13.5], [11, 13], [11, 10], [13, 8], [15, 6], [15, 3], [14, 3], [11, 6],
      [10, 7], [7, 7], [8, 6], [12, 2], [12, -4],
      [42, -4], [42, 70],
      // Washington, north from the South Sound to the border.
      [28, 70], [28, 62], [32, 62], [33, 61], [33, 59], [31, 57], [30, 56], [30, 55], [31, 54],
      [31, 53], [30, 52], [29, 52], [30, 51], [30, 45], [31, 44], [32, 43], [32, 35], [30, 33],
      [30, 30], [32, 30], [33, 29], [33, 26], [31, 24], [27, 24], [27, 23], [24, 23],
    ],
  },
  { name: "Quadra Island", outline: [[5, -1.5], [7.5, -1.5], [7.5, 1.5], [5.5, 3.5], [5, 3.5]] },
  { name: "Cortes Island", outline: [[10, -1.5], [11.4, -1.5], [11.4, 2.2], [10, 2.2]] },
  { name: "Texada Island", outline: [[6.5, 9.3], [8.5, 9.3], [8.5, 11.5], [6.5, 11.5]] },
  { name: "Denman Island", outline: [[4, 10.3], [4.7, 10.3], [6, 11.6], [6, 13.6], [5.3, 13.6], [4, 12.3]] },
  { name: "Hornby Island", outline: [[9.3, 12.3], [10.6, 12.3], [10.6, 13.7], [9.3, 13.7]] },
  { name: "Lasqueti Island", outline: [[7.2, 14.4], [8.6, 14.4], [8.6, 15.4], [7.2, 15.4]] },
  { name: "Gambier Island", outline: [[14.6, 9.6], [16.4, 9.6], [16.4, 10.6], [14.6, 10.6]] },
  { name: "Keats Island", outline: [[16.6, 11.3], [17.8, 11.3], [17.8, 12.4], [16.6, 12.4]] },
  { name: "Bowen Island", outline: [[18.2, 14.6], [19.4, 14.6], [19.4, 16.2], [18.2, 16.2]] },
  { name: "Gabriola Island", outline: [[9, 21], [10.5, 21], [10.5, 23], [9, 23]] },
  { name: "Thetis Island", outline: [[5.5, 25.6], [6.6, 25.6], [6.6, 26.7], [5.5, 26.7]] },
  { name: "Penelakut Island", outline: [[8.3, 28.3], [9.3, 28.3], [9.3, 29.3], [8.3, 29.3]] },
  { name: "Salt Spring Island", outline: [[6.3, 30.3], [8.8, 30.3], [8.8, 32.8], [6.3, 32.8]] },
  { name: "Galiano Island", outline: [[11.6, 24.5], [14.7, 24.5], [14.7, 25.7], [12.8, 25.7]] },
  { name: "Mayne Island", outline: [[15.4, 28.8], [16.6, 28.8], [16.6, 30], [15.4, 30]] },
  { name: "Pender Island", outline: [[13.8, 30.6], [14.6, 30.6], [14.6, 32.4], [13.2, 32.4], [13.2, 31.2]] },
  { name: "Saturna Island", outline: [[17.3, 29.6], [19, 29.6], [19, 30.8], [17.3, 30.8]] },
  { name: "Lummi Island", outline: [[23.6, 23.6], [24.7, 23.6], [24.7, 26.2], [23.6, 26.2]] },
  { name: "Orcas Island", outline: [[23.5, 26], [27, 26], [27, 28], [23.5, 28]] },
  { name: "Shaw Island", outline: [[24.4, 30.4], [25.6, 30.4], [25.6, 31.4], [24.4, 31.4]] },
  { name: "Lopez Island", outline: [[26.4, 30.4], [28.2, 30.4], [28.2, 31.6], [26.4, 31.6]] },
  { name: "San Juan Island", outline: [[19.9, 31.3], [21.7, 31.3], [21.7, 34.5], [20.7, 35.5], [19.9, 35.5]] },
  { name: "Guemes Island", outline: [[30.8, 26.2], [32.5, 26.2], [32.5, 28], [30.8, 28]] },
  { name: "Whidbey Island", outline: [[25, 35], [27, 35], [28, 36], [28, 45], [27, 46], [26, 46], [25, 45]] },
  { name: "Hat Island", outline: [[29, 39.8], [30.2, 39.8], [30.2, 40.8], [29, 40.8]] },
  { name: "Bainbridge Island", outline: [[22.7, 49.6], [24, 49.6], [25, 50.6], [25, 53], [22.7, 53]] },
  { name: "Vashon Island", outline: [[26.4, 57.4], [29.6, 57.4], [29.6, 59.2], [28.8, 60], [27.2, 60], [26.4, 59.2]] },
  { name: "Anderson Island", outline: [[22.6, 63.8], [23.7, 63.8], [23.7, 66.4], [22.6, 66.4]] },
  { name: "Ketron Island", outline: [[25.6, 65.3], [26.8, 65.3], [26.8, 66], [25.6, 66]] },
];
