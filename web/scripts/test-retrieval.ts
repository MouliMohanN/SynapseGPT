
import { retrieveRelevantChunks } from "../src/lib/rag/vectorRetriever";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  const query = "What is SynapseGPT?";
  console.log(`🔍 Testing retrieval for query: "${query}"`);

  const results = await retrieveRelevantChunks(query, 2);

  if (results.length === 0) {
    console.log("❌ No results found. Is the database indexed?");
  } else {
    console.log(`✅ Found ${results.length} results:`);
    results.forEach((r, i) => {
      console.log(`\n--- Result ${i + 1} (Score: ${r.score}) ---`);
      console.log(`Source: ${r.metadata.docName}`);
      console.log(`Content: ${r.content.substring(0, 100)}...`);
    });
  }
}

main().catch(console.error);
