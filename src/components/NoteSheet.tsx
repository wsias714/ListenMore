import { useEffect, useRef, useState } from "react";
import { C, body, display, mono } from "../constants";
import { Btn, Input } from "./atoms";
import type { Book } from "../types";

/** One-tap capture. The textarea is focused on open so the iOS keyboard (and its
    dictation mic) is already up. Typed or dictated, it's the same path. */
export function NoteSheet({
  listening, currentId, onSave, onStartBook, onClose,
}: {
  listening: Book[];
  currentId: string | null;
  onSave: (bookId: string, text: string) => void;
  onStartBook: (title: string) => string;
  onClose: () => void;
}) {
  const [bookId, setBookId] = useState<string | null>(
    (listening.find((b) => b.id === currentId) ?? listening[0])?.id ?? null,
  );
  const [text, setText] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const ta = useRef<HTMLTextAreaElement>(null);
  useEffect(() => ta.current?.focus(), []);

  const save = () => {
    if (!text.trim()) return;
    let id = bookId;
    if (!id) {
      if (!newTitle.trim()) return;
      id = onStartBook(newTitle.trim());
    }
    onSave(id, text);
    onClose();
  };

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,.55)", display: "flex", alignItems: "flex-end" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 780, margin: "0 auto", background: C.surface, borderTop: `1px solid ${C.accent}`,
          borderRadius: "14px 14px 0 0", padding: "18px 20px calc(18px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={{ font: `800 20px/1.2 ${display}`, letterSpacing: "-.02em" }}>Note</div>
          <Btn kind="quiet" onClick={onClose}>Close</Btn>
        </div>

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
            + new book
          </button>
        </div>

        {bookId === null && (
          <div style={{ marginBottom: 10 }}>
            <Input value={newTitle} onChange={setNewTitle} placeholder="Title of the book you're listening to" />
          </div>
        )}

        <textarea
          ref={ta}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          placeholder="What just landed? A line is plenty. (Tap the keyboard's mic to dictate.)"
          style={{
            width: "100%", background: C.bg, color: C.text, border: `1px solid ${C.line}`, borderRadius: 6,
            padding: "10px 12px", font: `400 16px/1.55 ${body}`, resize: "vertical", outline: "none", boxSizing: "border-box",
          }}
        />
        <div style={{ marginTop: 12 }}>
          <Btn kind="solid" onClick={save} disabled={!text.trim() || (bookId === null && !newTitle.trim())}>
            Save note
          </Btn>
        </div>
      </div>
    </div>
  );
}
