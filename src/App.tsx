import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { C, body, display, mono } from "./constants";
import { blankBook, today, uid } from "./lib/utils";
import { loadLibrary, saveLibrary } from "./lib/storage";
import { finishBook, isListening, newNote, readyDrafts, startBook as startBookLib, withBooks, withCurrent } from "./lib/library";
import { useSync } from "./lib/useSync";
import { NoteSheet } from "./components/NoteSheet";
import { DraftReview } from "./components/DraftReview";
import { SettingsView } from "./components/SettingsView";
import { TabBar } from "./components/TabBar";
import type { Tab } from "./components/TabBar";
import { exportCSV, exportJSON, exportMD, importJSON } from "./lib/exports";
import { fetchSeedBooks } from "./lib/seed";
import { NowView } from "./views/NowView";
import { LibraryView } from "./views/LibraryView";
import { BookDetail } from "./views/BookDetail";
import { ReviewView } from "./views/ReviewView";
import { QuickForm } from "./views/QuickForm";
import { Wizard } from "./views/Wizard";
import { wrap } from "./views/ui";
import type { Book, LibraryData } from "./types";

type Overlay = "none" | "quick" | "wizard" | "settings" | "draft";
type SaveState = "idle" | "saving" | "saved" | "error";
interface Toast {
  msg: string;
  undo?: () => void;
}
interface Sheet {
  /** Open the sheet for this book (default: the current one). */
  bookId?: string;
  /** Marking this book finished with no notes: ask for one line first. */
  finishing?: string;
}

const SNOOZE_KEY = "ll-draft-snooze";
const SNOOZE_DAYS = 3;
const loadSnooze = (): Record<string, string> => {
  try {
    return JSON.parse(window.localStorage.getItem(SNOOZE_KEY) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
};

export default function App() {
  const [lib, setLib] = useState<LibraryData>(() => loadLibrary());
  const books = lib.books;
  const setBooks = useCallback((f: (prev: Book[]) => Book[]) => setLib((l) => withBooks(l, f(l.books))), []);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [tab, setTab] = useState<Tab>("now");
  const [overlay, setOverlay] = useState<Overlay>("none");
  const [draft, setDraft] = useState<Book | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [draftBookId, setDraftBookId] = useState<string | null>(null);
  const [snoozed, setSnoozed] = useState<Record<string, string>>(loadSnooze);
  const firstRun = useRef(true);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  /* persist on change */
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    setSaveState("saving");
    try {
      saveLibrary(lib);
      setSaveState("saved");
      const t = setTimeout(() => setSaveState("idle"), 1200);
      return () => clearTimeout(t);
    } catch {
      setSaveState("error");
    }
  }, [lib]);

  const show = useCallback((t: Toast, ms: number) => {
    clearTimeout(toastTimer.current);
    setToast(t);
    toastTimer.current = setTimeout(() => setToast(null), ms);
  }, []);
  const flash = useCallback((m: string) => show({ msg: m }, 2400), [show]);

  const sync = useSync(lib, setLib, flash);

  const upsert = (b: Book) =>
    setBooks((prev) => {
      const i = prev.findIndex((x) => x.id === b.id);
      if (i === -1) return [...prev, b];
      const copy = [...prev];
      copy[i] = b;
      return copy;
    });

  const active = books.find((b) => b.id === activeId) ?? null;
  const listening = useMemo(() => books.filter(isListening), [books]);
  const finishedBooks = useMemo(() => books.filter((b) => !isListening(b)), [books]);
  const draftBook = books.find((b) => b.id === draftBookId) ?? null;
  const bookDraft = draftBook && sync.drafts ? sync.drafts.drafts[draftBook.id] : null;

  const now = Date.now();
  const drafted = readyDrafts(books, sync.drafts)
    .filter((b) => !(snoozed[b.id] && new Date(snoozed[b.id]).getTime() > now))
    .sort((a, b) => ((a.finishedAt ?? a.created) < (b.finishedAt ?? b.created) ? -1 : 1));
  const waiting = finishedBooks.filter(
    (b) => (b.notes?.length ?? 0) > 0 && !b.draftAccepted && !(sync.drafts?.drafts[b.id]) && !(b.depth === "full" && b.recall.trim()),
  );

  /* ---------- capture while listening ---------- */

  const startBook = (title: string): string => {
    const id = uid();
    setLib((l) => startBookLib(l, title, id));
    return id;
  };

  const addNote = (bookId: string, text: string) => {
    const n = newNote(text);
    setLib((l) =>
      withCurrent(withBooks(l, l.books.map((b) => (b.id === bookId ? { ...b, notes: [...(b.notes ?? []), n] } : b))), bookId),
    );
    flash("Noted.");
  };

  const attachLoose = (noteId: string, bookId: string) =>
    setLib((l) => {
      const n = l.looseNotes?.find((x) => x.id === noteId);
      if (!n) return l;
      const next = withBooks(l, l.books.map((b) => (b.id === bookId ? { ...b, notes: [...(b.notes ?? []), n] } : b)));
      const rest = (l.looseNotes ?? []).filter((x) => x.id !== noteId);
      return { ...next, looseNotes: rest.length ? rest : undefined };
    });

  const markFinished = (id: string) => {
    setLib((l) => finishBook(l, id));
    flash("Finished. The draft reflection arrives tomorrow morning.");
  };

  /** Finished: with no notes there's nothing to draft from, so ask for one line first. */
  const onFinish = (id: string) => {
    const b = books.find((x) => x.id === id);
    if (b && !(b.notes?.length)) setSheet({ finishing: id });
    else markFinished(id);
  };

  const logReview = (bookId: string, type: "APPLY" | "SYNTHESIZE" | "UPDATE", note: string) => {
    const b = books.find((x) => x.id === bookId);
    if (!b) return;
    upsert({ ...b, reviews: [...b.reviews, { date: today(), type, note }] });
    flash("Review logged.");
  };

  const removeBook = (b: Book) => {
    setBooks((prev) => prev.filter((x) => x.id !== b.id));
    setActiveId(null);
    show({ msg: "Removed.", undo: () => upsert(b) }, 6000);
  };

  const snooze = (id: string) => {
    const next = { ...snoozed, [id]: new Date(Date.now() + SNOOZE_DAYS * 86400000).toISOString() };
    setSnoozed(next);
    try {
      window.localStorage.setItem(SNOOZE_KEY, JSON.stringify(next));
    } catch {
      /* the banner just comes back next open */
    }
    setOverlay("none");
    flash(`Okay, I'll ask again in ${SNOOZE_DAYS} days.`);
  };

  /* ---------- import/export ---------- */

  const doImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    importJSON(f)
      .then((imported) => {
        // Restore brings books back (and wins over older copies); it never deletes what's here.
        const stamp = new Date().toISOString();
        setBooks((prev) => {
          const byId = new Map(prev.map((b) => [b.id, b]));
          for (const b of imported) byId.set(b.id, { ...b, updated: stamp });
          return [...byId.values()];
        });
        flash(`Restored ${imported.length} books.`);
      })
      .catch((err: Error) => flash(err.message));
    e.target.value = "";
  };

  const loadStarterLibrary = () => {
    fetchSeedBooks()
      .then((seed) => {
        setBooks((prev) => {
          const byId = new Map(prev.map((b) => [b.id, b]));
          for (const b of seed) byId.set(b.id, b);
          return [...byId.values()];
        });
        flash(`Loaded ${seed.length} starter books.`);
      })
      .catch((err: Error) => flash(err.message));
  };

  /* ---------- add / edit forms ---------- */

  const set =
    <K extends keyof Book>(k: K) =>
    (v: Book[K]) =>
      setDraft((d) => (d ? { ...d, [k]: v } : d));

  const toggleTheme = (t: string) => set("themes")(draft && draft.themes.includes(t) ? draft.themes.filter((x) => x !== t) : [...(draft?.themes ?? []), t]);

  const openForm = (b: Book | null) => {
    setDraft(b ? { ...b } : { ...blankBook(), depth: "quick" });
    setOverlay("quick");
  };

  const saveDraft = (another: boolean) => {
    if (!draft) return;
    if (!draft.title.trim()) return flash("A title, at least.");
    const editing = books.some((b) => b.id === draft.id);
    upsert(draft);
    if (another) {
      setDraft({ ...blankBook(), depth: "quick" });
      flash("Saved. Next one.");
      return;
    }
    setOverlay("none");
    if (editing) setActiveId(draft.id);
    else setTab("library");
    flash(editing ? "Saved." : "Added to the library.");
  };

  const openNote = (bookId?: string) => {
    if (bookId) setLib((l) => withCurrent(l, bookId));
    setSheet({ bookId });
  };

  /* ---------- chrome ---------- */

  const onTab = (t: Tab) => {
    setTab(t);
    setActiveId(null);
    setOverlay("none");
  };
  const inTabs = overlay === "none" && !active;
  const syncLabel =
    saveState === "error" ? "save failed"
    : sync.state === "syncing" ? "syncing"
    : sync.state === "error" ? "sync error"
    : sync.state === "offline" ? "offline"
    : sync.state === "off" ? "connect"
    : saveState === "saving" ? "saving"
    : "synced";
  const syncColor = saveState === "error" || sync.state === "error" ? C.rose : sync.state === "offline" || sync.state === "off" ? C.amber : C.faint;
  const sheetBook = sheet?.finishing ? books.find((b) => b.id === sheet.finishing) : undefined;

  return (
    <div
      style={{
        minHeight: "100vh", background: C.bg, color: C.text, font: `400 16px/1.6 ${body}`,
        padding: "0 0 calc(96px + env(safe-area-inset-bottom, 0px))",
      }}
    >
      {/* header */}
      <div className="safe-top" style={{ borderBottom: `1px solid ${C.line}`, background: C.bg, position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ ...wrap, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px" }}>
          <button onClick={() => onTab("now")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" }}>
            <div style={{ font: `800 20px/1 ${display}`, color: C.text, letterSpacing: "-.02em" }}>Listening Log</div>
            <div style={{ font: `400 11px/1.4 ${mono}`, color: C.faint, letterSpacing: ".1em", marginTop: 3 }}>
              {finishedBooks.length} BOOKS{listening.length ? ` · ${listening.length} LISTENING` : ""}
            </div>
          </button>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button
              onClick={() => setOverlay("settings")}
              title="Dropbox sync and settings"
              style={{ background: "none", border: "none", cursor: "pointer", padding: "8px 6px", font: `400 11px/1 ${mono}`, color: syncColor }}
            >
              {syncLabel}
            </button>
            <button
              onClick={() => setOverlay("settings")}
              aria-label="Settings"
              style={{ background: "none", border: `1px solid ${C.line}`, borderRadius: 6, cursor: "pointer", padding: "7px 10px", color: C.muted, font: `400 16px/1 ${body}` }}
            >
              ⚙︎
            </button>
          </div>
        </div>
      </div>

      {toast && (
        <div
          className="safe-bottom"
          style={{
            position: "fixed", bottom: "calc(84px + env(safe-area-inset-bottom, 0px))", left: "50%", transform: "translateX(-50%)", zIndex: 70,
            background: C.surfaceHi, border: `1px solid ${C.accent}`, color: C.text, padding: "10px 16px", borderRadius: 8,
            font: `500 14px/1.3 ${body}`, display: "flex", gap: 14, alignItems: "center", maxWidth: "calc(100vw - 32px)",
          }}
        >
          <span>{toast.msg}</span>
          {toast.undo && (
            <button
              onClick={() => {
                toast.undo?.();
                setToast(null);
              }}
              style={{ background: "none", border: "none", color: C.accent, font: `700 14px ${body}`, cursor: "pointer", padding: 0 }}
            >
              Undo
            </button>
          )}
        </div>
      )}

      {/* ------------------------------ TABS ------------------------------ */}
      {inTabs && (
        <div style={{ ...wrap, paddingTop: 22 }}>
          {tab === "now" && (
            <NowView
              lib={lib}
              listening={listening}
              finished={finishedBooks}
              drafted={drafted}
              waiting={waiting}
              sync={sync}
              onOpenBook={setActiveId}
              onNote={openNote}
              onFinish={onFinish}
              onOpenDraft={(id) => {
                setDraftBookId(id);
                setOverlay("draft");
              }}
              onSnooze={snooze}
              onSetCurrent={(id) => setLib((l) => withCurrent(l, id))}
              onAttachLoose={attachLoose}
              onSettings={() => setOverlay("settings")}
              onStarter={loadStarterLibrary}
            />
          )}
          {tab === "library" && <LibraryView books={finishedBooks} onOpen={setActiveId} onAdd={() => openForm(null)} />}
          {tab === "review" && <ReviewView finished={finishedBooks} onLog={logReview} />}
        </div>
      )}

      {/* ------------------------------ DETAIL ------------------------------ */}
      {overlay === "none" && active && (
        <div style={wrap}>
          <BookDetail
            book={active}
            onBack={() => setActiveId(null)}
            onNote={() => openNote(active.id)}
            onFinish={() => onFinish(active.id)}
            onEdit={() => openForm(active)}
            onDelete={() => removeBook(active)}
          />
        </div>
      )}

      {/* ------------------------------ FORMS ------------------------------ */}
      {overlay === "quick" && draft && (
        <div style={wrap}>
          <QuickForm
            draft={draft}
            editing={books.some((b) => b.id === draft.id)}
            set={set}
            toggleTheme={toggleTheme}
            onSave={() => saveDraft(false)}
            onAnother={() => saveDraft(true)}
            onCancel={() => setOverlay("none")}
            onFull={() => setOverlay("wizard")}
          />
        </div>
      )}
      {overlay === "wizard" && draft && (
        <div style={wrap}>
          <Wizard draft={draft} set={set} toggleTheme={toggleTheme} onSave={() => saveDraft(false)} onCancel={() => setOverlay("quick")} />
        </div>
      )}

      {/* ------------------------------ SETTINGS / DRAFT ------------------------------ */}
      {overlay === "settings" && (
        <div style={wrap}>
          <SettingsView
            sync={sync}
            onBack={() => setOverlay("none")}
            flash={flash}
            data={{
              onCSV: () => exportCSV(finishedBooks),
              onMarkdown: () => exportMD(books),
              onBackup: () => exportJSON(lib),
              onRestore: doImport,
              onStarter: loadStarterLibrary,
            }}
          />
        </div>
      )}
      {overlay === "draft" && draftBook && bookDraft && (
        <div style={wrap}>
          <DraftReview
            key={bookDraft.id}
            book={draftBook}
            draft={bookDraft}
            onCancel={() => setOverlay("none")}
            onSnooze={() => snooze(draftBook.id)}
            onAccept={(b) => {
              upsert(b);
              setOverlay("none");
              flash("Reflection saved.");
            }}
          />
        </div>
      )}

      {/* ------------------------------ ONE-TAP NOTE + TABS ------------------------------ */}
      {!sheet && overlay !== "draft" && overlay !== "settings" && overlay !== "quick" && overlay !== "wizard" && (
        <button
          onClick={() => openNote()}
          style={{
            position: "fixed", right: 20, bottom: "calc(76px + env(safe-area-inset-bottom, 0px))", zIndex: 40,
            background: C.accent, color: "#0C1116", border: "none", borderRadius: 28, padding: "16px 22px",
            font: `700 15px/1 ${body}`, cursor: "pointer", boxShadow: "0 4px 16px rgba(0,0,0,.4)",
          }}
        >
          ✎ Note
        </button>
      )}
      {overlay === "none" && !active && <TabBar tab={tab} onTab={onTab} />}

      {sheet && (
        <NoteSheet
          key={sheet.finishing ?? sheet.bookId ?? "any"}
          listening={listening}
          currentId={sheet.bookId ?? lib.currentBookId ?? null}
          finishing={sheetBook}
          onSave={(id, text) => {
            addNote(id, text);
            if (sheet.finishing) markFinished(sheet.finishing);
          }}
          onStartBook={startBook}
          onSkip={() => {
            if (sheet.finishing) markFinished(sheet.finishing);
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  );
}
