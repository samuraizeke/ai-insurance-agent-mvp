// app/api/policy/route.ts
import { NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { db, ensurePolicyMap } from "@/lib/db";
import type { PolicyKind } from "@/lib/types";

export const runtime = "nodejs";

const isPolicyKind = (value: unknown): value is PolicyKind =>
  value === "home" || value === "auto";

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const policyType = body?.policyType;

    if (!isPolicyKind(policyType)) {
      return new Response(JSON.stringify({ error: "Invalid policy type" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const policies = ensurePolicyMap(db.profile);
    const policy = policies[policyType];

    if (!policy) {
      return new Response(JSON.stringify({ error: "Policy not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (policy.storedAt?.startsWith("/uploads/")) {
      const relativePath = policy.storedAt.replace(/^\/+/, "");
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

    policies[policyType] = null;

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to remove policy";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
