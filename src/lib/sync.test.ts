import { test } from "node:test";
import assert from "node:assert/strict";
import { ConflictError, LIB_PATH, INBOX_DIR, parseInboxFile, syncLibrary } from "./remote.ts";
import type { Remote, RemoteEntry, RemoteFile } from "./remote.ts";
import type { Book, LibraryData } from "../types.ts";

class FakeRemote implements Remote {
  files = new Map<string, { text: string; rev: number; modified: string }>();
  onNextWrite?: () => void;
  async read(path: string): Promise<RemoteFile | null> {
    const f = this.files.get(path);
    return f ? { text: f.text, rev: String(f.rev) } : null;
  }
  async write(path: string, text: string, rev: string | null) {
    this.onNextWrite?.();
    this.onNextWrite = undefined;
    const f = this.files.get(path);
    if ((f ? String(f.rev) : null) !== rev) throw new ConflictError();
    const next = (f?.rev ?? 0) + 1;
    this.files.set(path, { text, rev: next, modified: new Date().toISOString() });
    return { rev: String(next) };
  }
  async list(dir: string): Promise<RemoteEntry[]> {
    return [...this.files].filter(([p]) => p.startsWith(dir + "/")).map(([path, f]) => ({ path, modified: f.modified }));
  }
  async remove(path: string) {
    this.files.delete(path);
  }
}

const book = (id: string, over: Partial<Book> = {}): Book => ({
  id, title: id, author: "", dateFinished: "2026-01-01", themes: [], thesis: "", topApplication: "",
  applicability: 3, rating: 3, recall: "", keyIdeas: "", surprised: "", specifics: "", quotes: "",
  feynman: "", confirms: "", contradicts: "", links: "", decision: "", ifSituation: "", thenAction: "",
  preMortem: "", reviews: [], created: "2026-01-01T00:00:00.000Z", depth: "quick", ...over,
});
const saved = (r: FakeRemote): LibraryData => JSON.parse(r.files.get(LIB_PATH)!.text);

test("first connect uploads local data and takes a pre-migration snapshot", async () => {
  const r = new FakeRemote();
  const res = await syncLibrary(r, { books: [book("a"), book("b")] }, { snapshotLocal: true });
  assert.equal(res.pushed, true);
  assert.equal(saved(r).books.length, 2);
  assert.ok([...r.files.keys()].some((p) => p.startsWith("/backups/premigration-")));
});

test("a write that races a newer remote file is re-merged, never clobbering", async () => {
  const r = new FakeRemote();
  await syncLibrary(r, { books: [book("a")] });
  // Another writer (second device) lands between our read and our write:
  r.onNextWrite = () => {
    const cur = JSON.parse(r.files.get(LIB_PATH)!.text) as LibraryData;
    cur.books.push(book("from-other-device"));
    const f = r.files.get(LIB_PATH)!;
    r.files.set(LIB_PATH, { ...f, text: JSON.stringify(cur), rev: f.rev + 1 });
  };
  const res = await syncLibrary(r, { books: [book("a"), book("mine")] });
  const ids = saved(r).books.map((b) => b.id).sort();
  assert.deepEqual(ids, ["a", "from-other-device", "mine"]);
  assert.equal(res.pushed, true);
});

test("no change -> no write", async () => {
  const r = new FakeRemote();
  await syncLibrary(r, { books: [book("a")] });
  const rev = r.files.get(LIB_PATH)!.rev;
  const res = await syncLibrary(r, { books: [book("a")] });
  assert.equal(res.pushed, false);
  assert.equal(r.files.get(LIB_PATH)!.rev, rev);
});

test("Shortcut inbox notes land on the current book, then the files are deleted", async () => {
  const r = new FakeRemote();
  r.files.set(`${INBOX_DIR}/2026-10-11T14-03-22.txt`, { text: "  the key point is X  ", rev: 1, modified: "2026-10-11T21:00:00Z" });
  r.files.set(`${INBOX_DIR}/2026-10-11T15-00-00.json`, { text: JSON.stringify({ text: "second", ts: "2026-10-11T22:00:00Z" }), rev: 1, modified: "x" });
  const res = await syncLibrary(r, { books: [book("a", { status: "listening" })], currentBookId: "a" });
  const notes = saved(r).books[0].notes!;
  assert.deepEqual(notes.map((n) => n.text), ["the key point is X", "second"]);
  assert.equal(notes[0].src, "shortcut");
  assert.equal(res.inboxMerged, 2);
  assert.equal([...r.files.keys()].filter((p) => p.startsWith(INBOX_DIR)).length, 0);
});

test("a failed inbox delete re-merges without duplicating the note", async () => {
  const r = new FakeRemote();
  r.files.set(`${INBOX_DIR}/n1.txt`, { text: "once", rev: 1, modified: "2026-10-11T21:00:00Z" });
  const realRemove = r.remove.bind(r);
  r.remove = async () => {
    throw new Error("offline");
  };
  await syncLibrary(r, { books: [book("a")], currentBookId: "a" });
  r.remove = realRemove;
  await syncLibrary(r, { books: [book("a")], currentBookId: "a" });
  assert.equal(saved(r).books[0].notes!.length, 1);
});

test("inbox parsing: filename timestamp, JSON body, empty file", () => {
  assert.equal(parseInboxFile("/inbox/2026-10-11T14-03-22.txt", "hi", "m")!.ts.slice(0, 10), "2026-10-11");
  assert.equal(parseInboxFile("/inbox/x.json", '{"text":"yo","ts":"2026-01-02T03:04:05Z"}', "2026-05-05T00:00:00Z")!.ts, "2026-01-02T03:04:05.000Z");
  assert.equal(parseInboxFile("/inbox/x.txt", "   ", "2026-05-05T00:00:00Z"), null);
  assert.equal(parseInboxFile("/inbox/x.txt", "hello", "2026-05-05T00:00:00Z")!.ts, "2026-05-05T00:00:00.000Z");
});
