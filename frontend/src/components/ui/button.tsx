import type { ButtonHTMLAttributes, CSSProperties } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
};

export function Button({ variant = "primary", style, ...props }: Props) {
  const base: CSSProperties = {
    borderRadius: 12,
    border: "1px solid transparent",
    padding: "0.55rem 0.9rem",
    cursor: "pointer",
    fontWeight: 600
  };

  const byVariant: Record<string, CSSProperties> = {
    primary: {
      background: "var(--accent)",
      color: "var(--accent-ink)"
    },
    ghost: {
      background: "transparent",
      borderColor: "var(--line)",
      color: "var(--ink)"
    },
    danger: {
      background: "var(--danger)",
      color: "white"
    }
  };

  return <button style={{ ...base, ...byVariant[variant], ...style }} {...props} />;
}
