"use client";
import { useState } from "react";
import { UploadCloud } from "lucide-react";
import type { PolicyFile, PolicyKind } from "@/lib/types";

type Props = {
  onUploaded: (policy: PolicyFile) => void;
  policyType: PolicyKind;
  title?: string;
  description?: string;
  className?: string;
};

type UploadResponse = { ok: true; policy: PolicyFile } | { ok?: false; error: string };

export default function FileDropzone({
  onUploaded,
  policyType,
  title,
  description,
  className,
}: Props) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("policyType", policyType);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data: UploadResponse = await res.json();

      if (!res.ok || !("ok" in data && data.ok)) {
        throw new Error(("error" in data && data.error) ? data.error : "Upload failed");
      }
      onUploaded(data.policy);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      setError(msg);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div
      className={`flex flex-col rounded-xl border border-dashed border-[var(--color-primary)]/35 bg-white/90 p-4 text-sm shadow-sm transition hover:border-[var(--color-primary)]/55 ${className ?? ""}`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const f = e.dataTransfer.files?.[0];
        if (f) void handleFile(f);
      }}
    >
      <div className="space-y-2.5">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-primary)]/80">
          Upload
        </span>
        <h3 className="text-xl font-semibold text-gray-900">
          {title ?? "Upload your policy"}
        </h3>
        <p className="text-sm text-gray-600">
          {description ?? "Drag & drop or choose a file (PDF, DOCX, images)."}
        </p>
      </div>

      <div className="mt-auto flex flex-col gap-2.5">
        <label
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-[var(--color-primary)] px-3.5 py-2 text-sm font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)] hover:text-white focus-within:outline-none focus-within:ring-2 focus-within:ring-[var(--color-primary)]/35"
          title="Upload a new policy"
          aria-label={title ?? "Upload your policy"}
        >
          <input
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />
          <UploadCloud className="h-5 w-5" aria-hidden />
          <span>Choose file</span>
        </label>

        {isUploading && <div className="text-[var(--color-ink-2)]">Uploading…</div>}
        {error && <div className="text-red-600">{error}</div>}
      </div>
    </div>
  );
}
