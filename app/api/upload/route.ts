// app/api/upload/route.ts
import { NextRequest } from "next/server";
import { db, ensurePolicyMap } from "@/lib/db";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import type { PolicyFile, PolicyKind } from "@/lib/types";
import { extractTextFromFile } from "@/lib/policyText";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return new Response(JSON.stringify({ error: "No file uploaded" }), { status: 400 });
    }

    const typeValue = form.get("policyType");
    const policyType =
      typeof typeValue === "string" && (typeValue === "home" || typeValue === "auto")
        ? (typeValue as PolicyKind)
        : null;

    if (!policyType) {
      return new Response(JSON.stringify({ error: "Invalid or missing policy type" }), {
        status: 400,
      });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const id = randomUUID();
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadsDir, { recursive: true });

    const safeName = file.name.replace(/[^a-zA-Z0-9.\- _]/g, "").slice(0, 120);
    const storedName = `${id}__${safeName || "policy"}`;
    const storedPath = path.join(uploadsDir, storedName);
    await fs.writeFile(storedPath, buffer);

    const storedAt = `/uploads/${storedName}`;
    let textContent: string | null = null;

    try {
      textContent = await extractTextFromFile(storedPath, file.type);
    } catch (error) {
      console.warn("Failed to extract policy text", error);
      textContent = null;
    }

    const policy: PolicyFile = {
      id,
      name: file.name,
      mime: file.type,
      size: file.size,
      storedAt,
      uploadedAt: Date.now(),
      textContent,
      kind: policyType,
    };

    const policyMap = ensurePolicyMap(db.profile);
    policyMap[policyType] = policy;

    return new Response(JSON.stringify({ ok: true, policy }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}
