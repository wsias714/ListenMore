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
        (d / 'daily').mkdir()
        (d / 'plans').mkdir()
        os.environ['LISTENMORE_DIR'] = str(d / 'app')
        os.environ['LISTENMORE_STATE'] = str(d / 'state')
        os.environ['HK_DAILY_DIR'] = str(d / 'daily')
        os.environ['BENCH_DB'] = str(d / 'bench.db')
        os.environ['BENCH_WEEKPLAN_DIR'] = str(d / 'plans')
        for m in ('lm_common', 'insights'):
            sys.modules.pop(m, None)
        import insights
        self.ins = insights
        self.app = d / 'app'
        self.daily = d / 'daily'
        self.plans = d / 'plans'
        self.db = d / 'bench.db'

    def tearDown(self):
        self.tmp.cleanup()
        for k in ('LISTENMORE_DIR', 'LISTENMORE_STATE', 'HK_DAILY_DIR', 'BENCH_DB', 'BENCH_WEEKPLAN_DIR'):
            os.environ.pop(k, None)

    def lib(self, books):
        (self.app / 'library.json').write_text(json.dumps({'books': books}))

    def week(self):
        """A week of Bench data: a closed item, a Sunday plan with re-kicks, and a slipped item."""
        import sqlite3
        con = sqlite3.connect(self.db)
        con.execute('CREATE TABLE calendar_events (title TEXT, last_completed TEXT, notes TEXT)')
        con.executemany('INSERT INTO calendar_events VALUES (?,?,?)', [
            ('Confirm Rent Deposit', '2026-10-14', 'secret $4,200 account 1234'),
            ('Closed long ago', '2026-09-01', ''), ('Never done', None, '')])
        con.commit()
        con.close()
        (self.plans / '2026-10-11.md').write_text(
            '# Weekly plan\n\n## 1. Hard deadlines\n- **Not a rekick**\n\n## 2. Re-kicks (1)\n'
            '- **Pay Nanny** (due 2026-10-10) (slipped)\n  - why: private reason text\n  - fix: do it\n\n'
            '## 3. Next\n- **Also not a rekick**\n')
        (self.daily / 'slipped.jsonl').write_text(json.dumps(
            {'date': '2026-10-15', 'title': 'File payroll form', 'hint': 'no thread started'}) + '\n'
            + json.dumps({'date': '2026-09-01', 'title': 'too old'}) + '\n')
        (self.daily / '2026-10-16.md').write_text('## Friction and repeated corrections\n\n- abc · run it yourself\n')

    def test_target_saturday(self):
        self.assertEqual(self.ins.target_saturday(date(2026, 10, 16)), date(2026, 10, 17))  # Fri
        self.assertEqual(self.ins.target_saturday(date(2026, 10, 17)), date(2026, 10, 17))  # Sat

    def test_pick_is_one_book_prefers_least_recently_reviewed_and_is_stable(self):
        books = [book(f'b{i:02d}'.replace('b0', 'b'), last='2026-10-01' if i > 4 else None) for i in range(1, 9)]
        sat = date(2026, 10, 17)
        got = self.ins.pick(books, sat)
        self.assertEqual(got, self.ins.pick(books, sat))
        self.assertEqual(len(got), 1)
        self.assertTrue(all(not b['reviews'] for b in got))  # the never-reviewed half wins

    def test_week_digest_titles_only_from_closed_rekicks_and_slipped(self):
        sat = date(2026, 10, 17)
        self.assertEqual(self.ins.week_digest(sat), '')            # nothing exists: empty, not an error
        self.week()
        d = self.ins.week_digest(sat)
        self.assertIn('closed Bench item: Confirm Rent Deposit', d)
        self.assertIn('Sunday plan re-kick: Pay Nanny', d)
        self.assertIn('slipped Bench item: File payroll form', d)
        for leak in ('secret', '4,200', 'private reason', 'run it yourself', 'Not a rekick', 'Also not',
                     'too old', 'Closed long ago', 'Never done', '(due'):
            self.assertNotIn(leak, d)
        self.assertLessEqual(len(d), self.ins.DIGEST_MAX)

    def test_week_digest_survives_a_bad_db(self):
        self.db.write_text('not a database')
        self.assertEqual(self.ins.week_digest(date(2026, 10, 17)), '')

    def test_quotes_must_be_verbatim_from_fields(self):
        bf = {'title': 'T', 'notes': ['Small habits compound over time'], 'thesis': 'Systems beat goals'}
        got = self.ins.verified_quotes(['small habits compound over time', 'Made up wisdom here', ''], bf)
        self.assertEqual(got, ['small habits compound over time'])
        self.assertEqual(self.ins.verified_quotes(['anything quoted'], {'title': 'T', 'thesis': 'x'}), [])  # no quotable field
        self.assertEqual(self.ins.verified_quotes('not a list', bf), [])

    def test_generates_one_book_on_friday_once(self):
        self.lib([book('b1', notes=[{'text': 'Small habits compound'}]), book('b2'), book('b3'), book('b4')])
        self.week()
        self.assertIn('skipped', self.ins.generate(date(2026, 10, 14)))
        model = {'quotes': ['Small habits compound', 'invented'], 'ideas': 'An idea paragraph.',
                 'your_week': 'Run it yourself.'}
        with mock.patch.object(self.ins.lm, 'run_json', return_value=model) as rj:
            r = self.ins.generate(date(2026, 10, 16))
            self.assertEqual(len(r['books']), 1)
            self.assertEqual(r['for_day'], '2026-10-17')
            self.assertEqual(r['ideas'], 'An idea paragraph.')
            self.assertEqual(r['your_week_kind'], 'week')
            self.assertEqual(r['your_week'], 'Run it yourself.')
            self.assertTrue(set(r['quotes']) <= {'Small habits compound'})
            self.assertIn('Pay Nanny', rj.call_args[0][0])
            self.assertIn('skipped', self.ins.generate(date(2026, 10, 17)))  # already have it
        self.assertEqual(rj.call_count, 1)

    def test_missing_week_digest_gives_evergreen_not_a_made_up_week(self):
        self.lib([book('b1', topApplication='do it')])
        model = {'quotes': [], 'ideas': 'Idea.', 'your_week': 'Evergreen lesson.'}
        with mock.patch.object(self.ins.lm, 'run_json', return_value=model) as rj:
            r = self.ins.generate(date(2026, 10, 17))
        self.assertEqual(r['your_week_kind'], 'evergreen')
        self.assertEqual(r['your_week'], 'Evergreen lesson.')
        self.assertIn('evergreen', rj.call_args[0][0])
        self.assertNotIn('Pay Nanny', rj.call_args[0][0])

    def test_falls_back_without_llm_and_never_picks_listening_books(self):
        self.lib([book('b1', status='listening'), book('b2', topApplication='do it')])
        with mock.patch.object(self.ins.lm, 'run_json', return_value=None):
            r = self.ins.generate(date(2026, 10, 17))
        self.assertEqual(r['books'], ['b2'])
        self.assertEqual(r['lines'], ['Tb2: thesis b2 Try: do it'])
        self.assertNotIn('ideas', r)


if __name__ == '__main__':
    unittest.main()
