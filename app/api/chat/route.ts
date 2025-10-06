import { NextRequest } from "next/server";
import { getOpenAI, getModel } from "@/lib/openai";
import { z } from "zod";

const BodySchema = z.object({
messages: z.array(
z.object({
role: z.enum(["user", "assistant", "system"]).default("user"),
content: z.string(),
})
),
policyText: z.string().optional(),
});

export async function POST(req: NextRequest) {
try {
const { messages, policyText } = BodySchema.parse(await req.json());

const openai = getOpenAI();
const model = getModel();

const completion = await openai.chat.completions.create({
model,
stream: true,
messages: [
// { role: "system", content: "You are a helpful P&C insurance agent." },
...messages,
...(policyText ? [{ role: "system" as const, content: `Customer policy excerpt (unverified):

${policyText}` }] : []),
],
temperature: 0.2,
});

const encoder = new TextEncoder();

const stream = new ReadableStream<Uint8Array>({
async start(controller) {
try {
for await (const part of completion) {
const delta = part.choices?.[0]?.delta?.content;
if (delta) controller.enqueue(encoder.encode(delta));
}
} catch (err) {
controller.error(err);
} finally {
controller.close();
}
},
});

return new Response(stream, {
headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
});
} catch (err: any) {
return new Response(JSON.stringify({ error: err?.message || "Bad request" }), { status: 400 });
}
}