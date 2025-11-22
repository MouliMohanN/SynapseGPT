import { NextResponse } from "next/server";
import type { ChatRequestBody } from "@/lib/types";
import { getDocumentContentById } from "@/lib/docParser";
import { getConversationHistory, updateConversationHistory } from "@/lib/chat/conversationStore";
import { streamOllamaResponse } from "@/lib/chat/ollamaClient";
import { buildSystemPrompt } from "@/lib/chat/promptBuilder";
import { formatAssistantResponse } from "@/lib/chat/formatters";
import { behavioralToModelConfig, buildBehavioralPrompt } from "@/lib/chat/settingsMapper";
import { retrieveRelevantChunks } from "@/lib/rag/vectorRetriever";
import { isRetrievalContextEnabled } from "@/lib/featureFlags";

export async function POST(request: Request) {
  const body = (await request.json()) as ChatRequestBody;
  const {
    conversationId,
    docId,
    sectionId,
    message,
    behavioralSettings,
    allowOutsideDocumentAnswers,
  } = body;

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

  const documentContext = await buildDocumentContext(docId ?? null, sectionId ?? null);
  
  // Only scope retrieval to the current document if we are generating a summary.
  // Otherwise (for chat), we want to search across all documents.
  const isSummary = conversationId.startsWith("summary-");
  
  // If it is a summary, we do not need retrieval context at all (just the doc content).
  // If it is chat, we want global retrieval (pass null as docId).
  const retrievalContext = isSummary 
    ? "" 
    : await buildRetrievalContext(message, null);

  const systemPrompt = buildSystemPrompt({
    docId: docId ?? null,
    sectionId: sectionId ?? null,
    documentContext,
    retrievalContext,
    allowOutsideDocumentAnswers,
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

async function buildDocumentContext(docId: string | null, sectionId: string | null) {
  if (!docId) {
    return "";
  }

  const docContent = await getDocumentContentById(docId);
  if (!docContent) {
    return "";
  }

  if (sectionId && docContent.sections?.length) {
    const section = docContent.sections.find((s) => s.id === sectionId);
    if (section) {
      return docContent.rawText.substring(section.startOffset, section.endOffset);
    }
  }

  return docContent.rawText;
}

async function buildRetrievalContext(message: string, docId: string | null) {
  if (!isRetrievalContextEnabled()) {
    return "";
  }

  const retrievedChunks = await retrieveRelevantChunks(message, 4);

  if (!retrievedChunks.length) {
    return "";
  }

  return retrievedChunks
    .map(
      (chunk, index) =>
        `Source: ${chunk.metadata.docName || chunk.metadata.source}\nContent: ${chunk.content}`,
    )
    .join("\n\n---\n\n");
}

