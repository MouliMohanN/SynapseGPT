import { NextResponse } from "next/server";
import { getVersion } from "@/lib/history";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ docId: string; timestamp: string }> }
) {
  try {
    const { docId: rawDocId, timestamp } = await params;
    const docId = decodeURIComponent(rawDocId);
    const sanitizedDocId = docId.replace(/\.\./g, "").replace(/^\/+/, "");

    const content = await getVersion(sanitizedDocId, timestamp);
    
    if (content === null) {
      return NextResponse.json(
        { error: "Version not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ content });
  } catch (error) {
    console.error("Get version error:", error);
    return NextResponse.json(
      { error: "Failed to get version" },
      { status: 500 }
    );
  }
}
