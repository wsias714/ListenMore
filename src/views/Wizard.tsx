import { useState } from "react";
import { C, STEPS, body, display, mono } from "../constants";
import { Btn, Field, Input, Label, Stars, ThemePicker } from "../components/atoms";
import type { Book } from "../types";
import { card } from "./ui";

/** The full six-step reflection. Reached from "Full reflection →" on the quick form. */
export function Wizard({
  draft, set, toggleTheme, onSave, onCancel,
}: {
  draft: Book;
  set: <K extends keyof Book>(k: K) => (v: Book[K]) => void;
  toggleTheme: (t: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState(0);
  return (
    <div style={{ paddingTop: 26 }}>
      <Btn kind="quiet" onClick={onCancel}>← Cancel</Btn>

      <div style={{ display: "flex", gap: 4, margin: "16px 0 20px" }}>
        {STEPS.map((s, i) => (
          <button
            key={s.n}
            onClick={() => setStep(i)}
            style={{
              flex: 1, height: 3, border: "none", padding: 0, cursor: "pointer",
              background: i <= step ? C.accent : C.line,
            }}
            aria-label={s.n}
          />
        ))}
      </div>

      <div style={card}>
        <div style={{ font: `400 11px/1 ${mono}`, color: C.faint, letterSpacing: ".1em" }}>
          STEP {step + 1} OF 6 · {STEPS[step].hint.toUpperCase()}
        </div>
        <div style={{ font: `800 26px/1.2 ${display}`, letterSpacing: "-.02em", margin: "8px 0 20px" }}>{STEPS[step].n}</div>

        {step === 0 && (
          <div style={{ display: "grid", gap: 16 }}>
            <div>
              <Label>Title</Label>
              <Input value={draft.title} onChange={set("title")} />
            </div>
            <div>
              <Label>Author</Label>
              <Input value={draft.author} onChange={set("author")} />
            </div>
            <div>
              <Label>Finished</Label>
              <Input type="date" value={draft.dateFinished} onChange={set("dateFinished")} />
            </div>
            <div style={{ padding: 12, background: C.bg, borderRadius: 6, color: C.muted, font: `400 14px/1.5 ${body}` }}>
              Close Audible. Everything below comes from memory only — that act of retrieval is what
              makes it stick.
            </div>
            <div>
              <Label>Core argument, one sentence</Label>
              <Field value={draft.recall} onChange={set("recall")} rows={2} />
            </div>
            <div>
              <Label>Three to five ideas you remember</Label>
              <Field value={draft.keyIdeas} onChange={set("keyIdeas")} rows={5} />
            </div>
            <div>
              <Label>What surprised you or changed your mind</Label>
              <Field value={draft.surprised} onChange={set("surprised")} rows={2} />
            </div>
          </div>
        )}

        {step === 1 && (
          <div style={{ display: "grid", gap: 16 }}>
            <div style={{ padding: 12, background: C.bg, borderRadius: 6, color: C.muted, font: `400 14px/1.5 ${body}` }}>
              Now open your Audible clips and bookmarks. Fill in the specifics your memory dropped —
              numbers, frameworks, caveats. Your words, not the author's.
            </div>
            <div>
              <Label>Specifics</Label>
              <Field value={draft.specifics} onChange={set("specifics")} rows={6} />
            </div>
            <div>
              <Label hint="one to three, with rough chapter">Quotes worth keeping</Label>
              <Field value={draft.quotes} onChange={set("quotes")} rows={4} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: "grid", gap: 16 }}>
            <div style={{ padding: 12, background: C.bg, borderRadius: 6, color: C.muted, font: `400 14px/1.5 ${body}` }}>
              Explain the most important idea to a smart colleague who hasn't read it. Where you get
              stuck is where you don't actually understand it yet.
            </div>
            <div>
              <Label>In plain language</Label>
              <Field value={draft.feynman} onChange={set("feynman")} rows={7} />
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ display: "grid", gap: 16 }}>
            <div>
              <Label>This confirms what I already believed about…</Label>
              <Field value={draft.confirms} onChange={set("confirms")} rows={2} />
            </div>
            <div>
              <Label>This contradicts or complicates…</Label>
              <Field value={draft.contradicts} onChange={set("contradicts")} rows={2} />
            </div>
            <div>
              <Label hint="name them">Other books or ideas this links to</Label>
              <Field value={draft.links} onChange={set("links")} rows={2} />
            </div>
          </div>
        )}

        {step === 4 && (
          <div style={{ display: "grid", gap: 16 }}>
            <div>
              <Label>One decision — work or life — you'd make differently</Label>
              <Field value={draft.decision} onChange={set("decision")} rows={3} />
            </div>
            <div>
              <Label hint="the highest-leverage thing on this page">Implementation intention</Label>
              <div style={{ display: "grid", gap: 8 }}>
                <Input value={draft.ifSituation} onChange={set("ifSituation")} placeholder="IF this specific situation happens…" />
                <Input value={draft.thenAction} onChange={set("thenAction")} placeholder="THEN I will take this specific action." />
              </div>
            </div>
            <div>
              <Label hint="only if this prompts a real decision">Pre-mortem</Label>
              <Field
                value={draft.preMortem}
                onChange={set("preMortem")}
                rows={3}
                placeholder="It's a year from now and acting on this backfired. Why?"
              />
            </div>
          </div>
        )}

        {step === 5 && (
          <div style={{ display: "grid", gap: 16 }}>
            <div>
              <Label hint="goes on the index">One-line thesis</Label>
              <Field value={draft.thesis} onChange={set("thesis")} rows={2} />
            </div>
            <div>
              <Label>Top application</Label>
              <Field value={draft.topApplication} onChange={set("topApplication")} rows={2} />
            </div>
            <div>
              <Label>Themes</Label>
              <ThemePicker selected={draft.themes} onToggle={toggleTheme} />
            </div>
            <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
              <div>
                <Label>Applicability</Label>
                <Stars value={draft.applicability} onChange={set("applicability")} />
              </div>
              <div>
                <Label>Rating</Label>
                <Stars value={draft.rating} onChange={set("rating")} glyph="★" />
              </div>
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 26, justifyContent: "space-between" }}>
          <Btn onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>Back</Btn>
          {step < 5 ? (
            <Btn kind="solid" onClick={() => setStep((s) => s + 1)}>Next</Btn>
          ) : (
            <Btn kind="solid" onClick={onSave}>Save reflection</Btn>
          )}
        </div>
      </div>
    </div>
  );
}
