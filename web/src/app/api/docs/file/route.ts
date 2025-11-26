import { NextResponse } from "next/server";
import * as fs from "fs/promises";
import * as path from "path";
import { ingestFile, removeDocumentFromVectorStore } from "@/lib/rag/ingestor";
import { saveHistory } from "@/lib/history";
import { emitDocEvent } from "@/lib/docEvents";

// Helper to get DOCS_ROOT
const getDocsRoot = () => {
  return process.env.DOCS_ROOT
    ? path.resolve(process.env.DOCS_ROOT)
    : path.resolve(process.cwd(), "..", "docs");
};

const sanitizeSegment = (segment: string): string => {
  return segment.replace(/[\/\\]/g, "").trim();
};

const sanitizeParentPath = (parentPath: string): string => {
  return parentPath.replace(/\.\./g, "").replace(/^\/+|\/+$/g, "");
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      parentPath?: string;
      name?: string;
      content?: string;
      overwrite?: boolean;
      relatedDocId?: string;
    };

    const rawName = body?.name;
    if (!rawName || typeof rawName !== "string") {
      return NextResponse.json(
        { error: "File name is required" },
        { status: 400 },
      );
    }

    let baseName = sanitizeSegment(rawName);
    if (!baseName) {
      return NextResponse.json(
        { error: "Invalid file name" },
        { status: 400 },
      );
    }

    // Ensure we have an extension; default to .md so it appears in the docs tree
    if (!/\.[^./\\]+$/.test(baseName)) {
      baseName = `${baseName}.md`;
    }

    const rawParentPath =
      typeof body.parentPath === "string" ? body.parentPath : "";
    const sanitizedParent = sanitizeParentPath(rawParentPath);

    const relativeFilePath = sanitizedParent
      ? path.join(sanitizedParent, baseName)
      : baseName;

    const docsRoot = getDocsRoot();
    const filePath = path.join(docsRoot, relativeFilePath);

    // Ensure parent directory exists (create intermediate dirs as needed)
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    const exists = await fs
      .access(filePath)
      .then(() => true)
      .catch(() => false);

    if (exists && !body.overwrite) {
      return NextResponse.json(
        { error: "A file with that name already exists" },
        { status: 409 },
      );
    }

    // Create file with provided content or empty string
    const content = typeof body.content === "string" ? body.content : "";

    // Read old content if overwriting (needed for history)
    let oldContent: string | null = null;
    if (exists && body.overwrite) {
      try {
        oldContent = await fs.readFile(filePath, "utf-8");
      } catch (readError) {
        console.error("Failed to read old content for history:", readError);
      }
    }

    // Write the new file content immediately
    await fs.writeFile(filePath, content, "utf-8");

    // Execute non-essential tasks in the background
    const relatedDocId = body.relatedDocId;

    // Execute non-essential tasks in the background
    const backgroundTasks = async () => {
      // Helper to emit to both channels
      const emitToBoth = (type: string, message: string, meta?: any) => {
        emitDocEvent(relativeFilePath, { type, message, meta });
        if (relatedDocId) {
          emitDocEvent(relatedDocId, { type, message, meta });
        }
      };

      // 1. Save History
      if (exists && body.overwrite && oldContent !== null) {
        try {
          emitToBoth("history:start", "Saving edit history...");

          const timestamp = await saveHistory(relativeFilePath, oldContent, content, null);

          emitToBoth("history:complete", "Edit history saved.", { timestamp });
        } catch (historyError) {
          console.error("Failed to save history in background:", historyError);
          emitToBoth("history:error", "Failed to save edit history.", { error: String(historyError) });
        }
      }

      // 2. Ingest into Vector Store
      try {
        emitToBoth("ingest:start", `Indexing ${baseName} for search...`);

        if (exists) {
          await removeDocumentFromVectorStore(relativeFilePath);
        }
        const result = await ingestFile(filePath, docsRoot);

        emitToBoth("ingest:complete", result.message || "Document indexed.", {
            chunksIndexed: result.chunksIndexed,
            success: result.success,
        });
      } catch (ingestError) {
        console.error("Failed to ingest file in background:", ingestError);
        emitToBoth("ingest:error", "Failed to index document.", { error: String(ingestError) });
      }
    };

    // Trigger background tasks without awaiting
    backgroundTasks().catch((err) =>
      console.error("Background task runner failed:", err),
    );

    return NextResponse.json({
      success: true,
      path: relativeFilePath,
      name: baseName,
      backgroundTasks: true,
    });
  } catch (error) {
    console.error("Create file error:", error);
    return NextResponse.json(
      { error: "Failed to create file" },
      { status: 500 },
    );
  }
}
