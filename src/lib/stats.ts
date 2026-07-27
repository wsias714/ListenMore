import type { Book } from "../types";

export interface CountRow {
  label: string;
  count: number;
}

export interface QuarterRow {
  key: string; // "2025-Q3", sorts chronologically as a string
  label: string; // "Q3 '25"
  count: number;
}

export interface LibraryStats {
  totalBooks: number;
  uniqueAuthors: number;
  topAuthors: CountRow[];
  topThemes: CountRow[];
  quarters: QuarterRow[];
  currentQuarterKey: string;
  currentQuarterCount: number;
  avgPerQuarter: number;
}

const quarterKey = (dateStr: string): string => {
  const d = new Date(dateStr + "T12:00:00");
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `${d.getFullYear()}-Q${q}`;
};

const quarterLabel = (key: string): string => {
  const [year, q] = key.split("-Q");
  return `${q}'${year.slice(2)}`;
};

const topN = (counts: Map<string, number>, n: number): CountRow[] =>
  [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([label, count]) => ({ label, count }));

export function computeLibraryStats(books: Book[]): LibraryStats {
  const authorCounts = new Map<string, number>();
  const themeCounts = new Map<string, number>();
  const quarterCounts = new Map<string, number>();

  for (const b of books) {
    if (b.author) authorCounts.set(b.author, (authorCounts.get(b.author) ?? 0) + 1);
    for (const t of b.themes) themeCounts.set(t, (themeCounts.get(t) ?? 0) + 1);
    if (b.dateFinished) {
      const k = quarterKey(b.dateFinished);
      quarterCounts.set(k, (quarterCounts.get(k) ?? 0) + 1);
    }
  }

  const sortedKeys = [...quarterCounts.keys()].sort();
  let quarters: QuarterRow[] = [];
  if (sortedKeys.length) {
    // fill in any quarters with zero books so the timeline reads continuously
    const [startYear, startQ] = sortedKeys[0].split("-Q").map(Number);
    const [endYear, endQ] = sortedKeys[sortedKeys.length - 1].split("-Q").map(Number);
    let y = startYear;
    let q = startQ;
    while (y < endYear || (y === endYear && q <= endQ)) {
      const key = `${y}-Q${q}`;
      quarters.push({ key, label: quarterLabel(key), count: quarterCounts.get(key) ?? 0 });
      q += 1;
      if (q > 4) {
        q = 1;
        y += 1;
      }
    }
  }

  const currentQuarterKey = quarterKey(new Date().toISOString().slice(0, 10));

  return {
    totalBooks: books.length,
    uniqueAuthors: authorCounts.size,
    topAuthors: topN(authorCounts, 3),
    topThemes: topN(themeCounts, 3),
    quarters,
    currentQuarterKey,
    currentQuarterCount: quarterCounts.get(currentQuarterKey) ?? 0,
    avgPerQuarter: quarters.length ? Math.round((books.length / quarters.length) * 10) / 10 : 0,
  };
}
