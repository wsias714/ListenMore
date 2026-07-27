import { useEffect, useMemo, useRef, useState } from "react";
import { C, STEPS, display, body, mono, REVIEW_DUE_DAYS, PROMPTS } from "./constants";
import { blankBook, daysSince, fmt, lastReviewDate, today } from "./lib/utils";
import { loadBooks, saveBooks } from "./lib/storage";
import { exportCSV, exportJSON, exportMD, importJSON } from "./lib/exports";
import { Btn, Field, Input, Label, Stars, ThemePicker } from "./components/atoms";
import { Spectrum, Ticks } from "./components/Spectrum";
import type { Book, ReflectionDepth } from "./types";

type View = "library" | "quick" | "wizard" | "review";
type SaveState = "idle" | "saving" | "saved" | "error";

export default function App() {
  const [books, setBooks] = useState<Book[]>(() => loadBooks());
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [view, setView] = useState<View>("library");
  const [draft, setDraft] = useState<Book | null>(null);
  const [step, setStep] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [themeFilter, setThemeFilter] = useState<string | null>(null);
  const [reviewBook, setReviewBook] = useState<Book | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [reviewNote, setReviewNote] = useState("");
  const [toast, setToast] = useState("");
  const firstRun = useRef(true);

  /* persist on change */
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    setSaveState("saving");
    try {
      saveBooks(books);
      setSaveState("saved");
      const t = setTimeout(() => setSaveState("idle"), 1200);
      return () => clearTimeout(t);
    } catch {
      setSaveState("error");
    }
  }, [books]);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 2200);
  };

  const upsert = (b: Book) =>
    setBooks((prev) => {
      const i = prev.findIndex((x) => x.id === b.id);
      if (i === -1) return [...prev, b];
      const copy = [...prev];
      copy[i] = b;
      return copy;
    });

  const remove = (id: string) => setBooks((prev) => prev.filter((b) => b.id !== id));

  const active = books.find((b) => b.id === activeId) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return books
      .filter((b) => !themeFilter || b.themes.includes(themeFilter))
      .filter(
        (b) =>
          !q ||
          [b.title, b.author, b.thesis, b.topApplication, b.themes.join(" "), b.keyIdeas, b.decision]
            .join(" ")
            .toLowerCase()
            .includes(q),
      )
      .sort((a, b) => (a.dateFinished < b.dateFinished ? 1 : -1));
  }, [books, query, themeFilter]);

  const dueCount = books.filter((b) => {
    const age = daysSince(lastReviewDate(b));
    return age === null || age > REVIEW_DUE_DAYS;
  }).length;

  /* weighted pick: oldest-reviewed half, then random */
  const startReview = () => {
    if (!books.length) return flash("Add a book first.");
    const ranked = [...books].sort((a, b) => {
      const la = lastReviewDate(a) ?? "0000";
      const lb = lastReviewDate(b) ?? "0000";
      return la < lb ? -1 : 1;
    });
    const pool = ranked.slice(0, Math.max(1, Math.ceil(ranked.length / 2)));
    setReviewBook(pool[Math.floor(Math.random() * pool.length)]);
    setRevealed(false);
    setReviewNote("");
    setView("review");
  };

  const logReview = (promptType: (typeof PROMPTS)[number]["type"]) => {
    if (!reviewBook) return;
    const b = books.find((x) => x.id === reviewBook.id);
    if (!b) return;
    upsert({ ...b, reviews: [...b.reviews, { date: today(), type: promptType, note: reviewNote.trim() }] });
    flash("Review logged.");
    setView("library");
  };

  /* ---------- import/export ---------- */

  const doImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    importJSON(f)
      .then((imported) => {
        setBooks(imported);
        flash(`Restored ${imported.length} books.`);
      })
      .catch((err: Error) => flash(err.message));
    e.target.value = "";
  };

  /* ---------- wizard ---------- */

  const set =
    <K extends keyof Book>(k: K) =>
    (v: Book[K]) =>
      setDraft((d) => (d ? { ...d, [k]: v } : d));

  const openWizard = (bookOrNull: Book | null, depth: ReflectionDepth = "full") => {
    setDraft(bookOrNull ? { ...bookOrNull } : { ...blankBook(), depth });
    setStep(0);
    setView(depth === "quick" ? "quick" : "wizard");
  };

  const finishWizard = () => {
    if (!draft) return;
    if (!draft.title.trim()) return flash("A title, at least.");
    upsert(draft);
    setView("library");
    flash(draft.depth === "quick" ? "Added to the library." : "Reflection saved.");
  };

  const toggleTheme = (t: string) =>
    set("themes")(draft && draft.themes.includes(t) ? draft.themes.filter((x) => x !== t) : [...(draft?.themes ?? []), t]);

  /* ---------- chrome ---------- */

  const shell: React.CSSProperties = {
    minHeight: "100vh", background: C.bg, color: C.text, font: `400 16px/1.6 ${body}`,
    padding: "0 0 80px",
  };
  const wrap: React.CSSProperties = { maxWidth: 780, margin: "0 auto", padding: "0 20px" };
  const card: React.CSSProperties = { background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: 18 };

  return (
    <div style={shell}>
      {/* header */}
      <div style={{ borderBottom: `1px solid ${C.line}`, background: C.bg, position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ ...wrap, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px" }}>
          <button
            onClick={() => {
              setView("library");
              setActiveId(null);
            }}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" }}
          >
            <div style={{ font: `800 20px/1 ${display}`, color: C.text, letterSpacing: "-.02em" }}>Listening Log</div>
            <div style={{ font: `400 11px/1.4 ${mono}`, color: C.faint, letterSpacing: ".1em", marginTop: 3 }}>
              {books.length} BOOKS · {dueCount} DUE
            </div>
          </button>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ font: `400 11px/1 ${mono}`, color: saveState === "error" ? C.rose : C.faint }}>
              {saveState === "saving" ? "saving" : saveState === "saved" ? "saved" : saveState === "error" ? "save failed" : ""}
            </span>
            <Btn onClick={startReview}>Review</Btn>
            <Btn kind="solid" onClick={() => openWizard(null, "full")}>+ Book</Btn>
          </div>
        </div>
      </div>

      {toast && (
        <div
          style={{
            position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 50,
            background: C.surfaceHi, border: `1px solid ${C.accent}`, color: C.text,
            padding: "10px 16px", borderRadius: 8, font: `500 14px/1 ${body}`,
          }}
        >
          {toast}
        </div>
      )}

      {/* ------------------------------ LIBRARY ------------------------------ */}
      {view === "library" && !active && (
        <div style={{ ...wrap, paddingTop: 26 }}>
          {books.length === 0 ? (
            <div style={{ ...card, textAlign: "center", padding: "48px 24px" }}>
              <div style={{ font: `700 26px/1.2 ${display}`, marginBottom: 10, letterSpacing: "-.02em" }}>
                Nothing logged yet.
              </div>
              <p style={{ color: C.muted, maxWidth: 460, margin: "0 auto 22px" }}>
                Start with the ten you've already finished. Quick add takes about two minutes each —
                thesis, one action, done. Full reflections come later, for books you're still listening to.
              </p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                <Btn kind="solid" onClick={() => openWizard(null, "quick")}>Quick add a finished book</Btn>
                <Btn onClick={() => openWizard(null, "full")}>Full reflection</Btn>
              </div>
            </div>
          ) : (
            <>
              <Spectrum books={books} onPick={setActiveId} activeId={activeId} />
              <div
                style={{
                  display: "flex", justifyContent: "space-between", font: `400 11px/1 ${mono}`,
                  color: C.faint, letterSpacing: ".08em", marginBottom: 22,
                }}
              >
                <span>OLDEST</span>
                <span style={{ color: C.amber }}>▮ DUE FOR REVIEW</span>
                <span>NEWEST</span>
              </div>

              <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 220px" }}>
                  <Input value={query} onChange={setQuery} placeholder="Search titles, ideas, actions…" />
                </div>
                <Btn kind="quiet" onClick={() => openWizard(null, "quick")}>Quick add</Btn>
              </div>

              {themeFilter && (
                <div style={{ marginBottom: 14 }}>
                  <Btn kind="quiet" onClick={() => setThemeFilter(null)}>✕ clear filter: {themeFilter}</Btn>
                </div>
              )}

              <div style={{ display: "grid", gap: 10 }}>
                {filtered.map((b) => {
                  const age = daysSince(lastReviewDate(b));
                  const cold = age === null || age > REVIEW_DUE_DAYS;
                  return (
                    <button
                      key={b.id}
                      onClick={() => setActiveId(b.id)}
                      style={{ ...card, textAlign: "left", cursor: "pointer", width: "100%", display: "block" }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
                        <div style={{ font: `700 18px/1.25 ${display}`, color: C.text, letterSpacing: "-.01em" }}>
                          {b.title}
                        </div>
                        <div style={{ font: `400 11px/1 ${mono}`, color: cold ? C.amber : C.faint, whiteSpace: "nowrap" }}>
                          {cold ? "DUE" : `${age}d`}
                        </div>
                      </div>
                      <div style={{ font: `400 13px/1.4 ${body}`, color: C.muted, marginTop: 2 }}>
                        {b.author || "—"} · finished {fmt(b.dateFinished)}
                      </div>
                      {b.thesis && <div style={{ marginTop: 10, color: C.text, font: `400 15px/1.5 ${body}` }}>{b.thesis}</div>}
                      {b.topApplication && (
                        <div
                          style={{
                            marginTop: 8, paddingLeft: 10, borderLeft: `2px solid ${C.accent}`,
                            color: C.muted, font: `400 14px/1.5 ${body}`,
                          }}
                        >
                          {b.topApplication}
                        </div>
                      )}
                      <div style={{ marginTop: 12 }}>
                        <Ticks book={b} />
                      </div>
                      <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                        {b.themes.map((t) => (
                          <span
                            key={t}
                            onClick={(e) => {
                              e.stopPropagation();
                              setThemeFilter(t);
                            }}
                            style={{
                              font: `500 11px/1 ${mono}`, color: C.muted, border: `1px solid ${C.line}`,
                              padding: "5px 8px", borderRadius: 20,
                            }}
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </button>
                  );
                })}
                {filtered.length === 0 && (
                  <div style={{ ...card, color: C.muted, textAlign: "center" }}>No book matches that. Try a broader term.</div>
                )}
              </div>

              <div style={{ marginTop: 34, paddingTop: 20, borderTop: `1px solid ${C.line}`, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Btn onClick={() => exportCSV(books)}>Export index (CSV)</Btn>
                <Btn onClick={() => exportMD(books)}>Export notes (Markdown)</Btn>
                <Btn kind="quiet" onClick={() => exportJSON(books)}>Back up</Btn>
                <label
                  style={{
                    font: `600 13px/1 ${body}`, color: C.muted, padding: "11px 16px",
                    border: "1px solid transparent", cursor: "pointer",
                  }}
                >
                  Restore
                  <input type="file" accept="application/json" onChange={doImport} style={{ display: "none" }} />
                </label>
              </div>
            </>
          )}
        </div>
      )}

      {/* ------------------------------ DETAIL ------------------------------ */}
      {active && view === "library" && (
        <div style={{ ...wrap, paddingTop: 26 }}>
          <Btn kind="quiet" onClick={() => setActiveId(null)}>← Library</Btn>
          <div style={{ ...card, marginTop: 14 }}>
            <div style={{ font: `800 28px/1.15 ${display}`, letterSpacing: "-.025em" }}>{active.title}</div>
            <div style={{ color: C.muted, marginTop: 4 }}>
              {active.author} · finished {fmt(active.dateFinished)} · reviewed {active.reviews.length}×
            </div>
            <div style={{ display: "flex", gap: 20, marginTop: 14, font: `400 12px/1 ${mono}`, color: C.faint }}>
              <span>APPLICABILITY {active.applicability}/5</span>
              <span>RATING {active.rating}/5</span>
            </div>

            {(
              [
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
              ] as [string, string][]
            )
              .filter(([, v]) => v && String(v).trim())
              .map(([k, v]) => (
                <div key={k} style={{ marginTop: 18 }}>
                  <Label>{k}</Label>
                  <div style={{ whiteSpace: "pre-wrap", color: C.text }}>{v}</div>
                </div>
              ))}

            {active.reviews.length > 0 && (
              <div style={{ marginTop: 22, paddingTop: 16, borderTop: `1px solid ${C.line}` }}>
                <Label>Review log</Label>
                {active.reviews.map((r, i) => (
                  <div key={i} style={{ marginTop: 8, font: `400 14px/1.5 ${body}` }}>
                    <span style={{ font: `600 11px/1 ${mono}`, color: C.accent }}>
                      {r.date} · {r.type}
                    </span>
                    {r.note && <div style={{ color: C.muted, marginTop: 3 }}>{r.note}</div>}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 24, flexWrap: "wrap" }}>
              <Btn kind="solid" onClick={() => openWizard(active, "full")}>Edit reflection</Btn>
              <Btn
                kind="warn"
                onClick={() => {
                  remove(active.id);
                  setActiveId(null);
                  flash("Removed.");
                }}
              >
                Delete
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------ QUICK ADD ------------------------------ */}
      {view === "quick" && draft && (
        <div style={{ ...wrap, paddingTop: 26 }}>
          <Btn kind="quiet" onClick={() => setView("library")}>← Cancel</Btn>
          <div style={{ ...card, marginTop: 14 }}>
            <div style={{ font: `800 24px/1.2 ${display}`, letterSpacing: "-.02em" }}>Quick add</div>
            <p style={{ color: C.muted, marginTop: 6, marginBottom: 22 }}>
              For books you finished a while ago. Write from memory first — if you can't recall the thesis,
              that's useful information. Two minutes, then move on.
            </p>

            <div style={{ display: "grid", gap: 16 }}>
              <div>
                <Label>Title</Label>
                <Input value={draft.title} onChange={set("title")} placeholder="Thinking in Bets" />
              </div>
              <div>
                <Label>Author</Label>
                <Input value={draft.author} onChange={set("author")} placeholder="Annie Duke" />
              </div>
              <div>
                <Label>Finished</Label>
                <Input type="date" value={draft.dateFinished} onChange={set("dateFinished")} />
              </div>
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

            <div style={{ display: "flex", gap: 8, marginTop: 26 }}>
              <Btn kind="solid" onClick={finishWizard}>Add to library</Btn>
              <Btn
                onClick={() => {
                  if (draft) upsert(draft);
                  setDraft({ ...blankBook(), depth: "quick" });
                  flash("Saved. Next one.");
                }}
              >
                Save &amp; add another
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------ FULL WIZARD ------------------------------ */}
      {view === "wizard" && draft && (
        <div style={{ ...wrap, paddingTop: 26 }}>
          <Btn kind="quiet" onClick={() => setView("library")}>← Cancel</Btn>

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
                <Btn kind="solid" onClick={finishWizard}>Save reflection</Btn>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------ REVIEW ------------------------------ */}
      {view === "review" &&
        reviewBook &&
        (() => {
          const promptIdx = reviewBook.reviews.length % 3;
          const p = PROMPTS[promptIdx];
          const b = books.find((x) => x.id === reviewBook.id) || reviewBook;
          return (
            <div style={{ ...wrap, paddingTop: 26 }}>
              <Btn kind="quiet" onClick={() => setView("library")}>← Library</Btn>
              <div style={{ ...card, marginTop: 14 }}>
                <div style={{ font: `400 11px/1 ${mono}`, color: C.amber, letterSpacing: ".1em" }}>THIS WEEK'S BOOK</div>
                <div style={{ font: `800 30px/1.15 ${display}`, letterSpacing: "-.025em", margin: "8px 0 2px" }}>{b.title}</div>
                <div style={{ color: C.muted }}>
                  {b.author} · finished {fmt(b.dateFinished)}
                  {b.reviews.length ? ` · last reviewed ${fmt(b.reviews[b.reviews.length - 1].date)}` : " · never reviewed"}
                </div>

                {!revealed ? (
                  <div style={{ marginTop: 26 }}>
                    <div style={{ padding: 16, background: C.bg, borderRadius: 8, border: `1px solid ${C.line}` }}>
                      <div style={{ font: `700 18px/1.4 ${display}`, marginBottom: 6 }}>First, from memory: what was the core idea?</div>
                      <p style={{ color: C.muted, margin: 0, font: `400 15px/1.55 ${body}` }}>
                        Say it out loud or think it through before you open the notes. The effort of
                        retrieval is the part that works — reading the notes first skips it.
                      </p>
                    </div>
                    <div style={{ marginTop: 16 }}>
                      <Btn kind="solid" onClick={() => setRevealed(true)}>I've recalled it — show my notes</Btn>
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: 24 }}>
                    {b.thesis && (
                      <>
                        <Label>Thesis</Label>
                        <div style={{ marginBottom: 16 }}>{b.thesis}</div>
                      </>
                    )}
                    {b.keyIdeas && (
                      <>
                        <Label>Key ideas</Label>
                        <div style={{ whiteSpace: "pre-wrap", marginBottom: 16 }}>{b.keyIdeas}</div>
                      </>
                    )}
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
                      <Label hint="optional — one line is plenty">Add to the notes</Label>
                      <Field value={reviewNote} onChange={setReviewNote} rows={3} />
                    </div>

                    <div style={{ display: "flex", gap: 8, marginTop: 18, flexWrap: "wrap" }}>
                      <Btn kind="solid" onClick={() => logReview(p.type)}>Log review</Btn>
                      <Btn onClick={startReview}>Different book</Btn>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
    </div>
  );
}
