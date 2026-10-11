import { useEffect, useRef, useState } from "react";
import { C, body, display, mono } from "../constants";
import { Btn, Input } from "./atoms";
import type { Book } from "../types";

const DRAFT_KEY = "ll-note-draft";
interface Unsent {
  text: string;
  title: string;
}
const readDraft = (): Unsent => {
  try {
    const j = JSON.parse(window.localStorage.getItem(DRAFT_KEY) ?? "{}") as Partial<Unsent>;
    return { text: j.text ?? "", title: j.title ?? "" };
  } catch {
    return { text: "", title: "" };
  }
};
const writeDraft = (d: Unsent) => {
  try {
    if (d.text || d.title) window.localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    else window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* private mode etc.: the sheet still works, it just can't remember */
  }
};

/** One-tap capture. The textarea is focused on open so the iOS keyboard (and its dictation mic)
    is already up. Unsent text survives closing the sheet, a stray tap or an app switch.
    `finishing` is the "you're marking this book done with no notes" variant: one line, or skip. */
export function NoteSheet({
  listening, currentId, finishing, onSave, onStartBook, onSkip, onClose,
}: {
  listening: Book[];
  currentId: string | null;
  /** When set, the sheet is locked to this (just-finished) book. */
  finishing?: Book;
  onSave: (bookId: string, text: string) => void;
  onStartBook: (title: string) => string;
  onSkip?: () => void;
  onClose: () => void;
}) {
  const [bookId, setBookId] = useState<string | null>(
    finishing?.id ?? (listening.find((b) => b.id === currentId) ?? listening[0])?.id ?? null,
  );
  const [unsent] = useState(readDraft);
  const [text, setText] = useState(unsent.text);
  const [newTitle, setNewTitle] = useState(unsent.title);
  const ta = useRef<HTMLTextAreaElement>(null);
  useEffect(() => ta.current?.focus(), []);

  const change = (t: string, title: string = newTitle) => {
    setText(t);
    writeDraft({ text: t, title });
  };
  const changeTitle = (t: string) => {
    setNewTitle(t);
    writeDraft({ text, title: t });
  };

  const commit = (): boolean => {
    if (!text.trim()) return false;
    let id = bookId;
    if (!id) {
      if (!newTitle.trim()) return false;
      id = onStartBook(newTitle.trim());
      setBookId(id); // a second "Save & another" must not start the same book twice
    }
    onSave(id, text);
    setNewTitle("");
    change("", "");
    return true;
  };

  const needsTitle = bookId === null && !newTitle.trim();

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,.55)", display: "flex", alignItems: "flex-end" }}>
      <div
        style={{
          width: "100%", maxWidth: 780, margin: "0 auto", background: C.surface, borderTop: `1px solid ${C.accent}`,
          borderRadius: "14px 14px 0 0", padding: "18px 20px calc(18px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={{ font: `800 20px/1.2 ${display}`, letterSpacing: "-.02em" }}>
            {finishing ? `Finished: ${finishing.title}` : "Note"}
          </div>
          <Btn kind="quiet" onClick={onClose}>Close</Btn>
        </div>

        {finishing ? (
          <p style={{ color: C.muted, margin: "6px 0 12px", font: `400 14px/1.5 ${body}` }}>
            No notes on this one yet. One line before you go: what stuck? That's what the draft gets built from.
          </p>
        ) : (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "8px 0 12px" }}>
            {listening.map((b) => (
              <button
                key={b.id}
                onClick={() => setBookId(b.id)}
                style={{
                  font: `500 12px/1 ${mono}`, padding: "7px 10px", borderRadius: 20, cursor: "pointer",
                  background: bookId === b.id ? "rgba(127,209,193,.14)" : "transparent",
                  color: bookId === b.id ? C.accent : C.muted,
                  border: `1px solid ${bookId === b.id ? C.accent : C.line}`,
                }}
              >
                {b.title}
              </button>
            ))}
            <button
              onClick={() => setBookId(null)}
              style={{
                font: `500 12px/1 ${mono}`, padding: "7px 10px", borderRadius: 20, cursor: "pointer",
                background: "transparent", color: bookId === null ? C.accent : C.muted,
                border: `1px solid ${bookId === null ? C.accent : C.line}`,
              }}
            >
              + start a book
            </button>
          </div>
        )}

        {!finishing && bookId === null && (
          <div style={{ marginBottom: 10 }}>
            <Input value={newTitle} onChange={changeTitle} placeholder="Title of the book you're listening to" />
          </div>
        )}

        <textarea
          ref={ta}
          value={text}
          onChange={(e) => change(e.target.value)}
          rows={finishing ? 3 : 5}
          placeholder={finishing ? "The one thing I'd tell a friend about this book…" : "What just landed? A line is plenty. (Tap the keyboard's mic to dictate.)"}
          style={{
            width: "100%", background: C.bg, color: C.text, border: `1px solid ${C.line}`, borderRadius: 6,
            padding: "10px 12px", font: `400 16px/1.55 ${body}`, resize: "vertical", outline: "none", boxSizing: "border-box",
          }}
        />
        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn
            kind="solid"
            disabled={!text.trim() || needsTitle}
            onClick={() => {
              if (commit()) onClose();
            }}
          >
            {finishing ? "Save & finish" : "Save note"}
          </Btn>
          {!finishing && (
            <Btn
              disabled={!text.trim() || needsTitle}
              onClick={() => {
                if (commit()) ta.current?.focus();
              }}
            >
              Save &amp; another
            </Btn>
          )}
          {finishing && onSkip && <Btn onClick={onSkip}>Skip, just finish</Btn>}
        </div>
      </div>
    </div>
  );
}
