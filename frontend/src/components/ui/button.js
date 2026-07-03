import { jsx as _jsx } from "react/jsx-runtime";
export function Button({ variant = "primary", style, ...props }) {
    const base = {
        borderRadius: 12,
        border: "1px solid transparent",
        padding: "0.55rem 0.9rem",
        cursor: "pointer",
        fontWeight: 600
    };
    const byVariant = {
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
    return _jsx("button", { style: { ...base, ...byVariant[variant], ...style }, ...props });
}
