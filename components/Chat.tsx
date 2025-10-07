// components/Chat.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import FileDropzone from "@/components/FileDropzone";
import { fmt } from "@/lib/utils";
import type { PolicyFile } from "@/lib/types";

type Role = "user" | "assistant" | "system";
type ChatMsg = { id: string; role: Role; content: string; createdAt: number };

type ChatProps = {
  initialPolicy?: PolicyFile | null;
};

export default function Chat({ initialPolicy = null }: ChatProps) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [policy, setPolicy] = useState<PolicyFile | null>(initialPolicy);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const latestAssistantIdRef = useRef<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!uploadStatus) return;
    const timeout = window.setTimeout(() => setUploadStatus(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [uploadStatus]);

  // Auto-scroll on new messages
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    // Cancel any previous stream
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    const userId = crypto.randomUUID();
    const assistantId = crypto.randomUUID();
    latestAssistantIdRef.current = assistantId;

    // 1) Push user message
    const userMsg: ChatMsg = {
      id: userId,
      role: "user",
      content: text,
      createdAt: Date.now(),
    };

    // 2) Create ONE assistant placeholder for streaming updates
    const assistantPlaceholder: ChatMsg = {
      id: assistantId,
      role: "assistant",
      content: "",
      createdAt: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg, assistantPlaceholder]);
    setInput("");
    setIsStreaming(true);

    try {
      const payload = {
        messages: [...messages, userMsg]
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({ role: m.role, content: m.content })),
      };

      const res = await fetch("/api/chat", {
        method: "POST",
        signal: abortRef.current.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok || !res.body) {
        const errText = await safeJsonError(res);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: `AI error: ${errText}` } : m
          )
        );
        setIsStreaming(false);
        return;
      }

      // Stream the plain text response
      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffered = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (!chunk) continue;

        buffered += chunk;

        // Update the existing assistant placeholder
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: buffered } : m))
        );
      }

      setIsStreaming(false);
    } catch (err: unknown) {
      if ((err as any)?.name === "AbortError") return;
      const msg =
        err instanceof Error ? err.message : typeof err === "string" ? err : "Unknown error";
      setMessages((prev) =>
        prev.map((m) =>
          m.id === latestAssistantIdRef.current ? { ...m, content: `AI error: ${msg}` } : m
        )
      );
      setIsStreaming(false);
    }
  }, [input, isStreaming, messages]);

  // Enter = send, Shift+Enter = newline
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const policySummary = useMemo(() => {
    if (!policy) {
      return "No policy on file yet.";
    }

    const details = [
      `Name: ${policy.name}`,
      policy.mime ? `Type: ${policy.mime}` : null,
      `Size: ${Math.round(policy.size / 1024)} KB`,
      `Uploaded: ${fmt.date(policy.uploadedAt)}`,
    ].filter(Boolean);

    return details.join(" • ");
  }, [policy]);

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] w-full max-w-5xl flex-col rounded-2xl bg-white/70 p-4 shadow-xl backdrop-blur lg:h-[calc(100vh-6rem)]">
      <div className="mb-3 text-center text-sm text-gray-500">Chat with your AI Insurance Agent</div>

      <div className="mb-4 space-y-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-700 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-medium text-gray-900">Policy on file</div>
              <div>{policySummary}</div>
            </div>
            {policy?.storedAt ? (
              <a
                className="text-sm font-medium text-[var(--color-primary)] underline"
                href={policy.storedAt}
                target="_blank"
                rel="noreferrer"
              >
                View / Download
              </a>
            ) : null}
          </div>
        </div>

        <FileDropzone
          onUploaded={(uploaded) => {
            setPolicy(uploaded);
            setUploadStatus(`Policy “${uploaded.name}” saved to your profile.`);
          }}
          title={policy ? "Replace your policy" : "Upload your policy"}
          description={
            policy
              ? "Upload a new policy file to keep the AI assistant up to date."
              : "Drag & drop or choose a file (PDF, DOCX, images)."
          }
        />
        {uploadStatus ? <div className="text-sm text-green-600">{uploadStatus}</div> : null}
      </div>

      <div className="flex-1 overflow-y-auto rounded-xl border border-gray-200 bg-white p-4">
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="space-y-4">
            {messages.map((m) => (
              <MessageBubble key={m.id} msg={m} />
            ))}
          </ul>
        )}
        <div ref={endRef} />
      </div>

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage();
        }}
      >
        <textarea
          className="min-h-[52px] max-h-40 flex-1 resize-y rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none ring-0 focus:border-primary"
          placeholder="Ask about your coverage… (Shift+Enter for newline)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={isStreaming}
          rows={2}
        />
        <button
          type="submit"
          disabled={isStreaming || !input.trim()}
          className="self-end rounded-xl bg-primary px-5 py-3 font-medium text-white disabled:opacity-60"
        >
          {isStreaming ? "Sending…" : "Send"}
        </button>
      </form>
    </div>
  );
}

function MessageBubble({ msg }: { msg: ChatMsg }) {
  const isUser = msg.role === "user";

  return (
    <li className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`flex max-w-[85%] items-start gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
        {/* Avatar */}
        <span
          className={`mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
            isUser ? "text-white" : "bg-gray-200 text-gray-700"
          }`}
          style={isUser ? { backgroundColor: "var(--color-secondary)" } : {}}
          aria-hidden
        >
          {isUser ? "U" : "AI"}
        </span>

        {/* Bubble */}
        <div
          className={`whitespace-pre-wrap leading-relaxed px-4 py-3 shadow-sm rounded-2xl ${
            isUser ? "text-white" : "bg-gray-100 text-gray-900"
          } ${isUser ? "rounded-br-md" : "rounded-bl-md"}`}
          style={isUser ? { backgroundColor: "var(--color-secondary)" } : {}}
        >
          {msg.content}
        </div>
      </div>
    </li>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full items-center justify-center text-gray-400">
      Start by asking a question about home or auto coverage.
    </div>
  );
}

async function safeJsonError(res: Response): Promise<string> {
  try {
    const j = await res.json();
    const inner = j?.error?.message ?? j?.error ?? j;
    return typeof inner === "string" ? inner : JSON.stringify(inner);
  } catch {
    return `${res.status} ${res.statusText}`;
  }
}
