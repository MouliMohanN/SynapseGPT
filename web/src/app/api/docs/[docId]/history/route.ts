import { NextResponse } from "next/server";
import { getHistory } from "@/lib/history";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ docId: string }> }
) {
  try {
    const { docId: rawDocId } = await params;
    const docId = decodeURIComponent(rawDocId);
    
    // Sanitize? We trust getHistory to handle it or we should sanitize here too.
    // Let's do basic sanitization to match other routes.
    const sanitizedDocId = docId.replace(/\.\./g, "").replace(/^\/+/, "");

    const history = await getHistory(sanitizedDocId);
    return NextResponse.json(history);
  } catch (error) {
    console.error("Get history error:", error);
    return NextResponse.json(
      { error: "Failed to get history" },
      { status: 500 }
    );
  }
}
