"""Shared plumbing for the ListenMore desktop jobs: where the Dropbox app folder is,
whether the rclone mount is healthy, and the Claude Haiku call (signed-in `claude` CLI,
no API key, same pattern as Bench's src/llm.py)."""
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import threading
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
HOME = Path.home()
MOUNT = Path(os.environ.get('LISTENMORE_MOUNT', HOME / 'Dropbox'))
# Path of the Dropbox "App folder" for the ListenMore app, relative to the Dropbox root.
# (Dropbox names it after the app; override if the app had to be named differently.)
APP_REL = os.environ.get('LISTENMORE_APP_REL', 'Apps/ListenMore')
# Test/override: point both jobs at a plain local directory instead of the Dropbox mount.
LOCAL_DIR = os.environ.get('LISTENMORE_DIR')
STATE = Path(os.environ.get('LISTENMORE_STATE', HOME / '.local/state/listenmore'))
RCLONE_REMOTE = os.environ.get('LISTENMORE_RCLONE_REMOTE', 'dropbox:')
LOG = STATE / 'jobs.log'
_FALLBACK_CLAUDE = HOME / '.local/share/mise/installs/claude/latest/claude'


def log(event: str, **kw) -> None:
    rec = {'t': datetime.now(timezone.utc).isoformat(timespec='seconds'), 'event': event, **kw}
    STATE.mkdir(parents=True, exist_ok=True)
    with LOG.open('a', encoding='utf-8') as f:
        f.write(json.dumps(rec, ensure_ascii=False) + '\n')
    print(json.dumps(rec, ensure_ascii=False))


def _within(seconds: float, fn):
    """Run fn in a thread; a hung FUSE call returns (False, None) instead of hanging the job."""
    box: list = []

    def target():
        try:
            box.append((True, fn()))
        except Exception as e:  # noqa: BLE001
            box.append((False, e))

    t = threading.Thread(target=target, daemon=True)
    t.start()
    t.join(seconds)
    if not box:
        return False, TimeoutError(f'timed out after {seconds}s')
    return box[0]


class Folder:
    """The ListenMore app folder, either on the rclone mount or a plain local dir (tests)."""

    def __init__(self, path: Path, via_rclone: bool):
        self.path = path
        self.via_rclone = via_rclone

    def read_text(self, name: str) -> str | None:
        p = self.path / name
        ok, res = _within(30, lambda: p.read_text(encoding='utf-8') if p.exists() else None)
        if not ok:
            raise OSError(f'reading {name}: {res}')
        return res

    def write_text(self, name: str, text: str) -> None:
        """Atomic: the file appears whole or not at all (never a partial drafts.json)."""
        json.loads(text)  # refuse to publish something that isn't valid JSON
        STATE.mkdir(parents=True, exist_ok=True)
        if not self.via_rclone:
            tmp = self.path / f'.{name}.tmp'
            tmp.write_text(text, encoding='utf-8')
            os.replace(tmp, self.path / name)
            return
        # Dropbox uploads commit atomically; `rclone copyto` straight to the final
        # name avoids ever leaving a *.tmp file in the user's Dropbox.
        local = STATE / f'.upload-{name}'
        local.write_text(text, encoding='utf-8')
        try:
            subprocess.run(
                ['rclone', 'copyto', str(local), f'{RCLONE_REMOTE}{APP_REL}/{name}',
                 '--retries', '3', '--low-level-retries', '5'],
                check=True, capture_output=True, text=True, timeout=180,
            )
        finally:
            local.unlink(missing_ok=True)


def open_folder() -> tuple[Folder | None, str]:
    """(folder, '') when usable, else (None, reason). Never raises: a flaky mount means skip."""
    if LOCAL_DIR:
        p = Path(LOCAL_DIR)
        return (Folder(p, False), '') if p.is_dir() else (None, f'LISTENMORE_DIR {p} is not a directory')
    ok, res = _within(10, lambda: os.path.ismount(MOUNT))
    if not ok or not res:
        return None, f'Dropbox mount {MOUNT} is not mounted'
    p = MOUNT / APP_REL
    ok, res = _within(20, p.is_dir)
    if not ok:
        return None, f'Dropbox mount unresponsive ({res})'
    if not res:
        return None, f'{p} does not exist yet (app not connected to Dropbox?)'
    return Folder(p, True), ''


def vocab() -> list[str]:
    """Theme vocabulary, parsed from the app's constants.ts so the two never drift."""
    try:
        src = (REPO / 'src' / 'constants.ts').read_text(encoding='utf-8')
        block = re.search(r'export const VOCAB = \[(.*?)\];', src, re.S)
        found = re.findall(r'"([^"]+)"', block.group(1)) if block else []
        if found:
            return found
    except OSError:
        pass
    return ['decision-making', 'risk', 'strategy', 'psychology', 'productivity']


def _claude_bin() -> str | None:
    override = os.environ.get('LISTENMORE_CLAUDE_BIN')
    if override is not None:
        return override or None
    return shutil.which('claude') or (str(_FALLBACK_CLAUDE) if _FALLBACK_CLAUDE.exists() else None)


def _parse_json_text(text: str):
    text = (text or '').strip()
    fence = re.search(r'```(?:json)?\s*(.*?)```', text, re.S)
    if fence:
        text = fence.group(1).strip()
    starts = [i for i in (text.find('{'), text.find('[')) if i != -1]
    if starts and min(starts) > 0:
        text = text[min(starts):]
    return json.loads(text)


MODEL = os.environ.get('LISTENMORE_MODEL', 'haiku')
if 'haiku' not in MODEL.lower():  # house rule: mechanical drafting never goes to a bigger/dearer model
    raise SystemExit(f'LISTENMORE_MODEL must be a Haiku model, got {MODEL!r}')


def run_json(prompt: str, label: str, timeout_s: int = 240):
    """One `claude -p` call, parsed to JSON, retried once on malformed JSON. None on any failure."""
    for attempt in (1, 2):
        result, parse_error = _run_once(prompt, f'{label}#{attempt}', timeout_s)
        if not parse_error:
            return result
    return None


def _run_once(prompt: str, label: str, timeout_s: int):
    rec = {'label': label, 'model': MODEL}
    binary = _claude_bin()
    result, parse_error = None, False
    try:
        if not binary:
            raise FileNotFoundError('claude CLI not found')
        runner = STATE / 'runner'
        runner.mkdir(parents=True, exist_ok=True)
        proc = subprocess.run(
            [binary, '-p', '--output-format', 'json', '--model', MODEL, '--max-turns', '1',
             '--system-prompt', 'You are a careful note-to-reflection writer. Output only JSON.',
             '--tools', '', '--strict-mcp-config', '--setting-sources', '', '--no-session-persistence'],
            input=prompt, cwd=runner, capture_output=True, text=True, encoding='utf-8',
            env={**os.environ, 'MAX_THINKING_TOKENS': '0'}, timeout=timeout_s,
        )
        envelope = json.loads(proc.stdout or '{}')
        rec['cost_usd'] = envelope.get('total_cost_usd')
        if proc.returncode != 0 or envelope.get('is_error'):
            raise RuntimeError(f"claude error: {(proc.stderr or envelope.get('result') or '')[:300]}")
        try:
            result = _parse_json_text(envelope.get('result', ''))
        except ValueError:
            parse_error = True
            raise
        rec['ok'] = True
    except Exception as exc:  # noqa: BLE001
        rec['ok'] = False
        rec['error'] = f'{type(exc).__name__}: {exc}'[:400]
    log('llm', **rec)
    return result, parse_error
