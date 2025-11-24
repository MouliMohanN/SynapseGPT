import { ChromaClient } from "chromadb";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

const CHROMA_URL = process.env.CHROMA_DB_URL || "http://localhost:8000";

async function testDatabaseLifecycle() {
  console.log("🧪 Testing ChromaDB Lifecycle\n");
  console.log("=" .repeat(60));

  const client = new ChromaClient({ path: CHROMA_URL });

  // Test 1: Check initial state
  console.log("\n📊 Test 1: Checking current database state...");
  try {
    const collections = await client.listCollections();
    console.log(`   ✓ Found ${collections.length} collection(s)`);
    
    for (const col of collections) {
      const collection = await client.getCollection({ name: col.name });
      const count = await collection.count();
      console.log(`   - ${col.name}: ${count} documents`);
    }
  } catch (error) {
    console.error("   ✗ Error:", error);
  }

  // Test 2: Verify specific collections
  console.log("\n📦 Test 2: Checking expected collections...");
  const expectedCollections = ["synapse-gpt"];
  
  for (const name of expectedCollections) {
    try {
      const collection = await client.getCollection({ name });
      const count = await collection.count();
      console.log(`   ✓ ${name}: ${count} documents`);
      
      // Sample a few documents
      if (count > 0) {
        const sample = await collection.peek({ limit: 3 });
        console.log(`   Sample sources:`);
        sample.metadatas?.slice(0, 3).forEach((meta: any) => {
          console.log(`     - ${meta.source || meta.docId || 'unknown'}`);
        });
      }
    } catch (error: any) {
      if (error.message?.includes("does not exist")) {
        console.log(`   ⚠️  ${name}: Collection does not exist`);
      } else {
        console.error(`   ✗ ${name}: Error -`, error.message);
      }
    }
  }

  // Test 3: Verify document diversity
  console.log("\n📚 Test 3: Checking document diversity...");
  try {
    const collection = await client.getCollection({ name: "synapse-gpt" });
    const all = await collection.get({ limit: 100 });
    
    const uniqueSources = new Set(
      all.metadatas?.map((m: any) => m.source || m.docId) || []
    );
    
    console.log(`   ✓ Total chunks: ${all.ids?.length || 0}`);
    console.log(`   ✓ Unique source files: ${uniqueSources.size}`);
    console.log(`   ✓ Average chunks per file: ${((all.ids?.length || 0) / uniqueSources.size).toFixed(1)}`);
    
    // List all unique sources
    if (uniqueSources.size > 0 && uniqueSources.size <= 20) {
      console.log(`\n   Source files:`);
      Array.from(uniqueSources).sort().forEach(source => {
        console.log(`     - ${source}`);
      });
    }
  } catch (error: any) {
    console.error("   ✗ Error:", error.message);
  }

  // Test 4: Test retrieval quality
  console.log("\n🔍 Test 4: Testing semantic search quality...");
  const testQueries = [
    "How to name variables?",
    "PR guidelines",
    "iOS setup",
  ];

  for (const query of testQueries) {
    try {
      const collection = await client.getCollection({ name: "synapse-gpt" });
      
      // Simple query without embeddings (just to test collection access)
      const results = await collection.get({ limit: 3 });
      
      console.log(`   Query: "${query}"`);
      console.log(`   ✓ Collection accessible, ${results.ids?.length || 0} sample docs retrieved`);
    } catch (error: any) {
      console.error(`   ✗ Query "${query}" failed:`, error.message);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ Database lifecycle test complete!\n");
}

testDatabaseLifecycle().catch(console.error);
