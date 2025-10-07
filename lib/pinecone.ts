// lib/pinecone.ts
import { Pinecone } from "@pinecone-database/pinecone";

function need(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

let _pc: Pinecone | null = null;
function client() {
  if (!_pc) _pc = new Pinecone({ apiKey: need("PINECONE_API_KEY") });
  return _pc;
}

/** Works with serverless host (PINECONE_HOST). */
export function pineconeIndex() {
  const name = need("PINECONE_INDEX");
  const ns = process.env.PINECONE_NAMESPACE || "kb";
  const host = process.env.PINECONE_HOST; // e.g. https://xxxxx.pinecone.io
  const idx = host ? client().index(name, host) : client().index(name);
  return idx.namespace(ns);
}

export type KBMetadata = {
  source: string;
  title?: string;
  chunk?: number;
};
