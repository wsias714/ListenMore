#!/usr/bin/env python3
"""Weekly "insights from a past book" for Bench's Saturday morning briefing.

Picks ONE book the way the app's weekly review does (least-recently-reviewed half, then
random; seeded by ISO week so reruns agree), has Haiku write a short piece from Wade's
own stored fields plus a titles-only digest of his week (Bench items closed, Sunday-plan
re-kicks, slipped items), and writes
~/.local/state/listenmore/book-insights.json:

  {"for_day": "2026-10-17", "generated": "...", "books": ["id"], "book": "Title by Author",
   "quotes": ["verbatim from his notes", ...], "ideas": "one paragraph",
   "your_week": "applied insight", "your_week_kind": "week" | "evergreen"}

Quotes are kept only if they appear verbatim in the book's stored fields (checked here, not
trusted from the model). With no week digest the model gives an evergreen structural lesson
instead (never skipped). If the model is unavailable the file carries plain "lines" built from the
stored thesis/application instead, which Bench still reads.

Only generates on Fri/Sat, and only if that Saturday's file is missing, so the nightly
timer can call it every night and it costs one Haiku call a week.

  insights.py [--force] [--dry-run]
"""
from __future__ import annotations

import json
import os
import random
import re
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from string import Template

sys.path.insert(0, str(Path(__file__).resolve().parent))
import lm_common as lm  # noqa: E402

PROMPT = Path(__file__).resolve().parent / 'prompts' / 'insights.md'
OUT = lm.STATE / 'book-insights.json'
HOW_MANY = 1
DAILY_DIR = Path(os.environ.get('HK_DAILY_DIR') or Path.home() / 'Projects' / 'ai-housekeeping' / 'runs' / 'daily')
BENCH_DB = Path(os.environ.get('BENCH_DB') or Path.home() / 'Projects' / 'bench' / 'bench.db')
WEEKPLAN_DIR = Path(os.environ.get('BENCH_WEEKPLAN_DIR') or Path.home() / 'Projects' / 'bench' / 'cache' / 'weekplan')
DIGEST_MAX = 1500


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


def _clip(s: str, n: int = 160) -> str:
    s = ' '.join(str(s).split())
    return s if len(s) <= n else s[:n - 1].rstrip() + '…'


def _closed_titles(days: list[str], db: Path) -> list[str]:
    """Titles of Bench items marked done in the window (calendar_events.last_completed)."""
    import sqlite3
    try:
        con = sqlite3.connect(f'file:{db}?mode=ro', uri=True, timeout=2)
    except sqlite3.Error:
        return []
    try:
        rows = con.execute(
            "SELECT title, substr(last_completed, 1, 10) FROM calendar_events "
            "WHERE substr(last_completed, 1, 10) BETWEEN ? AND ? ORDER BY last_completed",
            (days[0], days[-1])).fetchall()
    except sqlite3.Error:
        return []
    finally:
        con.close()
    return [f'{d}: closed Bench item: ' + _clip(t, 120) for t, d in rows if t]


def _rekick_titles(days: list[str], plan_dir: Path) -> list[str]:
    """Titles under '## ... Re-kicks' in the Sunday plan drafts dated inside the window."""
    out: list[str] = []
    for day in days:
        try:
            text = (plan_dir / f'{day}.md').read_text(encoding='utf-8', errors='replace')
        except OSError:
            continue
        in_sec = False
        for line in text.splitlines():
            if line.startswith('## '):
                in_sec = 're-kick' in line.lower()
            elif in_sec:
                m = re.match(r'- \*\*(.+?)\*\*', line)        # top-level bullet, bold title only
                if m:
                    out.append(f'{day}: Sunday plan re-kick: ' + _clip(m.group(1), 120))
    return out


def _slipped_titles(days: list[str], daily_dir: Path) -> list[str]:
    out: list[str] = []
    try:
        lines = (daily_dir / 'slipped.jsonl').read_text(encoding='utf-8', errors='replace').splitlines()
    except OSError:
        return out
    for line in lines:
        try:
            r = json.loads(line)
        except ValueError:
            continue
        if isinstance(r, dict) and r.get('date') in days and r.get('title'):
            out.append(f"{r['date']}: slipped Bench item: " + _clip(r['title'], 120))
    return out


def week_digest(sat: date, daily_dir: Path | None = None, db: Path | None = None,
                plan_dir: Path | None = None) -> str:
    """Titles-only digest of the 7 days ending `sat`: Bench items closed, the Sunday plan's re-kicks
    and items that slipped. No friction text, evidence, amounts or notes. Capped at DIGEST_MAX;
    '' when nothing is found (the caller then asks for an evergreen lesson)."""
    days = [(sat - timedelta(days=i)).isoformat() for i in range(6, -1, -1)]
    items = (_closed_titles(days, db or BENCH_DB) + _rekick_titles(days, plan_dir or WEEKPLAN_DIR)
             + _slipped_titles(days, daily_dir or DAILY_DIR))
    out, size = [], 0
    for it in dict.fromkeys(items):
        if size + len(it) + 1 > DIGEST_MAX:
            break
        out.append(it)
        size += len(it) + 1
    return '\n'.join(out)


def _norm(s: str) -> str:
    return ' '.join(str(s).split()).strip(' "\'“”‘’').lower()


def verified_quotes(quotes, brief_obj: dict) -> list[str]:
    """Only quotes that appear verbatim (whitespace/case-insensitive) in the book's stored fields."""
    hay = _norm(json.dumps(brief_obj, ensure_ascii=False))
    hay = hay.replace('\\"', '"')
    out = []
    for q in quotes if isinstance(quotes, list) else []:
        n = _norm(q)
        if len(n) >= 8 and n in hay and ' '.join(str(q).split()) not in out:
            out.append(' '.join(str(q).split()))
    return out[:3]


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
    b = chosen[0]
    bf = brief(b, today)
    digest = week_digest(sat)
    kind = 'week' if digest else 'evergreen'
    title = b['title'] + (f" by {b['author']}" if b.get('author') else '')
    payload = {'for_day': sat.isoformat(), 'generated': datetime.now(timezone.utc).isoformat(timespec='seconds'),
               'books': [x['id'] for x in chosen]}
    out = None
    if not dry:
        prompt = Template(PROMPT.read_text(encoding='utf-8')).safe_substitute(
            book=json.dumps(bf, ensure_ascii=False),
            week=digest or '(no record of his week is available: give an evergreen structural lesson)')
        out = lm.run_json(prompt, label='insights')
    ideas = ' '.join(str(out.get('ideas', '')).split()) if isinstance(out, dict) else ''
    if ideas:
        payload.update(book=title, quotes=verified_quotes(out.get('quotes'), bf), ideas=ideas,
                       your_week=' '.join(str(out.get('your_week', '')).split()), your_week_kind=kind)
    else:
        payload['lines'] = fallback_lines(chosen)
    if not dry:
        OUT.parent.mkdir(parents=True, exist_ok=True)
        tmp = OUT.with_suffix('.tmp')
        tmp.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')
        tmp.replace(OUT)
    lm.log('insights', for_day=sat.isoformat(), quotes=len(payload.get('quotes', [])), kind=kind, dry=dry)
    return {'ok': True, **payload}


if __name__ == '__main__':
    r = generate(date.today(), dry='--dry-run' in sys.argv, force='--force' in sys.argv)
    print(json.dumps(r, ensure_ascii=False, indent=2))
