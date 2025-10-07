// app/api/chat/route.ts
import { NextRequest } from "next/server";
import { AzureOpenAI } from "openai";
import { retrieveContext } from "@/lib/retriever";
import SYSTEM_PROMPT from "@/lib/systemPrompt";
import { db } from "@/lib/db";
import { promises as fs } from "fs";
import path from "path";

type Role = "system" | "user" | "assistant";
type Msg = { role: Role; content: string };

type AzureConfig = {
  client: AzureOpenAI;
  deployment: string;
};

let cachedAzure: AzureConfig | null = null;

function resolveAzure(): AzureConfig {
  if (cachedAzure) return cachedAzure;

  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;

  if (!endpoint || !apiKey || !deployment) {
    throw new Error(
      "Azure OpenAI environment variables are not fully configured (AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, AZURE_OPENAI_DEPLOYMENT)."
    );
  }

  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-12-01-preview";

  cachedAzure = {
    client: new AzureOpenAI({ endpoint, apiKey, apiVersion }),
    deployment,
  };

  return cachedAzure;
}

async function buildPolicySection(): Promise<string | null> {
  const policy = db.profile.policy;
  if (!policy) return null;

  const metadataLines = [
    `File name: ${policy.name}`,
    policy.mime ? `MIME type: ${policy.mime}` : null,
    `Size (bytes): ${policy.size}`,
  ].filter(Boolean);

  if (!policy.storedAt) {
    return `### Customer Policy Document\n${metadataLines.join("\n")}`;
  }

  const relPath = policy.storedAt.replace(/^\/+/, "");
  const absolutePath = path.join(process.cwd(), "public", relPath);

  try {
    const fileBuffer = await fs.readFile(absolutePath);
    const text = fileBuffer.toString("utf-8");
    const sanitized = text.replace(/\u0000/g, "");
    const printable = sanitized.replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "");
    const ratio = sanitized.length ? printable.length / sanitized.length : 1;
    const finalText = ratio < 0.5 ? printable : sanitized;
    const MAX_CHARS = 8000;
    const trimmed = finalText.length > MAX_CHARS ? finalText.slice(0, MAX_CHARS) : finalText;

    if (!trimmed.trim()) {
      return `### Customer Policy Document\n${metadataLines.join("\n")}\n\nThe uploaded policy file is not in a readable text format. Ask the customer for relevant excerpts when needed.`;
    }

    return `### Customer Policy Document\n${metadataLines.join("\n")}\n\n${trimmed}`;
  } catch (error) {
    console.warn("Unable to load policy document", error);
    return `### Customer Policy Document\n${metadataLines.join("\n")}\n\nThe policy could not be loaded from disk. Ask the customer to re-upload if context is required.`;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      messages: Msg[];
      useRag?: boolean;
      systemPrompt?: string;
      instructions?: string;
    };

    if (!Array.isArray(body.messages)) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const userFacingPrompt = body.systemPrompt?.trim() || SYSTEM_PROMPT.trim();
    const extraInstructions = body.instructions?.trim();

    const sections: string[] = [userFacingPrompt];

    if (extraInstructions) {
      sections.push(`### Additional Instructions\n${extraInstructions}`);
    }

    const useRag = body.useRag !== false;
    const lastUser = [...body.messages].reverse().find((m) => m.role === "user");
    if (useRag && lastUser?.content) {
      const { context } = await retrieveContext(lastUser.content, 6);
      if (context) {
        sections.push(
          `### Knowledge Base Context (verbatim; cite with bracket numbers)\n${context}`
        );
      }
    }

    const policySection = await buildPolicySection();
    if (policySection) {
      sections.push(policySection);
    }

    const messages: Msg[] = [{ role: "system", content: sections.join("\n\n---\n\n") }, ...body.messages];

    let azure: AzureConfig;
    try {
      azure = resolveAzure();
    } catch (configError: any) {
      console.error("Azure configuration error:", configError);
      return new Response(
        JSON.stringify({ error: configError?.message || String(configError) }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const completion = await azure.client.chat.completions.create({
      model: azure.deployment,
      messages,
      stream: true,
      temperature: 0.7,
    });

    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of completion) {
            const choice = chunk.choices?.[0];
            if (!choice) continue;

            const delta = choice.delta?.content;
            if (typeof delta === "string" && delta.length > 0) {
              controller.enqueue(encoder.encode(delta));
            }
          }
        } catch (err) {
          controller.error(err);
          return;
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
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
