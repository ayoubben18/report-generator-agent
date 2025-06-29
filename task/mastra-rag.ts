import { embedMany } from "ai";
import { openai } from "@ai-sdk/openai";
import { UpstashVector } from "@mastra/upstash";
import { MDocument } from "@mastra/rag";
import { z } from "zod";

// 1. Initialize document
const doc = MDocument.fromText(`Your document text here...`);

// 2. Create chunks
const chunks = await doc.chunk({
    strategy: "recursive",
    size: 512,
    overlap: 50,
});

// 3. Generate embeddings; we need to pass the text of each chunk
const { embeddings } = await embedMany({
    values: chunks.map((chunk) => chunk.text),
    model: openai.embedding("text-embedding-3-small"),
});

// 4. Store in vector database
const store = new UpstashVector({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
await store.upsert({
    indexName: "myCollection", // the namespace name in Upstash
    vectors: embeddings,
    metadata: chunks.map(chunk => ({ text: chunk.text })),
}); // using an index name of 'embeddings'

// 5. Query similar chunks
const results = await store.query({
    indexName: "myCollection",
    queryVector: embeddings[0],
    topK: 3,
}); // queryVector is the embedding of the query

console.log("Similar chunks:", results);