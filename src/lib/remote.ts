import type { LibraryData, Note } from "../types";
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
}

const MAX_ATTEMPTS = 5;

function parseLibrary(text: string): LibraryData {
  const p = JSON.parse(text) as LibraryData;
  if (!p || !Array.isArray(p.books)) throw new Error("library.json is not a Listening Log library");
  return p;
}

/** One inbox file -> a Note. Id comes from the filename so re-reading is idempotent. */
export function parseInboxFile(path: string, text: string, modified: string): Note | null {
  const name = path.split("/").pop() ?? path;
  const id = "inbox-" + name.replace(/\.[^.]+$/, "");
  let body = text.trim();
  let ts = "";
  if (body.startsWith("{")) {
    try {
      const j = JSON.parse(body) as { text?: unknown; ts?: unknown };
      if (typeof j.text === "string") body = j.text.trim();
      if (typeof j.ts === "string") ts = j.ts;
    } catch {
      /* not JSON after all; treat as plain text */
    }
  }
  if (!body) return null;
  if (!ts) {
    // Shortcut names files like 2026-10-11T14-03-22....txt
    const m = name.match(/^(\d{4}-\d{2}-\d{2})[T_ ](\d{2})[-:.](\d{2})(?:[-:.](\d{2}))?/);
    if (m) ts = `${m[1]}T${m[2]}:${m[3]}:${m[4] ?? "00"}`;
  }
  const d = new Date(ts || modified);
  return { id, ts: isNaN(d.getTime()) ? modified : d.toISOString(), text: body, src: "shortcut" };
}

async function readInbox(remote: Remote): Promise<{ notes: Note[]; files: string[] }> {
  const entries = await remote.list(INBOX_DIR);
  const notes: Note[] = [];
  const files: string[] = [];
  for (const e of entries) {
    const f = await remote.read(e.path);
    if (!f) continue;
    const n = parseInboxFile(e.path, f.text, e.modified);
    files.push(e.path); // unparseable/empty files are cleared too, they're noise
    if (n) notes.push(n);
  }
  return { notes, files };
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
    const merged = routeNotes(mergeLibraries(working, remoteLib), inbox.notes);

    if (r && !inbox.files.length && sameLibrary(merged, remoteLib)) {
      return { lib: merged, pushed: false, inboxMerged: 0 };
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
    return { lib: merged, pushed: true, inboxMerged: inbox.notes.length };
  }
  throw new Error("Dropbox kept changing underneath the sync; try again in a moment.");
}
