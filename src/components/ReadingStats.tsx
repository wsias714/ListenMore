import { C, display, body, mono } from "../constants";
import { computeLibraryStats } from "../lib/stats";
import type { Book } from "../types";

const Tile = ({ label, value }: { label: string; value: string }) => (
  <div style={{ flex: "1 1 100px" }}>
    <div style={{ font: `800 26px/1 ${display}`, color: C.text, letterSpacing: "-.02em" }}>{value}</div>
    <div style={{ font: `600 10px/1.4 ${mono}`, color: C.faint, letterSpacing: ".08em", textTransform: "uppercase", marginTop: 4 }}>
      {label}
    </div>
  </div>
);

const RankList = ({ title, rows }: { title: string; rows: { label: string; count: number }[] }) => {
  if (!rows.length) return null;
  const max = rows[0].count;
  return (
    <div style={{ flex: "1 1 200px" }}>
      <div style={{ font: `600 11px/1.4 ${mono}`, letterSpacing: ".08em", color: C.accent, textTransform: "uppercase", marginBottom: 10 }}>
        {title}
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {rows.map((r) => (
          <div key={r.label} style={{ display: "grid", gap: 3 }}>
            <div style={{ display: "flex", justifyContent: "space-between", font: `400 13px/1.3 ${body}`, color: C.text }}>
              <span>{r.label}</span>
              <span style={{ color: C.faint, font: `400 12px/1.3 ${mono}` }}>{r.count}</span>
            </div>
            <div style={{ height: 4, borderRadius: 2, background: C.line, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(r.count / max) * 100}%`, background: C.accent, borderRadius: 2 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const ReadingStats = ({ books }: { books: Book[] }) => {
  const s = computeLibraryStats(books);
  if (!s.totalBooks) return null;
  const maxQuarter = Math.max(1, ...s.quarters.map((q) => q.count));

  return (
    <div>
      <div style={{ font: `600 11px/1 ${mono}`, color: C.amber, letterSpacing: ".1em", marginBottom: 14 }}>YOUR READING</div>

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 24 }}>
        <Tile label="Books logged" value={String(s.totalBooks)} />
        <Tile label="Authors" value={String(s.uniqueAuthors)} />
        <Tile label={`This quarter (${s.currentQuarterKey.replace("-", " ")})`} value={String(s.currentQuarterCount)} />
        <Tile label="Avg / quarter" value={String(s.avgPerQuarter)} />
      </div>

      {s.quarters.length > 1 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ font: `600 11px/1.4 ${mono}`, letterSpacing: ".08em", color: C.accent, textTransform: "uppercase", marginBottom: 10 }}>
            Books finished per quarter
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 56, overflowX: "auto", paddingBottom: 2 }}>
            {s.quarters.map((q) => (
              <div key={q.key} title={`${q.label}: ${q.count} book${q.count === 1 ? "" : "s"}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flex: "0 0 auto" }}>
                <div
                  style={{
                    width: 14,
                    height: Math.max(3, (q.count / maxQuarter) * 44),
                    borderRadius: 2,
                    background: q.key === s.currentQuarterKey ? C.accent : C.line,
                  }}
                />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
            {s.quarters.map((q, i) => (
              <div
                key={q.key}
                style={{
                  width: 14, flex: "0 0 auto", font: `400 8px/1 ${mono}`, color: C.faint, textAlign: "center",
                  visibility: i % Math.ceil(s.quarters.length / 8) === 0 ? "visible" : "hidden",
                }}
              >
                {q.label}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
        <RankList title="Top genres" rows={s.topThemes} />
        <RankList title="Top authors" rows={s.topAuthors} />
      </div>
    </div>
  );
};
