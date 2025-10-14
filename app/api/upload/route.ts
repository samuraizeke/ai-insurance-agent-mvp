// app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { ensureProfile } from "@/lib/profile";
import { createSupabaseRouteClient } from "@/lib/supabase/server";
import type { PolicyFile, PolicyKind } from "@/lib/types";
import { extractTextFromFile } from "@/lib/policyText";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseRouteClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await ensureProfile(supabase, user);

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const typeValue = form.get("policyType");
    const policyType =
      typeof typeValue === "string" && (typeValue === "home" || typeValue === "auto")
        ? (typeValue as PolicyKind)
        : null;

    if (!policyType) {
      return NextResponse.json({ error: "Invalid or missing policy type" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const profileFolder = String(profile.id);
    const uploadsDir = path.join(process.cwd(), "public", "uploads", profileFolder);
    await fs.mkdir(uploadsDir, { recursive: true });

    const safeName = file.name.replace(/[^a-zA-Z0-9.\- _]/g, "").slice(0, 120);
    const storedName = `${randomUUID()}__${safeName || "policy"}`;
    const storedPath = path.join(uploadsDir, storedName);
    await fs.writeFile(storedPath, buffer);

    const storedAt = `/uploads/${profileFolder}/${storedName}`;
    let textContent: string | null = null;

    try {
      textContent = await extractTextFromFile(storedPath, file.type);
    } catch (error) {
      console.warn("Failed to extract policy text", error);
      textContent = null;
    }

    // Remove any existing policy of the same kind for this user to keep a single active record.
    await supabase
      .from("policies")
      .delete()
      .eq("profile_id", profile.id)
      .eq("kind", policyType);

    const {
      data,
      error: insertError,
    } = await supabase
      .from("policies")
      .insert({
        profile_id: profile.id,
        kind: policyType,
        name: file.name,
        mime: file.type,
        size: file.size,
        stored_at: storedAt,
        uploaded_at: new Date().toISOString(),
        text_content: textContent,
      })
      .select("id, profile_id, kind, name, mime, size, stored_at, uploaded_at, text_content")
      .single();

    if (insertError) {
      console.error("Failed to store policy metadata", insertError);
      return NextResponse.json({ error: "Failed to store policy metadata" }, { status: 500 });
    }

    const inserted = data as {
      id: number;
      profile_id: number;
      kind: PolicyKind;
      name: string;
      mime: string | null;
      size: number | string;
      stored_at: string;
      uploaded_at: string | null;
      text_content?: string | null;
    };

    const uploadedAt = inserted.uploaded_at ? Date.parse(inserted.uploaded_at) : Date.now();
    const policy: PolicyFile = {
      id: inserted.id,
      profileId: inserted.profile_id,
      kind: inserted.kind,
      name: inserted.name,
      mime: inserted.mime,
      size: typeof inserted.size === "number" ? inserted.size : Number(inserted.size ?? 0) || 0,
      storedAt: inserted.stored_at,
      uploadedAt: Number.isFinite(uploadedAt) ? uploadedAt : Date.now(),
      textContent: inserted.text_content ?? null,
    };

    return NextResponse.json({ ok: true, policy }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
