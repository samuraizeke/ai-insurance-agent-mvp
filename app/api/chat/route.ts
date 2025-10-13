// app/api/chat/route.ts
import { NextRequest } from "next/server";
import { AzureOpenAI } from "openai";
import { retrieveContext } from "@/lib/retriever";
import SYSTEM_PROMPT from "@/lib/systemPrompt";
import { db, ensurePolicyMap } from "@/lib/db";
import { chunkPolicyText, loadPolicyText } from "@/lib/policyText";
import type { PolicyFile, PolicyKind } from "@/lib/types";

export const runtime = "nodejs";

type Role = "system" | "user" | "assistant";
type Msg = { role: Role; content: string };

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error && typeof error.message === "string") {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return String(error);
}

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

function formatPolicyHeading(kind: PolicyKind) {
  const label = kind === "home" ? "Home" : "Auto";
  return `${label} Policy Document`;
}

async function renderPolicySection(kind: PolicyKind, policy: PolicyFile): Promise<string> {
  const metadataLines = [
    `File name: ${policy.name}`,
    policy.mime ? `MIME type: ${policy.mime}` : null,
    `Size (bytes): ${policy.size}`,
  ].filter(Boolean);

  try {
    const { text } = await loadPolicyText(policy);
    const trimmed = text?.trim();
    const heading = `### ${formatPolicyHeading(kind)}\n${metadataLines.join("\n")}`;

    if (!trimmed) {
      return `${heading}\n\nThe uploaded policy file is not in a readable text format. Ask the customer for relevant excerpts when needed.`;
    }

    const chunks = chunkPolicyText(trimmed, 6000);

    if (chunks.length === 1) {
      return `${heading}\n\n${chunks[0]}`;
    }

    const chunkSections = chunks
      .map((chunk, idx) => `#### Policy Segment ${idx + 1}\n${chunk}`)
      .join("\n\n");

    return `${heading}\n\n${chunkSections}`;
  } catch (error) {
    console.warn(`Unable to load ${kind} policy document`, error);
    return `### ${formatPolicyHeading(kind)}\n${metadataLines.join(
      "\n"
    )}\n\nThe policy could not be loaded from disk. Ask the customer to re-upload if context is required.`;
  }
}

async function buildPolicySection(): Promise<string | null> {
  const policyMap = ensurePolicyMap(db.profile);
  const renderTasks: Array<Promise<string>> = [];

  for (const [kind, maybePolicy] of Object.entries(policyMap) as Array<
    [PolicyKind, PolicyFile | null]
  >) {
    if (!maybePolicy) continue;
    renderTasks.push(renderPolicySection(kind, maybePolicy));
  }

  if (!renderTasks.length) {
    return null;
  }

  const sections = await Promise.all(renderTasks);
  return sections.join("\n\n---\n\n");
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

    const contextPromise = useRag && lastUser?.content
      ? retrieveContext(lastUser.content, 6).then((res) => res.context)
      : Promise.resolve("");
    const policyPromise = buildPolicySection();

    const [context, policySection] = await Promise.all([contextPromise, policyPromise]);

    if (context) {
      sections.push(
        `### Knowledge Base Context (verbatim; cite with bracket numbers)\n${context}`
      );
    }

    if (policySection) {
      sections.push(policySection);
    }

    const messages: Msg[] = [{ role: "system", content: sections.join("\n\n---\n\n") }, ...body.messages];

    let azure: AzureConfig;
    try {
      azure = resolveAzure();
    } catch (configError: unknown) {
      console.error("Azure configuration error:", configError);
      return new Response(
        JSON.stringify({ error: extractErrorMessage(configError) }),
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
  } catch (error: unknown) {
    console.error("Chat route error:", error);
    return new Response(JSON.stringify({ error: extractErrorMessage(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
