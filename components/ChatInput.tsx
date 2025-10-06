"use client";
import { FormEvent, useRef, useState } from "react";
import Button from "@/components/ui/Button";

export default function ChatInput({ onSend }: { onSend: (text: string) => void }) {
  const [value, setValue] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    const v = value.trim();
    if (!v) return;
    onSend(v);
    setValue("");
  }

  return (
    <form ref={formRef} onSubmit={submit} className="flex items-end gap-2">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Type your message…"
        rows={1}
        className="flex-1 resize-none rounded-xl border border-[var(--color-muted)] bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
      />
      <Button type="submit" variant="primary" size="md" disabled={!value.trim()}>
        Send
      </Button>
    </form>
  );
}
