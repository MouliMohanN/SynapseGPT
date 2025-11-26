import { ChromaClient } from "chromadb";
import * as dotenv from "dotenv";
import { createChromaClient } from "../src/lib/rag/chroma-utils";

// Load environment variables
dotenv.config({ path: ".env.local" });

const CHROMA_URL = process.env.CHROMA_DB_URL || "http://localhost:8000";

async function clearAllCollections() {
  try {
    console.log("🔍 Connecting to ChromaDB...");
    const client = createChromaClient(CHROMA_URL);

    console.log("📋 Fetching all collections...");
    const collections = await client.listCollections();

    if (collections.length === 0) {
      console.log("✅ No collections found. Database is already empty.");
      return;
    }

    console.log(`Found ${collections.length} collection(s):`);
    collections.forEach((col) => console.log(`  - ${col.name}`));

    console.log("\n🗑️  Deleting all collections...");
    for (const collection of collections) {
      await client.deleteCollection({ name: collection.name });
      console.log(`  ✓ Deleted: ${collection.name}`);
    }

    console.log("\n✅ All collections cleared successfully!");
  } catch (error) {
    console.error("❌ Error clearing ChromaDB:", error);
    process.exit(1);
  }
}

clearAllCollections().catch(console.error);
