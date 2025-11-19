"use client";

// web/src/app/page.tsx
import React, { useEffect, useRef, useState } from "react";
import type { ChatMessage, DocNode } from "@/lib/types";
import { SettingsModal } from "@/components/SettingsModal";
import { DocumentPanel } from "@/components/home/DocumentPanel";
import { ContentPanel } from "@/components/home/ContentPanel";
import { ChatPanel } from "@/components/home/ChatPanel";
import { AppHeader } from "@/components/home/AppHeader";
import { AboutModal } from "@/components/home/AboutModal";
import { SummarySettingsModal } from "@/components/home/SummarySettingsModal";
import {
  CHAT_STORAGE_KEY,
  DEFAULT_CONVERSATION_ID,
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
} from "@/config/constants";
import { storage } from "@/utils/storage";
import { useSummary } from "@/hooks/useSummary";
import { usePanelResize } from "@/hooks/usePanelResize";
import { useDocuments } from "@/hooks/useDocuments";
import { sortDocs, filterDocs } from "@/utils/documentUtils";

export default function HomePage() {
  const {
    docs,
    isDocsLoading,
    docsError,
    selectedDocId,
    setSelectedDocId,
    docContent,
    isDocLoading,
    docError,
    searchResults,
    isSearching,
    runContentSearch,
  } = useDocuments();

  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [docFilter, setDocFilter] = useState("");
  const [contentSearch, setContentSearch] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [settings, setSettings] = useState<typeof DEFAULT_SETTINGS>(DEFAULT_SETTINGS);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [streamingCharCount, setStreamingCharCount] = useState(0);
  
  const [showSummarySettings, setShowSummarySettings] = useState(false);

  const [showSections, setShowSections] = useState(true);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  
  const {
    leftWidth: leftPanelWidth,
    rightWidth: rightPanelWidth,
    setLeftWidth: setLeftPanelWidth,
    setRightWidth: setRightPanelWidth,
    startDraggingLeft,
    startDraggingRight,
  } = usePanelResize(DEFAULT_SETTINGS.defaultLeftWidth, DEFAULT_SETTINGS.defaultRightWidth);

  const {
    content: summaryContent,
    isLoading: isSummaryLoading,
    error: summaryError,
    preset: summaryPreset,
    detailLevel: summaryDetailLevel,
    tone: summaryTone,
    questionCount: summaryQuestions,
    setPreset: setSummaryPreset,
    setDetailLevel: setSummaryDetailLevel,
    setTone: setSummaryTone,
    setQuestionCount: setSummaryQuestions,
    generateSummary: runSummary,
    reset: resetSummary,
  } = useSummary();

  const triggerSummaryGeneration = React.useCallback((docId?: string | null) => {
    if (!docId) return;
    void runSummary(docId);
  }, [runSummary]);

  const handleManualSummaryGeneration = React.useCallback(() => {
    triggerSummaryGeneration(selectedDocId);
  }, [selectedDocId, triggerSummaryGeneration]);

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const summaryContentRef = useRef<HTMLDivElement | null>(null);
  const documentViewerRef = useRef<HTMLDivElement | null>(null);
  const documentContentRef = useRef<HTMLDivElement | null>(null);

  // Load chat history from storage on mount
  useEffect(() => {
    const storedMessages = storage.get<ChatMessage[]>(CHAT_STORAGE_KEY, []);
    if (storedMessages.length > 0) {
      setChatMessages(storedMessages);
    }
  }, []);

  // Save chat history whenever it changes
  useEffect(() => {
    if (chatMessages.length > 0) {
      storage.set(CHAT_STORAGE_KEY, chatMessages);
    } else {
      storage.remove(CHAT_STORAGE_KEY);
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

  // Reset summary when doc changes
  useEffect(() => {
    if (!selectedDocId) {
      resetSummary();
      return;
    }
    triggerSummaryGeneration(selectedDocId);
  }, [selectedDocId, triggerSummaryGeneration, resetSummary]);

  // Section navigation handler
  const handleSectionClick = (sectionId: string) => {
    setSelectedSectionId(sectionId);
    
    if (!documentViewerRef.current || !docContent) return;
    
    const section = docContent.sections.find(s => s.id === sectionId);
    if (!section) return;

    // Find the heading element by searching for the section title in the rendered content
    const headings = documentViewerRef.current.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const targetHeading = Array.from(headings).find(h => 
      h.textContent?.trim() === section.title
    );

    if (targetHeading) {
      targetHeading.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Track active section on scroll and auto-scroll TOC
  useEffect(() => {
    if (!documentViewerRef.current || !documentContentRef.current || !docContent || docContent.sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const heading = entry.target;
            const sectionTitle = heading.textContent?.trim();
            const section = docContent.sections.find(s => s.title === sectionTitle);
            if (section) {
              setActiveSectionId(section.id);
              
              // Auto-scroll the active section into view in the TOC
              const sectionButton = document.querySelector(`[data-section-id="${section.id}"]`);
              if (sectionButton) {
                sectionButton.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              }
            }
          }
        });
      },
      {
        root: documentViewerRef.current,
        rootMargin: '-20% 0px -70% 0px',
        threshold: 0,
      }
    );

    const headings = documentContentRef.current.querySelectorAll('h1, h2, h3, h4, h5, h6');
    headings.forEach(heading => observer.observe(heading));

    return () => observer.disconnect();
  }, [docContent]);

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!chatInput.trim() || !selectedDocId || isStreaming) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: chatInput.trim(),
      mode: "question",
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
      mode: "question",
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
          mode: "question",
          message: userMessage.content,
          modelConfig: {
            temperature: settings.temperature,
            maxTokens: settings.maxTokens,
            topP: settings.topP,
          },
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
          mode: "question",
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

  const handleClearConversation = () => {
    if (confirm("Clear all chat messages?")) {
      setChatMessages([]);
      storage.remove(CHAT_STORAGE_KEY);
    }
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

  const visibleDocs = sortDocs(filterDocs(docs, docFilter));
  const toggleFolder = (id: string) => {
    setExpandedFolders((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Full-text search across all documents
  const handleContentSearch = async () => {
    void runContentSearch(contentSearch);
  };

  const handleSaveSettings = (newSettings: typeof settings) => {
    setSettings(newSettings);
    setLeftPanelWidth(newSettings.defaultLeftWidth);
    setRightPanelWidth(newSettings.defaultRightWidth);
    storage.set(SETTINGS_STORAGE_KEY, newSettings);
  };

  // Load settings from localStorage
  useEffect(() => {
    const storedSettings = storage.get<typeof DEFAULT_SETTINGS>(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS);
    setSettings(storedSettings);
    setLeftPanelWidth(storedSettings.defaultLeftWidth ?? DEFAULT_SETTINGS.defaultLeftWidth);
    setRightPanelWidth(storedSettings.defaultRightWidth ?? DEFAULT_SETTINGS.defaultRightWidth);
  }, [setLeftPanelWidth, setRightPanelWidth]);

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-50 text-slate-900 overflow-hidden">
      <AppHeader onShowAbout={() => setShowAbout(true)} />

      <main className="flex-1 flex overflow-hidden">
        <DocumentPanel
          widthPercent={leftPanelWidth}
          visibleDocs={visibleDocs}
          isDocsLoading={isDocsLoading}
          docsError={docsError}
          docFilter={docFilter}
          onDocFilterChange={setDocFilter}
          contentSearch={contentSearch}
          onContentSearchChange={setContentSearch}
          onContentSearch={handleContentSearch}
          isSearching={isSearching}
          searchResults={searchResults}
          expandedFolders={expandedFolders}
          onToggleFolder={toggleFolder}
          selectedDocId={selectedDocId}
          onSelectDoc={setSelectedDocId}
          onOpenSettings={() => setShowSettings(true)}
        />

        {/* Resize handle for left panel */}
        <div
          className="w-1 bg-slate-300 hover:bg-purple-500 cursor-col-resize transition-colors shrink-0"
          onMouseDown={startDraggingLeft}
        />

        <ContentPanel
          documentViewerRef={documentViewerRef}
          summaryContentRef={summaryContentRef}
          documentContentRef={documentContentRef}
          docContent={docContent}
          showSections={showSections}
          onShowSections={() => setShowSections(true)}
          onHideSections={() => setShowSections(false)}
          selectedSectionId={selectedSectionId}
          activeSectionId={activeSectionId}
          onSectionSelect={setSelectedSectionId}
          handleSectionClick={handleSectionClick}
          selectedDocId={selectedDocId}
          summaryError={summaryError}
          summaryContent={summaryContent}
          isSummaryLoading={isSummaryLoading}
          onOpenSummarySettings={() => setShowSummarySettings(true)}
          onGenerateSummary={handleManualSummaryGeneration}
          docError={docError}
          isDocLoading={isDocLoading}
        />

        {/* Resize handle for right panel */}
        <div
          className="w-1 bg-slate-800 hover:bg-sky-500 cursor-col-resize transition-colors shrink-0"
          onMouseDown={startDraggingRight}
        />

        <ChatPanel
          widthPercent={rightPanelWidth}
          chatMessages={chatMessages}
          isStreaming={isStreaming}
          onRegenerate={handleRegenerateResponse}
          onClearConversation={handleClearConversation}
          selectedSectionTitle={selectedSectionId && docContent ? docContent.sections.find((s) => s.id === selectedSectionId)?.title : undefined}
          onClearSelectedSection={() => setSelectedSectionId(null)}
          chatContainerRef={chatContainerRef}
          onChatScroll={handleScroll}
          chatEndRef={chatEndRef}
          streamingCharCount={streamingCharCount}
          chatInput={chatInput}
          onChatInputChange={setChatInput}
          onChatKeyDown={handleKeyDown}
          onSend={handleSend}
          onStopGeneration={handleStopGeneration}
          isDocSelected={Boolean(selectedDocId)}
        />
      </main>
      {/* About Modal */}
      <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />
      
      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onSave={handleSaveSettings}
      />

      <SummarySettingsModal
        isOpen={showSummarySettings}
        preset={summaryPreset}
        detailLevel={summaryDetailLevel}
        tone={summaryTone}
        questionCount={summaryQuestions}
        onClose={() => setShowSummarySettings(false)}
        onPresetChange={setSummaryPreset}
        onDetailLevelChange={setSummaryDetailLevel}
        onToneChange={setSummaryTone}
        onQuestionCountChange={setSummaryQuestions}
        onGenerate={handleManualSummaryGeneration}
      />
    </div>
  );
}

