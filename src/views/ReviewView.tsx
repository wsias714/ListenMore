import { useState } from "react";
import { C, PROMPTS, body, display, mono } from "../constants";
import { fmt, lastReviewDate } from "../lib/utils";
import { Btn, Field, Label } from "../components/atoms";
import { ReadingStats } from "../components/ReadingStats";
import type { Book } from "../types";
import { card } from "./ui";

type PromptType = (typeof PROMPTS)[number]["type"];

/** Weighted pick: the oldest-reviewed half, then random. */
function pick(finished: Book[], not?: string): Book | null {
  const ranked = [...finished]
    .filter((b) => b.id !== not)
    .sort((a, b) => ((lastReviewDate(a) ?? "0000") < (lastReviewDate(b) ?? "0000") ? -1 : 1));
  if (!ranked.length) return finished[0] ?? null;
  const pool = ranked.slice(0, Math.max(1, Math.ceil(ranked.length / 2)));
  return pool[Math.floor(Math.random() * pool.length)];
}

/** This week's book: recall first, then the notes, then one prompt. */
export function ReviewView({
  finished, onLog,
}: {
  finished: Book[];
  onLog: (bookId: string, type: PromptType, note: string) => void;
}) {
  const [pickedId, setPickedId] = useState<string | null>(() => pick(finished)?.id ?? null);
  const [revealed, setRevealed] = useState(false);
  const [note, setNote] = useState("");

  if (!finished.length) {
    return <div style={{ ...card, color: C.muted }}>Nothing to review yet. Finish a book and it shows up here.</div>;
  }
  const b = finished.find((x) => x.id === pickedId) ?? finished[0];
  const p = PROMPTS[b.reviews.length % 3];

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={card}>
        <div style={{ font: `400 11px/1 ${mono}`, color: C.amber, letterSpacing: ".1em" }}>THIS WEEK'S BOOK</div>
        <div style={{ font: `800 30px/1.15 ${display}`, letterSpacing: "-.025em", margin: "8px 0 2px" }}>{b.title}</div>
        <div style={{ color: C.muted }}>
          {b.author} · finished {fmt(b.dateFinished)}
          {lastReviewDate(b) ? ` · last reviewed ${fmt(lastReviewDate(b))}` : " · never reviewed"}
        </div>

        {!revealed ? (
          <div style={{ marginTop: 26 }}>
            <div style={{ padding: 16, background: C.bg, borderRadius: 8, border: `1px solid ${C.line}` }}>
              <div style={{ font: `700 18px/1.4 ${display}`, marginBottom: 6 }}>First, from memory: what was the core idea?</div>
              <p style={{ color: C.muted, margin: 0, font: `400 15px/1.55 ${body}` }}>
                Say it out loud or think it through before you open the notes. The effort of retrieval is the part
                that works; reading the notes first skips it.
              </p>
            </div>
            <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Btn kind="solid" onClick={() => setRevealed(true)}>I've recalled it, show my notes</Btn>
              <Btn
                onClick={() => {
                  setPickedId(pick(finished, b.id)?.id ?? b.id);
                  setRevealed(false);
                }}
              >
                Different book
              </Btn>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 24 }}>
            {b.thesis && (<><Label>Thesis</Label><div style={{ marginBottom: 16 }}>{b.thesis}</div></>)}
            {b.topApplication && (<><Label>Top application</Label><div style={{ marginBottom: 16 }}>{b.topApplication}</div></>)}
            {b.keyIdeas && (<><Label>Key ideas</Label><div style={{ whiteSpace: "pre-wrap", marginBottom: 16 }}>{b.keyIdeas}</div></>)}
            {b.ifSituation && (
              <div style={{ padding: 12, borderLeft: `2px solid ${C.accent}`, marginBottom: 20, color: C.muted }}>
                IF {b.ifSituation}, THEN I will {b.thenAction}
              </div>
            )}

            <div style={{ padding: 16, background: C.bg, borderRadius: 8, border: `1px solid ${C.accent}` }}>
              <div style={{ font: `600 11px/1 ${mono}`, color: C.accent, letterSpacing: ".1em" }}>{p.type}</div>
              <div style={{ font: `700 18px/1.4 ${display}`, marginTop: 8 }}>{p.q}</div>
            </div>

            <div style={{ marginTop: 16 }}>
              <Label hint="optional, one line is plenty">Add to the notes</Label>
              <Field value={note} onChange={setNote} rows={3} />
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 18, flexWrap: "wrap" }}>
              <Btn
                kind="solid"
                onClick={() => {
                  onLog(b.id, p.type, note.trim());
                  setPickedId(pick(finished, b.id)?.id ?? b.id);
                  setRevealed(false);
                  setNote("");
                }}
              >
                Log review
              </Btn>
              <Btn
                onClick={() => {
                  setPickedId(pick(finished, b.id)?.id ?? b.id);
                  setRevealed(false);
                  setNote("");
                }}
              >
                Different book
              </Btn>
            </div>
          </div>
        )}
      </div>

      <div style={card}><ReadingStats books={finished} /></div>
    </div>
  );
}
