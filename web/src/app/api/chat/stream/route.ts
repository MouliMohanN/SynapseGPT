import { NextResponse } from "next/server";
import type { ChatRequestBody } from "@/lib/types";
import { getDocumentContentById } from "@/lib/docParser";
import { getConversationHistory, updateConversationHistory } from "@/lib/chat/conversationStore";
import { streamOllamaResponse } from "@/lib/chat/ollamaClient";
import { buildSystemPrompt } from "@/lib/chat/promptBuilder";
import { formatAssistantResponse } from "@/lib/chat/formatters";
import { behavioralToModelConfig, buildBehavioralPrompt } from "@/lib/chat/settingsMapper";

export async function POST(request: Request) {
  const body = (await request.json()) as ChatRequestBody;
  const { conversationId, docId, sectionId, message, behavioralSettings } = body;

  if (!conversationId || !message) {
    return NextResponse.json(
      { error: "conversationId and message are required" },
      { status: 400 },
    );
  }

  // Validate behavioralSettings
  if (!behavioralSettings) {
    return NextResponse.json(
      { error: "behavioralSettings is required" },
      { status: 400 },
    );
  }

  const history = getConversationHistory(conversationId);

  // Load document content if docId is provided
  let documentContext = "";
  if (docId) {
    const docContent = await getDocumentContentById(docId);
    if (docContent) {
      documentContext = docContent.rawText;
      // If a specific section is requested, try to extract just that section
      if (sectionId && docContent.sections) {
        const section = docContent.sections.find((s) => s.id === sectionId);
        if (section) {
          documentContext = docContent.rawText.substring(
            section.startOffset,
            section.endOffset,
          );
        }
      }
    }
  }

  const systemPrompt = buildSystemPrompt({
    docId: docId ?? null,
    sectionId: sectionId ?? null,
    documentContext,
  }) + " " + buildBehavioralPrompt(behavioralSettings);

  const modelConfig = behavioralToModelConfig(behavioralSettings);

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let assistantContent = "";

      try {
        const ollamaStream = streamOllamaResponse({
          messages: [
            ...history.map((msg) => ({ role: msg.role, content: msg.content })),
            { role: "user", content: message },
          ],
          modelConfig: modelConfig,
          systemPrompt,
        });

        for await (const delta of ollamaStream) {
          assistantContent += delta;
          controller.enqueue(encoder.encode(delta));
        }

        // Update conversation history after the stream completes.
        const formattedContent = formatAssistantResponse(assistantContent);
        
        updateConversationHistory(
          conversationId,
          message,
          formattedContent,
        );
      } catch (err) {
        console.error("Stream error:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        const fallback = `Error calling local LLM: ${errorMessage}`;
        controller.enqueue(encoder.encode(fallback));
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}

