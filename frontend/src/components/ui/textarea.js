import { jsx as _jsx } from "react/jsx-runtime";
export function Textarea(props) {
    return (_jsx("textarea", { ...props, style: {
            width: "100%",
            borderRadius: 10,
            border: "1px solid var(--line)",
            background: "#fff",
            color: "var(--ink)",
            padding: "0.55rem 0.75rem"
        } }));
}
