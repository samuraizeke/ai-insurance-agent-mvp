"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage, PolicyFile } from "@/lib/types";
import { Paperclip } from "lucide-react";
import Button from "@/components/ui/Button";

type UploadResponse = { ok: true; policy: PolicyFile } | { ok?: false; error: string };

function safeUUID(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [policyText, setPolicyText] = useState<string | undefined>(undefined);
  const [policyCard, setPolicyCard] = useState<PolicyFile | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  async function send(text: string) {
    const id = safeUUID();
    const userMsg: ChatMessage = { id, role: "user", content: text, createdAt: Date.now() };

    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: id + "-assistant", role: "assistant", content: "", createdAt: Date.now() },
    ]);

    setIsStreaming(true);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: messages.concat(userMsg).map(({ role, content }) => ({ role, content })),
        policyText,
      }),
    });

    if (!res.ok || !res.body) {
      setMessages((prev) =>
        prev.slice(0, -1).concat({
          id: id + "-assistant-error",
          role: "assistant",
          content: "Sorry, I couldn’t reach the AI service.",
          createdAt: Date.now(),
        }),
      );
      setIsStreaming(false);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let done = false;
    let buffer = "";

    while (!done) {
      const { value, done: d } = await reader.read();
      done = d;
      if (value) {
        buffer += decoder.decode(value, { stream: true });

        const segments = buffer.split("\n\n");
        buffer = segments.pop() ?? "";

        for (const seg of segments) {
          const textPart = seg.trim();
          if (!textPart) continue;
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last?.role === "assistant") {
              last.content = (last.content + " " + textPart).replace(/\s+/g, " ");
            }
            return next;
          });
        }
      }
    }

    setIsStreaming(false);
  }

  async function onFileChosen(file: File) {
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data: UploadResponse = await res.json();
      if (!res.ok || !("ok" in data && data.ok)) {
        throw new Error(("error" in data && data.error) ? data.error : "Upload failed");
      }
      setPolicyCard(data.policy);
      setPolicyText(`Policy file available at: ${data.policy.storedAt}`);
    } catch (e) {
      // swallow for now; you can toast here
      console.error(e);
    }
  }

  return (
    <div className="flex h-[80vh] flex-col md:h-[85vh]">
      <div className="relative flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          {messages.map((m) => {
            const isUser = m.role === "user";
            return (
              <div key={m.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                <div
                  className={[
                    "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-[0.95rem] shadow-sm",
                    isUser
                      ? "bg-[var(--color-primary)] text-white"
                      : "bg-white text-[var(--color-ink)] border border-[var(--color-muted)]",
                  ].join(" ")}
                >
                  {m.content}
                </div>
              </div>
            );
          })}
          {isStreaming && <div className="text-center text-xs text-[var(--color-ink-2)]">Agent is typing…</div>}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="border-t border-[var(--color-muted)] bg-white/90 p-3 backdrop-blur">
        <div className="mx-auto w-full max-w-3xl">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs text-[var(--color-ink-2)]">
              {policyCard ? (
                <>
                  Policy on file:{" "}
                  <a className="text-[var(--color-primary)] underline-offset-4 hover:underline" href={policyCard.storedAt} target="_blank">
                    {policyCard.name}
                  </a>
                </>
              ) : (
                <span className="opacity-80">Attach a policy for smarter answers</span>
              )}
            </div>

            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--color-muted)] bg-white px-3 py-1.5 text-xs text-[var(--color-ink)] hover:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25"
            >
              <Paperclip className="h-4 w-4" />
              Attach
            </button>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onFileChosen(f);
              }}
            />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget as HTMLFormElement;
              const textarea = form.elements.namedItem("message") as HTMLTextAreaElement;
              const v = textarea.value.trim();
              if (!v) return;
              void send(v);
              textarea.value = "";
            }}
            className="flex items-end gap-2"
          >
            <textarea
              name="message"
              rows={1}
              placeholder="Type your message…"
              className="min-h-[44px] flex-1 resize-none rounded-xl border border-[var(--color-muted)] bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
            />
            <Button type="submit" variant="primary" size="md">
              Send
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
