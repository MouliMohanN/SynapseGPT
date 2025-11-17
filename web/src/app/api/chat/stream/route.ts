import { NextResponse } from "next/server";
import type { ChatMessage, ChatRequestBody } from "@/lib/types";
import { getDocumentContentById } from "@/lib/docParser";

// Simple in-memory conversation store for this server process.
// This is non-persistent and per-process only, which is fine for
// local/offline usage and development.
const conversations = new Map<string, ChatMessage[]>();

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "gpt-oss:20b";

function formatAssistantResponse(content: string): string {
  if (!content) return content;
  
  let formatted = content;
  
  // Add extra line break before markdown headings (# ## ### etc)
  formatted = formatted.replace(/\n(#{1,6}\s)/g, "\n\n$1");
  
  // Add extra line break before list items at the start of a line
  formatted = formatted.replace(/\n([*\-+]|\d+\.)\s/g, "\n\n$1 ");
  
  // Ensure double line breaks between paragraphs (but don't triple them)
  formatted = formatted.replace(/\n\n\n+/g, "\n\n");
  
  // Add line break before code blocks
  formatted = formatted.replace(/\n```/g, "\n\n```");
  
  return formatted.trim();
}

export async function POST(request: Request) {
  const body = (await request.json()) as ChatRequestBody;
  const { conversationId, docId, sectionId, mode, message } = body;

  if (!conversationId || !message) {
    return NextResponse.json(
      { error: "conversationId and message are required" },
      { status: 400 },
    );
  }

  const history = conversations.get(conversationId) ?? [];

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
    mode,
    documentContext,
  });

  const ollamaBody = {
    model: OLLAMA_MODEL,
    stream: true,
    messages: [
      ...(systemPrompt
        ? [{ role: "system", content: systemPrompt } as const]
        : []),
      ...history.map((msg) => ({ role: msg.role, content: msg.content })),
      { role: "user", content: message },
    ],
  } as const;

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let assistantContent = "";

      try {
        const response = await fetch(`${OLLAMA_URL}/api/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(ollamaBody),
        });

        if (!response.body || !response.ok) {
          throw new Error(`Ollama request failed: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (!value) continue;

          const chunkText = decoder.decode(value, { stream: true });

          // Ollama streams JSONL; parse each line individually.
          const lines = chunkText
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean);

          for (const line of lines) {
            try {
              const json = JSON.parse(line) as {
                message?: { content?: string };
                done?: boolean;
              };
              const delta = json.message?.content ?? "";
              if (delta) {
                assistantContent += delta;
                controller.enqueue(encoder.encode(delta));
              }
            } catch {
              // If we hit a partial line, just ignore; the next chunk will complete it.
              continue;
            }
          }
        }

        // Update conversation history after the stream completes.
        const now = new Date().toISOString();
        
        // Post-process the assistant content to add extra line breaks for better readability
        const formattedContent = formatAssistantResponse(assistantContent);
        
        const updatedHistory: ChatMessage[] = [
          ...history,
          {
            role: "user",
            content: message,
            mode,
            createdAt: now,
          },
          {
            role: "assistant",
            content: formattedContent,
            mode,
            createdAt: now,
          },
        ];
        conversations.set(conversationId, updatedHistory);
      } catch (err) {
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

function buildSystemPrompt(input: {
  docId: string | null;
  sectionId: string | null;
  mode: ChatRequestBody["mode"];
  documentContext: string;
}): string {
  const parts: string[] = [];

  parts.push(
    "You are SynapseGPT, a local-first documentation assistant. Answer using only the information from the provided document content and be concise.",
  );

  if (input.documentContext) {
    parts.push(
      `\n\nDOCUMENT CONTENT:\n${input.documentContext}\n\nAnswer questions based strictly on the above content.`,
    );
  }

  if (input.docId) {
    parts.push(`Document: ${input.docId}.`);
  }
  if (input.sectionId) {
    parts.push(`Section: ${input.sectionId}.`);
  }

  switch (input.mode) {
    case "summary":
      parts.push(
        "User is asking for a summary. Provide a clear, high-level summary with key points.",
      );
      break;
    case "key_points":
      parts.push(
        "User wants key points. Respond with a concise bullet list of the most important points.",
      );
      break;
    case "faqs":
      parts.push(
        "User wants FAQs. Generate likely questions and brief answers based on the document.",
      );
      break;
    default:
      parts.push(
        "User is asking a direct question. Answer precisely and refer to relevant parts of the document when helpful.",
      );
      break;
  }

  return parts.join(" ");
}
