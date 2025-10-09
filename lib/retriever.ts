// lib/retriever.ts
import { embedTexts } from "./embeddings";
import { pineconeIndex } from "./pinecone";

export type RetrievedChunk = {
  text: string;
  source?: string;
  title?: string;
  score?: number;
  chunk?: number;
};

type ChunkMetadata = {
  text?: string;
  source?: string;
  title?: string;
  chunk?: number;
};

export async function retrieveContext(query: string, topK = 6): Promise<{
  context: string;
  chunks: RetrievedChunk[];
}> {
  const index = pineconeIndex();
  const [qVec] = await embedTexts([query]);
  const res = await index.query({
    topK,
    vector: qVec,
    includeMetadata: true,
  });

  const matches = res.matches ?? [];
  const chunks: RetrievedChunk[] = matches.map((match) => {
    const metadata = (match.metadata ?? {}) as ChunkMetadata;
    return {
      text: metadata.text ?? "",
      source: metadata.source,
      title: metadata.title,
      chunk: metadata.chunk,
      score: match.score,
    };
  });

  // Optional: sort by score desc
  chunks.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  // Trim context to keep prompts reasonable (~6k chars)
  const MAX = 6000;
  let total = 0;
  const selected: RetrievedChunk[] = [];
  for (const c of chunks) {
    const len = c.text.length + 100;
    if (total + len > MAX) break;
    selected.push(c);
    total += len;
  }

  const context = selected
    .map((c, i) => `[[${i + 1}]] ${c.title ?? c.source ?? "source"} #${c.chunk ?? 0}\n${c.text}`)
    .join("\n\n---\n\n");

  return { context, chunks: selected };
}
