// app/api/policy/route.ts
import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { loadCustomerProfile } from "@/lib/profile";
import { createSupabaseRouteClient } from "@/lib/supabase/server";
import type { PolicyKind } from "@/lib/types";

export const runtime = "nodejs";

const isPolicyKind = (value: unknown): value is PolicyKind =>
  value === "home" || value === "auto";

export async function DELETE(req: NextRequest) {
  try {
    const supabase = createSupabaseRouteClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await loadCustomerProfile(supabase, user.email ?? null);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    const policyType = body?.policyType;

    if (!isPolicyKind(policyType)) {
      return NextResponse.json({ error: "Invalid policy type" }, { status: 400 });
    }

    const { data: policy, error } = await supabase
      .from("policies")
      .select("id, stored_at")
      .eq("profile_id", profile.id)
      .eq("kind", policyType)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.error("Failed to load policy for deletion", error);
      return NextResponse.json({ error: "Failed to load policy" }, { status: 500 });
    }

    if (!policy) {
      return NextResponse.json({ error: "Policy not found" }, { status: 404 });
    }

    if (policy.stored_at?.startsWith("/uploads/")) {
      const relativePath = policy.stored_at.replace(/^\/+/, "");
      const resolvedPath = path.join(process.cwd(), "public", relativePath);

      try {
        await fs.unlink(resolvedPath);
      } catch (err) {
        const error = err as NodeJS.ErrnoException;
        if (error.code !== "ENOENT") {
          console.warn("Failed to delete stored policy file:", error);
        }
      }
    }

    const { error: deleteError } = await supabase.from("policies").delete().eq("id", policy.id);

    if (deleteError) {
      console.error("Failed to delete policy row", deleteError);
      return NextResponse.json({ error: "Failed to delete policy" }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to remove policy";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
