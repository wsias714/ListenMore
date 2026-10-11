import { useState } from "react";
import { C, body, display, mono } from "../constants";
import { fmtStamp } from "../lib/library";
import { Btn, Field, Input, Label, Stars, ThemePicker } from "./atoms";
import type { Book, Draft } from "../types";

/** Recall first, then reveal. The draft is a starting point to edit, never auto-accepted. */
export function DraftReview({
  book, draft, onAccept, onCancel,
}: {
  book: Book;
  draft: Draft;
  onAccept: (b: Book) => void;
  onCancel: () => void;
}) {
  const [recall, setRecall] = useState(book.recall);
  const [revealed, setRevealed] = useState(false);
  const [b, setB] = useState<Book>(book);
  const set =
    <K extends keyof Book>(k: K) =>
    (v: Book[K]) =>
      setB((x) => ({ ...x, [k]: v }));
  const card: React.CSSProperties = { background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: 18 };

  const reveal = () => {
    const f = draft.fields;
    setB({
      ...book,
      recall,
      thesis: f.thesis ?? book.thesis,
      topApplication: f.topApplication ?? book.topApplication,
      keyIdeas: f.keyIdeas ?? book.keyIdeas,
      surprised: f.surprised ?? book.surprised,
      specifics: f.specifics ?? book.specifics,
      quotes: f.quotes ?? book.quotes,
      decision: f.decision ?? book.decision,
      ifSituation: f.ifSituation ?? book.ifSituation,
      thenAction: f.thenAction ?? book.thenAction,
      themes: f.themes?.length ? f.themes : book.themes,
    });
    setRevealed(true);
  };

  const accept = () => onAccept({ ...b, recall, depth: "full", draftAccepted: draft.id });

  return (
    <div style={{ paddingTop: 26 }}>
      <Btn kind="quiet" onClick={onCancel}>← Library</Btn>
      <div style={{ ...card, marginTop: 14 }}>
        <div style={{ font: `400 11px/1 ${mono}`, color: C.amber, letterSpacing: ".1em" }}>DRAFT READY</div>
        <div style={{ font: `800 28px/1.15 ${display}`, letterSpacing: "-.025em", margin: "8px 0 2px" }}>{book.title}</div>
        <div style={{ color: C.muted }}>
          {book.author && `${book.author} · `}drafted from {draft.notesUsed} note{draft.notesUsed === 1 ? "" : "s"}
        </div>

        {!revealed ? (
          <div style={{ marginTop: 22 }}>
            <div style={{ padding: 16, background: C.bg, borderRadius: 8, border: `1px solid ${C.line}` }}>
              <div style={{ font: `700 18px/1.4 ${display}`, marginBottom: 6 }}>First, from memory: what was the core idea?</div>
              <p style={{ color: C.muted, margin: 0, font: `400 15px/1.55 ${body}` }}>
                Before you read the draft, write it in your own words (dictation works). That effort
                is the part that makes it stick. This becomes your "from memory" answer.
              </p>
            </div>
            <div style={{ marginTop: 14 }}>
              <Field value={recall} onChange={setRecall} rows={4} placeholder="The book's core argument is…" />
            </div>
            <div style={{ marginTop: 14 }}>
              <Btn kind="solid" onClick={reveal} disabled={recall.trim().length < 10}>I've recalled it, show the draft</Btn>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 22, display: "grid", gap: 16 }}>
            <div style={{ padding: 12, background: C.bg, borderRadius: 6, color: C.muted, font: `400 14px/1.5 ${body}` }}>
              Written by a model from your notes only. Fix anything that isn't what you meant, then accept.
            </div>
            <div>
              <Label>Your recall</Label>
              <div style={{ whiteSpace: "pre-wrap", color: C.muted }}>{recall}</div>
            </div>
            <div><Label>One-line thesis</Label><Field value={b.thesis} onChange={set("thesis")} rows={4} /></div>
            <div><Label>Top application</Label><Field value={b.topApplication} onChange={set("topApplication")} rows={4} /></div>
            <div><Label>Key ideas</Label><Field value={b.keyIdeas} onChange={set("keyIdeas")} rows={8} /></div>
            <div><Label>What surprised me</Label><Field value={b.surprised} onChange={set("surprised")} rows={3} /></div>
            <div><Label>Specifics</Label><Field value={b.specifics} onChange={set("specifics")} rows={6} /></div>
            {b.quotes && <div><Label>Quotes</Label><Field value={b.quotes} onChange={set("quotes")} rows={3} /></div>}
            <div><Label>Decision I'd make differently</Label><Field value={b.decision} onChange={set("decision")} rows={4} /></div>
            <div>
              <Label hint="if / then">Implementation intention</Label>
              <div style={{ display: "grid", gap: 8 }}>
                <Input value={b.ifSituation} onChange={set("ifSituation")} placeholder="IF this specific situation happens…" />
                <Input value={b.thenAction} onChange={set("thenAction")} placeholder="THEN I will take this specific action." />
              </div>
            </div>
            <div>
              <Label>Themes</Label>
              <ThemePicker
                selected={b.themes}
                onToggle={(t) => set("themes")(b.themes.includes(t) ? b.themes.filter((x) => x !== t) : [...b.themes, t])}
              />
            </div>
            <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
              <div><Label>Applicability</Label><Stars value={b.applicability} onChange={set("applicability")} /></div>
              <div><Label>Rating</Label><Stars value={b.rating} onChange={set("rating")} glyph="★" /></div>
            </div>

            {draft.gaps.length > 0 && (
              <div style={{ padding: 12, borderLeft: `2px solid ${C.amber}`, color: C.muted }}>
                <Label>Your notes didn't settle</Label>
                {draft.gaps.map((g, i) => <div key={i} style={{ marginTop: 4 }}>• {g}</div>)}
              </div>
            )}

            <details>
              <summary style={{ cursor: "pointer", color: C.muted }}>Your {book.notes?.length ?? 0} notes, to check the draft against</summary>
              {(book.notes ?? []).map((n) => (
                <div key={n.id} style={{ marginTop: 8, font: `400 14px/1.5 ${body}` }}>
                  <span style={{ font: `600 11px/1 ${mono}`, color: C.accent }}>{fmtStamp(n.ts)}</span>
                  <div style={{ color: C.muted, whiteSpace: "pre-wrap" }}>{n.text}</div>
                </div>
              ))}
            </details>

            <div style={{ display: "flex", gap: 8 }}>
              <Btn kind="solid" onClick={accept}>Accept &amp; save reflection</Btn>
              <Btn onClick={onCancel}>Not now</Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
