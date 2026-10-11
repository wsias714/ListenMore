import json
import os
import sys
import tempfile
import unittest
from datetime import date
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


def book(i, last=None, **kw):
    b = {'id': i, 'title': f'T{i}', 'created': f'2026-01-{int(i[1:]):02d}', 'thesis': f'thesis {i}',
         'reviews': [{'date': last, 'type': 'APPLY', 'note': ''}] if last else []}
    b.update(kw)
    return b


class InsightsTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        d = Path(self.tmp.name)
        (d / 'app').mkdir()
        os.environ['LISTENMORE_DIR'] = str(d / 'app')
        os.environ['LISTENMORE_STATE'] = str(d / 'state')
        for m in ('lm_common', 'insights'):
            sys.modules.pop(m, None)
        import insights
        self.ins = insights
        self.app = d / 'app'

    def tearDown(self):
        self.tmp.cleanup()
        os.environ.pop('LISTENMORE_DIR', None)
        os.environ.pop('LISTENMORE_STATE', None)

    def lib(self, books):
        (self.app / 'library.json').write_text(json.dumps({'books': books}))

    def test_target_saturday(self):
        self.assertEqual(self.ins.target_saturday(date(2026, 10, 16)), date(2026, 10, 17))  # Fri
        self.assertEqual(self.ins.target_saturday(date(2026, 10, 17)), date(2026, 10, 17))  # Sat

    def test_pick_prefers_least_recently_reviewed_and_is_stable(self):
        books = [book(f'b{i:02d}'.replace('b0', 'b'), last='2026-10-01' if i > 4 else None) for i in range(1, 9)]
        sat = date(2026, 10, 17)
        got = self.ins.pick(books, sat)
        self.assertEqual(got, self.ins.pick(books, sat))
        self.assertTrue(all(not b['reviews'] for b in got))  # the never-reviewed half wins

    def test_skips_midweek_and_generates_friday_once(self):
        self.lib([book('b1'), book('b2'), book('b3'), book('b4')])
        self.assertIn('skipped', self.ins.generate(date(2026, 10, 14)))
        with mock.patch.object(self.ins.lm, 'run_json', return_value={'lines': ['T1: x', 'T2: y']}) as rj:
            r = self.ins.generate(date(2026, 10, 16))
            self.assertEqual(r['lines'], ['T1: x', 'T2: y'])
            self.assertEqual(r['for_day'], '2026-10-17')
            self.assertIn('skipped', self.ins.generate(date(2026, 10, 17)))  # already have it
        self.assertEqual(rj.call_count, 1)

    def test_falls_back_without_llm_and_never_picks_listening_books(self):
        self.lib([book('b1', status='listening'), book('b2', topApplication='do it')])
        with mock.patch.object(self.ins.lm, 'run_json', return_value=None):
            r = self.ins.generate(date(2026, 10, 17))
        self.assertEqual(r['books'], ['b2'])
        self.assertEqual(r['lines'], ['Tb2: thesis b2 Try: do it'])


if __name__ == '__main__':
    unittest.main()
