import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeLibraries, routeNotes, sameLibrary } from "./merge.ts";
import type { Book, LibraryData, Note } from "../types.ts";

const book = (id: string, over: Partial<Book> = {}): Book => ({
  id, title: id, author: "", dateFinished: "2026-01-01", themes: [], thesis: "", topApplication: "",
  applicability: 3, rating: 3, recall: "", keyIdeas: "", surprised: "", specifics: "", quotes: "",
  feynman: "", confirms: "", contradicts: "", links: "", decision: "", ifSituation: "", thenAction: "",
  preMortem: "", reviews: [], created: "2026-01-01T00:00:00.000Z", depth: "quick", ...over,
});
const note = (id: string, ts: string, text = id): Note => ({ id, ts, text, src: "app" });
const lib = (books: Book[], extra: Partial<LibraryData> = {}): LibraryData => ({ books, ...extra });

test("books on one side only are kept (migration of a first-time connect)", () => {
  const m = mergeLibraries(lib([book("a")]), lib([]));
  assert.deepEqual(m.books.map((b) => b.id), ["a"]);
  const m2 = mergeLibraries(lib([]), lib([book("b")]));
  assert.deepEqual(m2.books.map((b) => b.id), ["b"]);
});

test("later edit wins fields; notes and reviews are unioned", () => {
  const a = book("x", { thesis: "old", updated: "2026-02-01T00:00:00Z", notes: [note("n1", "2026-02-01T01:00:00Z")] });
  const b = book("x", {
    thesis: "new", updated: "2026-03-01T00:00:00Z", notes: [note("n2", "2026-03-01T01:00:00Z")],
    reviews: [{ date: "2026-03-02", type: "APPLY", note: "" }],
  });
  const m = mergeLibraries(lib([a]), lib([b])).books[0];
  assert.equal(m.thesis, "new");
  assert.deepEqual(m.notes?.map((n) => n.id), ["n1", "n2"]);
  assert.equal(m.reviews.length, 1);
  assert.equal(mergeLibraries(lib([b]), lib([a])).books[0].thesis, "new");
});

test("a stale device cannot reopen a finished book", () => {
  const fin = book("x", { status: "finished", finishedAt: "2026-04-01T00:00:00Z", updated: "2026-04-01T00:00:00Z" });
  const stale = book("x", { status: "listening", updated: "2026-05-01T00:00:00Z" });
  const m = mergeLibraries(lib([stale]), lib([fin])).books[0];
  assert.equal(m.status, "finished");
  assert.equal(m.finishedAt, "2026-04-01T00:00:00Z");
});

test("legacy books (no status) stay legacy and are not seen as changed", () => {
  const a = book("x"), b = book("x");
  const m = mergeLibraries(lib([a]), lib([b]));
  assert.equal(m.books[0].status, undefined);
  assert.ok(sameLibrary(m, lib([a])));
});

test("delete propagates unless the book was edited after the delete", () => {
  const gone = mergeLibraries(
    lib([], { deleted: { x: "2026-06-01T00:00:00Z" } }),
    lib([book("x", { updated: "2026-05-01T00:00:00Z" })]),
  );
  assert.equal(gone.books.length, 0);
  const kept = mergeLibraries(
    lib([], { deleted: { x: "2026-06-01T00:00:00Z" } }),
    lib([book("x", { updated: "2026-07-01T00:00:00Z" })]),
  );
  assert.equal(kept.books.length, 1);
  assert.equal(kept.deleted, undefined);
});

test("notes route to the current book, else stay loose", () => {
  const withCur = routeNotes(lib([book("a")], { currentBookId: "a" }), [note("n", "2026-01-01T00:00:00Z")]);
  assert.equal(withCur.books[0].notes?.length, 1);
  assert.equal(withCur.looseNotes, undefined);
  const none = routeNotes(lib([book("a")]), [note("n", "2026-01-01T00:00:00Z")]);
  assert.equal(none.books[0].notes, undefined);
  assert.equal(none.looseNotes?.length, 1);
});

test("merge is idempotent", () => {
  const a = lib([book("a", { notes: [note("1", "2026-01-01T00:00:00Z")] })], { currentBookId: "a" });
  const m = mergeLibraries(a, a);
  assert.ok(sameLibrary(m, a));
});

test("clearing the current book (finishing it) is not undone by a stale remote", () => {
  const remote = lib([book("a", { status: "listening" })], { currentBookId: "a", currentAt: "2026-10-01T00:00:00Z" });
  const local = lib([book("a", { status: "finished" })], { currentBookId: null, currentAt: "2026-10-02T00:00:00Z" });
  assert.equal(mergeLibraries(local, remote).currentBookId, null);
  assert.equal(mergeLibraries(remote, local).currentBookId, null);
  const newerRemote = lib([book("a")], { currentBookId: "a", currentAt: "2026-10-03T00:00:00Z" });
  assert.equal(mergeLibraries(local, newerRemote).currentBookId, "a");
});
