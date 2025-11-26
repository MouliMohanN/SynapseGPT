
import { ingestHistoryVersion } from "../src/lib/rag/diffIngestor";
import { retrieveHistory } from "../src/lib/rag/vectorRetriever";
import { saveHistory } from "../src/lib/history";
import * as fs from "fs/promises";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function runTest() {
  console.log("Starting History RAG Verification...");

  const docId = "test-history-rag.md";
  const docsRoot = path.resolve(__dirname, "../../docs");
  const filePath = path.join(docsRoot, docId);

  // Ensure docs root exists
  await fs.mkdir(docsRoot, { recursive: true });

  // 1. Create Initial Version
  console.log("\n1. Creating initial version...");
  const contentV1 = "# Test Document\n\nThis is version 1.";
  await fs.writeFile(filePath, contentV1, "utf-8");
  
  // 2. Save Version 2 (Low Priority)
  console.log("\n2. Saving Version 2 (Low Priority)...");
  const contentV2 = "# Test Document\n\nThis is version 1.\nFixed a typo.";
  const timestampV2 = await saveHistory(docId, contentV1, contentV2, { hunks: [{ index: 0, priority: "low" }] });
  
  if (timestampV2) {
      console.log(`   Saved V2 at ${timestampV2}`);
      await ingestHistoryVersion(docId, timestampV2, "low");
  }

  // 3. Save Version 3 (High Priority)
  console.log("\n3. Saving Version 3 (High Priority)...");
  const contentV3 = "# Test Document\n\nThis is version 1.\nFixed a typo.\n\n## Major Feature\nAdded a new feature section.";
  const timestampV3 = await saveHistory(docId, contentV2, contentV3, { hunks: [{ index: 0, priority: "high" }] });

  if (timestampV3) {
      console.log(`   Saved V3 at ${timestampV3}`);
      await ingestHistoryVersion(docId, timestampV3, "high");
  }

  // 4. Query History
  console.log("\n4. Querying History...");
  
  // Query 1: Generic "What changed?"
  console.log("   Query: 'What changed in the test document?'");
  const results1 = await retrieveHistory("What changed in the test document?", { limit: 5 });
  results1.forEach(r => {
      console.log(`   - [${r.metadata.priority}] ${r.metadata.timestamp}: ${r.metadata.summary} (Score: ${r.score})`);
  });

  // Query 2: Specific "typo"
  console.log("\n   Query: 'Did we fix any typos?'");
  const results2 = await retrieveHistory("Did we fix any typos?", { limit: 5 });
  results2.forEach(r => {
      console.log(`   - [${r.metadata.priority}] ${r.metadata.timestamp}: ${r.metadata.summary} (Score: ${r.score})`);
  });

  // Cleanup
  console.log("\nCleaning up...");
  await fs.unlink(filePath);
  // Note: We are not cleaning up history/vector store to allow inspection if needed, 
  // but in a real test we might want to.
}

runTest().catch(console.error);
