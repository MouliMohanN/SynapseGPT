import { NextResponse } from "next/server";
import * as fs from "fs/promises";
import * as path from "path";

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

    if (exists) {
      return NextResponse.json(
        { error: "A file with that name already exists" },
        { status: 409 },
      );
    }

    // Create an empty file; it will be ingested once the user edits and saves it
    await fs.writeFile(filePath, "", "utf-8");

    return NextResponse.json({
      success: true,
      path: relativeFilePath,
      name: baseName,
    });
  } catch (error) {
    console.error("Create file error:", error);
    return NextResponse.json(
      { error: "Failed to create file" },
      { status: 500 },
    );
  }
}
