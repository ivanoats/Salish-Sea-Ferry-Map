"""Pinned GTFS -> validation-only TypeScript. Python 3 standard library only."""
import argparse
import csv
import datetime as dt
import hashlib
import io
import json
from pathlib import Path
import sys
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parent.parent
FEEDS = ROOT / 'data/gtfs'
OUTPUT = ROOT / 'src/data/generated/gtfs.ts'


def table(archive, name, required=False):
    if name not in archive.namelist():
        if required:
            raise ValueError(f'Missing {name}')
        return []
    return list(csv.DictReader(io.StringIO(archive.read(name).decode('utf-8-sig'))))


def service_dates(calendars, exceptions, lower="00010101", upper="99991231"):
    """Expand weekdays, then apply additions/removals, including exception-only feeds."""
    services = {}
    for row in calendars:
        dates = services.setdefault(row['service_id'], set())
        start = dt.datetime.strptime(max(row['start_date'], lower), '%Y%m%d').date()
        end = dt.datetime.strptime(min(row['end_date'], upper), '%Y%m%d').date()
        if (end - start).days > 3660:
            raise ValueError('Calendar exceeds ten years')
        day = start
        while day <= end:
            if row[('monday','tuesday','wednesday','thursday','friday','saturday','sunday')[day.weekday()]] == '1':
                dates.add(day.strftime('%Y%m%d'))
            day += dt.timedelta(days=1)
    for row in exceptions:
        dates = services.setdefault(row['service_id'], set())
        if row['exception_type'] == '1':
            if lower <= row['date'] <= upper:
                dates.add(row['date'])
        elif row['exception_type'] == '2':
            dates.discard(row['date'])
        else:
            raise ValueError('Invalid calendar exception')
    return services


def normalize(blob, reference):
    with zipfile.ZipFile(io.BytesIO(blob)) as archive:
        info = next(iter(table(archive, 'feed_info.txt')), {})
        all_routes = table(archive, 'routes.txt', True)
        routes = {r['route_id']: r for r in all_routes if r['route_type'] == '4'}
        trips = {r['trip_id']: r for r in table(archive, 'trips.txt', True) if r['route_id'] in routes}
        services = service_dates(table(archive, 'calendar.txt'), table(archive, 'calendar_dates.txt'),
                                 info.get('feed_start_date') or reference.replace('-', ''),
                                 info.get('feed_end_date') or (dt.date.fromisoformat(reference) + dt.timedelta(days=366)).strftime('%Y%m%d'))
        stops = {r['stop_id']: r for r in table(archive, 'stops.txt', True)}
        route_stops = {rid: set() for rid in routes}
        for row in table(archive, 'stop_times.txt', True):
            if row['trip_id'] in trips:
                route_stops[trips[row['trip_id']]['route_id']].add(row['stop_id'])
        route_dates = {rid: set() for rid in routes}
        for trip in trips.values():
            if trip['service_id'] not in services:
                raise ValueError(f"Unknown service {trip['service_id']}")
            route_dates[trip['route_id']].update(services[trip['service_id']])
        dates = set().union(*route_dates.values()) if routes else set()
        end = info.get('feed_end_date') or max(dates, default='')
        reason = None
        if not routes:
            reason = 'No route_type=4 records'
        elif not end or end < reference.replace('-', ''):
            reason = f'Expired or undated feed (end {end or "unknown"})'
        result = []
        for rid, row in sorted(routes.items()):
            result.append({'id': rid, 'name': row.get('route_long_name') or row.get('route_short_name'),
                           'serviceDates': sorted(route_dates[rid]),
                           'stops': [{'id': sid, 'name': stops[sid]['stop_name'],
                                      'coordinates': [float(stops[sid]['stop_lon']), float(stops[sid]['stop_lat'])]}
                                     for sid in sorted(route_stops[rid])]})
        return {'feedVersion': info.get('feed_version') or None, 'endDate': end or None,
                'skipReason': reason, 'routes': [] if reason else result,
                'stops': [] if reason else [{'id': sid, 'name': row['stop_name'],
                    'coordinates': [float(row['stop_lon']), float(row['stop_lat'])]}
                    for sid, row in sorted(stops.items())
                    if row.get('stop_lon') and row.get('stop_lat') and
                    (len(routes) == len(all_routes) or any(sid in ids for ids in route_stops.values()))]}


def build(refresh=False):
    manifest = json.loads((FEEDS / 'manifest.json').read_text())
    output = []
    for feed in manifest:
        if refresh and feed.get('url'):
            try:
                blob = urllib.request.urlopen(feed['url'], timeout=30).read()
                reference = dt.datetime.now(dt.timezone.utc).date().isoformat()
                normalized = normalize(blob, reference)
                archive = feed['operatorId'] + '.zip'
                (FEEDS / archive).write_bytes(blob)
                feed.update(archive=archive, fetchedAt=reference, sha256=hashlib.sha256(blob).hexdigest(),
                            feedVersion=normalized['feedVersion'])
                feed.pop('skipReason', None)
            except Exception as error:
                # Keep the previous pin intact on transient network/publisher failures.
                print(f"WARNING {feed['operatorId']}: refresh failed; keeping previous pin: {error}", file=sys.stderr)
        entry = {'operatorId': feed['operatorId'], 'referenceDate': feed.get('fetchedAt'),
                 'skipReason': feed.get('skipReason'), 'routes': []}
        if feed.get('archive'):
            blob = (FEEDS / feed['archive']).read_bytes()
            if hashlib.sha256(blob).hexdigest() != feed['sha256']:
                raise ValueError(f"Hash mismatch: {feed['archive']}")
            entry.update(normalize(blob, feed['fetchedAt']))
        if entry['skipReason']:
            print(f"WARNING {feed['operatorId']}: {entry['skipReason']}", file=sys.stderr)
        output.append(entry)
    if refresh:
        (FEEDS / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    return '// Generated by scripts/build-gtfs.py; validation only. Do not import in application code.\nexport const GTFS = ' + json.dumps(output, indent=2) + ';\n'


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--refresh', action='store_true', help='Download and pin feeds explicitly')
    parser.add_argument('--check', action='store_true', help='Check the generated file without writing')
    args = parser.parse_args()
    if args.check and args.refresh:
        parser.error('--check and --refresh are mutually exclusive')
    generated = build(args.refresh)
    if args.check:
        if not OUTPUT.exists() or OUTPUT.read_text() != generated:
            sys.exit('GTFS output is stale; run npm run build-gtfs')
    else:
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT.write_text(generated)
