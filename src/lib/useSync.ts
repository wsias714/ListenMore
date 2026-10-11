import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { DraftsFile, LibraryData } from "../types";
import { dropboxRemote, finishAuthFromUrl, isConnected } from "./dropbox";
import { mergeLibraries, sameLibrary } from "./merge";
import { DRAFTS_PATH, syncLibrary } from "./remote";

export type SyncState = "off" | "idle" | "syncing" | "offline" | "error";

const MIGRATED = "ll-dbx-migrated";
const flag = (): boolean => {
  try {
    return window.localStorage.getItem(MIGRATED) === "1";
  } catch {
    return true;
  }
};
const setFlag = () => {
  try {
    window.localStorage.setItem(MIGRATED, "1");
  } catch {
    /* ignore */
  }
};

export interface Sync {
  state: SyncState;
  error: string;
  lastSync: string;
  drafts: DraftsFile | null;
  connected: boolean;
  syncNow: () => void;
  refreshConnection: () => void;
}

export function useSync(lib: LibraryData, setLib: Dispatch<SetStateAction<LibraryData>>, flash: (m: string) => void): Sync {
  const [state, setState] = useState<SyncState>(isConnected() ? "idle" : "off");
  const [error, setError] = useState("");
  const [lastSync, setLastSync] = useState("");
  const [drafts, setDrafts] = useState<DraftsFile | null>(null);
  const [connected, setConnected] = useState(isConnected());

  const libRef = useRef(lib);
  libRef.current = lib;
  const synced = useRef<LibraryData | null>(null); // what Dropbox last held
  const busy = useRef(false);
  const again = useRef(false);

  const run = useCallback(async () => {
    if (!isConnected()) return;
    if (busy.current) {
      again.current = true;
      return;
    }
    busy.current = true;
    setState("syncing");
    try {
      const remote = dropboxRemote();
      const res = await syncLibrary(remote, libRef.current, { snapshotLocal: !flag() });
      setFlag();
      synced.current = res.lib;
      setLib((cur) => {
        const merged = mergeLibraries(cur, res.lib);
        return sameLibrary(merged, cur) ? cur : merged;
      });
      try {
        const d = await remote.read(DRAFTS_PATH);
        setDrafts(d ? (JSON.parse(d.text) as DraftsFile) : null);
      } catch {
        /* drafts are optional; a bad drafts.json never blocks the library */
      }
      if (res.inboxMerged) flash(`${res.inboxMerged} note${res.inboxMerged > 1 ? "s" : ""} from your Shortcut.`);
      setLastSync(new Date().toISOString());
      setError("");
      setState("idle");
    } catch (e) {
      const offline = !navigator.onLine || (e instanceof TypeError && /fetch|network/i.test(e.message));
      setState(offline ? "offline" : "error");
      setError(offline ? "" : e instanceof Error ? e.message : String(e));
    } finally {
      busy.current = false;
      if (again.current) {
        again.current = false;
        setTimeout(run, 500);
      }
    }
  }, [setLib, flash]);

  /* finish an OAuth redirect, then first sync */
  useEffect(() => {
    finishAuthFromUrl()
      .then((r) => {
        if (r === "connected") {
          setConnected(true);
          flash("Dropbox connected.");
        }
      })
      .catch((e: Error) => {
        setState("error");
        setError(e.message);
      })
      .finally(() => void run());
  }, [run, flash]);

  /* local edits -> debounce -> sync */
  useEffect(() => {
    if (!connected) return;
    if (synced.current && sameLibrary(lib, synced.current)) return;
    const t = setTimeout(() => void run(), 1500);
    return () => clearTimeout(t);
  }, [lib, connected, run]);

  /* come back to the app / regain network -> sync (picks up Shortcut notes) */
  useEffect(() => {
    const onVisible = () => document.visibilityState === "visible" && void run();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onVisible);
    };
  }, [run]);

  const refreshConnection = useCallback(() => {
    const c = isConnected();
    setConnected(c);
    setState(c ? "idle" : "off");
    if (c) void run();
  }, [run]);

  return { state, error, lastSync, drafts, connected, syncNow: () => void run(), refreshConnection };
}
