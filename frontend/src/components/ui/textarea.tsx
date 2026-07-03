import type { TextareaHTMLAttributes } from "react";

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      style={{
        width: "100%",
        borderRadius: 10,
        border: "1px solid var(--line)",
        background: "#fff",
        color: "var(--ink)",
        padding: "0.55rem 0.75rem"
      }}
    />
  );
}
