export type ReviewPromptType = "APPLY" | "SYNTHESIZE" | "UPDATE";

export interface Review {
  date: string; // YYYY-MM-DD
  type: ReviewPromptType;
  note: string;
}

export type ReflectionDepth = "quick" | "full";

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
}

export interface LibraryData {
  books: Book[];
}
