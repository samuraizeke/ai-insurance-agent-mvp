// components/Chat.tsx
"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Download, Eye, Loader2, Send } from "lucide-react";
import FileDropzone from "@/components/FileDropzone";
import { fmt } from "@/lib/utils";
import type { PolicyFile, PolicyKind, PolicyMap } from "@/lib/types";

type Role = "user" | "assistant" | "system";
type ChatMsg = { id: string; role: Role; content: string; createdAt: number };

type ChatProps = {
  initialPolicies?: Partial<PolicyMap>;
};

const POLICY_LABELS: Record<PolicyKind, string> = {
  home: "Home Policy",
  auto: "Auto Policy",
};

export default function Chat({ initialPolicies }: ChatProps) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [policies, setPolicies] = useState<PolicyMap>({
    home: initialPolicies?.home ?? null,
    auto: initialPolicies?.auto ?? null,
  });
  const [uploadStatus, setUploadStatus] = useState<
    Record<PolicyKind, { id: string; message: string } | null>
  >({ home: null, auto: null });
  const abortRef = useRef<AbortController | null>(null);
  const latestAssistantIdRef = useRef<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoScrollRef = useRef(true);
  const statusTimeoutsRef = useRef<Record<PolicyKind, number | null>>({
    home: null,
    auto: null,
  });

  const registerUploadStatus = useCallback((kind: PolicyKind, message: string) => {
    const id = crypto.randomUUID();

    setUploadStatus((prev) => ({ ...prev, [kind]: { id, message } }));

    const existingTimeout = statusTimeoutsRef.current[kind];
    if (existingTimeout) {
      window.clearTimeout(existingTimeout);
    }

    const timeoutId = window.setTimeout(() => {
      setUploadStatus((prev) => {
        if (prev[kind]?.id !== id) return prev;
        return { ...prev, [kind]: null };
      });
      statusTimeoutsRef.current[kind] = null;
    }, 5000);

    statusTimeoutsRef.current[kind] = timeoutId;
  }, []);

  const handlePolicyUpload = useCallback(
    (kind: PolicyKind) => (uploaded: PolicyFile) => {
      const resolvedKind = uploaded.kind ?? kind;
      setPolicies((prev) => ({ ...prev, [resolvedKind]: uploaded }));

      const label = POLICY_LABELS[resolvedKind];
      registerUploadStatus(resolvedKind, `${label} “${uploaded.name}” saved to your profile.`);
    },
    [registerUploadStatus]
  );
  useEffect(() => {
    return () => {
      Object.values(statusTimeoutsRef.current).forEach((timeoutId) => {
        if (timeoutId) {
          window.clearTimeout(timeoutId);
        }
      });
    };
  }, []);

  // Track if user is near bottom of the chat so we don't force-scroll when they're reading history
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const handleScroll = () => {
      const threshold = 80;
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
      shouldAutoScrollRef.current = isNearBottom;
    };

    handleScroll();
    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  // Auto-scroll within the chat container when new messages arrive
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el || !shouldAutoScrollRef.current) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
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

  const renderPolicyCard = (kind: PolicyKind) => {
    const policy = policies[kind];
    const status = uploadStatus[kind];
    const label = POLICY_LABELS[kind];

    const description = policy
      ? `Upload a new document if your ${label.toLowerCase()} changes.`
      : `Upload your latest ${label.toLowerCase()} so I can reference it while we chat.`;

    const meta =
      policy == null
        ? []
        : [
            {
              label: "Type",
              value:
                policy.mime?.split("/").pop()?.toUpperCase() ??
                policy.mime ??
                "Unknown",
            },
            { label: "Size", value: `${Math.round(policy.size / 1024)} KB` },
            { label: "Uploaded", value: fmt.date(policy.uploadedAt) },
          ];

    return (
      <div
        key={kind}
        className="flex flex-col gap-3.5 rounded-xl border border-gray-200/70 bg-white/95 p-4 shadow-sm"
      >
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-primary)]/80">
            {label}
          </span>
          <h3 className="mt-1.5 text-lg font-semibold text-gray-900">
            {policy ? policy.name : `No ${label.toLowerCase()} yet`}
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            {policy
              ? `Last updated ${fmt.date(policy.uploadedAt)}`
              : `Upload your latest ${label.toLowerCase()} to unlock tailored guidance.`}
          </p>
        </div>

        {policy ? (
          <div className="space-y-2.5">
            <div className="grid gap-2.5 text-sm text-gray-700 sm:grid-cols-3">
              {meta.map((metaItem) => (
                <div
                  key={metaItem.label}
                  className="rounded-lg border border-white/60 bg-white px-3 py-2.5 shadow-inner"
                >
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                    {metaItem.label}
                  </div>
                  <div className="mt-1 text-sm font-medium text-gray-900">
                    {metaItem.value}
                  </div>
                </div>
              ))}
            </div>
            {policy.storedAt ? (
              <div className="flex flex-wrap gap-2.5">
                <a
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-primary)] px-3.5 py-2 text-sm font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)] hover:text-white"
                  href={policy.storedAt}
                  target="_blank"
                  rel="noreferrer"
                  title={`View ${label.toLowerCase()}`}
                  aria-label={`View ${label.toLowerCase()}`}
                >
                  <Eye className="h-4 w-4" aria-hidden />
                  View policy
                </a>
                <a
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-primary)] px-3.5 py-2 text-sm font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)] hover:text-white"
                  href={policy.storedAt}
                  download
                  title={`Download ${label.toLowerCase()}`}
                  aria-label={`Download ${label.toLowerCase()}`}
                >
                  <Download className="h-4 w-4" aria-hidden />
                  Download
                </a>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-gray-300/80 bg-white/80 px-3.5 py-3 text-sm text-gray-600">
            Once a policy is uploaded, you&apos;ll see the key details here for quick reference.
          </div>
        )}

        <FileDropzone
          policyType={kind}
          onUploaded={handlePolicyUpload(kind)}
          title={policy ? "Replace document" : "Upload document"}
          description={description}
          className="bg-white"
        />

        {status ? (
          <div className="rounded-lg border border-green-100 bg-green-50/80 px-3 py-2 text-xs text-green-700">
            {status.message}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="grid min-h-0 w-full flex-1 overflow-hidden grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-5">
      <section className="flex min-h-0 flex-col rounded-2xl border border-gray-200/70 bg-white/95 p-5 shadow-sm">
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto rounded-xl border border-gray-100/70 bg-white p-3"
        >
          {messages.length === 0 ? (
            <EmptyState />
          ) : (
            <ul className="space-y-3">
              {messages.map((m) => (
                <MessageBubble key={m.id} msg={m} />
              ))}
            </ul>
          )}
        </div>

        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
        >
          <textarea
            className="min-h-[52px] max-h-40 flex-1 resize-y rounded-lg border border-gray-300/80 bg-white px-3.5 py-3 text-gray-900 outline-none ring-0 focus:border-primary"
            placeholder="Ask about coverage, claims support, or ways to save."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={isStreaming}
            rows={2}
          />
          <button
            type="submit"
            disabled={isStreaming || !input.trim()}
            className="self-center cursor-pointer rounded-lg bg-[var(--color-primary)] p-3 text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            title="Send message"
            aria-label="Send message"
          >
            {isStreaming ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            ) : (
              <Send className="h-5 w-5" aria-hidden />
            )}
          </button>
        </form>
      </section>

      <aside className="flex min-h-0 flex-col gap-3.5 overflow-y-auto">
        {(["home", "auto"] as PolicyKind[]).map((kind) => renderPolicyCard(kind))}
      </aside>
    </div>
  );
}

function MessageBubble({ msg }: { msg: ChatMsg }) {
  const isUser = msg.role === "user";
  const isAssistant = msg.role === "assistant";
  const trimmedContent = msg.content.trim();
  const isTypingPlaceholder = isAssistant && trimmedContent.length === 0;
  const bubbleClasses = [
    "whitespace-pre-wrap leading-relaxed px-3.5 py-2.5 shadow-sm rounded-xl",
    isUser ? "text-white" : "bg-gray-100/90 text-gray-900",
    isUser ? "rounded-br-md" : "rounded-bl-md",
    isTypingPlaceholder ? "flex items-center gap-2" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <li className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`flex max-w-[85%] items-start gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}>
        {/* Avatar */}
        <span
          className={`mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
            isUser ? "text-white" : "bg-gray-200 text-gray-700"
          }`}
          style={isUser ? { backgroundColor: "var(--color-secondary)" } : {}}
          aria-hidden
        >
          {isUser ? "U" : "Sam"}
        </span>

        {/* Bubble */}
        <div
          className={bubbleClasses}
          style={isUser ? { backgroundColor: "var(--color-secondary)" } : {}}
          aria-live={isTypingPlaceholder ? "polite" : undefined}
        >
          {isTypingPlaceholder ? (
            <>
              <span className="typing-dots" aria-hidden>
                <span />
                <span />
                <span />
              </span>
              <span className="sr-only">AI assistant is typing</span>
            </>
          ) : (
            msg.content
          )}
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
