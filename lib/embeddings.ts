// lib/embeddings.ts
import { AzureOpenAI } from "openai";

function need(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

// Lazily create client so scripts can load dotenv first
function getClient() {
  const endpoint   = need("AZURE_OPENAI_ENDPOINT");
  const apiKey     = need("AZURE_OPENAI_API_KEY");
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-12-01-preview";
  return new AzureOpenAI({ endpoint, apiKey, apiVersion });
}
function getEmbedDeployment() {
  return need("AZURE_OPENAI_EMBED_DEPLOYMENT"); // <-- your variable name
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (!texts.length) return [];
  const client = getClient();
  const model  = getEmbedDeployment(); // Azure: pass the deployment name here
  const res = await client.embeddings.create({ model, input: texts });
  // Keep order by index
  return res.data
    .sort((a: any, b: any) => a.index - b.index)
    .map((d: any) => d.embedding as number[]);
}

// Very simple chunker: ~1k chars with 200 overlap
export function chunkText(input: string, opts?: { chunkSize?: number; overlap?: number }) {
  const size = opts?.chunkSize ?? 1000;
  const overlap = opts?.overlap ?? 200;
  const clean = input.replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  const parts: string[] = [];
  let i = 0;
  while (i < clean.length) {
    const end = Math.min(clean.length, i + size);
    parts.push(clean.slice(i, end));
    i = Math.max(0, end - overlap);
  }
  return parts.filter(Boolean);
}
