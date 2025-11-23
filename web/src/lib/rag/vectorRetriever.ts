
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { OllamaEmbeddings } from "@langchain/ollama";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const COLLECTION_NAME = "synapse-gpt";
const HISTORY_COLLECTION_NAME = process.env.HISTORY_COLLECTION_NAME || "synapse-gpt-history";
const CHROMA_URL = process.env.CHROMA_DB_URL || "http://localhost:8000";
const OLLAMA_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const RERANK_RECENT_WEIGHT = parseFloat(process.env.RERANK_RECENT_WEIGHT || "1.2");

// Initialize the vector store client
const embeddings = new OllamaEmbeddings({
  model: "nomic-embed-text",
  baseUrl: OLLAMA_URL,
});

// Main Doc Store
const vectorStore = new Chroma(embeddings, {
  collectionName: COLLECTION_NAME,
  url: CHROMA_URL,
});

// History Store (Lazy init handled by Chroma wrapper usually, but we define it here)
const historyVectorStore = new Chroma(embeddings, {
  collectionName: HISTORY_COLLECTION_NAME,
  url: CHROMA_URL,
});

export interface RetrievedChunk {
  content: string;
  score: number;
  metadata: {
    source: string;
    docId: string;
    docName?: string;
    // History specific
    timestamp?: string;
    priority?: string;
    summary?: string;
    type?: string;
    additions?: number;
    deletions?: number;
  };
}

export async function retrieveRelevantChunks(
  query: string,
  k: number = 4
): Promise<RetrievedChunk[]> {
  try {
    const results = await vectorStore.similaritySearchWithScore(query, k);

    return results.map(([doc, score]) => ({
      content: doc.pageContent,
      score: score, 
      metadata: {
        source: doc.metadata.source as string,
        docId: doc.metadata.docId as string,
        docName: doc.metadata.docName as string,
      },
    }));
  } catch (error) {
    console.error("Error querying ChromaDB (Docs):", error);
    return [];
  }
}

export interface HistoryRetrievalOptions {
  priority?: "high" | "low";
  limit?: number;
}

export async function retrieveHistory(
  query: string,
  options: HistoryRetrievalOptions = {}
): Promise<RetrievedChunk[]> {
  const k = options.limit || 5;
  
  try {
    // Build filter
    const filter: any = {};
    const andConditions: any[] = []; // Initialize andConditions

    if (options.priority) {
      andConditions.push({ priority: options.priority });
    }

    if (andConditions.length > 0) {
      filter.$and = andConditions;
    }

    const effectiveFilter = Object.keys(filter).length > 0 ? filter : undefined;

    // Embed the query for similaritySearchVectorWithScore
    const queryEmbedding = await embeddings.embedQuery(query);

    const results = await historyVectorStore.similaritySearchVectorWithScore(queryEmbedding, k, effectiveFilter);

    // Map and Rerank
    const chunks = results.map(([doc, score]) => {
      let adjustedScore = score;
      
      // Simple Time Decay Reranking (Boost recent)
      // Chroma score is distance (lower is better), so we divide by weight to lower the distance
      if (doc.metadata.timestamp) {
        const date = new Date(doc.metadata.timestamp as string);
        const now = new Date();
        const daysDiff = (now.getTime() - date.getTime()) / (1000 * 3600 * 24);
        
        // Boost if recent (< 7 days)
        if (daysDiff < 7) {
           adjustedScore = score / RERANK_RECENT_WEIGHT;
        }
      }

      return {
        content: doc.pageContent,
        score: adjustedScore,
        metadata: {
          source: doc.metadata.docId as string, // Use docId as source for display
          docId: doc.metadata.docId as string,
          timestamp: doc.metadata.timestamp as string,
          priority: doc.metadata.priority as string,
          summary: doc.metadata.summary as string,
          type: "history",
          additions: doc.metadata.additions as number,
          deletions: doc.metadata.deletions as number,
        },
      };
    });

    // Re-sort based on adjusted score (ascending distance)
    return chunks.sort((a, b) => a.score - b.score);

  } catch (error) {
    console.error("Error querying ChromaDB (History):", error);
    return [];
  }
}
