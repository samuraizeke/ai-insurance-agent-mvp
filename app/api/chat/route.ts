// app/api/chat/route.ts
import { NextRequest } from "next/server";
import { AzureOpenAI } from "openai";
import SYSTEM_PROMPT from "@/lib/systemPrompt";
import { retrieveContext } from "@/lib/retriever";

// helpers
function need(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}
const ROLES = ["system", "user", "assistant"] as const;
type Role = typeof ROLES[number];
type Msg = { role: Role; content: string };
type InMsg = { role?: unknown; content?: unknown };
function isRole(x: unknown): x is Role {
  return typeof x === "string" && (ROLES as readonly string[]).includes(x);
}

export async function POST(req: NextRequest) {
  try {
    const endpoint   = need("AZURE_OPENAI_ENDPOINT");
    const apiKey     = need("AZURE_OPENAI_API_KEY");
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-12-01-preview";
    const model      = need("AZURE_OPENAI_DEPLOYMENT"); // chat DEPLOYMENT

    const body = (await req.json()) as {
      messages?: InMsg[];
      policyText?: unknown;
      systemPrompt?: unknown;
      useRag?: boolean;
      debug?: boolean;
    };

    const raw: InMsg[] = Array.isArray(body?.messages) ? body.messages! : [];
    const history: Msg[] = raw.map<Msg>((m) => {
      const role: Role = isRole(m.role) ? m.role : "user";
      return { role, content: String(m.content ?? "") };
    });

    // Build system parts
    const parts: string[] = [];
    if (SYSTEM_PROMPT.trim()) parts.push(SYSTEM_PROMPT.trim());
    if (typeof body?.systemPrompt === "string" && body.systemPrompt.trim()) {
      parts.push(body.systemPrompt.trim());
    }
    if (typeof body?.policyText === "string" && body.policyText.trim()) {
      parts.push("Customer policy excerpt (unverified):\n\n" + body.policyText.trim());
    }

    // RAG
    const useRag = body?.useRag !== false;
    if (useRag) {
      const lastUser = [...history].reverse().find((m) => m.role === "user");
      if (lastUser?.content?.trim()) {
        const { context } = await retrieveContext(lastUser.content.trim(), 6);
        if (context) {
          parts.push(
            `Knowledge Base Context (verbatim; cite with bracket numbers where used):\n\n${context}`
          );
        }
      }
    }

    const systemMsg: Msg | undefined = parts.length
      ? { role: "system", content: parts.join("\n\n---\n\n") }
      : undefined;
    const messages: Msg[] = systemMsg ? [systemMsg, ...history] : history;

    const client = new AzureOpenAI({ endpoint, apiKey, apiVersion });

    if (body?.debug) {
      const r = await client.chat.completions.create({
        model,
        messages,
        max_completion_tokens: 1024,
      });
      const text = r.choices?.[0]?.message?.content ?? "";
      return new Response(JSON.stringify({ ok: true, text }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const completion = await client.chat.completions.create({
      model,
      messages,
      stream: true,
      max_completion_tokens: 1024,
    });

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const enc = new TextEncoder();
        try {
          for await (const part of completion) {
            const delta = part.choices?.[0]?.delta?.content;
            if (delta) controller.enqueue(enc.encode(delta));
          }
        } catch (err) {
          controller.enqueue(new TextEncoder().encode(`\n\n[Error: ${String(err)}]`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch (e: any) {
    const payload = {
      message: e?.message || String(e),
      status: e?.status ?? 500,
      data: e?.response?.data ?? null,
    };
    console.error("Chat route error:", payload);
    return new Response(JSON.stringify({ error: payload }), {
      status: payload.status,
      headers: { "Content-Type": "application/json" },
    });
  }
}
