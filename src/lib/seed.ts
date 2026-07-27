import type { Book, LibraryData } from "../types";

export async function fetchSeedBooks(): Promise<Book[]> {
  const res = await fetch(`${import.meta.env.BASE_URL}seed/listening-log-seed.json`);
  if (!res.ok) throw new Error("Couldn't load the starter library.");
  const data = (await res.json()) as LibraryData;
  if (!Array.isArray(data.books)) throw new Error("Starter library file is malformed.");
  return data.books;
}
