# Capture while listening, Dropbox sync, nightly drafts

Why: filling in a reflection after finishing a book wasn't happening. So the app now
captures notes *while* listening (one tap, typed or dictated), stores everything in
Dropbox, and a nightly job on Wade's desktop drafts the reflection from the notes. Wade
still does the retrieval step (recall first), then edits and accepts.

## Who writes what (nobody writes the same file)

Dropbox folder `Apps/ListenMore/` (the app's "App folder"; the app can reach nothing else):

| Path | Written by | Contents |
|---|---|---|
| `library.json` | the app (phone) | books, notes, reviews, tombstones |
| `inbox/<stamp>.txt` | the iPhone Shortcut | one dictated note per file |
| `drafts.json` | the desktop job | one draft per finished book with notes |
| `backups/premigration-*.json` | the app, once | safety copy of the phone's data before first sync |

- **App writes** use Dropbox's rev-based update, so a write never silently replaces a
  newer file. On a conflict it re-reads, merges (`src/lib/merge.ts`) and retries.
  Merge never drops data: notes/reviews are unions; later edit wins fields; "finished" is
  sticky; deletes are tombstoned.
- **Shortcut notes are separate files** (not appended to a shared file) so the Shortcut and
  the app can never overwrite each other. The app folds them into the current book's notes
  on its next sync, then deletes the inbox files.
- localStorage stays as the offline cache. JSON Back up / Restore still work (Restore merges
  back, it never deletes).

## One-time Dropbox app registration (Wade)

1. Open <https://www.dropbox.com/developers/apps> → **Create app**.
2. **Scoped access** → **App folder** → name it `ListenMore` (the folder becomes
   `Apps/ListenMore`; if the name is taken, pick another and set
   `LISTENMORE_APP_REL="Apps/<that name>"` for the desktop job).
3. **Permissions** tab: tick `files.metadata.read`, `files.metadata.write`,
   `files.content.read`, `files.content.write` → **Submit**.
4. **Settings** tab → **OAuth 2** → **Redirect URIs**, add each, pressing **Add**:
   - `https://wsias714.github.io/ListenMore/`
   - `http://localhost:5173/`
   - `http://localhost:4173/`
5. Same section: **Allow public clients (Implicit Grant & PKCE)** = **Allow**.
   Leave access-token expiration on **Short-lived** (the app uses a refresh token).
6. Copy the **App key** (top of Settings). No secret is used anywhere. Give the key to
   Claude (or paste it in the app: Settings → Dropbox sync → App key).

The app stays in "Development" status; that's fine for one user.

## Connecting the phone

Open the home-screen app → tap the sync label at top right ("sync off") → paste the app key →
**Connect Dropbox** → approve. Existing phone data merges into Dropbox on that first sync
(a safety copy goes to `backups/` first). If the sign-in doesn't return to the app, use
**Use a code**: it opens Dropbox, you copy the code it shows and paste it back.

## Capturing

- **Note** button (bottom right of the library): opens a sheet with the keyboard already up.
  Tap the keyboard's mic to dictate (iOS dictation; the Web Speech API is not used: it is
  unreliable in home-screen web apps). Pick the book or start a new one inline.
- **Listening now** cards: `+ Note` and `Finished`. Finishing sets the date and queues the
  book for the next weekly run.
- **Shortcut:** see Settings → Dropbox sync → "iPhone Shortcut". Notes land on the book you
  last captured to (the "current" book); if none is current they wait as loose notes.

## Weekly job (desktop)

`desktop/` — systemd user timer `listenmore-drafts.timer`, Saturday 02:30 (`Persistent=true`, catches up if the machine was off).
Install/refresh: `desktop/install.sh`. Logs: `~/.local/state/listenmore/jobs.log`.

- `draft_job.py`: for books that are finished, have notes, and no accepted/self-written
  reflection, calls Claude **Haiku** through the signed-in `claude` CLI (no API key; the
  model name is guarded to contain "haiku") and writes `drafts.json`. Drafts use only what
  the notes say and list open questions as "gaps". Redrafts only if the notes change.
- Reads through the rclone mount (`~/Dropbox`). If the mount is absent, unresponsive, the
  app folder doesn't exist yet, or `library.json` is unreadable, it **skips and logs**
  (exit 0). Writes go through `rclone copyto` straight to `drafts.json` (Dropbox commits
  uploads atomically), after refusing anything that isn't valid JSON. Never touches
  `library.json`.
- `insights.py`: Fri/Sat only, once a week. See below.
- Tests: `cd desktop && python3 -I -m unittest discover -s tests`. Dry run:
  `python3 -I desktop/draft_job.py --dry-run`. Point both at a plain folder with
  `LISTENMORE_DIR=<dir> LISTENMORE_STATE=<dir>`.

## Draft ready, in the app

A "DRAFT READY" card appears on the library. Tapping it asks for the core idea *from memory*
first (stored as the book's "from memory" answer); only then is the draft revealed, in
editable fields with the model's open questions and your original notes alongside. Accept
saves it as a full reflection and clears the badge.

## Saturday insights (Bench)

`desktop/insights.py` writes `~/.local/state/listenmore/book-insights.json`
(`{"for_day": "<that Saturday>", "lines": [...]}`): 3 books picked like the app's weekly
review (least-recently-reviewed half, then random, seeded by week), one line each.
Bench's `_book_insights()` hook in `src/mail_briefing_email.py` reads it through
`src/book_insights.py` and the existing Saturday-only "Book insights (weekly)" section
renders it. The file is ignored unless `for_day` equals the briefing's day.
