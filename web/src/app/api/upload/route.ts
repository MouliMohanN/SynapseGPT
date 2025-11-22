
import { NextResponse } from "next/server";
import * as fs from "fs/promises";
import * as path from "path";
import { ingestFile } from "@/lib/rag/ingestor";
import { convertDocumentToMarkdown, isSupportedByDocling } from "@/lib/pythonBridge";

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
        
        // Save the original file
        await fs.writeFile(filePath, buffer);

        // Check if file needs conversion
        const ext = path.extname(originalName).toLowerCase();
        const isMarkdown = ext === ".md" || ext === ".txt";
        
        let fileToIngest = filePath;
        
        if (!isMarkdown && isSupportedByDocling(originalName)) {
          // Convert to Markdown using Docling
          console.log(`Converting ${originalName} to Markdown...`);
          const conversionResult = await convertDocumentToMarkdown(filePath);
          
          if (conversionResult.success && conversionResult.markdown) {
            // Save the converted Markdown
            const mdFileName = originalName.replace(/\.[^.]+$/, ".md");
            const mdRelativePath = cleanTargetPath 
              ? path.join(cleanTargetPath, mdFileName)
              : mdFileName;
            const mdFilePath = path.join(docsRoot, mdRelativePath);
            
            await fs.writeFile(mdFilePath, conversionResult.markdown, "utf-8");
            fileToIngest = mdFilePath;
            console.log(`Successfully converted ${originalName} to ${mdFileName}`);
            
            // Delete the original file after successful conversion
            await fs.unlink(filePath);
            console.log(`Deleted original file: ${originalName}`);
          } else {
            console.error(`Failed to convert ${originalName}:`, conversionResult.error);
            errors.push(`${file.name} (conversion failed)`);
            continue;
          }
        }

        // Ingest the file (either original .md/.txt or converted .md)
        await ingestFile(fileToIngest, docsRoot);
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
