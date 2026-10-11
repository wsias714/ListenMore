import { C, body, display } from "../constants";
import { Btn, Field, Input, Label, Stars, ThemePicker } from "../components/atoms";
import type { Book } from "../types";
import { card } from "./ui";

/** Add or edit a finished book in one screen. The 6-step wizard is a link away, never the default. */
export function QuickForm({
  draft, editing, set, toggleTheme, onSave, onAnother, onCancel, onFull,
}: {
  draft: Book;
  editing: boolean;
  set: <K extends keyof Book>(k: K) => (v: Book[K]) => void;
  toggleTheme: (t: string) => void;
  onSave: () => void;
  onAnother: () => void;
  onCancel: () => void;
  onFull: () => void;
}) {
  return (
    <div style={{ paddingTop: 26 }}>
      <Btn kind="quiet" onClick={onCancel}>← Cancel</Btn>
      <div style={{ ...card, marginTop: 14 }}>
        <div style={{ font: `800 24px/1.2 ${display}`, letterSpacing: "-.02em" }}>{editing ? "Edit" : "Add a finished book"}</div>
        <p style={{ color: C.muted, marginTop: 6, marginBottom: 22, font: `400 15px/1.55 ${body}` }}>
          Write from memory first. If you can't recall the thesis, that's useful information. Two minutes, then move on.
        </p>

        <div style={{ display: "grid", gap: 16 }}>
          <div><Label>Title</Label><Input value={draft.title} onChange={set("title")} placeholder="Thinking in Bets" /></div>
          <div><Label>Author</Label><Input value={draft.author} onChange={set("author")} placeholder="Annie Duke" /></div>
          <div><Label>Finished</Label><Input type="date" value={draft.dateFinished} onChange={set("dateFinished")} /></div>
          <div>
            <Label hint="what's the core argument, in one sentence?">Thesis</Label>
            <Field value={draft.thesis} onChange={set("thesis")} rows={2} placeholder="Good decisions and good outcomes are different things…" />
          </div>
          <div>
            <Label hint="the one thing you'd actually do">Top application</Label>
            <Field value={draft.topApplication} onChange={set("topApplication")} rows={2} placeholder="Separate decision quality from outcome when reviewing trades." />
          </div>
          <div>
            <Label hint="if / then">Implementation intention</Label>
            <div style={{ display: "grid", gap: 8 }}>
              <Input value={draft.ifSituation} onChange={set("ifSituation")} placeholder="IF a position loses money…" />
              <Input value={draft.thenAction} onChange={set("thenAction")} placeholder="THEN I will ask whether the process was wrong or just the result." />
            </div>
          </div>
          <div><Label>Themes</Label><ThemePicker selected={draft.themes} onToggle={toggleTheme} /></div>
          <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
            <div><Label>Applicability</Label><Stars value={draft.applicability} onChange={set("applicability")} /></div>
            <div><Label>Rating</Label><Stars value={draft.rating} onChange={set("rating")} glyph="★" /></div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 26, flexWrap: "wrap" }}>
          <Btn kind="solid" onClick={onSave}>{editing ? "Save" : "Add to library"}</Btn>
          {!editing && <Btn onClick={onAnother}>Save &amp; add another</Btn>}
          <Btn kind="quiet" onClick={onFull}>Full reflection →</Btn>
        </div>
      </div>
    </div>
  );
}
