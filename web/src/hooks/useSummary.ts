import { useState } from "react";
import { streamChat, readStreamChunks } from "@/services/chatService";
import {
  SPEED_PRESETS,
  DETAIL_INSTRUCTIONS,
  TONE_INSTRUCTIONS,
  buildQuestionInstruction,
  type SpeedPreset,
  type DetailLevel,
  type Tone,
} from "@/config/modelConfig";

export interface UseSummaryOptions {
  onComplete?: (content: string) => void;
  onError?: (error: string) => void;
}

export const useSummary = (options: UseSummaryOptions = {}) => {
  const [content, setContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [preset, setPreset] = useState<SpeedPreset>("balanced");
  const [detailLevel, setDetailLevel] = useState<DetailLevel>("detailed");
  const [tone, setTone] = useState<Tone>("professional");
  const [questionCount, setQuestionCount] = useState<number>(-1);

  const generateSummary = async (docId: string) => {
    if (!docId || isLoading) return;

    setContent("");
    setError(null);
    setIsLoading(true);

    const controller = new AbortController();
    const config = SPEED_PRESETS[preset];

    // Build custom message based on settings
    const message = [
      DETAIL_INSTRUCTIONS[detailLevel],
      TONE_INSTRUCTIONS[tone],
      buildQuestionInstruction(questionCount),
    ].join(" ");

    try {
      const { reader, decoder } = await streamChat({
        conversationId: `summary-${docId}`,
        docId,
        sectionId: null,
        mode: "summary",
        message,
        modelConfig: config,
        signal: controller.signal,
      });

      let accumulatedContent = "";

      await readStreamChunks(reader, decoder, (chunk) => {
        accumulatedContent += chunk;
        setContent(accumulatedContent);
      });

      options.onComplete?.(accumulatedContent);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        options.onError?.(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setContent("");
    setError(null);
    setIsLoading(false);
  };

  return {
    content,
    isLoading,
    error,
    preset,
    detailLevel,
    tone,
    questionCount,
    setPreset,
    setDetailLevel,
    setTone,
    setQuestionCount,
    generateSummary,
    reset,
  };
};
