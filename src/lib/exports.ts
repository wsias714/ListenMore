import type { Book, LibraryData } from "../types";

function download(name: string, text: string, mime: string) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportCSV(books: Book[]) {
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = [
    "Title", "Author", "Date Finished", "Themes", "One-Line Thesis", "Top Application",
    "Applicability", "Rating", "Last Reviewed", "Review Count", "If-Then",
  ];
  const rows = books.map((b) =>
    [
      b.title,
      b.author,
      b.dateFinished,
      b.themes.join(", "),
      b.thesis,
      b.topApplication,
      b.applicability,
      b.rating,
      b.reviews.length ? b.reviews[b.reviews.length - 1].date : "",
      b.reviews.length,
      b.ifSituation ? `IF ${b.ifSituation} THEN ${b.thenAction}` : "",
    ]
      .map(esc)
      .join(","),
  );
  download("listening-log-index.csv", [head.map(esc).join(","), ...rows].join("\n"), "text/csv");
}

export function exportMD(books: Book[]) {
  const md = books
    .map(
      (b) => `# ${b.title} — ${b.author}
Finished: ${b.dateFinished} | Themes: ${b.themes.join(", ")} | Applicability: ${b.applicability}/5 | Rating: ${b.rating}/5

**Thesis:** ${b.thesis}

## Blank sheet (from memory)
${b.recall}

**Key ideas**
${b.keyIdeas}

**Surprised me**
${b.surprised}

## Specifics
${b.specifics}

**Quotes**
${b.quotes}

## Explain it simply
${b.feynman}

## Connect
- Confirms: ${b.confirms}
- Contradicts: ${b.contradicts}
- Links to: ${b.links}

## Apply
- Decision I'd make differently: ${b.decision}
- IF ${b.ifSituation} THEN I will ${b.thenAction}
- Pre-mortem: ${b.preMortem}

## Review log
${b.reviews.map((r) => `- ${r.date} · ${r.type} · ${r.note || "(no note)"}`).join("\n") || "- none yet"}
`,
    )
    .join("\n\n---\n\n");
  download("listening-log-notes.md", md, "text/markdown");
}

export function exportJSON(books: Book[]) {
  download("listening-log-backup.json", JSON.stringify({ books } satisfies LibraryData, null, 2), "application/json");
}

export function importJSON(file: File): Promise<Book[]> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      try {
        const p = JSON.parse(r.result as string) as LibraryData;
        if (!Array.isArray(p.books)) throw new Error("Not a Listening Log backup");
        resolve(p.books);
      } catch {
        reject(new Error("That file isn't a Listening Log backup."));
      }
    };
    r.onerror = () => reject(new Error("Couldn't read that file."));
    r.readAsText(file);
  });
}
