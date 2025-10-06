import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs"; // ensure fs is allowed

export async function POST(req: NextRequest) {
try {
const form = await req.formData();
const file = form.get("file");
if (!(file instanceof File)) {
return new Response(JSON.stringify({ error: "No file uploaded" }), { status: 400 });
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

db.profile.policy = {
id,
name: file.name,
mime: file.type,
size: file.size,
storedAt: `/uploads/${storedName}`,
uploadedAt: Date.now(),
};

return new Response(
JSON.stringify({ ok: true, policy: db.profile.policy }),
{ status: 200, headers: { "Content-Type": "application/json" } }
);
} catch (err: any) {
return new Response(JSON.stringify({ error: err?.message || "Upload failed" }), { status: 500 });
}
}