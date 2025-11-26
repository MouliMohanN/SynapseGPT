import { ChromaClient } from "chromadb";
import { ingestDirectory } from "../src/lib/rag/ingestor";
import { createChromaClient } from "../src/lib/rag/chroma-utils";
import * as path from "path";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

const CHROMA_URL = process.env.CHROMA_DB_URL || "http://localhost:8000";
const COLLECTION_NAME = "synapse-gpt";
const DOCS_ROOT = process.env.DOCS_ROOT 
  ? path.resolve(process.env.DOCS_ROOT)
  : path.resolve(process.cwd(), "../docs");

async function rebuildDocsDatabase() {
  try {
    console.log("🗑️  Step 1: Clearing existing documents collection...");
    
    // Use ChromaClient to delete the collection
    const client = createChromaClient(CHROMA_URL);
    
    try {
      await client.deleteCollection({ name: COLLECTION_NAME });
      console.log(`   ✓ Deleted collection: ${COLLECTION_NAME}`);
    } catch (error: any) {
      if (error.constructor.name === "ChromaNotFoundError" || error.message?.includes("does not exist") || error.message?.includes("not found")) {
        console.log(`   ℹ️  Collection ${COLLECTION_NAME} does not exist, skipping deletion.`);
      } else {
        throw error;
      }
    }

    console.log("\n📚 Step 2: Re-ingesting all documents...");
    console.log(`   Source: ${DOCS_ROOT}`);
    
    const result = await ingestDirectory(DOCS_ROOT);

    if (result.success) {
      console.log(`\n✅ Rebuild complete! ${result.message}`);
    } else {
      console.error(`\n❌ Rebuild failed: ${result.message}`);
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Error rebuilding docs database:", error);
    process.exit(1);
  }
}

rebuildDocsDatabase().catch(console.error);
