import type { LibraryData } from "../types";

const KEY = "listening-log-v1";

/** localStorage is the offline cache; Dropbox (when connected) is the source of truth. */
export function loadLibrary(): LibraryData {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { books: [] };
    const parsed = JSON.parse(raw) as LibraryData;
    return Array.isArray(parsed.books) ? parsed : { books: [] };
  } catch {
    return { books: [] };
  }
}

export function saveLibrary(lib: LibraryData): void {
  window.localStorage.setItem(KEY, JSON.stringify(lib));
}
