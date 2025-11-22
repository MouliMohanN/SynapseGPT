
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { OllamaEmbeddings } from "@langchain/ollama";

const COLLECTION_NAME = "synapse-gpt";
const CHROMA_URL = "http://localhost:8000";

// Initialize the vector store client
// We use a singleton pattern or lazy initialization to avoid setting it up on every request if possible,
// but for Next.js serverless functions, simple initialization is often safest.
const embeddings = new OllamaEmbeddings({
  model: "nomic-embed-text",
  baseUrl: "http://localhost:11434",
});

const vectorStore = new Chroma(embeddings, {
  collectionName: COLLECTION_NAME,
  url: CHROMA_URL,
});

export interface RetrievedChunk {
  content: string;
  score: number;
  metadata: {
    source: string;
    docId: string;
    docName?: string;
  };
}

export async function retrieveRelevantChunks(
  query: string,
  k: number = 4
): Promise<RetrievedChunk[]> {
  try {
    // Perform similarity search with score
    // The score from Chroma is a "distance" (lower is better), but LangChain might normalize it.
    // Let's check the raw output.
    const results = await vectorStore.similaritySearchWithScore(query, k);

    return results.map(([doc, score]) => ({
      content: doc.pageContent,
      // Chroma returns distance, so we might want to invert it or just return as is.
      // For now, let's return the raw score/distance.
      score: score, 
      metadata: {
        source: doc.metadata.source as string,
        docId: doc.metadata.docId as string,
        docName: doc.metadata.docName as string,
      },
    }));
  } catch (error) {
    console.error("Error querying ChromaDB:", error);
    return [];
  }
}
