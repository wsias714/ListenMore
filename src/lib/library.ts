import type { Book, DraftsFile, LibraryData, Note } from "../types.ts";
import { blankBook, uid } from "./utils.ts";

/** Apply a books update, stamping `updated` on whatever changed and tombstoning deletes. */
export function withBooks(lib: LibraryData, next: Book[]): LibraryData {
  const now = new Date().toISOString();
  const prev = new Map(lib.books.map((b) => [b.id, b]));
  const stamped = next.map((b) => (prev.get(b.id) === b ? b : { ...b, updated: now }));
  const keep = new Set(next.map((b) => b.id));
  const deleted = { ...(lib.deleted ?? {}) };
  for (const id of prev.keys()) if (!keep.has(id)) deleted[id] = now;
  for (const id of keep) delete deleted[id];
  const current = lib.currentBookId && keep.has(lib.currentBookId) ? lib.currentBookId : null;
  const cleared = current !== (lib.currentBookId ?? null);
  return {
    ...lib,
    books: stamped,
    currentBookId: current,
    ...(cleared ? { currentAt: now } : {}),
    ...(Object.keys(deleted).length ? { deleted } : { deleted: undefined }),
  };
}

/** Choose (or clear) the book notes capture to, stamped so the latest choice wins a merge. */
export const withCurrent = (lib: LibraryData, id: string | null): LibraryData => ({
  ...lib,
  currentBookId: id,
  currentAt: new Date().toISOString(),
});

/** Start a book you're listening to and make it the capture target. */
export function startBook(lib: LibraryData, title: string, id: string = uid(), created: string = new Date().toISOString()): LibraryData {
  const b: Book = { ...blankBook(), id, title, depth: "quick", status: "listening", dateFinished: "", created };
  return withCurrent(withBooks(lib, [...lib.books, b]), id);
}

/** Mark a book finished; if it was the capture target, hand the target to another listening book (or none). */
export function finishBook(lib: LibraryData, id: string, when: Date = new Date()): LibraryData {
  if (!lib.books.some((b) => b.id === id)) return lib;
  const next = withBooks(
    lib,
    lib.books.map((b) =>
      b.id === id ? { ...b, status: "finished" as const, dateFinished: when.toISOString().slice(0, 10), finishedAt: when.toISOString() } : b,
    ),
  );
  return next.currentBookId === id ? withCurrent(next, next.books.find((b) => b.status === "listening")?.id ?? null) : next;
}

export const isListening = (b: Book) => b.status === "listening";

export const newNote = (text: string): Note => ({
  id: `n-${Date.now().toString(36)}-${uid()}`,
  ts: new Date().toISOString(),
  text: text.trim(),
  src: "app",
});

/** Drafts the desktop job produced that Wade hasn't accepted yet. */
export function readyDrafts(books: Book[], drafts: DraftsFile | null): Book[] {
  if (!drafts) return [];
  return books.filter((b) => {
    const d = drafts.drafts[b.id];
    return !!d && !isListening(b) && d.id !== b.draftAccepted;
  });
}

export const fmtStamp = (iso: string): string =>
  new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
