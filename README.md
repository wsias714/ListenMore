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
- **Export** — the library index as CSV (drop into a Claude Project as
  low-token context for cross-book synthesis), full notes as Markdown, or a
  full JSON backup you can restore later.

Data is stored locally in your browser (`localStorage`) — nothing leaves
your machine unless you export it yourself.

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

React + TypeScript + Vite, no backend, no external state library. All app
state lives in `src/App.tsx`; data helpers are under `src/lib/`.
