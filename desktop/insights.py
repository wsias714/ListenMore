#!/usr/bin/env python3
"""Weekly "insights from past books" for Bench's Saturday morning briefing.

Picks books the way the app's weekly review does (least-recently-reviewed half, then
random; seeded by ISO week so reruns agree), has Haiku write one line each from Wade's
own stored fields, and writes ~/.local/state/listenmore/book-insights.json:

  {"for_day": "2026-10-17", "generated": "...", "lines": ["Title: ...", ...]}

Only generates on Fri/Sat, and only if that Saturday's file is missing, so the nightly
timer can call it every night and it costs one Haiku call a week. Falls back to plain
lines built from the stored thesis/application if the model is unavailable.

  insights.py [--force] [--dry-run]
"""
from __future__ import annotations

import json
import random
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from string import Template

sys.path.insert(0, str(Path(__file__).resolve().parent))
import lm_common as lm  # noqa: E402

PROMPT = Path(__file__).resolve().parent / 'prompts' / 'insights.md'
OUT = lm.STATE / 'book-insights.json'
HOW_MANY = 3


def target_saturday(today: date) -> date:
    return today + timedelta(days=(5 - today.weekday()) % 7)


def last_review(b: dict) -> str:
    revs = b.get('reviews') or []
    return str(revs[-1].get('date', '')) if revs else ''


def finished(books: list[dict]) -> list[dict]:
    return [b for b in books if isinstance(b, dict) and b.get('status') != 'listening' and b.get('title')]


def pick(books: list[dict], sat: date) -> list[dict]:
    """Oldest-reviewed half (never reviewed counts as oldest), then random, seeded by the week."""
    ranked = sorted(books, key=lambda b: (last_review(b), str(b.get('created', ''))))
    pool = ranked[:max(1, (len(ranked) + 1) // 2)]
    return random.Random(sat.isoformat()).sample(pool, min(HOW_MANY, len(pool)))


def brief(b: dict, today: date) -> dict:
    last = last_review(b)
    ago = (today - date.fromisoformat(last)).days if last else None
    notes = [str(n.get('text', ''))[:200] for n in (b.get('notes') or [])[:6] if isinstance(n, dict)]
    out = {'title': b['title'], 'author': b.get('author', ''), 'themes': b.get('themes', []),
           'thesis': b.get('thesis', ''), 'topApplication': b.get('topApplication', ''),
           'keyIdeas': str(b.get('keyIdeas', ''))[:500], 'notes': notes,
           'daysSinceReview': ago}
    if b.get('ifSituation'):
        out['ifThen'] = f"IF {b['ifSituation']}, THEN {b.get('thenAction', '')}"
    return {k: v for k, v in out.items() if v not in ('', [], None)}


def fallback_lines(chosen: list[dict]) -> list[str]:
    lines = []
    for b in chosen:
        bits = [x for x in (b.get('thesis'), b.get('topApplication')) if x]
        if bits:
            lines.append(f"{b['title']}: " + ' Try: '.join(bits[:2]))
    return lines


def generate(today: date, dry: bool = False, force: bool = False) -> dict:
    sat = target_saturday(today)
    if not force and today.weekday() not in (4, 5):
        return {'ok': True, 'skipped': 'only generates Friday/Saturday'}
    if not force and OUT.exists():
        try:
            if json.loads(OUT.read_text()).get('for_day') == sat.isoformat():
                return {'ok': True, 'skipped': f'already have {sat}'}
        except ValueError:
            pass
    folder, why = lm.open_folder()
    if folder is None:
        lm.log('insights_skipped', reason=why)
        return {'ok': True, 'skipped': why}
    try:
        text = folder.read_text('library.json')
        library = json.loads(text) if text else None
    except (OSError, ValueError) as e:
        lm.log('insights_skipped', reason=f'could not read library: {e}')
        return {'ok': True, 'skipped': 'unreadable library'}
    books = finished((library or {}).get('books') or [])
    if not books:
        return {'ok': True, 'skipped': 'no finished books'}

    chosen = pick(books, sat)
    lines: list[str] = []
    if not dry:
        prompt = Template(PROMPT.read_text(encoding='utf-8')).safe_substitute(
            books=json.dumps([brief(b, today) for b in chosen], ensure_ascii=False))
        out = lm.run_json(prompt, label='insights')
        if isinstance(out, dict) and isinstance(out.get('lines'), list):
            lines = [' '.join(str(x).split()) for x in out['lines'] if str(x).strip()][:HOW_MANY + 1]
    if not lines:
        lines = fallback_lines(chosen)
    payload = {'for_day': sat.isoformat(), 'generated': datetime.now(timezone.utc).isoformat(timespec='seconds'),
               'books': [b['id'] for b in chosen], 'lines': lines}
    if not dry:
        OUT.parent.mkdir(parents=True, exist_ok=True)
        tmp = OUT.with_suffix('.tmp')
        tmp.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')
        tmp.replace(OUT)
    lm.log('insights', for_day=sat.isoformat(), lines=len(lines), dry=dry)
    return {'ok': True, **payload}


if __name__ == '__main__':
    r = generate(date.today(), dry='--dry-run' in sys.argv, force='--force' in sys.argv)
    print(json.dumps(r, ensure_ascii=False, indent=2))
