export type ReviewPromptType = "APPLY" | "SYNTHESIZE" | "UPDATE";

export interface Review {
  date: string; // YYYY-MM-DD
  type: ReviewPromptType;
  note: string;
}

export type ReflectionDepth = "quick" | "full";

/** A thought captured while listening. Timestamped; stored on its book. */
export interface Note {
  id: string;
  ts: string; // ISO timestamp the thought was captured
  text: string;
  src: "app" | "shortcut";
}

/** Absent means "finished": every book saved before capture-while-listening existed. */
export type BookStatus = "listening" | "finished";

export interface Book {
  id: string;
  title: string;
  author: string;
  dateFinished: string; // YYYY-MM-DD
  themes: string[];
  thesis: string;
  topApplication: string;
  applicability: number; // 1-5
  rating: number; // 1-5
  recall: string;
  keyIdeas: string;
  surprised: string;
  specifics: string;
  quotes: string;
  feynman: string;
  confirms: string;
  contradicts: string;
  links: string;
  decision: string;
  ifSituation: string;
  thenAction: string;
  preMortem: string;
  reviews: Review[];
  created: string; // ISO timestamp
  depth: ReflectionDepth;
  status?: BookStatus;
  finishedAt?: string; // ISO timestamp, set when marked finished
  notes?: Note[];
  /** id of the desktop draft already accepted, so "draft ready" clears. */
  draftAccepted?: string;
  /** ISO timestamp of the last edit; drives last-writer-wins in merge. */
  updated?: string;
}

export interface LibraryData {
  books: Book[];
  /** Deleted book ids -> when, so a delete on one device survives a merge. */
  deleted?: Record<string, string>;
  /** The book "Note" captures to by default (and where Shortcut notes land). */
  currentBookId?: string | null;
  /** When currentBookId was last chosen; the later choice wins in a merge. */
  currentAt?: string;
  /** Shortcut notes that arrived while no book was current. */
  looseNotes?: Note[];
  /** Shortcut start/finish command files already applied (they are not idempotent like notes). */
  inboxApplied?: string[];
}

/** Fields the desktop job drafts. All optional: it only fills what the notes support. */
export interface DraftFields {
  thesis?: string;
  topApplication?: string;
  keyIdeas?: string;
  surprised?: string;
  specifics?: string;
  quotes?: string;
  decision?: string;
  ifSituation?: string;
  thenAction?: string;
  themes?: string[];
}

export interface Draft {
  id: string; // changes whenever the draft is regenerated
  bookId: string;
  generatedAt: string;
  model: string;
  notesUsed: number;
  fields: DraftFields;
  /** Things the notes didn't settle; shown as questions, never as facts. */
  gaps: string[];
}

/** drafts.json: written only by the desktop job, read-only to the app. */
export interface DraftsFile {
  version: 1;
  generatedAt: string;
  drafts: Record<string, Draft>;
}
