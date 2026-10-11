import { C, body, display, mono } from "../constants";
import { fmtStamp } from "../lib/library";
import { Btn } from "../components/atoms";
import type { Sync } from "../lib/useSync";
import type { Book, LibraryData } from "../types";
import { card, kicker } from "./ui";

/** Home: what you're listening to, what's waiting on you, and nothing else. */
export function NowView({
  lib, listening, finished, drafted, waiting, sync,
  onOpenBook, onNote, onFinish, onOpenDraft, onSnooze, onSetCurrent, onAttachLoose, onSettings, onStarter,
}: {
  lib: LibraryData;
  listening: Book[];
  finished: Book[];
  /** Books whose draft is ready and not snoozed; oldest first. */
  drafted: Book[];
  /** Finished books that have notes but no draft yet. */
  waiting: Book[];
  sync: Sync;
  onOpenBook: (id: string) => void;
  onNote: (bookId?: string) => void;
  onFinish: (id: string) => void;
  onOpenDraft: (id: string) => void;
  onSnooze: (id: string) => void;
  onSetCurrent: (id: string) => void;
  onAttachLoose: (noteId: string, bookId: string) => void;
  onSettings: () => void;
  onStarter: () => void;
}) {
  const current = listening.find((b) => b.id === lib.currentBookId) ?? null;
  const loose = lib.looseNotes ?? [];
  const target = current ?? listening[0] ?? null;
  const empty = lib.books.length === 0;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {drafted[0] && (
        <div style={{ ...card, borderColor: C.amber }}>
          <span style={kicker(C.amber)}>DRAFT READY{drafted.length > 1 ? ` · ${drafted.length} WAITING` : ""}</span>
          <div style={{ font: `700 18px/1.3 ${display}`, marginTop: 8 }}>{drafted[0].title}</div>
          <div style={{ color: C.muted, font: `400 14px/1.45 ${body}`, margin: "2px 0 12px" }}>
            Your notes became a reflection. Recall the core idea, then check it.
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn kind="solid" onClick={() => onOpenDraft(drafted[0].id)}>Review draft</Btn>
            <Btn kind="quiet" onClick={() => onSnooze(drafted[0].id)}>Not now</Btn>
          </div>
        </div>
      )}

      {sync.state === "off" && (
        <div style={card}>
          <div style={{ font: `700 16px/1.3 ${display}` }}>Connect Dropbox</div>
          <p style={{ color: C.muted, margin: "4px 0 12px", font: `400 14px/1.5 ${body}` }}>
            So notes from your Shortcut and the drafts reach this phone, and your library is backed up.
          </p>
          <Btn kind="solid" onClick={onSettings}>Set up Dropbox</Btn>
        </div>
      )}

      {loose.length > 0 && (
        <div style={{ ...card, borderColor: C.amber }}>
          <span style={kicker(C.amber)}>
            {loose.length} NOTE{loose.length === 1 ? "" : "S"} WAITING FOR A BOOK
          </span>
          {loose.map((n) => (
            <div key={n.id} style={{ marginTop: 12 }}>
              <div style={kicker(C.accent)}>{fmtStamp(n.ts)}</div>
              <div style={{ margin: "4px 0 8px", whiteSpace: "pre-wrap" }}>{n.text}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                {target && <Btn kind="solid" onClick={() => onAttachLoose(n.id, target.id)}>File to {target.title}</Btn>}
                <select
                  aria-label="File to a different book"
                  value=""
                  onChange={(e) => e.target.value && onAttachLoose(n.id, e.target.value)}
                  style={{ background: C.bg, color: C.muted, border: `1px solid ${C.line}`, borderRadius: 6, padding: "10px 8px", font: `400 13px ${body}`, maxWidth: "100%" }}
                >
                  <option value="">{target ? "Other book…" : "File to…"}</option>
                  {lib.books.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={kicker(C.accent)}>LISTENING NOW</span>
          <Btn kind="quiet" onClick={() => onNote()}>+ Start a book</Btn>
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          {listening.map((b) => {
            const notes = b.notes ?? [];
            const last = notes[notes.length - 1];
            return (
              <div key={b.id} style={card}>
                <button
                  onClick={() => onOpenBook(b.id)}
                  style={{ background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer", width: "100%" }}
                >
                  <div style={{ font: `700 18px/1.25 ${display}`, color: C.text }}>{b.title}</div>
                  <div style={{ font: `400 13px/1.4 ${body}`, color: C.muted, marginTop: 2 }}>
                    {notes.length} note{notes.length === 1 ? "" : "s"}
                    {last ? ` · last ${fmtStamp(last.ts)}` : ""}
                  </div>
                  {last && <div style={{ color: C.muted, font: `400 14px/1.5 ${body}`, marginTop: 8 }}>“{last.text.slice(0, 140)}”</div>}
                </button>
                <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                  <Btn kind="solid" onClick={() => onNote(b.id)}>+ Note</Btn>
                  <Btn onClick={() => onFinish(b.id)}>Finished</Btn>
                </div>
              </div>
            );
          })}
          {listening.length === 0 && (
            <div style={{ ...card, color: C.muted }}>
              {empty ? (
                <>
                  Nothing here yet. Start a book, jot a thought as you listen, and the reflection gets drafted for you
                  when you finish.
                  <div style={{ marginTop: 12 }}>
                    <Btn kind="quiet" onClick={onStarter}>Or load your starter library (16 books)</Btn>
                  </div>
                </>
              ) : (
                <>Nothing in progress. Tap <b>Start a book</b> when you begin one.</>
              )}
            </div>
          )}
        </div>
        {listening.length > 0 && (
          <div style={{ font: `400 12px/1.5 ${mono}`, color: C.faint, marginTop: 10 }}>
            SHORTCUT NOTES GO TO:{" "}
            {listening.length > 1 ? (
              <select
                aria-label="Shortcut notes go to"
                value={current?.id ?? ""}
                onChange={(e) => e.target.value && onSetCurrent(e.target.value)}
                style={{ background: C.bg, color: C.accent, border: `1px solid ${C.line}`, borderRadius: 6, padding: "4px 6px", font: `500 12px ${mono}`, maxWidth: "70%" }}
              >
                {!current && <option value="">(pick a book)</option>}
                {listening.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
              </select>
            ) : (
              <span style={{ color: C.accent }}>{current?.title ?? listening[0].title}</span>
            )}
          </div>
        )}
      </div>

      {waiting.length > 0 && (
        <div>
          <div style={{ ...kicker(C.accent), marginBottom: 8 }}>DRAFT ON ITS WAY</div>
          <div style={{ display: "grid", gap: 8 }}>
            {waiting.map((b) => (
              <button
                key={b.id}
                onClick={() => onOpenBook(b.id)}
                style={{ ...card, textAlign: "left", cursor: "pointer", width: "100%", padding: 14 }}
              >
                <div style={{ font: `700 16px/1.3 ${display}`, color: C.text }}>{b.title}</div>
                <div style={{ font: `400 13px/1.4 ${body}`, color: C.muted }}>
                  {b.notes!.length} note{b.notes!.length === 1 ? "" : "s"} · the draft arrives tomorrow morning
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {finished.length > 0 && listening.length === 0 && waiting.length === 0 && drafted.length === 0 && (
        <div style={{ color: C.faint, font: `400 13px/1.5 ${body}` }}>
          All caught up. Your {finished.length} finished books are in Library; Review has this week's pick.
        </div>
      )}
    </div>
  );
}
