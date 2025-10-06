import { ChatMessage } from "@/lib/types";

export default function MessageBubble({ m }: { m: ChatMessage }) {
  const isUser = m.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={[
          "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-[0.95rem] shadow-sm",
          isUser
            ? "bg-[var(--color-primary)] text-white"
            : "bg-white text-[var(--color-ink)] border border-[var(--color-muted)]",
        ].join(" ")}
      >
        {m.content}
        {m.attachments?.length ? (
          <div className="mt-2 text-xs opacity-80">
            Attachments: {m.attachments.map((a) => a.name).join(", ")}
          </div>
        ) : null}
      </div>
    </div>
  );
}
