
import { ingestDirectory } from "../src/lib/rag/ingestor";
import * as path from "path";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

const DOCS_ROOT = process.env.DOCS_ROOT 
  ? path.resolve(process.env.DOCS_ROOT)
  : path.resolve(process.cwd(), "../docs");

async function main() {
  console.log(`🚀 Starting ingestion from: ${DOCS_ROOT}`);
  
  const result = await ingestDirectory(DOCS_ROOT);

  if (result.success) {
    console.log(`🎉 Ingestion complete! ${result.message}`);
  } else {
    console.error(`❌ Ingestion failed: ${result.message}`);
    process.exit(1);
  }
}

main().catch(console.error);
