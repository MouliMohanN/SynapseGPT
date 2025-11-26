import { Chroma } from "@langchain/community/vectorstores/chroma";
import { OllamaEmbeddings } from "@langchain/ollama";
import * as fs from "fs/promises";
import * as path from "path";
import * as dotenv from "dotenv";
import { getPatch, getPatchMetadata } from "@/lib/history";
import { streamOllamaCompletion } from "@/lib/chat/ollamaClient";
import { buildBehavioralPrompt, BehavioralSettings } from "@/lib/chat/settingsMapper";
import { createChromaClient } from "./chroma-utils";

dotenv.config({ path: ".env.local" });

const HISTORY_COLLECTION_NAME = process.env.HISTORY_COLLECTION_NAME || "synapse-gpt-history";
const CHROMA_URL = process.env.CHROMA_DB_URL || "http://localhost:8000";
const OLLAMA_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const SUMMARY_MODEL = process.env.HISTORY_SUMMARY_MODEL || "gpt-oss:20b";

// Initialize Embeddings
const embeddings = new OllamaEmbeddings({
  model: "nomic-embed-text",
  baseUrl: OLLAMA_URL,
});

let historyVectorStorePromise: Promise<Chroma> | null = null;

async function getHistoryVectorStore() {
  if (!historyVectorStorePromise) {
    const client = createChromaClient(CHROMA_URL);
    historyVectorStorePromise = Chroma.fromExistingCollection(embeddings, {
      collectionName: HISTORY_COLLECTION_NAME,
      index: client,
    });
  }
  return historyVectorStorePromise;
}

export interface VersionChangeEvent {
  id: string; // hash(docId + timestamp)
  docId: string;
  timestamp: string;
  priority: "high" | "low";
  summary: string;
  diffStats: {
    additions: number;
    deletions: number;
  };
}

/**
 * Generates a unique ID for the history event.
 */
function generateEventId(docId: string, timestamp: string): string {
  // Simple hash replacement since we don't have crypto in this context easily, 
  // or just use a composite string which Chroma handles.
  // Let's use a base64 encoded composite string to be safe.
  return Buffer.from(`${docId}:${timestamp}`).toString('base64');
}

/**
 * Inverts a reverse patch (New -> Old) to a forward patch (Old -> New)
 * for easier consumption by LLMs and stats counting.
 */
function invertPatch(patchContent: string): string {
  return patchContent.split('\n').map(line => {
    if (line.startsWith('---') || line.startsWith('+++')) return line;
    if (line.startsWith('-')) return '+' + line.slice(1);
    if (line.startsWith('+')) return '-' + line.slice(1);
    return line;
  }).join('\n');
}

/**
 * Summarizes a patch using a local LLM or heuristics.
 */
async function summarizePatch(patchContent: string, priority: string): Promise<string> {
  // Invert patch to make it "Forward" (Old -> New) so "Additions" look like Additions.
  const forwardPatch = invertPatch(patchContent);

  // LLM Summary for all patches
  try {
    const behavior: BehavioralSettings = {
      detailLevel: "detailed",
      tone: "professional",
      generateQuestions: 0
    };
    
    const behavioralPrompt = buildBehavioralPrompt(behavior);

    const prompt = `You are a document analysis assistant. Analyze this change/diff and create a SPECIFIC, DETAILED summary of what was modified.

IMPORTANT RULES:
- Be SPECIFIC about what content was added, modified, or removed
- Include actual names, titles, sections, or key terms that changed
- Mention the PURPOSE or IMPACT of the change when clear from context
- Avoid generic phrases like "updated content" or "made changes"
- Adapt your language to the document type (technical, business, creative, etc.)

GOOD examples:
- "Added authentication middleware with JWT token validation" (technical)
- "Updated Q3 revenue projections from $2M to $2.5M in financial summary" (business)
- "Added new character backstory for protagonist in Chapter 3" (creative)
- "Expanded troubleshooting section with 3 new common error scenarios" (documentation)

BAD examples:
- "A section was added"
- "Fixed a typo"
- "Updated the document"

${behavioralPrompt}

Patch:
${forwardPatch}

Specific summary:`;

    let summary = "";
    const stream = streamOllamaCompletion({
      prompt,
      modelConfig: {
        model: SUMMARY_MODEL,
        temperature: 0.5,
        maxTokens: 131000,
        topP: 0.85,
      }
    });

    for await (const chunk of stream) {
      summary += chunk;
    }
    
    return summary.trim() || "Updated document content.";
  } catch (error) {
    console.error("Failed to generate AI summary for patch:", error);
    return "Updated document content (AI summary failed).";
  }
}

/**
 * Parses basic stats from a unified diff.
 * Note: Since we store Reverse Diffs (New -> Old), 
 * - Lines starting with '-' are present in New but not Old (ADDITIONS).
 * - Lines starting with '+' are present in Old but not New (DELETIONS).
 */
function getDiffStats(patchContent: string) {
  const lines = patchContent.split('\n');
  let additions = 0;
  let deletions = 0;
  
  for (const line of lines) {
    // In Reverse Diff:
    // '-' means it's in Source (New) but not Target (Old) -> It was ADDED.
    if (line.startsWith('-') && !line.startsWith('---')) additions++;
    
    // '+' means it's in Target (Old) but not Source (New) -> It was DELETED.
    if (line.startsWith('+') && !line.startsWith('+++')) deletions++;
  }
  
  return { additions, deletions };
}

/**
 * Ingests a specific history version into the vector store.
 */
export async function ingestHistoryVersion(
  docId: string, 
  timestamp: string, 
  priority: "high" | "low" = "low"
) {
  try {
    const patchContent = await getPatch(docId, timestamp);
    if (!patchContent) {
      console.warn(`No patch found for ${docId} at ${timestamp}`);
      return;
    }

    // 1. Generate Summary
    const summary = await summarizePatch(patchContent, priority);
    const stats = getDiffStats(patchContent);

    // 2. Prepare Document
    const eventId = generateEventId(docId, timestamp);
    
    const document = {
      pageContent: `Change in ${docId} at ${timestamp}: ${summary}\n\nDiff Stats: +${stats.additions} -${stats.deletions}\n\nPatch:\n${patchContent}`,
      metadata: {
        id: eventId,
        docId,
        timestamp,
        priority,
        summary,
        type: "history",
        additions: stats.additions,
        deletions: stats.deletions,
      },
    };

    // 3. Upsert to Chroma
    // Note: We use a separate collection for history
    // We need to handle the case where the collection might not exist yet.
    // LangChain's Chroma wrapper usually creates it if missing, but let's be safe.
    
    // We'll use the static method to add documents which handles initialization better in some versions,
    // or just reuse our getHistoryVectorStore
    const store = await getHistoryVectorStore();
    
    await store.addDocuments([document]);
    
    console.log(`Successfully ingested history version ${timestamp} for ${docId}`);
    return true;

  } catch (error) {
    console.error(`Error ingesting history for ${docId} at ${timestamp}:`, error);
    return false;
  }
}

/**
 * Deletes all history events for a document.
 */
export async function deleteHistoryIndex(docId: string) {
  try {
    const store = await getHistoryVectorStore();
    await store.delete({
      filter: { docId },
    });
  } catch (error) {
    console.error(`Error deleting history index for ${docId}:`, error);
  }
}
