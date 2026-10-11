# Listening Log

An audiobook retention & reflection app, built around what actually works for
remembering and applying what you listen to: retrieval practice, spaced
resurfacing, and application-focused reflection (implementation intentions,
pre-mortems). See `docs/spec.md` for the evidence and design behind it.

## What it does

- **Library** — every finished audiobook as a card: title, author, one-line
  thesis, top application, themes, and a review-history strip. A spectrum bar
  up top shows your whole library at a glance (bar height = applicability,
  color = how overdue for review).
- **Quick add** — a ~2 minute path for backfilling books you already
  finished: thesis, one action, one if/then, themes, done.
- **Full reflection wizard** — the 6-step, ~20–30 minute template: Blank
  sheet (retrieval from memory) → Specifics (from Audible clips) → Explain it
  (Feynman) → Connect (elaboration) → Apply (decision + implementation
  intention + pre-mortem) → Metadata.
- **Weekly review** — picks a book biased toward least-recently-reviewed,
  asks you to recall its core idea from memory before revealing your notes,
  then rotates through Apply / Synthesize / Update prompts.
- **Reading stats** — at the top of the Review view: books logged, unique
  authors, this quarter's count, books finished per quarter over time, and
  top genres/authors by frequency.
- **Export** — the library index as CSV (drop into a Claude Project as
  low-token context for cross-book synthesis), full notes as Markdown, or a
  full JSON backup you can restore later.
- **Starter library** — "Load starter library" (Now when empty, or Settings → Data) seeds the app from `public/seed/listening-log-seed.json`, matched
  by book `id` so it's safe to run again without creating duplicates.

- **Capture while listening** — a one-tap *Note* button (typed or iOS
  dictation) logs timestamped notes against the book you're listening to;
  an iPhone Shortcut (note / start a book / finished) works from the Action
  button. Marking a book *Finished* queues it for a daily desktop check that drafts the
  reflection from your notes; you recall the core idea first, then edit
  and accept. See `docs/capture-and-sync.md`.
- **Dropbox sync** — optional. Connect Dropbox (OAuth PKCE, no server,
  scoped to `Apps/ListenMore/`) and the library syncs across devices;
  `localStorage` stays as the offline cache.

Without Dropbox, data is stored locally in your browser (`localStorage`) —
nothing leaves your machine unless you export it yourself.

## Installing on iPhone (Add to Home Screen)

This is a PWA — it installs straight from Safari, no App Store or Apple
Developer account needed:

1. Open the app's URL in **Safari** on your iPhone (must be Safari, not
   Chrome — iOS only allows installing from Safari).
2. Tap the **Share** icon (square with an arrow) in the toolbar.
3. Scroll down and tap **Add to Home Screen**, then **Add**.
4. Launch it from the home screen icon — it opens full-screen, no browser
   chrome, and works offline after the first load.

Because it's a home-screen web app, data stays local to that installation —
if you reinstall or switch devices, use **Back up** / **Restore** (JSON) in
the library footer to move your data over.

## Getting started

```bash
npm install
npm run dev
```

Then open the printed local URL. To build for production:

```bash
npm run build
npm run preview
```

## Tech

React + TypeScript + Vite, no backend (Dropbox via its JS SDK, browser-only PKCE), no external state library. All app
state and actions live in `src/App.tsx`, screens in `src/views/`; data helpers are under `src/lib/`. `npm test` runs the merge/sync tests. The daily drafting job lives in `desktop/` (Python, systemd user timer).
