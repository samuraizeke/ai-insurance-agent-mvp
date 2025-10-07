import { NextRequest } from "next/server";
import { AzureOpenAI } from "openai";
import { retrieveContext } from "@/lib/retriever";

const client = new AzureOpenAI({
  endpoint: process.env.AZURE_OPENAI_ENDPOINT!,
  apiKey: process.env.AZURE_OPENAI_API_KEY!,
  apiVersion: process.env.AZURE_OPENAI_API_VERSION!,
  deployment: process.env.AZURE_OPENAI_DEPLOYMENT!,
});

type Msg = { role: "system" | "user" | "assistant"; content: string };

export async function POST(req: NextRequest) {
  try {
    const { messages, useRag = true } = await req.json();
    const lastUserMessage = messages.filter((m: Msg) => m.role === "user").pop();

    let context = "";
    if (useRag && lastUserMessage?.content) {
      const retrieved = await retrieveContext(lastUserMessage.content, 6);
      context = `\n\n### Knowledge Base Context\n${retrieved}\n\n---`;
    }

    const systemPrompt = `
You are an AI insurance advisor that helps consumers choose appropriate personal home and auto coverage and navigate claims.
${context}
    `;

    const stream = await client.chat.completions.stream({
      model: process.env.AZURE_OPENAI_DEPLOYMENT!,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m: Msg) => ({
          role: m.role,
          content: m.content,
        })),
      ],
      max_completion_tokens: 8000,
      temperature: 1,
      stream: true,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const event of stream) {
          if (event.type === "message" && event.message?.content) {
            controller.enqueue(
              encoder.encode(JSON.stringify({ content: event.message.content }) + "\n")
            );
          } else if (event.type === "error") {
            controller.enqueue(encoder.encode(JSON.stringify({ error: event.error }) + "\n"));
          }
        }
        controller.close();
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  } catch (err: any) {
    console.error("Chat error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
