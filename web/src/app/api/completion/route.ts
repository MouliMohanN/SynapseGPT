import { NextResponse } from "next/server";
import { streamOllamaCompletion } from "@/lib/chat/ollamaClient";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text, cursorOffset, modelConfig } = body;

    console.log("Received completion request:", { textLength: text?.length, cursorOffset, modelConfig });

    if (!text || cursorOffset === undefined) {
      return new Response("Missing text or cursorOffset", { status: 400 });
    }

    // Construct a prompt that encourages completion
    // We take the text up to the cursor
    const textBeforeCursor = text.slice(0, cursorOffset);

    // And a bit of text after to help context, though for ghost text we mostly care about forward completion
    // For now, let's just send the text before cursor as the prompt.
    // We can optimize this with FIM (Fill In Middle) if the model supports it, but standard completion is a good start.
    
    const systemPrompt = "You are a helpful writing assistant. Complete the following text naturally. Do not repeat the input. Output ONLY the completion.";

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          const ollamaStream = streamOllamaCompletion({
            prompt: textBeforeCursor,
            systemPrompt,
            modelConfig: modelConfig || {
              temperature: 0.1,
              maxTokens: 50,
            },
          });

          for await (const delta of ollamaStream) {
            controller.enqueue(encoder.encode(delta));
          }
        } catch (err) {
          console.error("Stream error:", err);
          controller.enqueue(encoder.encode("")); // Fail silently for ghost text
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
  } catch (error) {
    console.error("Completion API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
