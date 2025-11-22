
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { OllamaEmbeddings } from "@langchain/ollama";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import * as fs from "fs/promises";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const COLLECTION_NAME = "synapse-gpt";
const CHROMA_URL = process.env.CHROMA_DB_URL || "http://localhost:8000";
const OLLAMA_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

// Initialize Embeddings
const embeddings = new OllamaEmbeddings({
  model: "nomic-embed-text",
  baseUrl: OLLAMA_URL,
});

// Initialize Splitter
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});

interface IngestionResult {
  success: boolean;
  chunksIndexed: number;
  message: string;
}

/**
 * Ingests a single file into the vector store.
 */
export async function ingestFile(filePath: string, rootDir: string): Promise<IngestionResult> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const relativePath = path.relative(rootDir, filePath);
    const docName = path.basename(filePath);

    const document = {
      pageContent: content,
      metadata: {
        source: relativePath,
        docId: relativePath,
        docName: docName,
      },
    };

    return await processDocuments([document]);
  } catch (error) {
    console.error(`Error ingesting file ${filePath}:`, error);
    return { success: false, chunksIndexed: 0, message: String(error) };
  }
}

/**
 * Ingests an entire directory recursively.
 */
export async function ingestDirectory(dir: string): Promise<IngestionResult> {
  try {
    const documents = await loadDocuments(dir, dir);
    if (documents.length === 0) {
      return { success: true, chunksIndexed: 0, message: "No documents found." };
    }
    return await processDocuments(documents);
  } catch (error) {
    console.error(`Error ingesting directory ${dir}:`, error);
    return { success: false, chunksIndexed: 0, message: String(error) };
  }
}

// --- Internal Helpers ---

async function processDocuments(documents: any[]): Promise<IngestionResult> {
  try {
    const chunks = await splitter.splitDocuments(documents);
    
    if (chunks.length > 0) {
      await Chroma.fromDocuments(chunks, embeddings, {
        collectionName: COLLECTION_NAME,
        url: CHROMA_URL,
      });
    }

    return {
      success: true,
      chunksIndexed: chunks.length,
      message: `Successfully indexed ${chunks.length} chunks.`,
    };
  } catch (error) {
    console.error("Error processing documents:", error);
    throw error;
  }
}

async function loadDocuments(dir: string, rootDir: string) {
  const docs: any[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      const nestedDocs = await loadDocuments(fullPath, rootDir);
      docs.push(...nestedDocs);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if ([".md", ".txt", ".mdx"].includes(ext)) {
        const content = await fs.readFile(fullPath, "utf-8");
        const relativePath = path.relative(rootDir, fullPath);
        docs.push({
          pageContent: content,
          metadata: {
            source: relativePath,
            docId: relativePath,
            docName: entry.name,
          },
        });
      }
    }
  }
  return docs;
}
