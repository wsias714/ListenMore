import { C, body, display, mono } from "../constants";
import { fmtStamp, isListening } from "../lib/library";
import { fmt } from "../lib/utils";
import { Btn, Label } from "../components/atoms";
import type { Book } from "../types";
import { card } from "./ui";

export function BookDetail({
  book: active, onBack, onNote, onFinish, onEdit, onDelete,
}: {
  book: Book;
  onBack: () => void;
  onNote: () => void;
  onFinish: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const fields: [string, string][] = [
    ["One-line thesis", active.thesis],
    ["Top application", active.topApplication],
    ["From memory", active.recall],
    ["Key ideas", active.keyIdeas],
    ["What surprised me", active.surprised],
    ["Specifics", active.specifics],
    ["Quotes", active.quotes],
    ["Explained simply", active.feynman],
    ["Confirms", active.confirms],
    ["Contradicts", active.contradicts],
    ["Links to", active.links],
    ["Decision I'd make differently", active.decision],
    ["Implementation intention", active.ifSituation ? `IF ${active.ifSituation}, THEN I will ${active.thenAction}` : ""],
    ["Pre-mortem", active.preMortem],
  ];
  return (
    <div style={{ paddingTop: 26 }}>
      <Btn kind="quiet" onClick={onBack}>← Back</Btn>
      <div style={{ ...card, marginTop: 14 }}>
        <div style={{ font: `800 28px/1.15 ${display}`, letterSpacing: "-.025em" }}>{active.title}</div>
        <div style={{ color: C.muted, marginTop: 4 }}>
          {active.author ? `${active.author} · ` : ""}
          {isListening(active) ? "listening now" : `finished ${fmt(active.dateFinished)} · reviewed ${active.reviews.length}×`}
        </div>
        {!isListening(active) && (
          <div style={{ display: "flex", gap: 20, marginTop: 14, font: `400 12px/1 ${mono}`, color: C.faint }}>
            <span>APPLICABILITY {active.applicability}/5</span>
            <span>RATING {active.rating}/5</span>
          </div>
        )}

        {fields
          .filter(([, v]) => v && String(v).trim())
          .map(([k, v]) => (
            <div key={k} style={{ marginTop: 18 }}>
              <Label>{k}</Label>
              <div style={{ whiteSpace: "pre-wrap", color: C.text }}>{v}</div>
            </div>
          ))}

        {(active.notes?.length ?? 0) > 0 && (
          <div style={{ marginTop: 22, paddingTop: 16, borderTop: `1px solid ${C.line}` }}>
            <Label>Notes while listening</Label>
            {active.notes!.map((n) => (
              <div key={n.id} style={{ marginTop: 10, font: `400 14px/1.5 ${body}` }}>
                <span style={{ font: `600 11px/1 ${mono}`, color: C.accent }}>
                  {fmtStamp(n.ts)}{n.src === "shortcut" ? " · shortcut" : ""}
                </span>
                <div style={{ color: C.text, whiteSpace: "pre-wrap" }}>{n.text}</div>
              </div>
            ))}
          </div>
        )}

        {active.reviews.length > 0 && (
          <div style={{ marginTop: 22, paddingTop: 16, borderTop: `1px solid ${C.line}` }}>
            <Label>Review log</Label>
            {active.reviews.map((r, i) => (
              <div key={i} style={{ marginTop: 8, font: `400 14px/1.5 ${body}` }}>
                <span style={{ font: `600 11px/1 ${mono}`, color: C.accent }}>{r.date} · {r.type}</span>
                {r.note && <div style={{ color: C.muted, marginTop: 3 }}>{r.note}</div>}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 24, flexWrap: "wrap" }}>
          {isListening(active) ? (
            <>
              <Btn kind="solid" onClick={onNote}>+ Note</Btn>
              <Btn onClick={onFinish}>Finished</Btn>
            </>
          ) : (
            <Btn kind="solid" onClick={onEdit}>Edit</Btn>
          )}
          <Btn kind="warn" onClick={onDelete}>Delete</Btn>
        </div>
      </div>
    </div>
  );
}
