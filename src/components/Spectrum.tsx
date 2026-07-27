import { C } from "../constants";
import { daysSince, lastReviewDate } from "../lib/utils";
import { REVIEW_DUE_DAYS } from "../constants";
import type { Book } from "../types";

export const Spectrum = ({
  books,
  onPick,
  activeId,
}: {
  books: Book[];
  onPick: (id: string) => void;
  activeId: string | null;
}) => {
  if (!books.length) return null;
  const sorted = [...books].sort((a, b) => (a.dateFinished < b.dateFinished ? -1 : 1));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 62, marginBottom: 4 }}>
      {sorted.map((b) => {
        const last = lastReviewDate(b);
        const age = daysSince(last);
        const cold = age === null || age > REVIEW_DUE_DAYS;
        const h = 18 + (b.applicability || 3) * 8;
        return (
          <button
            key={b.id}
            onClick={() => onPick(b.id)}
            title={`${b.title} — ${cold ? "due for review" : `reviewed ${age}d ago`}`}
            style={{
              width: 9, height: h, borderRadius: 2, border: "none", cursor: "pointer", padding: 0,
              background: activeId === b.id ? C.text : cold ? C.amber : C.accent,
              opacity: activeId === b.id ? 1 : cold ? 0.85 : 0.5,
            }}
          />
        );
      })}
    </div>
  );
};

export const Ticks = ({ book }: { book: Book }) => {
  const weeks = Math.max(1, Math.min(52, Math.ceil((daysSince(book.dateFinished) || 0) / 7)));
  const marks = new Set(
    book.reviews.map((r) => Math.floor((new Date(r.date + "T12:00:00").getTime() - new Date(book.dateFinished + "T12:00:00").getTime()) / 86400000 / 7)),
  );
  return (
    <svg width="100%" height="14" style={{ display: "block", opacity: 0.9 }} aria-hidden="true">
      {Array.from({ length: weeks }).map((_, i) => {
        const hit = marks.has(i);
        return <rect key={i} x={i * 5} y={hit ? 1 : 6} width={2} height={hit ? 12 : 3} fill={hit ? C.accent : C.line} />;
      })}
    </svg>
  );
};
