import { C, body } from "../constants";

export type Tab = "now" | "library" | "review";

const TABS: { id: Tab; label: string }[] = [
  { id: "now", label: "Now" },
  { id: "library", label: "Library" },
  { id: "review", label: "Review" },
];

/** Fixed bottom bar. */
export function TabBar({ tab, onTab }: { tab: Tab; onTab: (t: Tab) => void }) {
  return (
    <nav
      aria-label="Sections"
      style={{
        position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 30, background: C.bg, borderTop: `1px solid ${C.line}`,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div style={{ maxWidth: 780, margin: "0 auto", display: "flex" }}>
        {TABS.map((t) => {
          const on = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onTab(t.id)}
              aria-current={on ? "page" : undefined}
              style={{
                flex: 1, background: "none", border: "none", cursor: "pointer", padding: "14px 0 12px",
                font: `${on ? 700 : 500} 14px/1 ${body}`, color: on ? C.accent : C.muted,
                borderTop: `2px solid ${on ? C.accent : "transparent"}`,
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
