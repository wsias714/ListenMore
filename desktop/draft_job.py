#!/usr/bin/env python3
"""Nightly: for every book Wade has marked finished and that has captured notes but no
reflection yet, write a draft reflection into drafts.json next to the library.

Ownership: the app owns library.json; this job owns drafts.json and never touches the
library. A missing/hung Dropbox mount means skip-and-log, never a partial file.

  draft_job.py [--dry-run] [--only BOOK_ID]
"""
from __future__ import annotations

import fcntl
import hashlib
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from string import Template

sys.path.insert(0, str(Path(__file__).resolve().parent))
import lm_common as lm  # noqa: E402

PROMPT = Path(__file__).resolve().parent / 'prompts' / 'draft.md'
MAX_PER_RUN = 6
FIELDS = ['thesis', 'topApplication', 'keyIdeas', 'surprised', 'specifics', 'quotes',
          'decision', 'ifSituation', 'thenAction']


def notes_of(book: dict) -> list[dict]:
    notes = [n for n in (book.get('notes') or []) if isinstance(n, dict) and str(n.get('text', '')).strip()]
    return sorted(notes, key=lambda n: str(n.get('ts', '')))


def notes_hash(book: dict) -> str:
    blob = json.dumps([[n.get('id'), n.get('text')] for n in notes_of(book)], ensure_ascii=False)
    return hashlib.sha1(blob.encode()).hexdigest()[:12]


def needs_draft(book: dict, existing: dict | None) -> bool:
    if book.get('status') == 'listening':
        return False                       # not finished yet
    if not notes_of(book):
        return False                       # nothing to draft from
    if book.get('draftAccepted'):
        return False                       # reflection already accepted
    if book.get('depth') == 'full' and str(book.get('recall', '')).strip():
        return False                       # Wade wrote a reflection himself
    if existing and existing.get('notesHash') == notes_hash(book):
        return False                       # already drafted from exactly these notes
    return True


def build_prompt(book: dict, vocab: list[str]) -> str:
    lines = []
    for n in notes_of(book):
        text = ' '.join(str(n['text']).split())
        lines.append(f"{str(n.get('ts', ''))[:16].replace('T', ' ')} | {text}")
    return Template(PROMPT.read_text(encoding='utf-8')).safe_substitute(
        title=str(book.get('title', '')).replace('\n', ' '),
        author=str(book.get('author', '')).replace('\n', ' ') or '(unknown)',
        notes='\n'.join(lines), vocab=', '.join(vocab))


def clean(out, vocab: list[str]) -> tuple[dict, list[str]] | None:
    """Validate the model's JSON into (fields, gaps); None if there's nothing usable."""
    if not isinstance(out, dict):
        return None
    fields: dict = {}
    for k in FIELDS:
        v = out.get(k)
        if isinstance(v, list):
            v = '\n'.join(str(x) for x in v)
        if isinstance(v, str) and v.strip():
            fields[k] = v.strip()
    themes = [t for t in (out.get('themes') or []) if isinstance(t, str) and t in vocab][:3]
    if themes:
        fields['themes'] = themes
    gaps = [g.strip() for g in (out.get('gaps') or []) if isinstance(g, str) and g.strip()][:4]
    # The app prints its own "IF ... THEN ..." labels; keep only the clauses.
    if 'ifSituation' in fields:
        fields['ifSituation'] = re.sub(r'^\s*if[\s,:]+', '', fields['ifSituation'], flags=re.I).strip()
    if 'thenAction' in fields:
        fields['thenAction'] = re.sub(r'^\s*then[\s,:]+', '', fields['thenAction'], flags=re.I).strip()
    # An if/then half-filled is worse than none.
    if bool(fields.get('ifSituation')) != bool(fields.get('thenAction')):
        fields.pop('ifSituation', None)
        fields.pop('thenAction', None)
    return (fields, gaps) if fields else None


def load_json(folder: lm.Folder, name: str):
    text = folder.read_text(name)
    return None if text is None else json.loads(text)


def run(dry: bool = False, only: str | None = None) -> int:
    folder, why = lm.open_folder()
    if folder is None:
        lm.log('skipped', reason=why)
        return 0                            # not an error: the mount restarts, tomorrow retries

    try:
        library = load_json(folder, 'library.json')
        existing = load_json(folder, 'drafts.json') or {}
    except (OSError, ValueError) as e:      # unreadable / mid-sync / corrupt: touch nothing
        lm.log('skipped', reason=f'could not read library/drafts: {e}')
        return 0
    if not isinstance(library, dict) or not isinstance(library.get('books'), list):
        lm.log('skipped', reason='no library.json yet (nothing synced from the app)')
        return 0

    drafts: dict = dict(existing.get('drafts') or {}) if isinstance(existing, dict) else {}
    books = {b['id']: b for b in library['books'] if isinstance(b, dict) and b.get('id')}
    pruned = [i for i in drafts if i not in books]
    for i in pruned:
        del drafts[i]

    todo = [b for i, b in books.items() if (only is None or i == only) and needs_draft(b, drafts.get(i))]
    vocab = lm.vocab()
    made, failed = 0, 0
    for b in todo[:MAX_PER_RUN]:
        if dry:
            lm.log('would_draft', book=b['id'], title=b.get('title'), notes=len(notes_of(b)))
            continue
        out = lm.run_json(build_prompt(b, vocab), label=f"draft:{b['id']}")
        cleaned = clean(out, vocab)
        if cleaned is None:
            failed += 1
            lm.log('draft_failed', book=b['id'], title=b.get('title'))
            continue
        fields, gaps = cleaned
        now = datetime.now(timezone.utc).isoformat(timespec='seconds')
        h = notes_hash(b)
        drafts[b['id']] = {
            'id': hashlib.sha1(f'{b["id"]}{h}{now}'.encode()).hexdigest()[:12],
            'bookId': b['id'], 'generatedAt': now, 'model': lm.MODEL,
            'notesUsed': len(notes_of(b)), 'notesHash': h, 'fields': fields, 'gaps': gaps,
        }
        made += 1
        lm.log('drafted', book=b['id'], title=b.get('title'), notes=len(notes_of(b)))

    if (made or pruned) and not dry:
        payload = {'version': 1, 'generatedAt': datetime.now(timezone.utc).isoformat(timespec='seconds'),
                   'drafts': drafts}
        try:
            folder.write_text('drafts.json', json.dumps(payload, ensure_ascii=False, indent=2))
        except Exception as e:  # noqa: BLE001
            lm.log('write_failed', error=str(e)[:300])
            return 1
    lm.log('done', candidates=len(todo), drafted=made, failed=failed, pruned=len(pruned), dry=dry)
    return 1 if todo and made == 0 and failed and not dry else 0


def main() -> int:
    lm.STATE.mkdir(parents=True, exist_ok=True)
    with (lm.STATE / 'drafts.lock').open('w') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            lm.log('skipped', reason='another run holds the lock')
            return 0
        only = sys.argv[sys.argv.index('--only') + 1] if '--only' in sys.argv else None
        return run(dry='--dry-run' in sys.argv, only=only)


if __name__ == '__main__':
    sys.exit(main())
