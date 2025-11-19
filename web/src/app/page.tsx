"use client";

// web/src/app/page.tsx
import React, { useEffect, useRef, useState } from "react";
import type { ChatMessage, DocNode, DocumentContent } from "@/lib/types";
import { SettingsModal } from "@/components/SettingsModal";
import { DocumentPanel } from "@/components/home/DocumentPanel";
import { ContentPanel } from "@/components/home/ContentPanel";
import { ChatPanel } from "@/components/home/ChatPanel";
import { AppHeader } from "@/components/home/AppHeader";
import { AboutModal } from "@/components/home/AboutModal";

const DEFAULT_CONVERSATION_ID = "demo-conversation";
const CHAT_STORAGE_KEY = "synapsegpt-chat-history";

export default function HomePage() {
  const [docs, setDocs] = useState<DocNode[]>([]);
  const [isDocsLoading, setIsDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState<string | null>(null);

  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [docContent, setDocContent] = useState<DocumentContent | null>(null);
  const [isDocLoading, setIsDocLoading] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);

  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [docFilter, setDocFilter] = useState("");
  const [contentSearch, setContentSearch] = useState("");
  const [searchResults, setSearchResults] = useState<{docId: string, matches: number}[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [settings, setSettings] = useState({
    aiModel: "gpt-oss:20b",
    temperature: 0.7,
    maxTokens: -1,
    topP: 0.9,
    defaultLeftWidth: 20,
    defaultRightWidth: 25,
  });
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [streamingCharCount, setStreamingCharCount] = useState(0);
  
  const [summaryContent, setSummaryContent] = useState<string>("");
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summaryPreset, setSummaryPreset] = useState<"quick" | "balanced" | "deep">("balanced");
  const [summaryDetailLevel, setSummaryDetailLevel] = useState<"overview" | "detailed" | "comprehensive">("detailed");
  const [summaryTone, setSummaryTone] = useState<"professional" | "casual" | "tutorial">("professional");
  const [summaryQuestions, setSummaryQuestions] = useState<number>(-1); // -1 means let LLM decide
  const [showSummarySettings, setShowSummarySettings] = useState(false);
  
  const [showSections, setShowSections] = useState(true);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  
  const [leftPanelWidth, setLeftPanelWidth] = useState(20); // percentage
  const [rightPanelWidth, setRightPanelWidth] = useState(25); // percentage
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const summaryContentRef = useRef<HTMLDivElement | null>(null);
  const documentViewerRef = useRef<HTMLDivElement | null>(null);
  const documentContentRef = useRef<HTMLDivElement | null>(null);

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

  // Initial docs load.
  useEffect(() => {
    const loadDocs = async () => {
      try {
        setIsDocsLoading(true);
        setDocsError(null);
        const res = await fetch("/api/docs");
        if (!res.ok) {
          throw new Error(`Failed to load docs: ${res.status}`);
        }
        const data = (await res.json()) as { docs: DocNode[] };
        setDocs(data.docs);
        // Auto-select the first file if available to make the UI feel alive.
        const firstFile = findFirstFile(data.docs);
        if (firstFile) {
          setSelectedDocId(firstFile.id);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setDocsError(message);
      } finally {
        setIsDocsLoading(false);
      }
    };

    void loadDocs();
  }, []);

  // Load document content when selection changes.
  useEffect(() => {
    if (!selectedDocId) {
      setDocContent(null);
      setSummaryContent("");
      setSummaryError(null);
      return;
    }

    const loadDoc = async () => {
      try {
        setIsDocLoading(true);
        setDocError(null);
        const encodedId = encodeURIComponent(selectedDocId);
        const res = await fetch(`/api/docs/${encodedId}`);
        if (!res.ok) {
          throw new Error(`Failed to load document: ${res.status}`);
        }
        const data = (await res.json()) as DocumentContent;
        setDocContent(data);
        
        // Auto-generate summary when document loads
        handleGenerateSummary();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setDocError(message);
      } finally {
        setIsDocLoading(false);
      }
    };

    void loadDoc();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDocId]);

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
      localStorage.removeItem(CHAT_STORAGE_KEY);
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

  const handleGenerateSummary = async () => {
    if (!selectedDocId || isSummaryLoading) return;

    setSummaryContent("");
    setSummaryError(null);
    setIsSummaryLoading(true);

    const controller = new AbortController();

    // Configure based on preset
    const presetConfigs = {
      quick: {
        temperature: 0.3,
        maxTokens: 512,
        topP: 0.85,
      },
      balanced: {
        temperature: 0.5,
        maxTokens: 1536,
        topP: 0.9,
      },
      deep: {
        temperature: 0.7,
        maxTokens: 3072,
        topP: 0.95,
      },
    };

    const config = presetConfigs[summaryPreset];

    // Build custom message based on detail level, tone, and question settings
    const detailInstructions = {
      overview: "Provide a high-level overview focusing on main concepts only.",
      detailed: "Provide a detailed summary with explanations and examples.",
      comprehensive: "Provide an exhaustive analysis covering all aspects, edge cases, and nuances.",
    };

    const toneInstructions = {
      professional: "Use formal, technical language appropriate for professional documentation.",
      casual: "Use conversational, easy-to-understand language as if explaining to a colleague.",
      tutorial: "Use step-by-step teaching style with clear examples and beginner-friendly explanations.",
    };

    const questionInstruction = summaryQuestions === -1
      ? "Generate all relevant and important questions with detailed answers."
      : summaryQuestions > 0
        ? `Generate exactly ${summaryQuestions} relevant questions with detailed answers.`
        : "Do not include questions and answers section.";

    const customMessage = `${detailInstructions[summaryDetailLevel]} ${toneInstructions[summaryTone]} ${questionInstruction}`;

    try {
      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: "summary-" + selectedDocId,
          docId: selectedDocId,
          sectionId: null,
          mode: "summary",
          message: customMessage,
          modelConfig: {
            temperature: config.temperature,
            maxTokens: config.maxTokens,
            topP: config.topP,
          },
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`Summary request failed: ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      let done = false;
      let accumulatedContent = "";
      
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          accumulatedContent += chunk;
          setSummaryContent(accumulatedContent);
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        const message = err instanceof Error ? err.message : "Unknown error";
        setSummaryError(message);
      }
    } finally {
      setIsSummaryLoading(false);
    }
  };

  const sortDocs = (nodes: DocNode[]): DocNode[] => {
    return nodes
      .map(node => {
        if (node.type === "folder" && node.children) {
          return {
            ...node,
            children: sortDocs(node.children)
          };
        }
        return node;
      })
      .sort((a, b) => {
        // Folders first, then files
        if (a.type === "folder" && b.type === "file") return -1;
        if (a.type === "file" && b.type === "folder") return 1;
        // Alphabetically by name
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      });
  };

  const filterDocs = (nodes: DocNode[], query: string): DocNode[] => {
    if (!query.trim()) return nodes;
    const lowerQuery = query.toLowerCase();

    const matches = (node: DocNode): boolean => {
      const fullPath = node.path || node.name;
      return (
        node.name.toLowerCase().includes(lowerQuery) ||
        fullPath.toLowerCase().includes(lowerQuery)
      );
    };

    const recurse = (node: DocNode): DocNode | null => {
      if (node.type === "file") {
        return matches(node) ? node : null;
      }

      const filteredChildren = (node.children || [])
        .map(recurse)
        .filter((child): child is DocNode => child !== null);

      if (filteredChildren.length > 0 || matches(node)) {
        return {
          ...node,
          children: filteredChildren,
        };
      }

      return null;
    };

    return nodes
      .map(recurse)
      .filter((node): node is DocNode => node !== null);
  };

  const visibleDocs = sortDocs(filterDocs(docs, docFilter));
  const toggleFolder = (id: string) => {
    setExpandedFolders((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Full-text search across all documents
  const handleContentSearch = async () => {
    if (!contentSearch.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const results: {docId: string, matches: number}[] = [];
    const searchLower = contentSearch.toLowerCase();

    // Search through all loaded documents
    for (const doc of docs) {
      if (doc.type === "file") {
        try {
          const encodedId = encodeURIComponent(doc.id);
          const res = await fetch(`/api/docs/${encodedId}`);
          if (res.ok) {
            const data = (await res.json()) as DocumentContent;
            const matches = (data.rawText.toLowerCase().match(new RegExp(searchLower, 'g')) || []).length;
            if (matches > 0) {
              results.push({ docId: doc.id, matches });
            }
          }
        } catch {
          // Skip errors for individual documents
        }
      }
    }

    setSearchResults(results.sort((a, b) => b.matches - a.matches));
    setIsSearching(false);
  };

  const handleSaveSettings = (newSettings: typeof settings) => {
    setSettings(newSettings);
    setLeftPanelWidth(newSettings.defaultLeftWidth);
    setRightPanelWidth(newSettings.defaultRightWidth);
    localStorage.setItem('synapsegpt-settings', JSON.stringify(newSettings));
  };

  // Load settings from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('synapsegpt-settings');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSettings(parsed);
        setLeftPanelWidth(parsed.defaultLeftWidth || 20);
        setRightPanelWidth(parsed.defaultRightWidth || 25);
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  const handleMouseMoveLeft = React.useCallback((e: MouseEvent) => {
    const newWidth = (e.clientX / window.innerWidth) * 100;
    if (newWidth >= 10 && newWidth <= 40) {
      setLeftPanelWidth(newWidth);
    }
  }, []);

  const handleMouseMoveRight = React.useCallback((e: MouseEvent) => {
    const newWidth = ((window.innerWidth - e.clientX) / window.innerWidth) * 100;
    if (newWidth >= 15 && newWidth <= 50) {
      setRightPanelWidth(newWidth);
    }
  }, []);

  const handleMouseUp = React.useCallback(() => {
    setIsDraggingLeft(false);
    setIsDraggingRight(false);
  }, []);

  useEffect(() => {
    if (isDraggingLeft) {
      window.addEventListener('mousemove', handleMouseMoveLeft as EventListener);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMoveLeft as EventListener);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingLeft, handleMouseMoveLeft, handleMouseUp]);

  useEffect(() => {
    if (isDraggingRight) {
      window.addEventListener('mousemove', handleMouseMoveRight as EventListener);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMoveRight as EventListener);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingRight, handleMouseMoveRight, handleMouseUp]);

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
          onMouseDown={() => setIsDraggingLeft(true)}
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
          onGenerateSummary={handleGenerateSummary}
          docError={docError}
          isDocLoading={isDocLoading}
        />

        {/* Resize handle for right panel */}
        <div
          className="w-1 bg-slate-800 hover:bg-sky-500 cursor-col-resize transition-colors shrink-0"
          onMouseDown={() => setIsDraggingRight(true)}
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

      {/* AI Summary Settings Modal */}
      {showSummarySettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowSummarySettings(false)}>
          <div 
            className="bg-white border border-slate-200 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">AI Summary Settings</h2>
              <button
                onClick={() => setShowSummarySettings(false)}
                className="text-slate-500 hover:text-slate-700 text-xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {/* Speed Preset */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">Speed Preset</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSummaryPreset("quick")}
                    className={`flex-1 px-3 py-2 text-xs rounded transition-all ${
                      summaryPreset === "quick"
                        ? "bg-purple-600 text-white shadow-sm"
                        : "bg-white text-slate-700 hover:bg-purple-50 border border-slate-300"
                    }`}
                  >
                    ⚡ Quick
                    <div className="text-[9px] opacity-75 mt-0.5">512 tokens</div>
                  </button>
                  <button
                    onClick={() => setSummaryPreset("balanced")}
                    className={`flex-1 px-3 py-2 text-xs rounded transition-all ${
                      summaryPreset === "balanced"
                        ? "bg-purple-600 text-white shadow-sm"
                        : "bg-white text-slate-700 hover:bg-purple-50 border border-slate-300"
                    }`}
                  >
                    ⚖️ Balanced
                    <div className="text-[9px] opacity-75 mt-0.5">1536 tokens</div>
                  </button>
                  <button
                    onClick={() => setSummaryPreset("deep")}
                    className={`flex-1 px-3 py-2 text-xs rounded transition-all ${
                      summaryPreset === "deep"
                        ? "bg-purple-600 text-white shadow-sm"
                        : "bg-white text-slate-700 hover:bg-purple-50 border border-slate-300"
                    }`}
                  >
                    🔬 Deep
                    <div className="text-[9px] opacity-75 mt-0.5">3072 tokens</div>
                  </button>
                </div>
              </div>

              {/* Detail Level */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">Detail Level</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSummaryDetailLevel("overview")}
                    className={`flex-1 px-3 py-2 text-xs rounded transition-all ${
                      summaryDetailLevel === "overview"
                        ? "bg-amber-500 text-white shadow-sm"
                        : "bg-white text-slate-700 hover:bg-amber-50 border border-slate-300"
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setSummaryDetailLevel("detailed")}
                    className={`flex-1 px-3 py-2 text-xs rounded transition-all ${
                      summaryDetailLevel === "detailed"
                        ? "bg-amber-500 text-white shadow-sm"
                        : "bg-white text-slate-700 hover:bg-amber-50 border border-slate-300"
                    }`}
                  >
                    Detailed
                  </button>
                  <button
                    onClick={() => setSummaryDetailLevel("comprehensive")}
                    className={`flex-1 px-3 py-2 text-xs rounded transition-all ${
                      summaryDetailLevel === "comprehensive"
                        ? "bg-amber-500 text-white shadow-sm"
                        : "bg-white text-slate-700 hover:bg-amber-50 border border-slate-300"
                    }`}
                  >
                    Comprehensive
                  </button>
                </div>
              </div>

              {/* Tone */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">Writing Tone</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSummaryTone("professional")}
                    className={`flex-1 px-3 py-2 text-xs rounded transition-all ${
                      summaryTone === "professional"
                        ? "bg-blue-500 text-white shadow-sm"
                        : "bg-white text-slate-700 hover:bg-blue-50 border border-slate-300"
                    }`}
                  >
                    📊 Professional
                  </button>
                  <button
                    onClick={() => setSummaryTone("casual")}
                    className={`flex-1 px-3 py-2 text-xs rounded transition-all ${
                      summaryTone === "casual"
                        ? "bg-blue-500 text-white shadow-sm"
                        : "bg-white text-slate-700 hover:bg-blue-50 border border-slate-300"
                    }`}
                  >
                    💬 Casual
                  </button>
                  <button
                    onClick={() => setSummaryTone("tutorial")}
                    className={`flex-1 px-3 py-2 text-xs rounded transition-all ${
                      summaryTone === "tutorial"
                        ? "bg-blue-500 text-white shadow-sm"
                        : "bg-white text-slate-700 hover:bg-blue-50 border border-slate-300"
                    }`}
                  >
                    📚 Tutorial
                  </button>
                </div>
              </div>

              {/* Questions */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">
                  Questions: {summaryQuestions === -1 ? 'All (LLM decides)' : summaryQuestions === 0 ? 'None' : summaryQuestions}
                </label>
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={() => setSummaryQuestions(0)}
                    className={`px-3 py-1.5 text-xs rounded transition-all ${
                      summaryQuestions === 0
                        ? "bg-green-600 text-white shadow-sm"
                        : "bg-white text-slate-700 hover:bg-green-50 border border-slate-300"
                    }`}
                  >
                    None
                  </button>
                  <button
                    onClick={() => setSummaryQuestions(5)}
                    className={`px-3 py-1.5 text-xs rounded transition-all ${
                      summaryQuestions === 5
                        ? "bg-green-600 text-white shadow-sm"
                        : "bg-white text-slate-700 hover:bg-green-50 border border-slate-300"
                    }`}
                  >
                    Few (5)
                  </button>
                  <button
                    onClick={() => setSummaryQuestions(10)}
                    className={`px-3 py-1.5 text-xs rounded transition-all ${
                      summaryQuestions === 10
                        ? "bg-green-600 text-white shadow-sm"
                        : "bg-white text-slate-700 hover:bg-green-50 border border-slate-300"
                    }`}
                  >
                    Many (10)
                  </button>
                  <button
                    onClick={() => setSummaryQuestions(-1)}
                    className={`px-3 py-1.5 text-xs rounded transition-all ${
                      summaryQuestions === -1
                        ? "bg-green-600 text-white shadow-sm"
                        : "bg-white text-slate-700 hover:bg-green-50 border border-slate-300"
                    }`}
                  >
                    All
                  </button>
                </div>
                {summaryQuestions > 0 && summaryQuestions !== -1 && (
                  <input
                    type="range"
                    min="1"
                    max="20"
                    step="1"
                    value={summaryQuestions}
                    onChange={(e) => setSummaryQuestions(parseInt(e.target.value))}
                    className="w-full accent-green-600"
                  />
                )}
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  handleGenerateSummary();
                  setShowSummarySettings(false);
                }}
                className="flex-1 px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors font-medium shadow-sm"
              >
                Apply & Generate
              </button>
              <button
                onClick={() => setShowSummarySettings(false)}
                className="px-4 py-2 text-sm bg-slate-200 hover:bg-slate-300 text-slate-700 rounded transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function findFirstFile(nodes: DocNode[]): DocNode | null {
  for (const node of nodes) {
    if (node.type === "file") {
      return node;
    }
    if (node.children) {
      const found = findFirstFile(node.children);
      if (found) return found;
    }
  }
  return null;
}
