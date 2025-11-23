import { NextResponse } from "next/server";
import { getVersion, getPatch, getPatchMetadata } from "@/lib/history";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ docId: string; timestamp: string }> }
) {
  try {
    const { docId: rawDocId, timestamp } = await params;
    const docId = decodeURIComponent(rawDocId);
    const sanitizedDocId = docId.replace(/\.\./g, "").replace(/^\/+/, "");

    const [content, patch, metadata] = await Promise.all([
      getVersion(sanitizedDocId, timestamp),
      getPatch(sanitizedDocId, timestamp),
      getPatchMetadata(sanitizedDocId, timestamp),
    ]);
    
    if (content === null && patch === null && metadata === null) {
      return NextResponse.json(
        { error: "Version not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ content, patch, metadata });
  } catch (error) {
    console.error("Get version error:", error);
    return NextResponse.json(
      { error: "Failed to get version" },
      { status: 500 }
    );
  }
}
