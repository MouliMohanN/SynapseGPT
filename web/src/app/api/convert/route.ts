import { NextResponse } from "next/server";
import * as fs from "fs/promises";
import * as path from "path";
import { convertDocumentToMarkdown, isSupportedByDocling } from "@/lib/pythonBridge";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    const filename = file.name;
    const ext = path.extname(filename).toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());

    if (ext === ".md" || ext === ".txt") {
      const text = buffer.toString("utf-8");
      return NextResponse.json({ success: true, markdown: text });
    }

    if (!isSupportedByDocling(filename)) {
      return NextResponse.json(
        { error: "Unsupported file type for conversion" },
        { status: 400 }
      );
    }

    const tmpDir = path.join(process.cwd(), ".tmp");
    await fs.mkdir(tmpDir, { recursive: true });
    const tmpPath = path.join(tmpDir, `${Date.now()}-${filename}`);

    await fs.writeFile(tmpPath, buffer);

    const result = await convertDocumentToMarkdown(tmpPath);

    try {
      await fs.unlink(tmpPath);
    } catch (e) {
      console.error("Failed to remove temp file:", e);
    }

    if (!result.success || !result.markdown) {
      return NextResponse.json(
        { error: result.error || "Conversion failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      markdown: result.markdown,
    });
  } catch (error) {
    console.error("Conversion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
