"""Offline regression fixtures for CSV, mode filtering, calendar and pin semantics."""
import importlib.util
import io
import hashlib
import json
import tempfile
from unittest.mock import patch
from pathlib import Path
import unittest
import zipfile

spec = importlib.util.spec_from_file_location('gtfs', Path(__file__).with_name('build-gtfs.py'))
gtfs = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gtfs)


def archive(files):
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, 'w') as z:
        for name, content in files.items():
            z.writestr(name, content)
    return buffer.getvalue()


class GtfsTests(unittest.TestCase):
    def test_weekdays_and_exceptions(self):
        row = dict(service_id='a', start_date='20260921', end_date='20260927',
                   monday='1', tuesday='0', wednesday='0', thursday='0',
                   friday='0', saturday='0', sunday='0')
        dates = gtfs.service_dates([row], [
            dict(service_id='a', date='20260921', exception_type='2'),
            dict(service_id='a', date='20260926', exception_type='1'),
            dict(service_id='b', date='20260927', exception_type='1')])
        self.assertEqual(dates, {'a': {'20260926'}, 'b': {'20260927'}})

    def fixture(self):
        return {
            'routes.txt': 'route_id,route_type,route_long_name\nf,4,"Ferry, island"\nb,3,Bus\n',
            'trips.txt': 'route_id,service_id,trip_id\nf,s,t\nb,s,bus\n',
            'stops.txt': '\ufeffstop_id,stop_name,stop_lon,stop_lat\na,"Dock, west",-123,48\nz,Bus,-122,47\n',
            'stop_times.txt': 'trip_id,stop_id,stop_sequence\nt,a,1\nbus,z,1\n',
            'calendar_dates.txt': 'service_id,date,exception_type\ns,20260926,1\n',
        }

    def test_exception_only_feed_bom_quoted_csv_and_ferry_filter(self):
        result = gtfs.normalize(archive(self.fixture()), '2026-09-26')
        self.assertIsNone(result['skipReason'])
        self.assertEqual([r['id'] for r in result['routes']], ['f'])
        self.assertEqual(result['routes'][0]['serviceDates'], ['20260926'])
        self.assertEqual(result['stops'], [dict(id='a', name='Dock, west', coordinates=[-123.0, 48.0])])

    def test_expired_feed_is_skipped(self):
        result = gtfs.normalize(archive(self.fixture()), '2026-09-27')
        self.assertIn('Expired', result['skipReason'])
        self.assertEqual(result['routes'], [])
        self.assertEqual(result['stops'], [])

    def test_feed_info_expiry_wins_over_long_calendar(self):
        files = self.fixture()
        files['feed_info.txt'] = 'feed_end_date,feed_version\n20260925,v1\n'
        result = gtfs.normalize(archive(files), '2026-09-26')
        self.assertIn('Expired', result['skipReason'])
        self.assertEqual(result['feedVersion'], 'v1')

    def test_hash_mismatch_fails_instead_of_skipping(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'feed.zip').write_bytes(archive(self.fixture()))
            (root / 'manifest.json').write_text(json.dumps([dict(
                operatorId='test', archive='feed.zip', sha256='wrong', fetchedAt='2026-09-26')]))
            with patch.object(gtfs, 'FEEDS', root):
                with self.assertRaisesRegex(ValueError, 'Hash mismatch'):
                    gtfs.build()

    def test_refresh_failure_retains_pin_and_offline_output(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            blob = archive(self.fixture())
            (root / 'feed.zip').write_bytes(blob)
            feed = dict(operatorId='test', archive='feed.zip',
                        sha256=hashlib.sha256(blob).hexdigest(), fetchedAt='2026-09-26',
                        url='https://example.test/feed.zip', feedVersion=None)
            (root / 'manifest.json').write_text(json.dumps([feed]))
            with patch.object(gtfs, 'FEEDS', root):
                before = gtfs.build()
                with patch.object(gtfs.urllib.request, 'urlopen', side_effect=OSError('offline')):
                    after = gtfs.build(refresh=True)
                self.assertEqual(before, after)
                self.assertEqual(json.loads((root / 'manifest.json').read_text()), [feed])
                self.assertEqual((root / 'feed.zip').read_bytes(), blob)

    def test_missing_required_file_is_an_error(self):
        files = self.fixture()
        del files['stops.txt']
        with self.assertRaisesRegex(ValueError, 'Missing stops.txt'):
            gtfs.normalize(archive(files), '2026-09-26')

    def test_unknown_service_is_an_error(self):
        files = self.fixture()
        del files['calendar_dates.txt']
        with self.assertRaisesRegex(ValueError, 'Unknown service'):
            gtfs.normalize(archive(files), '2026-09-26')


if __name__ == '__main__':
    unittest.main()
