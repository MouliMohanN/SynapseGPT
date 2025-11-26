import { NextRequest, NextResponse } from "next/server";
import { TestGenerationAgent } from "@/lib/agent/testGenerator";
import type { AgentEvent } from "@/lib/agent/testGenerator";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileContent, fileName, docId, modelConfig } = body;

    if (!fileContent || !fileName) {
      return NextResponse.json(
        { error: "Missing fileContent or fileName" },
        { status: 400 }
      );
    }

    // Create the agent
    const agent = new TestGenerationAgent(fileContent, fileName, modelConfig);

    // Stream events to the client
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of agent.generate()) {
            // Send each event as JSON
            const eventData = JSON.stringify(event) + "\n";
            controller.enqueue(encoder.encode(eventData));
          }
        } catch (error) {
          const errorEvent: AgentEvent = {
            type: "error",
            message: error instanceof Error ? error.message : "Unknown error",
          };
          controller.enqueue(encoder.encode(JSON.stringify(errorEvent) + "\n"));
        } finally {
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("Agent API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
