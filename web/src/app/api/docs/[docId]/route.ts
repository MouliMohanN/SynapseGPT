import { NextResponse } from "next/server";
import * as fs from "fs/promises";
import * as path from "path";
import { ingestFile, removeDocumentFromVectorStore } from "@/lib/rag/ingestor";

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

    // Delete the file
    await fs.unlink(filePath);

    // Remove embeddings from the vector store
    await removeDocumentFromVectorStore(sanitizedDocId);
    
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
    const newPath = path.join(path.dirname(oldPath), sanitizedNewName);

    // Verify old file exists
    const realOldPath = await fs.realpath(oldPath).catch(() => null);
    if (!realOldPath || !realOldPath.startsWith(docsRoot)) {
      return NextResponse.json(
        { error: "Invalid file path" },
        { status: 400 }
      );
    }

    // Check if new name already exists
    const newExists = await fs.access(newPath).then(() => true).catch(() => false);
    if (newExists) {
      return NextResponse.json(
        { error: "A file with that name already exists" },
        { status: 409 }
      );
    }

    // Rename the file on disk
    await fs.rename(oldPath, newPath);

    // Remove old embeddings and re-ingest the file under the new docId
    await removeDocumentFromVectorStore(sanitizedDocId);
    await ingestFile(newPath, docsRoot);

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
    const { content } = await request.json();

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
