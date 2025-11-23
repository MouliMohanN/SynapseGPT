import { NextResponse } from "next/server";
import * as fs from "fs/promises";
import * as path from "path";
import { getDocsTree, DOCS_ROOT } from "@/lib/docProvider";

export async function GET() {
  const docs = await getDocsTree();
  return NextResponse.json({ docs });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      parentPath?: string;
      name?: string;
    };

    const rawName = body?.name;
    if (!rawName || typeof rawName !== "string") {
      return NextResponse.json(
        { error: "Folder name is required" },
        { status: 400 },
      );
    }

    const sanitizedName = rawName.replace(/[\/\\]/g, "").trim();
    if (!sanitizedName) {
      return NextResponse.json(
        { error: "Invalid folder name" },
        { status: 400 },
      );
    }

    const rawParentPath =
      typeof body.parentPath === "string" ? body.parentPath : "";

    const sanitizedParentPath = rawParentPath
      .replace(/\.\./g, "")
      .replace(/^\/+|\/+$/g, "");

    const relativeFolderPath = sanitizedParentPath
      ? path.join(sanitizedParentPath, sanitizedName)
      : sanitizedName;

    const targetPath = path.join(DOCS_ROOT, relativeFolderPath);

    await fs.mkdir(DOCS_ROOT, { recursive: true });

    const exists = await fs
      .access(targetPath)
      .then(() => true)
      .catch(() => false);

    if (exists) {
      return NextResponse.json(
        { error: "A file or folder with that name already exists" },
        { status: 409 },
      );
    }

    await fs.mkdir(targetPath, { recursive: false });

    return NextResponse.json({
      success: true,
      path: relativeFolderPath,
      name: sanitizedName,
    });
  } catch (error) {
    console.error("Create folder error:", error);
    return NextResponse.json(
      { error: "Failed to create folder" },
      { status: 500 },
    );
  }
}

