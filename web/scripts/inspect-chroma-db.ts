import { ChromaClient } from "chromadb";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

const CHROMA_URL = process.env.CHROMA_DB_URL || "http://localhost:8000";

async function inspectDatabase() {
  try {
    console.log("🔍 Connecting to ChromaDB...");
    const client = new ChromaClient({ path: CHROMA_URL });

    console.log("📋 Fetching all collections...\n");
    const collections = await client.listCollections();

    if (collections.length === 0) {
      console.log("⚠️  No collections found in the database.");
      return;
    }

    console.log(`Found ${collections.length} collection(s):\n`);

    for (const collectionInfo of collections) {
      const collection = await client.getCollection({ name: collectionInfo.name });
      const count = await collection.count();

      console.log(`📦 Collection: ${collectionInfo.name}`);
      console.log(`   Documents: ${count}`);
      console.log(`   ID: ${collectionInfo.id}`);

      // Get a sample of documents
      if (count > 0) {
        const sample = await collection.peek({ limit: 3 });
        console.log(`   Sample IDs: ${sample.ids.slice(0, 3).join(", ")}`);
        
        if (sample.metadatas && sample.metadatas.length > 0) {
          console.log(`   Sample Metadata:`, JSON.stringify(sample.metadatas[0], null, 2));
        }
      }
      console.log("");
    }

    console.log("✅ Inspection complete!");
  } catch (error) {
    console.error("❌ Error inspecting ChromaDB:", error);
    process.exit(1);
  }
}

inspectDatabase().catch(console.error);
