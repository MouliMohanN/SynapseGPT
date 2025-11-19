
const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "gpt-oss:20b";

export interface OllamaModelConfig {
  temperature?: number;
  topP?: number;
  maxTokens?: number;
}

export interface OllamaChatRequest {
  messages: Array<{ role: string; content: string }>;
  modelConfig?: OllamaModelConfig;
  systemPrompt?: string;
}

export async function* streamOllamaResponse(request: OllamaChatRequest) {
  const ollamaBody = {
    model: OLLAMA_MODEL,
    stream: true,
    messages: [
      ...(request.systemPrompt
        ? [{ role: "system", content: request.systemPrompt } as const]
        : []),
      ...request.messages,
    ],
    options: {
      temperature: request.modelConfig?.temperature ?? 0.7,
      top_p: request.modelConfig?.topP ?? 0.9,
      num_predict: request.modelConfig?.maxTokens ?? -1,
      repeat_penalty: 1.1,
    },
  } as const;

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

  try {
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
            yield delta;
          }
        } catch {
          // If we hit a partial line, just ignore; the next chunk will complete it.
          continue;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
