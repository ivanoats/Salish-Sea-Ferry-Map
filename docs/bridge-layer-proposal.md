# Proposed bridge layer

This layer should explain the few places where road traffic can cross the
Salish Sea without boarding a ferry. It should be **off by default**, so the
ferry network remains the visual focus, and should include structures that
cross salt water or a navigable tidal channel rather than every bridge in the
map's bounding box.

## Recommended first release

| Map feature | Crossing | Why include it |
| --- | --- | --- |
| Deception Pass Bridge | Deception Pass and Canoe Pass, WA | The paired spans connect Whidbey Island to Fidalgo Island and the mainland road network. Represent them as one named feature, with both spans in its geometry. |
| Tacoma Narrows Bridges | Tacoma Narrows, WA | The two parallel suspension bridges provide the major road crossing between Tacoma and the Kitsap Peninsula. Represent the pair as one feature. |
| Hood Canal Bridge | Hood Canal, WA | A floating bridge across a major arm of Puget Sound and an especially clear alternative to a long drive or ferry connection. |
| Agate Pass Bridge | Agate Pass, WA | The only road connection between Bainbridge Island and the Kitsap Peninsula, directly relevant to interpreting the Seattle–Bainbridge ferry route. |
| Lions Gate Bridge | First Narrows, BC | The prominent road crossing at the entrance to Vancouver Harbour, within the Canadian portion of the map. |
| Ironworkers Memorial Second Narrows Crossing | Second Narrows, BC | Vancouver Harbour's other major road crossing; include it to avoid making the layer Washington-only. |

These six features are a compact, defensible initial set. They cover the
region's most consequential salt-water road crossings without turning the
layer into a general-purpose road map.

## Good second-release candidates

Add these only if the layer remains legible at the intended zoom levels:

- **Rainbow Bridge (La Conner)** and the **SR 20 Swinomish Channel bridges** —
  crossings of the navigable Swinomish Channel. The SR 20 highway and railway
  spans should be separate features if both are shown.
- **Manette Bridge** and **Warren Avenue Bridge** — parallel alternatives
  across Port Washington Narrows in Bremerton.
- **Johnson Street Bridge** and **Bay Street Bridge** — crossings of
  Victoria's working Inner and Upper Harbour waterways.
- **Burrard Street Bridge**, **Granville Street Bridge**, and **Cambie Street
  Bridge** — False Creek crossings that may be useful when the map is zoomed
  into Vancouver, but are less relevant to regional ferry connectivity.
- **Ballard Bridge**, **Fremont Bridge**, **University Bridge**, and **Montlake
  Bridge** — movable bridges on Seattle's Ship Canal. These belong only in a
  broader “navigable crossings” interpretation of the layer because most span
  an inland ship canal rather than the Salish Sea proper.

## Explicit exclusions

- Ordinary river, creek, highway, and railway bridges should remain part of
  the basemap rather than this overlay.
- Lake Washington floating bridges are major structures, but they do not
  cross the Salish Sea and do not explain ferry connectivity.
- Do not add a bridge solely because it lies inside the map bounds; require a
  clear relationship to a salt-water or navigable tidal crossing.

## Suggested presentation and data

- Add one **Bridges** checkbox under a contextual-layers heading, unchecked by
  default.
- Draw bridge centerlines with a neutral casing and label them only at closer
  zoom levels; ferry routes should retain stronger color and visual priority.
- Open a small detail card on selection with the bridge name, crossing,
  jurisdiction, structure type, and a source link.
- Store hand-reviewed GeoJSON locally, consistent with the project's static,
  curated data approach. Suggested properties are `id`, `name`, `crossing`,
  `jurisdiction`, `structureType`, `groupId`, and `sourceUrl`.
- Use `groupId` to keep paired structures (the Tacoma Narrows bridges) and
  multi-span crossings (Deception Pass and Canoe Pass) conceptually grouped
  while retaining their accurate individual geometries.

## Acceptance rule for future additions

A bridge belongs in this overlay when it crosses salt water or a navigable
tidal channel within the map's Salish Sea scope **and** materially helps a
reader understand regional access, ferry alternatives, or marine navigation.
Local bridges that do not meet both tests should be left to the basemap.
