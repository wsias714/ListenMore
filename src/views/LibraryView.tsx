import { useMemo, useState } from "react";
import { C, REVIEW_DUE_DAYS, body, display, mono } from "../constants";
import { daysSince, fmt, lastReviewDate } from "../lib/utils";
import { Btn, Input } from "../components/atoms";
import { Spectrum, Ticks } from "../components/Spectrum";
import type { Book } from "../types";
import { card } from "./ui";

/** The archive: every finished book, searchable. */
export function LibraryView({
  books, onOpen, onAdd,
}: {
  books: Book[];
  onOpen: (id: string) => void;
  onAdd: () => void;
}) {
  const [query, setQuery] = useState("");
  const [themeFilter, setThemeFilter] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return books
      .filter((b) => !themeFilter || b.themes.includes(themeFilter))
      .filter(
        (b) =>
          !q ||
          [b.title, b.author, b.thesis, b.topApplication, b.themes.join(" "), b.keyIdeas, b.decision]
            .join(" ")
            .toLowerCase()
            .includes(q),
      )
      .sort((a, b) => (a.dateFinished < b.dateFinished ? 1 : -1));
  }, [books, query, themeFilter]);

  if (!books.length) {
    return (
      <div style={{ ...card, textAlign: "center", padding: "40px 24px" }}>
        <div style={{ font: `700 22px/1.2 ${display}`, marginBottom: 8 }}>No finished books yet.</div>
        <p style={{ color: C.muted, maxWidth: 420, margin: "0 auto 18px" }}>
          Books land here when you tap Finished on Now. You can also add one you finished a while ago.
        </p>
        <Btn kind="solid" onClick={onAdd}>Add a finished book</Btn>
      </div>
    );
  }

  return (
    <>
      <Spectrum books={books} onPick={onOpen} activeId={null} />
      <div
        style={{ display: "flex", justifyContent: "space-between", font: `400 11px/1 ${mono}`, color: C.faint, letterSpacing: ".08em", marginBottom: 22 }}
      >
        <span>OLDEST</span>
        <span style={{ color: C.amber }}>▮ DUE FOR REVIEW</span>
        <span>NEWEST</span>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 220px" }}>
          <Input value={query} onChange={setQuery} placeholder="Search titles, ideas, actions…" />
        </div>
        <Btn kind="quiet" onClick={onAdd}>+ Add finished book</Btn>
      </div>

      {themeFilter && (
        <div style={{ marginBottom: 14 }}>
          <Btn kind="quiet" onClick={() => setThemeFilter(null)}>✕ clear filter: {themeFilter}</Btn>
        </div>
      )}

      <div style={{ display: "grid", gap: 10 }}>
        {filtered.map((b) => {
          const age = daysSince(lastReviewDate(b));
          const cold = age === null || age > REVIEW_DUE_DAYS;
          return (
            <button key={b.id} onClick={() => onOpen(b.id)} style={{ ...card, textAlign: "left", cursor: "pointer", width: "100%", display: "block" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
                <div style={{ font: `700 18px/1.25 ${display}`, color: C.text, letterSpacing: "-.01em" }}>{b.title}</div>
                <div style={{ font: `400 11px/1 ${mono}`, color: cold ? C.amber : C.faint, whiteSpace: "nowrap" }}>
                  {cold ? "DUE" : `${age}d`}
                </div>
              </div>
              <div style={{ font: `400 13px/1.4 ${body}`, color: C.muted, marginTop: 2 }}>
                {b.author || "—"} · finished {fmt(b.dateFinished)}
              </div>
              {b.thesis && <div style={{ marginTop: 10, color: C.text, font: `400 15px/1.5 ${body}` }}>{b.thesis}</div>}
              {b.topApplication && (
                <div style={{ marginTop: 8, paddingLeft: 10, borderLeft: `2px solid ${C.accent}`, color: C.muted, font: `400 14px/1.5 ${body}` }}>
                  {b.topApplication}
                </div>
              )}
              <div style={{ marginTop: 12 }}><Ticks book={b} /></div>
              <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                {b.themes.map((t) => (
                  <span
                    key={t}
                    onClick={(e) => {
                      e.stopPropagation();
                      setThemeFilter(t);
                    }}
                    style={{ font: `500 11px/1 ${mono}`, color: C.muted, border: `1px solid ${C.line}`, padding: "5px 8px", borderRadius: 20 }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && <div style={{ ...card, color: C.muted, textAlign: "center" }}>No book matches that. Try a broader term.</div>}
      </div>
    </>
  );
}
