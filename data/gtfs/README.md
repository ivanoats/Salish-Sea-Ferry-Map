# Pinned GTFS validation

The curated TypeScript data remains authoritative. GTFS checks route presence,
terminal-area coordinates, and calendar evidence; it never updates the map.

## Commands

Requires Python 3.9+ (standard library only), in addition to the project's Node runtime.
Run commands from the repository root:

- `npm run build-gtfs`: regenerate `src/data/generated/gtfs.ts` offline.
- `npm run check-gtfs`: verify hashes, compare generated output, and test parsing.
- `npm test`: run data integrity and drift regression checks.
- `npm run refresh-gtfs`: explicitly fetch all configured publisher URLs and
  update archives, manifest, and generated output. Failed downloads warn and
  retain the previous pin. Expired downloads are pinned but excluded from checks.

Review archive and manifest changes, update explicit IDs in `mappings.json` when
needed, inspect all warnings, then run both check commands. Review full-route
exceptions on every refresh: they cannot automatically detect a restored route
whose publisher ID was never known. Calendar exceptions do fail if service returns.
Commit archives, manifest, mappings, and generated output together after review.
Normal builds and CI do not download feeds. CI checks regeneration explicitly.

## Provenance and coverage

Publisher URLs were discovered through the
[Mobility Database catalog](https://github.com/MobilityData/mobility-database-catalogs/tree/main/catalogs/sources/gtfs/schedule).
Archives are original, unmodified downloads. `manifest.json` records the source
URL, UTC fetch date, SHA-256, and publisher `feed_version` (null when omitted).
A feed without an archive has a reason, not an empty success result.
Publisher attribution is preserved inside each archive's `agency.txt` and
`feed_info.txt`; these archives are validation inputs, not redistributed UI data.

Initial snapshot fetched 2026-09-26 UTC (2026-09-25 Pacific):

| Operator | Coverage |
| --- | --- |
| WSF | Eight active curated routes; suspended Sidney crossing manually verified |
| BC Ferries | Twenty curated routes have presence and coordinate checks; Route 55 absent; eight calendar gaps explicitly recorded |
| Black Ball | Route, stops, calendar |
| King County Water Taxi | Both routes, stops, calendars; other Metro modes filtered out |
| Skagit County | Route, stops, calendar |
| Kitsap | Download returned HTTP 406; skipped |
| Victoria Clipper | Archive expired in February 2018; skipped |
| Whatcom County | Archive expired August 2026; skipped |
| Pierce County, Harbor Hopper, Hat Island, Puget Sound Express | No usable feed identified; manually verified |

Coverage warnings appear during generation and in the integrity test. They do
not fail the build. Missing or corrupt pinned files and unexpected data drift do.
The King County archive contains the entire Metro feed (~13 MB), although only
ferry data enters the generated snapshot. Total archives are ~14 MB.

## What a passing check establishes

Route and stop IDs are explicit and operator-specific. They are not fuzzy name
matches or recalculated nearest neighbours, so an ID disappearing fails review.
WSF's directional crossings combine into curated circuits; BC's Southern Gulf
Islands record corroborates two curated routes. Each mapped stop must occur in at least one matched route's stop_times.
Eleven terminal memberships in the initial BC snapshot lack this evidence and
have named exceptions in `stopMembershipSkipReasons`; these still receive
coordinate checks and fail if the stop returns to the matched route. Terminal
building IDs have been replaced with the corresponding served boarding-stop IDs
where available. This is not a check of every sailing's stop order or complete
end-to-end connectivity.

The coordinate tolerance is **1,000 metres**. This allows terminal buildings,
berths, and older dock points, including the approximately 0.8 km discrepancies
at the Guemes terminals. It is a coarse displacement check, not confirmation of
precise dock placement. Existing dock-level checks against OSM remain separate.

Calendar weekdays and `calendar_dates.txt` additions/removals are expanded,
including feeds that contain only exception dates. Feed validity bounds the
window; without declared validity, the fallback window is the fetch date through
366 days later. Expiry is evaluated at the pinned fetch date for reproducibility.
A passing old snapshot makes no claim about present-day service: refresh it.

Active routes require some service on or after the snapshot date, not a sailing
every day. Suspended routes must have none. Seasonal routes require service
somewhere in the window, with seasonal classification explicitly left for human
verification. An incomplete calendar is recorded as a named exception, never
used to suspend a route. New service invalidates that exception for review.

GTFS field semantics follow the [official schedule reference](https://gtfs.org/documentation/schedule/reference/).
