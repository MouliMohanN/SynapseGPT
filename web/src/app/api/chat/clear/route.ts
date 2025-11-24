import { NextResponse } from "next/server";
import { clearConversationHistory } from "@/lib/chat/conversationStore";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { conversationId } = body;

    if (!conversationId) {
      return NextResponse.json(
        { error: "conversationId is required" },
        { status: 400 }
      );
    }

    clearConversationHistory(conversationId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error clearing conversation:", error);
    return NextResponse.json(
      { error: "Failed to clear conversation" },
      { status: 500 }
    );
  }
}
