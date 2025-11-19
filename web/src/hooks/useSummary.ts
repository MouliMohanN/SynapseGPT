import { useEffect, useRef, useState, useCallback } from 'react';
import { buildBehavioralPrompt } from '@/lib/chat/settingsMapper';

export const useSummary = (selectedDocId: string | null, settings: any) => {
  const [summaryContent, setSummaryContent] = useState<string>("");
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  
  const summaryContentRef = useRef<HTMLDivElement>(null);
  const isGeneratingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleGenerateSummary = useCallback(async () => {
    if (!selectedDocId || isSummaryLoading || isGeneratingRef.current) return;

    console.log("Starting summary generation for doc:", selectedDocId);
    isGeneratingRef.current = true;
    setSummaryContent("");
    setSummaryError(null);
    setIsSummaryLoading(true);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const customMessage = buildBehavioralPrompt(settings.summaryBehavioralSettings);
    console.log("Summary message:", customMessage);
    console.log("Summary settings:", settings.summaryBehavioralSettings);

    try {
      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: "summary-" + selectedDocId,
          docId: selectedDocId,
          sectionId: null,
          message: customMessage,
          behavioralSettings: settings.summaryBehavioralSettings,
        }),
        signal: controller.signal,
      });

      console.log("Response received:", res.status, res.ok);
      if (!res.ok || !res.body) {
        throw new Error(`Summary request failed: ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      let done = false;
      let accumulatedContent = "";
      let chunkCount = 0;
      
      console.log("Starting stream reading...");
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        chunkCount++;
        console.log(`Chunk ${chunkCount}: done=${done}, value length=${value?.length || 0}`);
        if (value) {
          const chunk = decoder.decode(value);
          accumulatedContent += chunk;
          setSummaryContent(accumulatedContent);
        }
      }
      console.log("Stream completed after", chunkCount, "chunks");
    } catch (err) {
      console.error("Summary generation error:", err);
      if ((err as Error).name !== 'AbortError') {
        const message = err instanceof Error ? err.message : "Unknown error";
        setSummaryError(message);
      }
    } finally {
      console.log("Finally block - setting loading to false");
      setIsSummaryLoading(false);
      isGeneratingRef.current = false;
      abortControllerRef.current = null;
    }
  }, [selectedDocId, settings.summaryBehavioralSettings, isSummaryLoading]);

  // Auto-generate summary when document loads
  useEffect(() => {
    if (selectedDocId) {
      handleGenerateSummary();
    } else {
      setSummaryContent("");
      setSummaryError(null);
    }
  }, [selectedDocId, handleGenerateSummary]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    // State
    summaryContent,
    isSummaryLoading,
    summaryError,
    
    // Refs
    summaryContentRef,
    
    // Actions
    handleGenerateSummary,
  };
};
