import type { LibraryData, Note } from "../types";
import { finishBook, startBook } from "./library.ts";
import { mergeLibraries, routeNotes, sameLibrary } from "./merge.ts";

/* Sync engine, written against a tiny `Remote` interface so it can be tested
   with an in-memory fake (see sync.test.ts) and run against Dropbox in the app. */

export const LIB_PATH = "/library.json";
export const DRAFTS_PATH = "/drafts.json";
export const INBOX_DIR = "/inbox";
export const BACKUP_DIR = "/backups";

/** Thrown by Remote.write when the file's rev moved since it was read. */
export class ConflictError extends Error {
  constructor() {
    super("remote file changed since it was read");
  }
}

export interface RemoteFile {
  text: string;
  rev: string;
}
export interface RemoteEntry {
  path: string;
  modified: string; // ISO
}
export interface Remote {
  read(path: string): Promise<RemoteFile | null>;
  /** rev=null means "create, and fail with ConflictError if it already exists". */
  write(path: string, text: string, rev: string | null): Promise<{ rev: string }>;
  list(dir: string): Promise<RemoteEntry[]>;
  remove(path: string): Promise<void>;
}

export interface SyncResult {
  lib: LibraryData;
  pushed: boolean;
  inboxMerged: number;
  inboxCommands: number;
}

const MAX_ATTEMPTS = 5;

function parseLibrary(text: string): LibraryData {
  const p = JSON.parse(text) as LibraryData;
  if (!p || !Array.isArray(p.books)) throw new Error("library.json is not a Listening Log library");
  return p;
}

/** What a Shortcut can drop in /inbox: a thought, or a "start a book" / "finished" command. */
export type InboxItem =
  | { kind: "note"; note: Note }
  | { kind: "start"; id: string; ts: string; title: string }
  | { kind: "finish"; id: string; ts: string };

/** One inbox file -> an item. Ids come from the filename so re-reading is idempotent. */
export function parseInboxItem(path: string, text: string, modified: string): InboxItem | null {
  const name = path.split("/").pop() ?? path;
  const stem = name.replace(/\.[^.]+$/, "");
  const id = "inbox-" + stem;
  let body = text.trim();
  let ts = "";
  let cmd = "";
  let title = "";
  if (body.startsWith("{")) {
    try {
      const j = JSON.parse(body) as { text?: unknown; ts?: unknown; cmd?: unknown; title?: unknown };
      if (typeof j.text === "string") body = j.text.trim();
      if (typeof j.ts === "string") ts = j.ts;
      if (typeof j.cmd === "string") cmd = j.cmd.trim().toLowerCase();
      if (typeof j.title === "string") title = j.title.trim();
    } catch {
      /* not JSON after all; treat as plain text */
    }
  }
  if (!ts) {
    // Shortcut names files like 2026-10-11T14-03-22....txt
    const m = name.match(/^(\d{4}-\d{2}-\d{2})[T_ ](\d{2})[-:.](\d{2})(?:[-:.](\d{2}))?/);
    if (m) ts = `${m[1]}T${m[2]}:${m[3]}:${m[4] ?? "00"}`;
  }
  const d = new Date(ts || modified);
  const when = isNaN(d.getTime()) ? modified : d.toISOString();
  if (cmd === "start") return title ? { kind: "start", id, ts: when, title } : null;
  if (cmd === "finish" || cmd === "finished") return { kind: "finish", id, ts: when };
  if (!body) return null;
  return { kind: "note", note: { id, ts: when, text: body, src: "shortcut" } };
}

/** Back-compat helper: the Note in an inbox file, or null if it's a command or empty. */
export function parseInboxFile(path: string, text: string, modified: string): Note | null {
  const item = parseInboxItem(path, text, modified);
  return item?.kind === "note" ? item.note : null;
}

/** Fold inbox items into the library in the order they were made, so "start", a note, then "finish" behave. */
export function applyInbox(lib: LibraryData, items: InboxItem[]): { lib: LibraryData; notes: number; commands: number } {
  const ordered = [...items].sort((a, b) => {
    const ta = a.kind === "note" ? a.note.ts : a.ts;
    const tb = b.kind === "note" ? b.note.ts : b.ts;
    return ta < tb ? -1 : ta > tb ? 1 : 0;
  });
  let cur = lib;
  let notes = 0;
  let commands = 0;
  for (const it of ordered) {
    if (it.kind === "note") {
      cur = routeNotes(cur, [it.note]);
      notes++;
      continue;
    }
    if ((cur.inboxApplied ?? []).includes(it.id)) continue; // a leftover file from a failed delete
    if (it.kind === "start") {
      if (!cur.books.some((b) => b.id === it.id)) cur = startBook(cur, it.title, it.id, it.ts);
    } else if (cur.currentBookId) {
      cur = finishBook(cur, cur.currentBookId, new Date(it.ts));
    }
    cur = { ...cur, inboxApplied: [...(cur.inboxApplied ?? []), it.id].slice(-300) };
    commands++;
  }
  return { lib: cur, notes, commands };
}

async function readInbox(remote: Remote): Promise<{ items: InboxItem[]; files: string[] }> {
  const entries = await remote.list(INBOX_DIR);
  const items: InboxItem[] = [];
  const files: string[] = [];
  for (const e of entries) {
    const f = await remote.read(e.path);
    if (!f) continue;
    const it = parseInboxItem(e.path, f.text, e.modified);
    files.push(e.path); // unparseable/empty files are cleared too, they're noise
    if (it) items.push(it);
  }
  return { items, files };
}

/**
 * Pull remote, merge with `local`, fold in Shortcut inbox notes, and push only if
 * that changed anything. Uses rev-based writes: if the file moved underneath us
 * (phone and Shortcut racing, a second device) we re-read, re-merge and retry,
 * so a write can never silently overwrite a newer file.
 */
export async function syncLibrary(
  remote: Remote,
  local: LibraryData,
  opts: { snapshotLocal?: boolean } = {},
): Promise<SyncResult> {
  let working = local;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const r = await remote.read(LIB_PATH);
    const remoteLib: LibraryData = r ? parseLibrary(r.text) : { books: [] };

    if (opts.snapshotLocal && working.books.length) {
      // One-time safety copy of the phone's data before it merges into Dropbox.
      const name = `${BACKUP_DIR}/premigration-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
      try {
        await remote.write(name, JSON.stringify(working), null);
      } catch (e) {
        if (!(e instanceof ConflictError)) throw e;
      }
      opts = { ...opts, snapshotLocal: false };
    }

    const inbox = await readInbox(remote);
    const applied = applyInbox(mergeLibraries(working, remoteLib), inbox.items);
    const merged = applied.lib;

    if (r && !inbox.files.length && sameLibrary(merged, remoteLib)) {
      return { lib: merged, pushed: false, inboxMerged: 0, inboxCommands: 0 };
    }
    try {
      await remote.write(LIB_PATH, JSON.stringify(merged), r?.rev ?? null);
    } catch (e) {
      if (e instanceof ConflictError) {
        working = merged;
        continue;
      }
      throw e;
    }
    // Only after the library holds the notes is it safe to drop the inbox files.
    for (const f of inbox.files) {
      try {
        await remote.remove(f);
      } catch {
        /* ids are filename-derived, so a leftover file re-merges harmlessly */
      }
    }
    return { lib: merged, pushed: true, inboxMerged: applied.notes, inboxCommands: applied.commands };
  }
  throw new Error("Dropbox kept changing underneath the sync; try again in a moment.");
}
