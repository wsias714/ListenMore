import type { Book, LibraryData, Note, Review } from "../types";

/* Pure merge of two library snapshots (local cache vs. Dropbox). No I/O, so it
   is unit-tested directly: `npm test`. Rules, in order of importance:
   - nothing is ever dropped silently: notes and reviews are unions;
   - a book that exists on only one side is kept unless the other side deleted
     it *after* that book's last edit;
   - for a book on both sides, the later `updated` wins field-by-field, but its
     notes/reviews are unioned with the loser's. */

const stamp = (b: Book) => b.updated ?? b.created ?? "";

function unionNotes(a: Note[] = [], b: Note[] = []): Note[] {
  const byId = new Map<string, Note>();
  for (const n of [...a, ...b]) if (!byId.has(n.id)) byId.set(n.id, n);
  return [...byId.values()].sort((x, y) => (x.ts < y.ts ? -1 : x.ts > y.ts ? 1 : 0));
}

function unionReviews(a: Review[], b: Review[]): Review[] {
  const key = (r: Review) => `${r.date}|${r.type}|${r.note}`;
  const byKey = new Map<string, Review>();
  for (const r of [...a, ...b]) if (!byKey.has(key(r))) byKey.set(key(r), r);
  return [...byKey.values()].sort((x, y) => (x.date < y.date ? -1 : x.date > y.date ? 1 : 0));
}

export function mergeBook(a: Book, b: Book): Book {
  const [older, newer] = stamp(a) <= stamp(b) ? [a, b] : [b, a];
  const notes = unionNotes(older.notes, newer.notes);
  // "finished" is sticky (and legacy books with no status count as finished):
  // a stale device must not reopen a finished book.
  const finished = a.status !== "listening" || b.status !== "listening";
  const finishedAt = newer.finishedAt ?? older.finishedAt;
  return {
    ...newer,
    reviews: unionReviews(older.reviews ?? [], newer.reviews ?? []),
    ...(notes.length ? { notes } : {}),
    ...(finished && (a.status === "finished" || b.status === "finished") ? { status: "finished" as const } : {}),
    ...(finished && a.status !== "finished" && b.status !== "finished" ? { status: undefined } : {}),
    ...(finished && finishedAt ? { finishedAt } : {}),
  };
}

export function mergeLibraries(local: LibraryData, remote: LibraryData): LibraryData {
  const deleted: Record<string, string> = { ...(remote.deleted ?? {}) };
  for (const [id, ts] of Object.entries(local.deleted ?? {})) {
    if (!deleted[id] || deleted[id] < ts) deleted[id] = ts;
  }

  const byId = new Map<string, Book>();
  for (const b of remote.books) byId.set(b.id, b);
  for (const b of local.books) {
    const other = byId.get(b.id);
    byId.set(b.id, other ? mergeBook(b, other) : b);
  }
  for (const [id, delTs] of Object.entries(deleted)) {
    const b = byId.get(id);
    if (b && stamp(b) <= delTs) byId.delete(id);
    // edited after the delete elsewhere: the edit wins, drop the tombstone
    else if (b) delete deleted[id];
  }

  const loose = unionNotes(local.looseNotes, remote.looseNotes);
  const applied = [...new Set([...(remote.inboxApplied ?? []), ...(local.inboxApplied ?? [])])].slice(-300);
  const books = [...byId.values()];
  // The later explicit choice of "current book" wins (null means "none", on purpose).
  const useLocal = (local.currentAt ?? "") >= (remote.currentAt ?? "");
  const chosen = useLocal ? local : remote;
  const current = chosen.currentBookId ?? null;
  const currentAt = chosen.currentAt;
  return {
    books,
    ...(Object.keys(deleted).length ? { deleted } : {}),
    currentBookId: current && byId.has(current) ? current : null,
    ...(currentAt ? { currentAt } : {}),
    ...(loose.length ? { looseNotes: loose } : {}),
    ...(applied.length ? { inboxApplied: applied } : {}),
  };
}

/** Stable-ish equality for "did the merge change anything worth pushing". */
export function sameLibrary(a: LibraryData, b: LibraryData): boolean {
  return stable(canonical(a)) === stable(canonical(b));
}

/** JSON with sorted keys and no undefined, so key order never reads as a change. */
function stable(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stable).join(",")}]`;
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o)
      .filter((k) => o[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stable(o[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(v);
}

function canonical(l: LibraryData) {
  return {
    books: [...l.books].sort((x, y) => (x.id < y.id ? -1 : 1)),
    deleted: l.deleted ?? {},
    currentBookId: l.currentBookId ?? null,
    currentAt: l.currentAt ?? "",
    looseNotes: l.looseNotes ?? [],
    inboxApplied: [...(l.inboxApplied ?? [])].sort(),
  };
}

/** Attach unassigned/inbox notes to the current book; the rest stay loose. */
export function routeNotes(lib: LibraryData, incoming: Note[]): LibraryData {
  if (!incoming.length) return lib;
  const target = lib.currentBookId;
  const books = lib.books.map((b) =>
    b.id === target ? { ...b, notes: unionNotes(b.notes, incoming), updated: new Date().toISOString() } : b,
  );
  const placed = target && lib.books.some((b) => b.id === target);
  return {
    ...lib,
    books,
    ...(placed ? {} : { looseNotes: unionNotes(lib.looseNotes, incoming) }),
  };
}
