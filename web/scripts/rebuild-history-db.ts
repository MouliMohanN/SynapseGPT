#!/usr/bin/env ts-node

import * as fs from "fs/promises";
import * as path from "path";
import * as dotenv from "dotenv";
import { ingestHistoryVersion } from "../src/lib/rag/diffIngestor";

dotenv.config({ path: ".env.local" });

const DOCS_ROOT = process.env.DOCS_ROOT
  ? path.resolve(process.env.DOCS_ROOT)
  : path.resolve(__dirname, "../../docs");
const HISTORY_DIR = ".history";
const CHROMA_URL = process.env.CHROMA_DB_URL || "http://localhost:8000";
const OLLAMA_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const HISTORY_COLLECTION_NAME = process.env.HISTORY_COLLECTION_NAME || "synapse-gpt-history";

async function clearHistoryCollection() {
  console.log("🗑️  Clearing existing history collection...");
  
  try {
    // Use ChromaClient to delete the collection
    const { ChromaClient } = await import("chromadb");
    const client = new ChromaClient({ path: CHROMA_URL });
    
    try {
      await client.deleteCollection({ name: HISTORY_COLLECTION_NAME });
      console.log("✅ History collection cleared");
    } catch (error: any) {
      if (error.message?.includes("does not exist")) {
        console.log("ℹ️  Collection doesn't exist yet, will be created during ingestion");
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.warn("⚠️  Could not clear collection:", error);
  }
}

async function findAllHistoryFiles(): Promise<Array<{ docId: string; timestamp: string; metaPath: string }>> {
  const historyFiles: Array<{ docId: string; timestamp: string; metaPath: string }> = [];
  const historyRoot = path.join(DOCS_ROOT, HISTORY_DIR);

  try {
    await fs.access(historyRoot);
  } catch {
    // .history directory doesn't exist
    return historyFiles;
  }

  async function scanHistoryDirectory(dir: string, relativePath: string = "") {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        // Recurse into subdirectories
        await scanHistoryDirectory(fullPath, relPath);
      } else if (entry.isFile() && entry.name.endsWith(".meta.json")) {
        // Found a metadata file
        const timestamp = entry.name.replace(".meta.json", "");
        // The relative path up to this file (minus the filename) is the docId
        const docId = relativePath;
        
        historyFiles.push({
          docId,
          timestamp,
          metaPath: fullPath,
        });
      }
    }
  }

  await scanHistoryDirectory(historyRoot);
  return historyFiles;
}

async function rebuildHistoryDatabase() {
  console.log("🔄 Starting history database rebuild...\n");

  // Step 1: Clear existing collection
  await clearHistoryCollection();
  console.log("");

  // Step 2: Find all history files
  console.log("🔍 Scanning for history files...");
  const historyFiles = await findAllHistoryFiles();
  console.log(`✅ Found ${historyFiles.length} history entries\n`, historyFiles);

  if (historyFiles.length === 0) {
    console.log("ℹ️  No history files found. Nothing to ingest.");
    return;
  }

  // Step 3: Re-ingest all history
  console.log("📥 Re-ingesting history entries...\n");
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < historyFiles.length; i++) {
    const { docId, timestamp, metaPath } = historyFiles[i];
    
    try {
      // Read metadata to determine priority
      const metaContent = await fs.readFile(metaPath, "utf-8");
      const metadata = JSON.parse(metaContent);
      
      let priority: "high" | "low" = "low";
      if (metadata.hunks) {
        const hasHigh = metadata.hunks.some((h: any) => h.priority === "high");
        if (hasHigh) priority = "high";
      }

      console.log(`[${i + 1}/${historyFiles.length}] Ingesting: ${docId} @ ${timestamp} (${priority})`);
      
      await ingestHistoryVersion(docId, timestamp, priority);
      successCount++;
    } catch (error) {
      console.error(`❌ Failed to ingest ${docId} @ ${timestamp}:`, error);
      errorCount++;
    }
  }

  console.log("\n✨ Rebuild complete!");
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
}

// Run the script
rebuildHistoryDatabase()
  .then(() => {
    console.log("\n🎉 History database rebuild finished!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Fatal error:", error);
    process.exit(1);
  });
