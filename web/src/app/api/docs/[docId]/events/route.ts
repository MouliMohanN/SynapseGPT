import { subscribeToDocEvents, type DocEvent } from "@/lib/docEvents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ docId: string }> }
) {
  const { docId: rawDocId } = await params;
  const docId = decodeURIComponent(rawDocId);
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: DocEvent) => {
        const payload = `data: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      };

      const unsubscribe = subscribeToDocEvents("__all__", send);

      send({
        docId,
        type: "sse:connected",
        message: "Connected to document event stream.",
        timestamp: new Date().toISOString(),
      });

      const keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode(": keep-alive\n\n"));
      }, 15000);

      const close = () => {
        clearInterval(keepAlive);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // Ignore if already closed
        }
      };

      request.signal.addEventListener("abort", () => {
        close();
      });
    },
    cancel() {
      // Stream cancelled by the client; listeners are cleaned up via abort handler.
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
