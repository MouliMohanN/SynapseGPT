import * as fs from "fs/promises";
import * as path from "path";
import { createPatch, applyPatch } from "diff";

// Helper to get DOCS_ROOT (duplicated from route.ts to avoid circular deps if any, 
// but ideally should be shared config. For now, keeping it self-contained or imported if possible.
// We'll re-implement the getDocsRoot logic here to be safe.)
const getDocsRoot = () => {
  return process.env.DOCS_ROOT
    ? path.resolve(process.env.DOCS_ROOT)
    : path.resolve(process.cwd(), "..", "docs");
};

const getHistoryRoot = () => {
  return path.join(getDocsRoot(), ".history");
};

export interface HistoryVersion {
  timestamp: string;
  size: number;
}

export type HistoryPriority = "low" | "high";

export interface HistoryHunkPriority {
  index: number;
  priority: HistoryPriority;
}

export interface HistoryPatchMetadata {
  hunks: HistoryHunkPriority[];
}

/**
 * Saves a "Reverse Patch" so we can reconstruct the old content from the new content later.
 * 
 * @param docId The relative path of the document (e.g. "folder/file.md")
 * @param oldContent The content BEFORE the update
 * @param newContent The content AFTER the update
 */
export async function saveHistory(
  docId: string,
  oldContent: string,
  newContent: string,
  metadata?: HistoryPatchMetadata | null,
) {
  try {
    const historyRoot = getHistoryRoot();
    const docHistoryDir = path.join(historyRoot, docId);

    // Ensure history directory exists
    await fs.mkdir(docHistoryDir, { recursive: true });

    const timestamp = new Date().toISOString();
    
    // Create a patch that transforms NEW -> OLD.
    // When we want to go back in time, we start with CURRENT (which is NEW) 
    // and apply this patch to get OLD.
    const patch = createPatch(path.basename(docId), newContent, oldContent);

    const patchPath = path.join(docHistoryDir, `${timestamp}.patch`);
    await fs.writeFile(patchPath, patch, "utf-8");

    if (metadata && Array.isArray(metadata.hunks) && metadata.hunks.length > 0) {
      const metaPath = path.join(docHistoryDir, `${timestamp}.meta.json`);
      await fs.writeFile(metaPath, JSON.stringify(metadata), "utf-8");
    }
    
    console.log(`Saved history patch for ${docId} at ${timestamp}`);
  } catch (error) {
    console.error("Failed to save history:", error);
    // We don't want to block the main save operation if history fails
  }
}

/**
 * Returns a list of available versions for a document.
 */
export async function getHistory(docId: string): Promise<HistoryVersion[]> {
  try {
    const historyRoot = getHistoryRoot();
    const docHistoryDir = path.join(historyRoot, docId);

    // Check if history dir exists
    const exists = await fs.access(docHistoryDir).then(() => true).catch(() => false);
    if (!exists) {
      return [];
    }

    const files = await fs.readdir(docHistoryDir);
    const versions: HistoryVersion[] = [];

    for (const file of files) {
      if (file.endsWith(".patch")) {
        const filePath = path.join(docHistoryDir, file);
        const stats = await fs.stat(filePath);
        const timestamp = path.basename(file, ".patch");
        versions.push({
          timestamp,
          size: stats.size,
        });
      }
    }

    // Sort by timestamp descending (newest first)
    return versions.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  } catch (error) {
    console.error("Failed to get history:", error);
    return [];
  }
}

/**
 * Reconstructs a specific version of the document by applying reverse patches.
 */
export async function getVersion(docId: string, targetTimestamp: string): Promise<string | null> {
  try {
    const docsRoot = getDocsRoot();
    const historyRoot = getHistoryRoot();
    const docHistoryDir = path.join(historyRoot, docId);
    
    // 1. Read the CURRENT (latest) content from disk
    const currentFilePath = path.join(docsRoot, docId);
    let content = await fs.readFile(currentFilePath, "utf-8");

    // 2. Get all patches sorted by timestamp DESC (Newest -> Oldest)
    // We need to apply patches in reverse order of time:
    // Current -> Patch(T_now -> T_prev1) -> Patch(T_prev1 -> T_prev2) ... -> Target
    const versions = await getHistory(docId);
    
    // Filter patches: We need all patches that are NEWER than the target timestamp,
    // AND the patch for the target timestamp itself (to get to that state).
    // Actually, if we have:
    // V3 (Current)
    // Patch V3->V2 (Timestamp T2)
    // Patch V2->V1 (Timestamp T1)
    //
    // If we want V2 (Timestamp T2): We apply Patch(T2).
    // If we want V1 (Timestamp T1): We apply Patch(T2) then Patch(T1).
    
    // So we need all patches where timestamp >= targetTimestamp
    const patchesToApply = versions.filter(v => v.timestamp >= targetTimestamp);
    
    // Sort them Newest -> Oldest (which they already are from getHistory)
    // Just to be safe:
    patchesToApply.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    for (const version of patchesToApply) {
      const patchPath = path.join(docHistoryDir, `${version.timestamp}.patch`);
      const patchContent = await fs.readFile(patchPath, "utf-8");
      
      // Apply the patch. 
      // Since our patch is NEW -> OLD, applying it to NEW gives OLD.
      const result = applyPatch(content, patchContent);
      
      if (result === false) {
        throw new Error(`Failed to apply patch for version ${version.timestamp}`);
      }
      
      content = result;
    }

    return content;
  } catch (error) {
    console.error("Failed to reconstruct version:", error);
    return null;
  }
}

export async function getPatch(docId: string, timestamp: string): Promise<string | null> {
  try {
    const historyRoot = getHistoryRoot();
    const docHistoryDir = path.join(historyRoot, docId);
    const patchPath = path.join(docHistoryDir, `${timestamp}.patch`);
    const exists = await fs.access(patchPath).then(() => true).catch(() => false);
    if (!exists) {
      return null;
    }
    const patchContent = await fs.readFile(patchPath, "utf-8");
    return patchContent;
  } catch (error) {
    console.error("Failed to read patch:", error);
    return null;
  }
}

export async function getPatchMetadata(docId: string, timestamp: string): Promise<HistoryPatchMetadata | null> {
  try {
    const historyRoot = getHistoryRoot();
    const docHistoryDir = path.join(historyRoot, docId);
    const metaPath = path.join(docHistoryDir, `${timestamp}.meta.json`);
    const exists = await fs.access(metaPath).then(() => true).catch(() => false);
    if (!exists) {
      return null;
    }
    const raw = await fs.readFile(metaPath, "utf-8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as any).hunks)) {
      return null;
    }
    return parsed as HistoryPatchMetadata;
  } catch (error) {
    console.error("Failed to read patch metadata:", error);
    return null;
  }
}
