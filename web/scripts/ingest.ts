
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { OllamaEmbeddings } from "@langchain/ollama";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import * as fs from "fs/promises";
import * as path from "path";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

const DOCS_ROOT = process.env.DOCS_ROOT 
  ? path.resolve(process.env.DOCS_ROOT)
  : path.resolve(process.cwd(), "../docs");

const COLLECTION_NAME = "synapse-gpt";

async function main() {
  console.log(`🚀 Starting ingestion from: ${DOCS_ROOT}`);

  // 1. Initialize Embeddings
  const embeddings = new OllamaEmbeddings({
    model: "nomic-embed-text",
    baseUrl: "http://localhost:11434",
  });

  // 2. Initialize Vector Store
  const vectorStore = await Chroma.fromExistingCollection(embeddings, {
    collectionName: COLLECTION_NAME,
    url: "http://localhost:8000", // Default Chroma URL
  }).catch(() => null);

  // If collection doesn't exist, we'll create it during addDocuments
  
  // 3. Load Documents
  console.log("📂 Loading documents...");
  const documents = await loadDocuments(DOCS_ROOT);
  console.log(`✅ Found ${documents.length} documents.`);

  // 4. Split Text
  console.log("✂️  Splitting text...");
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  const chunks = await splitter.splitDocuments(documents);
  console.log(`🧩 Generated ${chunks.length} chunks.`);

  // 5. Indexing
  console.log("floppy_disk  Indexing to ChromaDB...");
  
  // We use the static method to create/add to the store
  await Chroma.fromDocuments(chunks, embeddings, {
    collectionName: COLLECTION_NAME,
    url: "http://localhost:8000",
  });

  console.log("🎉 Ingestion complete!");
}

// Helper to recursively load documents
async function loadDocuments(dir: string, rootDir: string = dir) {
  const docs: any[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(rootDir, fullPath);

    if (entry.isDirectory()) {
      const nestedDocs = await loadDocuments(fullPath, rootDir);
      docs.push(...nestedDocs);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if ([".md", ".txt", ".mdx"].includes(ext)) {
        const content = await fs.readFile(fullPath, "utf-8");
        docs.push({
          pageContent: content,
          metadata: {
            source: relativePath,
            docId: relativePath, // Match existing system ID format
            docName: entry.name,
          },
        });
      }
    }
  }
  return docs;
}

main().catch(console.error);
