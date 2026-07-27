import type { ReviewPromptType } from "./types";

export const C = {
  bg: "#10151C",
  surface: "#18202A",
  surfaceHi: "#1F2934",
  line: "#2A3541",
  text: "#DCE3EA",
  muted: "#8496A6",
  faint: "#5B6B7A",
  accent: "#7FD1C1",
  amber: "#D9A441",
  rose: "#E08A7B",
} as const;

export const display = "'Bricolage Grotesque', 'Trebuchet MS', sans-serif";
export const body = "'Karla', system-ui, sans-serif";
export const mono = "'JetBrains Mono', ui-monospace, monospace";

export const VOCAB = [
  "decision-making", "risk", "behavioral-finance", "valuation", "incentives",
  "markets", "macro", "personal-finance", "strategy", "leadership",
  "negotiation", "psychology", "productivity", "history", "biography",
  "health", "parenting", "technology", "writing", "philosophy",
];

export const PROMPTS: { type: ReviewPromptType; q: string }[] = [
  { type: "APPLY", q: "Is there a decision in front of you right now where this applies?" },
  { type: "SYNTHESIZE", q: "What other book connects to this? What's the combined lesson?" },
  { type: "UPDATE", q: "Do you still believe this? Has anything changed your view?" },
];

export const STEPS = [
  { n: "Blank sheet", hint: "5 min · from memory, don't peek" },
  { n: "Specifics", hint: "5–8 min · now open your Audible clips" },
  { n: "Explain it", hint: "3–5 min · Feynman" },
  { n: "Connect", hint: "3 min" },
  { n: "Apply", hint: "5 min · the whole point" },
  { n: "Metadata", hint: "1 min" },
];

export const REVIEW_DUE_DAYS = 60;
