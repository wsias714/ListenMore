import type { Book, LibraryData } from "../types";

const KEY = "listening-log-v1";

export function loadBooks(): Book[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LibraryData;
    return Array.isArray(parsed.books) ? parsed.books : [];
  } catch {
    return [];
  }
}

export function saveBooks(books: Book[]): void {
  window.localStorage.setItem(KEY, JSON.stringify({ books } satisfies LibraryData));
}
