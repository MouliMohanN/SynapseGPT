import { NextResponse } from "next/server";
import * as fs from "fs/promises";
import * as path from "path";
import { ingestFile, removeDocumentFromVectorStore } from "@/lib/rag/ingestor";
import { saveHistory } from "@/lib/history";

// Helper to get DOCS_ROOT
const getDocsRoot = () => {
  return process.env.DOCS_ROOT 
    ? path.resolve(process.env.DOCS_ROOT)
    : path.resolve(process.cwd(), "..", "docs");
};

// Sanitize document ID to prevent directory traversal
const sanitizeDocId = (docId: string): string => {
  // Remove any path traversal attempts
  return docId.replace(/\.\./g, "").replace(/^\/+/, "");
};

const TEXT_EXTENSIONS = new Set([".md", ".txt", ".mdx"]);

async function collectDocIdsInDirectory(
  dirPath: string,
  docsRoot: string,
): Promise<string[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const docIds: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      const childDocIds = await collectDocIdsInDirectory(fullPath, docsRoot);
      docIds.push(...childDocIds);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (TEXT_EXTENSIONS.has(ext)) {
        const relativePath = path.relative(docsRoot, fullPath);
        docIds.push(relativePath);
      }
    }
  }

  return docIds;
}

async function removeDirectoryFromVectorStore(
  dirPath: string,
  docsRoot: string,
) {
  const docIds = await collectDocIdsInDirectory(dirPath, docsRoot);
  for (const docId of docIds) {
    await removeDocumentFromVectorStore(docId);
  }
}

async function ingestDirectoryFiles(dirPath: string, docsRoot: string) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      await ingestDirectoryFiles(fullPath, docsRoot);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (TEXT_EXTENSIONS.has(ext)) {
        await ingestFile(fullPath, docsRoot);
      }
    }
  }
}

// GET - Fetch document content
export async function GET(
  request: Request,
  { params }: { params: Promise<{ docId: string }> }
) {
  try {
    const { docId: rawDocId } = await params;
    const docId = decodeURIComponent(rawDocId);
    const sanitizedDocId = sanitizeDocId(docId);
    const docsRoot = getDocsRoot();
    const filePath = path.join(docsRoot, sanitizedDocId);

    // Verify file exists and is within docs root
    const realPath = await fs.realpath(filePath).catch(() => null);
    if (!realPath || !realPath.startsWith(docsRoot)) {
      return NextResponse.json(
        { error: "Invalid file path" },
        { status: 400 }
      );
    }

    // Read file content and stats
    const content = await fs.readFile(filePath, "utf-8");
    const stats = await fs.stat(filePath);
    
    // Extract sections from markdown headings
    const sections = extractSections(content);
    
    // Get file extension
    const fileExt = path.extname(sanitizedDocId).slice(1) || "txt";

    return NextResponse.json({ 
      id: sanitizedDocId,
      name: path.basename(sanitizedDocId),
      path: sanitizedDocId,
      rawText: content,
      sections,
      meta: {
        size: content.length,
        lastModified: stats.mtime.toISOString(),
        fileType: fileExt,
      }
    });
  } catch (error) {
    console.error("Get document error:", error);
    return NextResponse.json(
      { error: "Failed to load document" },
      { status: 500 }
    );
  }
}

// Helper function to extract sections from markdown
function extractSections(content: string) {
  const sections = [];
  const lines = content.split('\n');
  let currentOffset = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    
    if (headingMatch) {
      const level = headingMatch[1].length;
      const title = headingMatch[2].trim();
      const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      
      sections.push({
        id,
        title,
        startOffset: currentOffset,
        endOffset: currentOffset + line.length,
        level,
      });
    }
    
    currentOffset += line.length + 1; // +1 for newline
  }
  
  return sections;
}

// DELETE - Remove a document
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ docId: string }> }
) {
  try {
    const { docId: rawDocId } = await params;
    const docId = decodeURIComponent(rawDocId);
    const sanitizedDocId = sanitizeDocId(docId);
    const docsRoot = getDocsRoot();
    const filePath = path.join(docsRoot, sanitizedDocId);

    // Verify file exists and is within docs root
    const realPath = await fs.realpath(filePath).catch(() => null);
    if (!realPath || !realPath.startsWith(docsRoot)) {
      return NextResponse.json(
        { error: "Invalid file path" },
        { status: 400 }
      );
    }

    const stats = await fs.stat(filePath);

    if (stats.isDirectory()) {
      await removeDirectoryFromVectorStore(filePath, docsRoot);
      await fs.rm(filePath, { recursive: true, force: true });
    } else {
      // Delete the file
      await fs.unlink(filePath);

      // Remove embeddings from the vector store
      await removeDocumentFromVectorStore(sanitizedDocId);
    }
    
    return NextResponse.json({ 
      success: true,
      message: `Deleted ${sanitizedDocId}` 
    });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
}

// PATCH - Rename a document
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ docId: string }> }
) {
  try {
    const { docId: rawDocId } = await params;
    const docId = decodeURIComponent(rawDocId);
    const sanitizedDocId = sanitizeDocId(docId);
    const { newName } = await request.json();

    if (!newName || typeof newName !== "string") {
      return NextResponse.json(
        { error: "New name is required" },
        { status: 400 }
      );
    }

    // Sanitize new name (no path separators)
    const sanitizedNewName = newName.replace(/[\/\\]/g, "").trim();
    if (!sanitizedNewName) {
      return NextResponse.json(
        { error: "Invalid new name" },
        { status: 400 }
      );
    }

    const docsRoot = getDocsRoot();
    const oldPath = path.join(docsRoot, sanitizedDocId);

    // Verify old file exists
    const realOldPath = await fs.realpath(oldPath).catch(() => null);
    if (!realOldPath || !realOldPath.startsWith(docsRoot)) {
      return NextResponse.json(
        { error: "Invalid file path" },
        { status: 400 }
      );
    }

    const oldStats = await fs.stat(oldPath);
    let newPath: string;

    if (oldStats.isDirectory()) {
      // Folders can be freely renamed using the provided name.
      newPath = path.join(path.dirname(oldPath), sanitizedNewName);

      // Check if new folder name already exists
      const newExists = await fs.access(newPath).then(() => true).catch(() => false);
      if (newExists) {
        return NextResponse.json(
          { error: "A file or folder with that name already exists" },
          { status: 409 }
        );
      }

      // Collect existing docIds under the old folder so we can remove them
      // from the vector store before re-ingesting under the new path.
      const oldDocIds = await collectDocIdsInDirectory(oldPath, docsRoot);

      // Rename the folder on disk
      await fs.rename(oldPath, newPath);

      for (const id of oldDocIds) {
        await removeDocumentFromVectorStore(id);
      }

      // Re-ingest all supported documents under the new folder path
      await ingestDirectoryFiles(newPath, docsRoot);
    } else {
      // For files, only allow renaming the basename while preserving the
      // original extension. Changing the extension (type) is not allowed.
      const oldExt = path.extname(oldPath);
      const requestedExt = path.extname(sanitizedNewName);

      let baseName = sanitizedNewName;
      if (requestedExt) {
        if (requestedExt.toLowerCase() !== oldExt.toLowerCase()) {
          return NextResponse.json(
            { error: "Changing file type is not allowed" },
            { status: 400 },
          );
        }
        baseName = path.basename(sanitizedNewName, requestedExt);
      }

      const finalFileName = `${baseName}${oldExt}`;
      newPath = path.join(path.dirname(oldPath), finalFileName);

      // Check if a file with the target name already exists
      const newExists = await fs.access(newPath).then(() => true).catch(() => false);
      if (newExists) {
        return NextResponse.json(
          { error: "A file or folder with that name already exists" },
          { status: 409 }
        );
      }

      // Rename the file on disk
      await fs.rename(oldPath, newPath);

      // Remove old embeddings and re-ingest the file under the new docId
      await removeDocumentFromVectorStore(sanitizedDocId);
      await ingestFile(newPath, docsRoot);
    }

    const newDocId = path.relative(docsRoot, newPath);
    return NextResponse.json({ 
      success: true,
      newDocId,
      message: `Renamed to ${sanitizedNewName}` 
    });
  } catch (error) {
    console.error("Rename error:", error);
    return NextResponse.json(
      { error: "Failed to rename document" },
      { status: 500 }
    );
  }
}

// PUT - Update document content
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ docId: string }> }
) {
  try {
    const { docId: rawDocId } = await params;
    const docId = decodeURIComponent(rawDocId);
    const sanitizedDocId = sanitizeDocId(docId);
    const { content, historyMetadata } = await request.json();

    if (typeof content !== "string") {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    const docsRoot = getDocsRoot();
    const filePath = path.join(docsRoot, sanitizedDocId);

    // Verify file exists and is within docs root
    const realPath = await fs.realpath(filePath).catch(() => null);
    if (!realPath || !realPath.startsWith(docsRoot)) {
      return NextResponse.json(
        { error: "Invalid file path" },
        { status: 400 }
      );
    }

    // Read old content for history
    let oldContent = "";
    try {
      oldContent = await fs.readFile(filePath, "utf-8");
    } catch (error) {
      // File might not exist or be readable, just ignore history for this first save
      console.log("No previous content found for history.", error);
    }

    // Save history (Reverse Delta)
    if (oldContent) {
       await saveHistory(sanitizedDocId, oldContent, content, historyMetadata ?? null);
    }
    
    // Save updated content
    await fs.writeFile(filePath, content, "utf-8");

    // Re-ingest to update embeddings
    await ingestFile(filePath, docsRoot);

    return NextResponse.json({ 
      success: true,
      message: "Document updated and re-ingested" 
    });
  } catch (error) {
    console.error("Update error:", error);
    return NextResponse.json(
      { error: "Failed to update document" },
      { status: 500 }
    );
  }
}
