import { C, body, mono, VOCAB } from "../constants";

export const Label = ({ children, hint }: { children: React.ReactNode; hint?: string }) => (
  <div style={{ marginBottom: 6 }}>
    <span style={{ font: `600 11px/1.4 ${mono}`, letterSpacing: ".08em", color: C.accent, textTransform: "uppercase" }}>
      {children}
    </span>
    {hint && <span style={{ font: `400 12px/1.4 ${body}`, color: C.faint, marginLeft: 8 }}>{hint}</span>}
  </div>
);

export const Field = ({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) => (
  <textarea
    value={value}
    rows={rows}
    placeholder={placeholder}
    onChange={(e) => onChange(e.target.value)}
    style={{
      width: "100%", background: C.bg, color: C.text, border: `1px solid ${C.line}`,
      borderRadius: 6, padding: "10px 12px", font: `400 15px/1.55 ${body}`,
      resize: "vertical", outline: "none", boxSizing: "border-box",
    }}
    onFocus={(e) => (e.target.style.borderColor = C.accent)}
    onBlur={(e) => (e.target.style.borderColor = C.line)}
  />
);

export const Input = ({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) => (
  <input
    type={type}
    value={value}
    placeholder={placeholder}
    onChange={(e) => onChange(e.target.value)}
    style={{
      width: "100%", background: C.bg, color: C.text, border: `1px solid ${C.line}`,
      borderRadius: 6, padding: "10px 12px", font: `400 15px/1.4 ${body}`,
      outline: "none", boxSizing: "border-box",
    }}
    onFocus={(e) => (e.target.style.borderColor = C.accent)}
    onBlur={(e) => (e.target.style.borderColor = C.line)}
  />
);

type BtnKind = "solid" | "ghost" | "quiet" | "warn";

export const Btn = ({
  children,
  onClick,
  kind = "ghost",
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  kind?: BtnKind;
  disabled?: boolean;
}) => {
  const base: React.CSSProperties = {
    font: `600 13px/1 ${body}`, letterSpacing: ".01em", padding: "11px 16px",
    borderRadius: 6, cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.4 : 1, transition: "background .15s, border-color .15s",
  };
  const kinds: Record<BtnKind, React.CSSProperties> = {
    solid: { background: C.accent, color: "#0C1116", border: `1px solid ${C.accent}` },
    ghost: { background: "transparent", color: C.text, border: `1px solid ${C.line}` },
    quiet: { background: "transparent", color: C.muted, border: "1px solid transparent" },
    warn: { background: "transparent", color: C.rose, border: `1px solid ${C.line}` },
  };
  return (
    <button onClick={disabled ? undefined : onClick} disabled={disabled} style={{ ...base, ...kinds[kind] }}>
      {children}
    </button>
  );
};

export const Stars = ({
  value,
  onChange,
  glyph = "●",
}: {
  value: number;
  onChange: (n: number) => void;
  glyph?: string;
}) => (
  <div style={{ display: "flex", gap: 6 }}>
    {[1, 2, 3, 4, 5].map((n) => (
      <button
        key={n}
        onClick={() => onChange(n)}
        aria-label={`${n} of 5`}
        style={{
          background: "none", border: "none", cursor: "pointer", padding: 2,
          font: `400 17px/1 ${body}`, color: n <= value ? C.accent : C.line,
        }}
      >
        {glyph}
      </button>
    ))}
  </div>
);

export const ThemePicker = ({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (t: string) => void;
}) => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
    {VOCAB.map((t) => {
      const on = selected.includes(t);
      return (
        <button
          key={t}
          onClick={() => onToggle(t)}
          style={{
            font: `500 12px/1 ${mono}`, padding: "7px 10px", borderRadius: 20, cursor: "pointer",
            background: on ? "rgba(127,209,193,.14)" : "transparent",
            color: on ? C.accent : C.muted,
            border: `1px solid ${on ? C.accent : C.line}`,
          }}
        >
          {t}
        </button>
      );
    })}
  </div>
);
