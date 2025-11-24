import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '@/lib/types';

const DEFAULT_CONVERSATION_ID = "chat-";
const CHAT_STORAGE_KEY = "synapsegpt-chat-history";

export const useChat = (selectedDocId: string | null, selectedSectionId: string | null, settings: any) => {
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [streamingCharCount, setStreamingCharCount] = useState(0);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Load chat history from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(CHAT_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as ChatMessage[];
        setChatMessages(parsed);
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Save chat history to localStorage whenever it changes
  useEffect(() => {
    if (chatMessages.length > 0) {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatMessages));
    }
  }, [chatMessages]);

  // Auto-scroll to bottom during streaming
  useEffect(() => {
    if (shouldAutoScroll && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, shouldAutoScroll]);

  // Detect manual scroll to disable auto-scroll
  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShouldAutoScroll(isNearBottom);
  };

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!chatInput.trim() || !selectedDocId || isStreaming) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: chatInput.trim(),
      createdAt: new Date().toISOString(),
    };

    setChatInput("");
    setChatMessages((prev) => [...prev, userMessage]);
    setShouldAutoScroll(true);
    setStreamingCharCount(0);

    // Prepare a placeholder assistant message that will be filled as streaming proceeds.
    const assistantIndex = chatMessages.length + 1;
    const initialAssistant: ChatMessage = {
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
    };
    setChatMessages((prev) => [...prev, initialAssistant]);

    setIsStreaming(true);
    
    const controller = new AbortController();
    setAbortController(controller);

    try {
      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: DEFAULT_CONVERSATION_ID,
          docId: selectedDocId,
          sectionId: selectedSectionId,
          message: userMessage.content,
          allowOutsideDocumentAnswers: settings.allowOutsideDocumentAnswers,
          historyRetrievalLimit: settings.historyRetrievalLimit,
          behavioralSettings: settings.chatBehavioralSettings,
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`Chat request failed: ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      let done = false;
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value);
          setChatMessages((prev) => {
            const updated = [...prev];
            const index = assistantIndex;
            if (!updated[index]) return updated;
            updated[index] = {
              ...updated[index],
              content: updated[index].content + chunk,
            };
            return updated;
          });
          
          // Update character count
          setStreamingCharCount((prev) => prev + chunk.length);
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        setChatMessages((prev) => {
          const updated = [...prev];
          if (updated[assistantIndex]) {
            updated[assistantIndex] = {
              ...updated[assistantIndex],
              content: updated[assistantIndex].content + "\n\n*[Response stopped by user]*",
            };
          }
          return updated;
        });
      } else {
        const message = err instanceof Error ? err.message : "Unknown error";
        const errorAssistant: ChatMessage = {
          role: "assistant",
          content: `Error: ${message}`,
          createdAt: new Date().toISOString(),
        };
        setChatMessages((prev) => [...prev.slice(0, assistantIndex), errorAssistant]);
      }
    } finally {
      setIsStreaming(false);
      setAbortController(null);
      setStreamingCharCount(0);
    }
  };

  const handleStopGeneration = () => {
    if (abortController) {
      abortController.abort();
    }
  };

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleClearConversation = () => {
    setShowClearConfirm(true);
  };

  const confirmClearConversation = () => {
    setChatMessages([]);
    localStorage.removeItem(CHAT_STORAGE_KEY);
    setShowClearConfirm(false);
  };

  const handleRegenerateResponse = async () => {
    if (chatMessages.length < 2) return;
    
    // Find the last user message
    const lastUserMsgIndex = chatMessages.findLastIndex(m => m.role === "user");
    if (lastUserMsgIndex === -1) return;
    
    const lastUserMessage = chatMessages[lastUserMsgIndex];
    
    // Remove messages after the last user message
    setChatMessages((prev) => prev.slice(0, lastUserMsgIndex + 1));
    
    // Re-trigger the same message
    setChatInput(lastUserMessage.content);
    setTimeout(() => {
      const form = document.querySelector('form');
      if (form) {
        form.requestSubmit();
      }
    }, 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e as unknown as React.FormEvent);
    }
  };

  return {
    // State
    chatInput,
    chatMessages,
    isStreaming,
    streamingCharCount,
    showClearConfirm,
    
    // Refs
    chatEndRef,
    chatContainerRef,
    
    // Actions
    setChatInput,
    handleSend,
    handleStopGeneration,
    handleClearConversation,
    confirmClearConversation,
    setShowClearConfirm,
    handleRegenerateResponse,
    handleKeyDown,
    handleScroll,
  };
};
