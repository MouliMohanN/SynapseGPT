import type { ChatMode } from "@/lib/types";
import type { ModelConfig } from "@/config/modelConfig";

export interface StreamChatParams {
  conversationId: string;
  docId: string;
  sectionId?: string | null;
  mode: ChatMode;
  message: string;
  modelConfig?: Partial<ModelConfig>;
  signal?: AbortSignal;
}

export interface StreamResponse {
  reader: ReadableStreamDefaultReader<Uint8Array>;
  decoder: TextDecoder;
}

/**
 * Stream chat messages from the API
 */
export const streamChat = async (params: StreamChatParams): Promise<StreamResponse> => {
  const response = await fetch("/api/chat/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      conversationId: params.conversationId,
      docId: params.docId,
      sectionId: params.sectionId ?? null,
      mode: params.mode,
      message: params.message,
      modelConfig: params.modelConfig,
    }),
    signal: params.signal,
  });

  if (!response.ok || !response.body) {
    throw new Error(`Chat request failed: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  return { reader, decoder };
};

/**
 * Read stream chunks and accumulate content
 */
export const readStreamChunks = async (
  reader: ReadableStreamDefaultReader<Uint8Array>,
  decoder: TextDecoder,
  onChunk: (chunk: string) => void
): Promise<void> => {
  let done = false;

  while (!done) {
    const { value, done: readerDone } = await reader.read();
    done = readerDone;

    if (value) {
      const chunk = decoder.decode(value, { stream: true });
      onChunk(chunk);
    }
  }
};
