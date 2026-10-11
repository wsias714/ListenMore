import { C, mono } from "../constants";

export const card: React.CSSProperties = { background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: 18 };
export const wrap: React.CSSProperties = {
  maxWidth: 780, margin: "0 auto",
  padding: "0 max(20px, env(safe-area-inset-right, 0px)) 0 max(20px, env(safe-area-inset-left, 0px))",
};
export const kicker = (color: string): React.CSSProperties => ({
  font: `600 11px/1 ${mono}`, color, letterSpacing: ".1em",
});
