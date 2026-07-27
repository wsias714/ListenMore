import type { Book } from "../types";

export const uid = () => Math.random().toString(36).slice(2, 10);

export const today = () => new Date().toISOString().slice(0, 10);

export const daysSince = (d: string | null | undefined): number | null =>
  d ? Math.floor((Date.now() - new Date(d + "T12:00:00").getTime()) / 86400000) : null;

export const fmt = (d: string | null | undefined): string =>
  d
    ? new Date(d + "T12:00:00").toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

export const blankBook = (): Book => ({
  id: uid(),
  title: "",
  author: "",
  dateFinished: today(),
  themes: [],
  thesis: "",
  topApplication: "",
  applicability: 3,
  rating: 3,
  recall: "",
  keyIdeas: "",
  surprised: "",
  specifics: "",
  quotes: "",
  feynman: "",
  confirms: "",
  contradicts: "",
  links: "",
  decision: "",
  ifSituation: "",
  thenAction: "",
  preMortem: "",
  reviews: [],
  created: new Date().toISOString(),
  depth: "full",
});

export const lastReviewDate = (b: Book): string | null =>
  b.reviews.length ? b.reviews[b.reviews.length - 1].date : null;
