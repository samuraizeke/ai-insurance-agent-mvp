// app/api/chat/route.ts
import { NextRequest } from "next/server";
import { AzureOpenAI } from "openai";
import { retrieveContext } from "@/lib/retriever";

type Role = "system" | "user" | "assistant";
type Msg = { role: Role; content: string };

function need(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

const endpoint   = need("AZURE_OPENAI_ENDPOINT");
const apiKey     = need("AZURE_OPENAI_API_KEY");
const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-12-01-preview";
const model      = need("AZURE_OPENAI_DEPLOYMENT"); // chat DEPLOYMENT name

const client = new AzureOpenAI({ endpoint, apiKey, apiVersion });

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      messages: Msg[];
      useRag?: boolean;
      maxTokens?: number;      // optional override
    };

    const useRag = body.useRag !== false;
    const max_completion_tokens = Math.max(
      1,
      Math.min(Number(body?.maxTokens ?? 4096), 16384)
    );

    let sys = `You are an AI insurance advisor that helps consumers choose appropriate personal home and auto coverage and navigate claims.`;

    // Append KB context (RAG)
    const lastUser = [...body.messages].reverse().find((m) => m.role === "user");
    if (useRag && lastUser?.content) {
      const { context } = await retrieveContext(lastUser.content, 6);
      if (context) {
        const trimmed = context.length > 6000 ? context.slice(0, 6000) : context;
        sys += `

### Knowledge Base Context (verbatim; cite with bracket numbers):
${trimmed}
`;
      }
    }

    const messages: Msg[] = [{ role: "system", content: sys }, ...body.messages];

    // Start a streaming completion (returns AsyncIterable<ChatCompletionChunk>)
    const completion = await client.chat.completions.create({
      model,
      messages,
      stream: true,
      // Some Azure regions/models only accept the default temperature (1).
      // If your deployment rejects custom values, remove this line.
      temperature: 1,
      max_completion_tokens,
    });

    const enc = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of completion) {
            // Each chunk is ChatCompletionChunk
            const choice = chunk.choices?.[0];
            if (!choice) continue;

            const delta = choice.delta?.content;
            if (typeof delta === "string" && delta.length) {
              // Send as NDJSON line: {"content":"..."}
              controller.enqueue(enc.encode(JSON.stringify({ content: delta }) + "\n"));
            }

            // Optional: let the client know if we hit the length stop reason
            if (choice.finish_reason === "length") {
              controller.enqueue(
                enc.encode(JSON.stringify({ note: "truncated" }) + "\n")
              );
            }
          }
        } catch (err) {
          controller.enqueue(
            enc.encode(JSON.stringify({ error: String(err) }) + "\n")
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    console.error("Chat route error:", e);
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
