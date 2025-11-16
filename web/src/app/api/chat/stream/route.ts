import { NextResponse } from "next/server";
import type { ChatRequestBody } from "@/lib/types";

// NOTE: This route currently returns a dummy streamed response to
// validate the frontend streaming implementation. In a later unit,
// we will wire this up to Ollama (gpt-oss-20b).

export async function POST(request: Request) {
  const body = (await request.json()) as ChatRequestBody;

  const encoder = new TextEncoder();

  const readableStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const chunks = [
        `Streaming reply for doc ${body.docId}. `,
        `Mode: ${body.mode}. `,
        "This is a placeholder assistant response that will be ",
        "replaced by real output from the local LLM backend.",
      ];

      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
        // Artificial delay between chunks to simulate streaming.
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      controller.close();
    },
  });

  return new NextResponse(readableStream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}
