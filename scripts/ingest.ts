// scripts/ingest.ts
import fs from 'fs';
import readline from 'readline';
import crypto from 'crypto';
import { AzureOpenAI } from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import { pineconeIndex } from "../lib/pinecone";
// scripts/ingest.ts (first lines)
import dotenv from "dotenv";

dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || ".env.local" });


const index = pineconeIndex();

function need(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

// ---- Env
const AZURE_OPENAI_ENDPOINT = need('AZURE_OPENAI_ENDPOINT');
const AZURE_OPENAI_API_KEY = need('AZURE_OPENAI_API_KEY');
const AZURE_OPENAI_API_VERSION = need('AZURE_OPENAI_API_VERSION');
const AZURE_OPENAI_EMBED_DEPLOYMENT = need('AZURE_OPENAI_EMBED_DEPLOYMENT');

const PINECONE_API_KEY = need('PINECONE_API_KEY');
const PINECONE_HOST = need('PINECONE_HOST');         // serverless uses host
const PINECONE_INDEX = need('PINECONE_INDEX');
const PINECONE_NAMESPACE = process.env.PINECONE_NAMESPACE || 'default';

// ---- Clients
const openai = new AzureOpenAI({
  apiKey: AZURE_OPENAI_API_KEY,
  endpoint: AZURE_OPENAI_ENDPOINT,
  apiVersion: AZURE_OPENAI_API_VERSION,
  deployment: AZURE_OPENAI_EMBED_DEPLOYMENT,
});

const pc = new Pinecone({ apiKey: PINECONE_API_KEY });

// ---- Chunking helpers
type Chunk = { id: string; text: string; source: string; ord: number };

function chunkTextStreaming(opts: {
  lineIter: AsyncIterable<string>;
  maxChars?: number;      // ~1.5k chars ≈ 500–700 tokens
  overlap?: number;       // 200-char overlap
  source: string;
}): AsyncGenerator<Chunk> {
  const maxChars = opts.maxChars ?? 1500;
  const overlap = opts.overlap ?? 200;

  let buffer = '';
  let ord = 0;

  const pushChunk = function* () {
    if (!buffer.trim()) return;
    const id = crypto.createHash('sha1').update(`${opts.source}:${ord}:${buffer}`).digest('hex');
    yield { id, text: buffer.trim(), source: opts.source, ord: ord++ };
  };

  return (async function* () {
    for await (const line of opts.lineIter) {
      // Append line; if too big, emit chunk(s)
      if (buffer.length + line.length + 1 > maxChars) {
        yield* pushChunk();
        // keep an overlap from the tail
        buffer = buffer.slice(Math.max(0, buffer.length - overlap));
      }
      buffer += (buffer ? '\n' : '') + line;
    }
    // flush last
    if (buffer.trim()) {
      yield* pushChunk();
    }
  })();
}

// ---- Embedding
async function embedBatch(texts: string[]) {
  // Azure OpenAI embeddings (key-based)
  const res = await openai.embeddings.create({
    input: texts,
    model: AZURE_OPENAI_EMBED_DEPLOYMENT, // for Azure this is the deployment name
  } as any);
  // sort by index to ensure order
  const vectors = res.data
    .sort((a: any, b: any) => a.index - b.index)
    .map((d: any) => d.embedding as number[]);
  return vectors;
}

// ---- Upsert with retry
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function upsertWithRetry(vectors: any[], tries = 3) {
  let attempt = 0;
  while (true) {
    try {
      await index.upsert(vectors);
      return;
    } catch (err) {
      attempt++;
      if (attempt >= tries) throw err;
      await sleep(300 * attempt * attempt);
    }
  }
}

// ---- Main
async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: tsx scripts/ingest.ts <path-to-file>');
    process.exit(1);
  }
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  // Create a streaming line iterator
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  const chunks: Chunk[] = [];
  const batchSize = 64;

  // stream → chunk → batch embed → upsert
  let batchTexts: string[] = [];
  let batchMeta: Chunk[] = [];

  for await (const chunk of chunkTextStreaming({ lineIter: rl, source: filePath })) {
    if (!chunk.text.trim()) continue;

    batchTexts.push(chunk.text);
    batchMeta.push(chunk);

    if (batchTexts.length >= batchSize) {
      const vectors = await embedBatch(batchTexts);
      const upserts = vectors.map((vec, i) => ({
        id: batchMeta[i].id,
        values: vec,
        metadata: {
          source: batchMeta[i].source,
          ord: batchMeta[i].ord,
          text: batchMeta[i].text, // consider truncating if you don’t want full text in metadata
        },
      }));
      await upsertWithRetry(upserts);
      chunks.push(...batchMeta);

      // reset batch
      batchTexts = [];
      batchMeta = [];
    }
  }

  // final partial batch
  if (batchTexts.length) {
    const vectors = await embedBatch(batchTexts);
    const upserts = vectors.map((vec, i) => ({
      id: batchMeta[i].id,
      values: vec,
      metadata: {
        source: batchMeta[i].source,
        ord: batchMeta[i].ord,
        text: batchMeta[i].text,
      },
    }));
    await upsertWithRetry(upserts);
    chunks.push(...batchMeta);
  }

  console.log(`Ingested ${chunks.length} chunks into Pinecone index "${PINECONE_INDEX}" (ns: "${PINECONE_NAMESPACE}").`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
