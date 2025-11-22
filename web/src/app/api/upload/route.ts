
import { NextResponse } from "next/server";
import * as fs from "fs/promises";
import * as path from "path";
import { ingestFile } from "@/lib/rag/ingestor";

// Helper to get DOCS_ROOT
const getDocsRoot = () => {
  return process.env.DOCS_ROOT 
    ? path.resolve(process.env.DOCS_ROOT)
    : path.resolve(process.cwd(), "..", "docs");
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const targetPath = formData.get("targetPath") as string || "";

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No files uploaded" },
        { status: 400 }
      );
    }

    // Sanitize targetPath to prevent directory traversal
    // Allow alphanumeric, underscores, hyphens, and forward slashes
    const sanitizedTargetPath = targetPath.replace(/[^a-zA-Z0-9_\-\/]/g, "");
    // Remove leading/trailing slashes to avoid issues
    const cleanTargetPath = sanitizedTargetPath.replace(/^\/+|\/+$/g, "");

    const docsRoot = getDocsRoot();
    
    // Ensure docs root exists
    await fs.mkdir(docsRoot, { recursive: true });

    let successCount = 0;
    const errors: string[] = [];

    for (const file of files) {
      try {
        // Get the relative path from the filename (we appended it in frontend)
        // or just use the name if no path info
        const originalName = file.name;
        
        // Combine target path with the file's relative path
        const relativeFilePath = cleanTargetPath 
          ? path.join(cleanTargetPath, originalName)
          : originalName;

        const filePath = path.join(docsRoot, relativeFilePath);
        const fileDir = path.dirname(filePath);

        // Ensure the directory exists
        await fs.mkdir(fileDir, { recursive: true });

        const buffer = Buffer.from(await file.arrayBuffer());
        await fs.writeFile(filePath, buffer);

        // Ingest the file
        await ingestFile(filePath, docsRoot);
        successCount++;
      } catch (err) {
        console.error(`Failed to process file ${file.name}:`, err);
        errors.push(file.name);
      }
    }

    if (successCount === 0 && errors.length > 0) {
      return NextResponse.json(
        { error: "Failed to upload any files", details: errors },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      count: successCount,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
