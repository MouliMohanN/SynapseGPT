import { useEffect, useRef, useState, useCallback } from 'react';
import { buildBehavioralPrompt } from '@/lib/chat/settingsMapper';

export const useSummary = (
  selectedDocId: string | null,
  settings: any,
  canSummarize: boolean,
) => {
  const [summaryContent, setSummaryContent] = useState<string>("");
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  
  const summaryContentRef = useRef<HTMLDivElement>(null);
  const isGeneratingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentDocIdRef = useRef<string | null>(null);
  const pendingDocIdRef = useRef<string | null>(null);
  const latestHandleRef = useRef<(() => void) | null>(null);

  const handleGenerateSummary = useCallback(async () => {
    if (!selectedDocId || isGeneratingRef.current || !canSummarize) return;

    console.log("Starting summary generation for doc:", selectedDocId);
    isGeneratingRef.current = true;
    setSummaryContent("");
    setSummaryError(null);
    setIsSummaryLoading(true);

    currentDocIdRef.current = selectedDocId;
    pendingDocIdRef.current = selectedDocId;

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
      if ((err as Error).name === 'AbortError') {
        // Expected when the user cancels or navigates away; no need to surface as an error.
        console.info('Summary generation aborted.');
      } else {
        console.error('Summary generation error:', err);
        const message = err instanceof Error ? err.message : 'Unknown error';
        setSummaryError(message);
      }
    } finally {
      console.log("Finally block - setting loading to false");
      setIsSummaryLoading(false);
      isGeneratingRef.current = false;
      abortControllerRef.current = null;
      const pendingDocId = pendingDocIdRef.current;
      if (pendingDocId && pendingDocId !== currentDocIdRef.current) {
        if (latestHandleRef.current) {
          latestHandleRef.current();
        }
      }
    }
  }, [selectedDocId, canSummarize, settings.summaryBehavioralSettings]);

  // Auto-generate summary when document loads
  useEffect(() => {
    pendingDocIdRef.current = selectedDocId;

    if (!selectedDocId || !canSummarize) {
      setSummaryContent("");
      setSummaryError(null);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      return;
    }

    if (isGeneratingRef.current) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    } else {
      handleGenerateSummary();
    }
  }, [selectedDocId, canSummarize, handleGenerateSummary]);

  useEffect(() => {
    latestHandleRef.current = handleGenerateSummary;
  }, [handleGenerateSummary]);

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
    stopSummaryGeneration: () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      setIsSummaryLoading(false);
      isGeneratingRef.current = false;
    },
  };
};
