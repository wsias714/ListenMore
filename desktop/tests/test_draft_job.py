import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

HERE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE))


def book(i, **kw):
    b = {'id': i, 'title': f'Book {i}', 'author': 'A', 'depth': 'quick', 'recall': '', 'reviews': []}
    b.update(kw)
    return b


def note(i, text='a thought'):
    return {'id': i, 'ts': '2026-10-11T10:00:00Z', 'text': text, 'src': 'app'}


class DraftJobTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.dir = Path(self.tmp.name) / 'ListenMore'
        self.dir.mkdir()
        self.state = Path(self.tmp.name) / 'state'
        os.environ['LISTENMORE_DIR'] = str(self.dir)
        os.environ['LISTENMORE_STATE'] = str(self.state)
        for m in ('lm_common', 'draft_job'):
            sys.modules.pop(m, None)
        import draft_job
        self.dj = draft_job

    def tearDown(self):
        self.tmp.cleanup()
        os.environ.pop('LISTENMORE_DIR', None)
        os.environ.pop('LISTENMORE_STATE', None)

    def write_lib(self, books):
        (self.dir / 'library.json').write_text(json.dumps({'books': books}))

    def test_needs_draft_rules(self):
        d = self.dj.needs_draft
        n = [note('1')]
        self.assertTrue(d(book('a', status='finished', notes=n), None))
        self.assertFalse(d(book('a', status='listening', notes=n), None))
        self.assertFalse(d(book('a', status='finished'), None))
        self.assertFalse(d(book('a', status='finished', notes=n, draftAccepted='x'), None))
        self.assertFalse(d(book('a', status='finished', notes=n, depth='full', recall='mine'), None))
        b = book('a', status='finished', notes=n)
        self.assertFalse(d(b, {'notesHash': self.dj.notes_hash(b)}))
        b2 = book('a', status='finished', notes=n + [note('2')])
        self.assertTrue(d(b2, {'notesHash': self.dj.notes_hash(b)}))

    def test_clean_filters_themes_and_half_intentions(self):
        out = {'thesis': ' T ', 'themes': ['risk', 'bogus'], 'ifSituation': 'when x', 'thenAction': '', 'gaps': ['q?', '']}
        fields, gaps = self.dj.clean(out, ['risk', 'strategy'])
        self.assertEqual(fields, {'thesis': 'T', 'themes': ['risk']})
        self.assertEqual(gaps, ['q?'])
        self.assertIsNone(self.dj.clean({'thesis': ''}, ['risk']))
        self.assertIsNone(self.dj.clean('nope', ['risk']))

    def test_clean_strips_if_then_labels(self):
        f, _ = self.dj.clean({'ifSituation': 'If I lose money', 'thenAction': 'Then I ask why'}, [])
        self.assertEqual((f['ifSituation'], f['thenAction']), ('I lose money', 'I ask why'))

    def test_writes_draft_only_for_finished_books_and_leaves_library_alone(self):
        self.write_lib([book('a', status='finished', notes=[note('1')]), book('b', status='listening', notes=[note('2')])])
        before = (self.dir / 'library.json').read_text()
        fake = {'thesis': 'T', 'topApplication': 'Do X', 'keyIdeas': 'one\ntwo', 'themes': ['risk'], 'gaps': ['why?']}
        with mock.patch.object(self.dj.lm, 'run_json', return_value=fake) as rj:
            self.assertEqual(self.dj.run(), 0)
        self.assertEqual(rj.call_count, 1)
        drafts = json.loads((self.dir / 'drafts.json').read_text())
        self.assertEqual(list(drafts['drafts']), ['a'])
        self.assertEqual(drafts['drafts']['a']['fields']['thesis'], 'T')
        self.assertEqual((self.dir / 'library.json').read_text(), before)
        self.assertEqual([p.name for p in self.dir.iterdir() if p.name.startswith('.')], [])  # no stray tmp
        # second run: same notes -> no LLM call
        with mock.patch.object(self.dj.lm, 'run_json') as rj2:
            self.dj.run()
        rj2.assert_not_called()

    def test_missing_dir_is_skip_not_error(self):
        os.environ['LISTENMORE_DIR'] = str(self.dir / 'nope')
        for m in ('lm_common', 'draft_job'):
            sys.modules.pop(m, None)
        import draft_job
        self.assertEqual(draft_job.run(), 0)
        self.assertIn('skipped', (Path(os.environ['LISTENMORE_STATE']) / 'jobs.log').read_text())

    def test_corrupt_library_touches_nothing(self):
        (self.dir / 'library.json').write_text('{"books": [')
        self.assertEqual(self.dj.run(), 0)
        self.assertFalse((self.dir / 'drafts.json').exists())

    def test_llm_failure_writes_nothing_and_fails_loudly(self):
        self.write_lib([book('a', status='finished', notes=[note('1')])])
        with mock.patch.object(self.dj.lm, 'run_json', return_value=None):
            self.assertEqual(self.dj.run(), 1)
        self.assertFalse((self.dir / 'drafts.json').exists())

    def test_prunes_drafts_for_deleted_books(self):
        self.write_lib([book('a', status='finished', notes=[note('1')])])
        (self.dir / 'drafts.json').write_text(json.dumps({'version': 1, 'drafts': {'gone': {'id': 'x'}}}))
        with mock.patch.object(self.dj.lm, 'run_json', return_value={'thesis': 'T'}):
            self.dj.run()
        self.assertEqual(sorted(json.loads((self.dir / 'drafts.json').read_text())['drafts']), ['a'])

    def test_model_guard_rejects_non_haiku(self):
        os.environ['LISTENMORE_MODEL'] = 'claude-fable-5-1'
        sys.modules.pop('lm_common', None)
        try:
            with self.assertRaises(SystemExit):
                import lm_common  # noqa: F401
        finally:
            os.environ.pop('LISTENMORE_MODEL')


if __name__ == '__main__':
    unittest.main()
