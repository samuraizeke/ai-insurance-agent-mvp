// lib/openai.ts
import { AzureOpenAI } from "openai";

function need(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export function getAzureChatClient() {
  const endpoint     = need("AZURE_OPENAI_ENDPOINT");           // e.g., https://...azure.com/
  const apiKey       = need("AZURE_OPENAI_API_KEY");
  const apiVersion   = process.env.AZURE_OPENAI_API_VERSION || "2024-12-01-preview";
  const deployment   = need("AZURE_OPENAI_DEPLOYMENT");         // <-- DEPLOYMENT NAME

  const client = new AzureOpenAI({
    endpoint,
    apiKey,
    apiVersion,
    // NOTE: for Chat Completions you do NOT pass deployment here; you pass it as "model" per call.
  });

  return { client, deployment };
}
