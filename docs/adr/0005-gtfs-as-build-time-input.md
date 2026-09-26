# ADR 0005: Treat GTFS feeds as build-time inputs, not a runtime data source

- Status: Accepted
- Accepted: 2026-09-25
- Date: 2026-09-15
- Informed by: a feed survey run 2026-09-15 against the Mobility Database catalog

## Context

[ADR 0001](./0001-static-hand-curated-dataset.md) makes the hand-curated dataset
in `src/data/` the source of truth, on the grounds that "some operators publish
no machine-readable feeds at all." [ADR 0004](./0004-route-map-scope.md) keeps
schedules and fares out of scope and states that future work there "would
require a separate decision and a broader data source strategy." This record is
that decision, limited to *how* GTFS data enters the project — not to what the
product does with it.

A survey of the Mobility Database catalog on 2026-09-15 found that the premise
behind ADR 0001 has weakened but not disappeared. The survey recorded the following feed availability (historical observations,
not a guarantee of current coverage):

| Operator | Feed reachable | Freshness on 2026-09-15 |
| --- | --- | --- |
| Washington State Ferries | yes | `calendar.txt` begins 20260915 — regenerated daily |
| BC Ferries (via Trillium) | yes | valid through 20270331 |
| Black Ball Ferry Line | yes | current |
| Victoria Clipper | yes | current |
| Kitsap Transit | yes | 8 ferry routes, incl. two foot ferries not on the map |
| King County Water Taxi | yes, inside the KC Metro feed | routes 973 / 975 |
| Skagit County (Guemes) | yes | current |
| Whatcom County (Lummi) | yes | **expired** — `feed_end_date` 20260801 |
| Puget Sound Express | **no** | publisher URL returns 404 |
| Pierce County (Anderson Island) | **no** | Pierce Transit's feed has no `route_type=4` routes |
| Harbor Hopper | **no** | no feed published |
| Hat Island Ferry | **no** | no feed published |

Three facts from that survey shape the decision:

**Quality is uneven and unmonitored.** One feed is regenerated daily, one expired
six weeks ago, one 404s. A design that assumes feeds are available at request
time inherits every one of those failure modes.

**The volume is not client-shippable.** The WSF feed alone is a 528 KB archive
containing 31,618 trips and 63,235 `stop_times` rows. TransLink's is 16 MB.
Parsing GTFS in the browser is not a realistic option for a map whose current
dataset is a few hundred lines of TypeScript.

**Realtime is a separate concern.** The original survey incorrectly reported
zero realtime catalog entries. The catalog includes WSF, King County Metro,
and Kitsap realtime entries; their usefulness for vessel positions has not been
assessed here. ADR 0003's WSDOT proxy remains the application's live source.
This decision concerns static schedule archives only.

## Decision

Consume GTFS at build time, as a corroborating input to the curated dataset.
Concretely, four commitments:

**1. Build-time only.** A script under `scripts/` fetches each feed, keeps only
`route_type=4` records, and emits generated TypeScript under
`src/data/generated/`. No GTFS archive is fetched at request time, parsed in the
browser, or proxied through a Next.js route handler. This follows the precedent
already set by `scripts/build-route-geometry.ts` and the top-level `data/`
directory, which exists so large build inputs cannot be imported or served by
accident.

**2. The curated dataset stays the source of truth.** GTFS corroborates; it does
not overwrite. Where a feed and `src/data/*.ts` disagree, the build reports the
disagreement and a human resolves it by editing the curated record. ADR 0001 is
amended in its reasoning, not reversed in its conclusion: the dataset is still
hand-curated, but it is now hand-curated *against a check*.

**3. The first use is validation, not features.** Before any GTFS-derived value
reaches the UI, the generated data backs assertions in
`src/data/__tests__/data-integrity.test.ts`: terminal coordinates within a
stated tolerance of the operator's `stops.txt`, every mapped route still present
in its operator's `routes.txt`, and `RouteStatus` consistent with the feed's
service calendar. Drift becomes a failing test rather than a silent inaccuracy.

**4. Feeds are vendored and pinned.** Downloaded archives live in `data/gtfs/`
beside `salish-mesh.json`, committed alongside a manifest recording each feed's
source URL, UTC fetch date, SHA-256, and `feed_version` (null if absent). Refreshing a feed is a deliberate,
reviewable commit — not something that changes the build's output between two
runs of the same source tree.

An unreachable or expired feed logs a warning and is skipped. It never fails the
build, and it never causes a curated record to be weakened or removed.

**Out of scope here.** Whether schedules, fares, or headways appear in the user
interface is *not* decided by this record. That would amend ADR 0004's product
scope and requires its own ADR. This record only establishes that if such a
feature is ever built, the data behind it arrives by the mechanism above.

## Validation semantics

The accepted implementation uses Python 3 standard-library ZIP and CSV readers
in `scripts/build-gtfs.py`, with TypeScript assertions in the existing integrity
suite. `npm run build-gtfs` reads only pinned archives; `npm run refresh-gtfs`
explicitly downloads replacements. CI checks archive hashes and regenerated
output without network access. Refresh failures retain the previous pin and
warn. A malformed or hash-mismatched local pin is an error, not an outage.

Validation uses each feed's UTC fetch date as its reference date. Expiry is
assessed at that date, not against the machine clock; otherwise an unchanged
checkout would stop validating over time. Refresh feeds to reassess freshness.
Service evidence applies weekday calendars and added/removed service dates.
Active routes require service on or after the reference date; suspended routes
must not have such service. A seasonal route needs service somewhere in the
published window, but its seasonal classification remains manually verified:
a short schedule cannot establish a year-round operating pattern.

`data/gtfs/mappings.json` pins route and stop identifiers explicitly, including
many-to-one and one-to-many route correspondences. Mapped stops must belong
to a matched route, with named exceptions for missing publisher stop_times;
those exceptions fail when membership evidence returns. Coordinates use a 1 km
terminal-area tolerance because feed points may represent a berth, terminal
building, or older dock. This catches larger displacement, not dock-level drift;
existing OSM coordinate checks remain necessary.

Coverage gaps are named exceptions, never inferred status changes. The initial
snapshot skips expired Clipper and Lummi feeds and an unreachable Kitsap feed.
BC Ferries omits Route 55 and has several route records without usable future
service dates. Those routes still receive presence and coordinate checks where
possible, with calendar gaps reported separately. Sidney's suspended service
is absent and remains manually verified. Calendar exceptions fail when service
returns, requiring review. Full-route exceptions also require manual review on
refresh. Coverage and refresh instructions live in `data/gtfs/README.md`.

## Consequences

- Feed outages, expiry, and publisher churn cannot affect a visitor's page load.
  The worst case is a stale generated file, which is visible in git history.
- The client bundle is unaffected by feed size, so adding an operator's feed
  costs nothing at runtime.
- Accuracy improves where it is hardest to eyeball: terminal coordinates and
  route existence get checked against the operators' own published data. The
  misplaced Lummi Island terminal fixed in `6e31b11` is exactly the class of
  error this catches.
- Four operators — Puget Sound Express, Pierce County, Harbor Hopper, Hat Island
  — remain entirely hand-verified. Validation coverage is partial by nature, and
  the tests must not imply otherwise.
- Vendoring adds roughly 14 MB of archives to the repository, mostly the
  combined King County Metro feed and makes feed
  refresh a manual chore. That cost is accepted in exchange for reproducible builds.
- GTFS route coverage will surface routes absent from the map — Hullo Ferries
  (Nanaimo–Vancouver), the TransLink SeaBus, Kitsap's Port Orchard and Annapolis
  foot ferries. Whether to add them is a dataset question under ADR 0001, not a
  consequence of this record.

## Alternatives considered

**Fetch feeds at runtime, server-side.** Rejected. It adds a dependency on
eleven third-party publishers of uneven reliability to a page that currently has
no external dependency except the optional vessel proxy, and it puts feed
downtime on the critical path of rendering a map that does not otherwise need
the data.

**Make GTFS the source of truth, replacing the curated dataset.** Rejected.
Coverage would regress immediately — four operators have no feed, and two of
them serve islands with no other public transport. The map's editorial framing
is also not expressible in GTFS: the Salish Sea scope, the operator palette, and
the decision to draw the suspended Anacortes–Sidney run all live outside what a
feed can say.

**Consume a third-party aggregator such as Transitland or an OpenTripPlanner
instance.** Rejected for now. It introduces an API key, a rate limit, and an
intermediary's freshness policy for data every publisher already serves directly
over plain HTTP.

## Evidence

- Feed reachability, sizes, and validity windows above were measured by direct
  HTTP fetch on 2026-09-15; the archives' `feed_info.txt` and `calendar.txt`
  contents are the source of the freshness column.
- The implementation rechecked the [Mobility Database catalog](https://github.com/MobilityData/mobility-database-catalogs/tree/main/catalogs/sources/gtfs)
  and corrected the original realtime claim; no runtime feed integration is implied.
- `data/README.md` establishes the convention that large build-time inputs live
  outside `src/` and `public/` so they cannot be bundled or served.
- `scripts/build-route-geometry.ts` establishes the generate-into-`src/data`
  build step this record reuses.
