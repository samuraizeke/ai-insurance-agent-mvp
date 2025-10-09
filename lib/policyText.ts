import { promises as fs } from "fs";
import path from "path";
import { createRequire } from "node:module";
import type { PolicyFile } from "@/lib/types";

const require = createRequire(import.meta.url);
type PdfParseFn = (data: Buffer | Uint8Array) => Promise<{ text?: string }>;

export type ExtractedPolicyText = {
  text: string | null;
  sourcePath: string;
};

export type LoadPolicyTextOptions = {
  maxChars?: number;
  minLength?: number;
  forceReextract?: boolean;
};

export async function loadPolicyText(
  policy: PolicyFile,
  opts?: LoadPolicyTextOptions
): Promise<ExtractedPolicyText> {
  const maxChars = opts?.maxChars;
  const minLength = opts?.minLength ?? 0;
  const shouldForce = opts?.forceReextract ?? false;

  const cached = policy.textContent?.trim() ?? null;

  if (!policy.storedAt) {
    const limited =
      maxChars && cached && cached.length > maxChars ? cached.slice(0, maxChars) : cached;
    return { text: limited, sourcePath: "" };
  }

  const relPath = policy.storedAt.replace(/^\/+/, "");
  const absolutePath = path.join(process.cwd(), "public", relPath);

  let text = cached;
  const needsFresh = shouldForce || !text || text.length < minLength;

  if (needsFresh) {
    text = await extractTextFromFile(absolutePath, policy.mime, { maxChars });
  }

  if (!text) {
    // One final attempt without limiting characters.
    text = await extractTextFromFile(absolutePath, policy.mime);
  }

  if (text && maxChars && text.length > maxChars) {
    text = text.slice(0, maxChars);
  }

  if (text) {
    policy.textContent = text;
  }

  return { text, sourcePath: absolutePath };
}

export async function extractTextFromFile(
  filePath: string,
  mime?: string,
  opts?: { maxChars?: number }
): Promise<string | null> {
  const maxChars = opts?.maxChars;
  const buffer = await fs.readFile(filePath);
  const mimeLower = mime?.toLowerCase() ?? "";
  const ext = path.extname(filePath).toLowerCase();

  let raw = "";

  if (mimeLower.includes("pdf") || ext === ".pdf") {
    try {
      const parse = require("pdf-parse") as PdfParseFn;
      const parsed = await parse(buffer);
      raw = typeof parsed?.text === "string" ? parsed.text : "";
    } catch (error) {
      console.warn("Failed to parse PDF document", error);
      raw = "";
    }
  } else if (mimeLower.startsWith("text/") || ext === ".txt" || ext === ".md") {
    raw = buffer.toString("utf-8");
  } else {
    raw = buffer.toString("utf-8");
  }

  const sanitized = sanitize(raw);
  if (!sanitized) {
    return null;
  }

  if (maxChars && maxChars > 0 && sanitized.length > maxChars) {
    return sanitized.slice(0, maxChars);
  }

  return sanitized;
}

function sanitize(value: string | null | undefined) {
  if (!value) return null;

  const withoutNulls = value.replace(/\u0000/g, "");
  const collapsed = withoutNulls.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const printable = collapsed.replace(/[^\x09\x0A\x0D\x20-\x7E]/g, " ");
  const ratio = collapsed.length ? printable.length / collapsed.length : 1;
  const chosen = ratio < 0.5 ? printable : collapsed;
  const normalized = chosen.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

  return normalized.length ? normalized : null;
}

export function chunkPolicyText(text: string, chunkSize = 6000) {
  if (text.length <= chunkSize) return [text];

  const parts: string[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const sliceEnd = Math.min(text.length, cursor + chunkSize);
    parts.push(text.slice(cursor, sliceEnd));
    cursor = sliceEnd;
  }

  return parts;
}
