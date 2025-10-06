"use client";
import { useState } from "react";

export default function FileDropzone({ onUploaded }: { onUploaded: (policy: any) => void }) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Upload failed");
      onUploaded(data.policy);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div
      className="rounded-xl border border-dashed border-[var(--color-muted)] bg-[var(--color-warm)]/40 p-4 text-sm"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const f = e.dataTransfer.files?.[0];
        if (f) void handleFile(f);
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="font-medium">Upload your policy</div>
          <div className="text-[var(--color-ink-2)]">Drag & drop or choose a file (PDF, DOCX, images)</div>
        </div>

        <label className="cursor-pointer rounded-xl bg-[var(--color-primary)] px-3 py-2 text-sm text-white shadow-sm transition hover:opacity-90 focus-within:outline-none focus-within:ring-2 focus-within:ring-[var(--color-primary)]/35">
          <input
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />
          Choose file
        </label>
      </div>

      {isUploading && <div className="mt-2 text-[var(--color-ink-2)]">Uploading…</div>}
      {error && <div className="mt-2 text-red-600">{error}</div>}
    </div>
  );
}
