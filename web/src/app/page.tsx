"use client";

// web/src/app/page.tsx
import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { prism } from "react-syntax-highlighter/dist/esm/styles/prism";
import type { ChatMessage, DocNode, DocumentContent } from "@/lib/types";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Logo } from "@/components/Logo";
import { DocumentTreeSkeleton, DocumentViewerSkeleton, SummarySkeleton } from "@/components/Skeleton";
import { SettingsModal } from "@/components/SettingsModal";

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
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const summaryContentRef = useRef<HTMLDivElement>(null);
  const documentViewerRef = useRef<HTMLDivElement>(null);
  const documentContentRef = useRef<HTMLDivElement>(null);

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
      {/* Header with branding */}
      <header className="bg-white border-b border-slate-300 px-6 py-3 flex items-center justify-between shadow-sm">
        <Logo size="md" showText={true} onClick={() => setShowAbout(true)} />
        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-600">
            <span className="font-medium text-slate-900">AI-Powered</span> Documentation Assistant
          </div>
          <div className="h-4 w-px bg-slate-300" />
          <a 
            href="https://www.synapsewave.com/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-purple-600 hover:text-purple-700 font-medium transition-colors"
          >
            Powered by SynapseWave
          </a>
        </div>
      </header>
      
      <main className="flex-1 flex overflow-hidden">
      {/* Left: document browser */}
      <section className="border-r border-slate-300 flex flex-col bg-white overflow-hidden" style={{ width: `${leftPanelWidth}%` }}>
        <div className="border-b border-slate-300 px-4 py-3 shrink-0 bg-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h2 className="text-sm font-semibold text-slate-900">Documentation</h2>
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="p-1.5 bg-white hover:bg-purple-50 text-purple-600 rounded-md border border-purple-200 hover:border-purple-300 transition-all"
              title="Settings"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
          <input
            type="text"
            value={docFilter}
            onChange={(e) => setDocFilter(e.target.value)}
            placeholder="Filter by name or path…"
            className="w-full rounded-lg bg-white border border-slate-300 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent mb-2 shadow-sm"
          />
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <svg className="w-3.5 h-3.5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={contentSearch}
                onChange={(e) => setContentSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleContentSearch()}
                placeholder="Search content…"
                className="w-full rounded-lg bg-white border border-slate-300 pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-sm"
              />
            </div>
            <button
              onClick={handleContentSearch}
              disabled={isSearching || !contentSearch.trim()}
              className="px-3 py-2 text-xs bg-purple-600 hover:bg-purple-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg shadow-sm transition-colors font-medium"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </div>
          {searchResults.length > 0 && (
            <div className="mt-2 px-2 py-1 text-[10px] text-purple-700 bg-purple-50 rounded-md border border-purple-200">
              <span className="font-medium">{searchResults.length}</span> result{searchResults.length !== 1 ? 's' : ''} found
            </div>
          )}
        </div>
        <div className="flex-1 text-xs text-slate-700 overflow-auto p-4 bg-white">
          <ErrorBoundary>
            {isDocsLoading && <DocumentTreeSkeleton />}
            {docsError && (
              <p className="text-red-400">Failed to load docs: {docsError}</p>
            )}
            {!isDocsLoading && !docsError && visibleDocs.length === 0 && (
              <div className="text-center py-8">
                <svg className="w-12 h-12 mx-auto text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-slate-500 text-sm">No documents found</p>
                <p className="text-slate-400 text-xs mt-1">Try adjusting your filters</p>
              </div>
            )}
            {!isDocsLoading && !docsError && visibleDocs.length > 0 && (
              <div className="space-y-1">
                {visibleDocs.map((node) => (
                  <DocTreeNode
                    key={node.id}
                    node={node}
                    depth={0}
                    expanded={expandedFolders}
                    onToggleFolder={toggleFolder}
                    selectedDocId={selectedDocId}
                    onSelectDoc={setSelectedDocId}
                    filterQuery={docFilter}
                    searchResults={searchResults}
                  />
                ))}
              </div>
            )}
          </ErrorBoundary>
        </div>
      </section>

      {/* Resize handle for left panel */}
      <div
        className="w-1 bg-slate-300 hover:bg-purple-500 cursor-col-resize transition-colors shrink-0"
        onMouseDown={() => setIsDraggingLeft(true)}
      />

      {/* Center: summary (top 25%) + raw viewer (bottom 75%) */}
      <section className="flex-1 flex border-r border-slate-300 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-400 scrollbar-track-slate-100 hover:scrollbar-thumb-purple-500" ref={documentViewerRef}>
        {/* Section TOC - Left side - sticky */}
        {docContent && showSections && (
          <div className="w-48 border-r border-slate-300 shrink-0 sticky top-0 self-start h-screen flex flex-col overflow-hidden bg-white shadow-sm">
            <div className="px-3 py-2 border-b border-slate-300 flex items-center justify-between bg-slate-50 shrink-0">
              <h3 className="text-xs font-semibold text-slate-800">Sections</h3>
              <button
                onClick={() => setShowSections(false)}
                className="text-xs text-slate-400 hover:text-slate-700"
                title="Hide sections"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-slate-400 scrollbar-track-slate-100 hover:scrollbar-thumb-purple-500">
              {/* AI Summary Section */}
              <div className="border-b border-slate-300">
                <button
                  onClick={() => {
                    setSelectedSectionId(null);
                    const summaryEl = document.querySelector('[data-section="ai-summary"]');
                    summaryEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className={`w-full text-left px-3 py-2 text-[11px] transition-colors ${
                    selectedSectionId === null
                      ? 'bg-purple-50 text-purple-700 font-semibold border-l-2 border-purple-600'
                      : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  ✨ AI Summary
                </button>
              </div>
              
              {/* Document Sections */}
              {docContent.sections.length > 0 && (
                <div className="p-2 space-y-0.5">
                  {docContent.sections.map((section) => (
                    <button
                      key={section.id}
                      data-section-id={section.id}
                      onClick={() => handleSectionClick(section.id)}
                      className={`w-full text-left px-2 py-1 rounded-md text-[11px] transition-all ${
                        activeSectionId === section.id
                          ? 'bg-purple-600 text-white shadow-sm'
                          : selectedSectionId === section.id
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'hover:bg-slate-100 text-slate-700'
                      }`}
                      style={{ paddingLeft: `${8 + (section.level - 1) * 8}px` }}
                    >
                      <span className="block truncate">{section.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Content area with summary and document viewer */}
        <div className="flex-1 flex flex-col">
        <div data-section="ai-summary" className="flex flex-col shrink-0 border-b border-slate-300 bg-purple-50/30">
          <div className="p-3 pb-2 flex flex-col">
            <div className="flex items-center justify-between mb-2 shrink-0">
              <h2 className="text-sm font-semibold text-slate-800">✨ AI Summary</h2>
              {selectedDocId && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowSummarySettings(true)}
                    className="px-2 py-1 text-[10px] bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md shadow-sm transition-colors"
                    title="Configure summary settings"
                  >
                    ⚙️ Settings
                  </button>
                  <button
                    onClick={handleGenerateSummary}
                    disabled={isSummaryLoading}
                    className="px-2 py-1 text-[10px] bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 disabled:text-slate-500 text-white rounded-md shadow-sm transition-colors"
                  >
                    {isSummaryLoading ? "Generating..." : "Regenerate"}
                  </button>
                </div>
              )}
            </div>
            
            {!selectedDocId && (
              <p className="text-xs text-slate-600">Select a document to see its summary.</p>
            )}
            
            {selectedDocId && summaryError && (
              <div className="text-xs text-red-600">
                Error: {summaryError}
              </div>
            )}
            
            {selectedDocId && summaryContent && (
              <ErrorBoundary>
                <div ref={summaryContentRef}>
                  <div className="prose prose-slate prose-xs max-w-none text-xs
                    prose-p:my-3 prose-p:leading-relaxed prose-p:text-slate-900
                    prose-ul:my-3 prose-ul:pl-5 prose-ul:space-y-1
                    prose-ol:my-3 prose-ol:pl-5 prose-ol:space-y-1
                    prose-li:my-1 prose-li:text-slate-900
                    prose-h1:text-sm prose-h1:font-bold prose-h1:mt-4 prose-h1:mb-2 prose-h1:text-slate-900
                    prose-h2:text-xs prose-h2:font-bold prose-h2:mt-3 prose-h2:mb-1.5 prose-h2:text-slate-900
                    prose-h3:text-xs prose-h3:font-semibold prose-h3:mt-2 prose-h3:mb-1 prose-h3:text-slate-900
                    prose-code:text-[11px] prose-code:bg-purple-100 prose-code:text-purple-900 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono prose-code:font-medium
                    prose-pre:my-3 prose-pre:bg-slate-50 prose-pre:p-3 prose-pre:rounded-lg prose-pre:border prose-pre:border-slate-300
                    prose-strong:text-slate-900 prose-strong:font-semibold
                    prose-a:text-purple-600 prose-a:underline prose-a:hover:text-purple-700"
                  >
                    <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                      {summaryContent}
                    </ReactMarkdown>
                  </div>
                </div>
              </ErrorBoundary>
            )}
            
            {selectedDocId && isSummaryLoading && !summaryContent && <SummarySkeleton />}
          </div>
        </div>
        
        {/* Document viewer */}
        <div className="flex-1 p-3 bg-white">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-800">📄 Document Viewer</h2>
                {docContent && !showSections && (
                  <button
                    onClick={() => setShowSections(true)}
                    className="text-xs px-2 py-0.5 bg-purple-600 hover:bg-purple-700 text-white rounded-md shadow-sm transition-colors"
                    title="Show sections"
                  >
                    📑 Sections
                  </button>
                )}
              </div>
              {docContent && (
                <span className="text-[10px] text-slate-600">
                  {docContent.path} · {docContent.meta.fileType?.toUpperCase()} ·{" "}
                  {docContent.meta.size} chars
                </span>
              )}
            </div>
          {isDocLoading && <DocumentViewerSkeleton />}
          {docError && (
            <p className="text-xs text-red-600">Failed to load document: {docError}</p>
          )}
          {!isDocLoading && !docError && !docContent && (
            <p className="text-xs text-slate-600">
              Select a document from the left to view its contents.
            </p>
          )}
          {!isDocLoading && !docError && docContent && (
            <ErrorBoundary>
              <div ref={documentContentRef} className="prose prose-slate prose-sm max-w-none text-slate-900
              prose-p:my-3 prose-p:leading-relaxed prose-p:text-slate-900
              prose-ul:my-3 prose-ul:pl-5 prose-ul:space-y-1
              prose-ol:my-3 prose-ol:pl-5 prose-ol:space-y-1
              prose-li:my-1 prose-li:text-slate-900
              prose-h1:text-lg prose-h1:font-bold prose-h1:mt-6 prose-h1:mb-3 prose-h1:text-slate-900
              prose-h2:text-base prose-h2:font-bold prose-h2:mt-5 prose-h2:mb-2 prose-h2:text-slate-900
              prose-h3:text-sm prose-h3:font-semibold prose-h3:mt-4 prose-h3:mb-2 prose-h3:text-slate-900
              prose-code:text-xs prose-code:bg-purple-100 prose-code:text-purple-900 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono prose-code:font-medium
              prose-pre:my-4 prose-pre:bg-slate-50 prose-pre:p-4 prose-pre:rounded-lg prose-pre:border prose-pre:border-slate-300
              prose-strong:font-semibold prose-strong:text-slate-900
              prose-a:text-purple-600 prose-a:underline prose-a:hover:text-purple-700"
            >
              <ReactMarkdown 
                rehypePlugins={[rehypeRaw]}
                components={{
                  code({ className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    const codeString = String(children).replace(/\n$/, '');
                    const isInline = !className;
                    
                    return !isInline && match ? (
                      <div className="relative group">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(codeString);
                          }}
                          className="absolute right-2 top-2 px-2 py-1 text-[10px] bg-purple-600 hover:bg-purple-700 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                        >
                          Copy
                        </button>
                        <SyntaxHighlighter
                          style={prism as any}
                          language={match[1]}
                          PreTag="div"
                          customStyle={{
                            margin: 0,
                            borderRadius: '0.375rem',
                            fontSize: '0.75rem',
                            backgroundColor: '#f8f9fa',
                            border: '1px solid #e2e8f0',
                          }}
                          {...props}
                        >
                          {codeString}
                        </SyntaxHighlighter>
                      </div>
                    ) : (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {docContent.rawText}
              </ReactMarkdown>
            </div>
            </ErrorBoundary>
          )}
        </div>
        </div>
      </section>

      {/* Resize handle for right panel */}
      <div
        className="w-1 bg-slate-800 hover:bg-sky-500 cursor-col-resize transition-colors shrink-0"
        onMouseDown={() => setIsDraggingRight(true)}
      />

      {/* Right: chat panel */}
      <section className="p-3 flex flex-col overflow-hidden bg-white" style={{ width: `${rightPanelWidth}%` }}>
        <div className="flex flex-col gap-1 mb-2 shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Chat</h2>
            <div className="flex gap-2">
              {chatMessages.length > 0 && (
                <>
                <button
                  onClick={handleRegenerateResponse}
                  disabled={isStreaming || chatMessages.length < 2}
                  className="text-[10px] px-2 py-1 rounded-md bg-purple-600 hover:bg-purple-700 text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Regenerate last response"
                >
                  ↻ Regenerate
                </button>
                <button
                  onClick={handleClearConversation}
                  disabled={isStreaming}
                  className="text-[10px] px-2 py-1 rounded-md bg-purple-600 hover:bg-purple-700 text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Clear conversation"
                >
                  Clear
                </button>
              </>
            )}
          </div>
          </div>
          {selectedSectionId && docContent && (
            <div className="text-[10px] text-slate-700 bg-purple-50 border border-purple-300 px-2 py-1 rounded-md flex items-center gap-1">
              <span>📍</span>
              <span>Asking about section:</span>
              <span className="font-semibold text-purple-700">
                {docContent.sections.find(s => s.id === selectedSectionId)?.title}
              </span>
              <button
                onClick={() => setSelectedSectionId(null)}
                className="ml-auto text-slate-500 hover:text-slate-700"
                title="Clear section context"
              >
                ✕
              </button>
            </div>
          )}
        </div>
        <div 
          ref={chatContainerRef}
          onScroll={handleScroll}
          className="flex-1 border border-slate-300 rounded-lg p-3 mb-2 overflow-auto space-y-3 bg-slate-50"
        >
          {chatMessages.length === 0 && (
            <p className="text-xs text-slate-600">
              Start a conversation about the selected document.
            </p>
          )}
          {chatMessages.map((msg, index) => (
            <div
              key={`${msg.role}-${msg.createdAt}-${index}`}
              className={`px-3 py-2 rounded-lg shadow-sm ${msg.role === "user" ? "bg-purple-600 text-white ml-8" : "bg-white border border-slate-200 mr-2 text-slate-900"}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className={`block text-[10px] uppercase tracking-wider font-semibold ${
                  msg.role === "user" ? "text-purple-100" : "text-slate-600"
                }`}>
                  {msg.role === "user" ? "You" : "Assistant"}
                </span>
                <span className={`text-[9px] ${
                  msg.role === "user" ? "text-purple-100" : "text-slate-500"
                }`}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              {msg.role === "assistant" ? (
                <div className="prose prose-slate prose-xs max-w-none text-xs
                  prose-p:my-4 prose-p:leading-relaxed prose-p:text-slate-900
                  prose-ul:my-4 prose-ul:pl-6 prose-ul:space-y-2
                  prose-ol:my-4 prose-ol:pl-6 prose-ol:space-y-2
                  prose-li:leading-relaxed prose-li:pl-2 prose-li:text-slate-900
                  prose-headings:mt-6 prose-headings:mb-3 prose-headings:font-bold prose-headings:text-xs prose-headings:text-slate-900
                  prose-h1:text-xs prose-h2:text-xs prose-h3:text-xs
                  prose-pre:my-4 prose-pre:bg-slate-50 prose-pre:border prose-pre:border-slate-300 prose-pre:text-xs prose-pre:rounded-lg
                  prose-code:bg-purple-100 prose-code:text-purple-900 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono prose-code:font-medium
                  prose-strong:font-semibold prose-strong:text-slate-900
                  prose-a:text-purple-600 prose-a:underline prose-a:hover:text-purple-700">
                  <ReactMarkdown 
                    rehypePlugins={[rehypeRaw]}
                    components={{
                      code({ className, children, ...props }: any) {
                        const match = /language-(\w+)/.exec(className || '');
                        const codeString = String(children).replace(/\n$/, '');
                        const isInline = !className;
                        
                        return !isInline && match ? (
                          <div className="relative group">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(codeString);
                              }}
                              className="absolute right-2 top-2 px-2 py-1 text-[10px] bg-purple-600 hover:bg-purple-700 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                            >
                              Copy
                            </button>
                            <SyntaxHighlighter
                              style={prism as any}
                              language={match[1]}
                              PreTag="div"
                              customStyle={{
                                margin: 0,
                                borderRadius: '0.375rem',
                                fontSize: '0.75rem',
                                backgroundColor: '#f8f9fa',
                                border: '1px solid #e2e8f0',
                              }}
                              {...props}
                            >
                              {codeString}
                            </SyntaxHighlighter>
                          </div>
                        ) : (
                          <code className={className} {...props}>
                            {children}
                          </code>
                        );
                      },
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <span className="text-xs leading-relaxed whitespace-pre-wrap">{msg.content}</span>
              )}
            </div>
          ))}
          {isStreaming && (
            <div className="px-3 py-2 rounded-lg bg-white border border-slate-200 shadow-sm mr-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-800 text-xs">
                  <div className="flex gap-1">
                    <span className="animate-bounce" style={{ animationDelay: '0ms' }}>●</span>
                    <span className="animate-bounce" style={{ animationDelay: '150ms' }}>●</span>
                    <span className="animate-bounce" style={{ animationDelay: '300ms' }}>●</span>
                  </div>
                  <span>Generating response...</span>
                </div>
                {streamingCharCount > 0 && (
                  <span className="text-[10px] font-mono text-purple-600">
                    {streamingCharCount} chars
                  </span>
                )}
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
        <form className="flex flex-col gap-2" onSubmit={handleSend}>
          <textarea
            placeholder="Ask anything about this document… (Shift+Enter for new line)"
            className="flex-1 bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none min-h-[60px] text-slate-900"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!selectedDocId || isStreaming}
            rows={2}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-purple-600 hover:bg-purple-700 text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!selectedDocId || isStreaming || !chatInput.trim()}
            >
              {isStreaming ? "Streaming…" : "Send"}
            </button>
            {isStreaming && (
              <button
                type="button"
                onClick={handleStopGeneration}
                className="px-3 py-1.5 text-xs rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-sm"
              >
                Stop
              </button>
            )}
          </div>
        </form>
      </section>

      {/* About Modal */}
      {showAbout && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAbout(false)}>
          <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-300 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Logo size="md" showText={true} />
                <div className="h-8 w-px bg-slate-300" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">About SynapseGPT</h2>
                  <p className="text-xs text-slate-600">AI-Powered Documentation Assistant</p>
                </div>
              </div>
              <button
                onClick={() => setShowAbout(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="px-6 py-6 space-y-6">
              {/* Capabilities Section */}
              <div>
                <h3 className="text-base font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Key Capabilities
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-purple-600 text-white rounded-lg">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-slate-900">Smart Document Browser</h4>
                        <p className="text-xs text-slate-600 mt-1">Hierarchical file tree with search, filtering, and alphabetical sorting</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-purple-600 text-white rounded-lg">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-slate-900">AI-Generated Summaries</h4>
                        <p className="text-xs text-slate-600 mt-1">Automatic document summarization with streaming responses</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-purple-600 text-white rounded-lg">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-slate-900">Contextual Chat Assistant</h4>
                        <p className="text-xs text-slate-600 mt-1">Ask questions about specific documents or sections with persistent history</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-purple-600 text-white rounded-lg">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-slate-900">Section Navigation</h4>
                        <p className="text-xs text-slate-600 mt-1">Interactive table of contents with active section tracking and scroll sync</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-purple-600 text-white rounded-lg">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-slate-900">Full-Text Search</h4>
                        <p className="text-xs text-slate-600 mt-1">Search across all documents with match counting and highlighting</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-purple-600 text-white rounded-lg">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-slate-900">Customizable Panels</h4>
                        <p className="text-xs text-slate-600 mt-1">Resizable panels, configurable AI settings, and persistent preferences</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Tech Stack Section */}
              <div>
                <h3 className="text-base font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  Technology Stack
                </h3>
                <div className="space-y-4">
                  {/* Frontend */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 mb-2">Frontend</h4>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1 bg-slate-100 text-slate-900 rounded-full text-xs font-medium">Next.js 15</span>
                      <span className="px-3 py-1 bg-slate-100 text-slate-900 rounded-full text-xs font-medium">React 19</span>
                      <span className="px-3 py-1 bg-slate-100 text-slate-900 rounded-full text-xs font-medium">TypeScript</span>
                      <span className="px-3 py-1 bg-slate-100 text-slate-900 rounded-full text-xs font-medium">Tailwind CSS 4</span>
                      <span className="px-3 py-1 bg-slate-100 text-slate-900 rounded-full text-xs font-medium">React Markdown</span>
                      <span className="px-3 py-1 bg-slate-100 text-slate-900 rounded-full text-xs font-medium">Syntax Highlighter</span>
                    </div>
                  </div>
                  
                  {/* Backend */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 mb-2">Backend & AI</h4>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1 bg-slate-100 text-slate-900 rounded-full text-xs font-medium">Next.js API Routes</span>
                      <span className="px-3 py-1 bg-slate-100 text-slate-900 rounded-full text-xs font-medium">Ollama</span>
                      <span className="px-3 py-1 bg-slate-100 text-slate-900 rounded-full text-xs font-medium">Streaming Responses</span>
                      <span className="px-3 py-1 bg-slate-100 text-slate-900 rounded-full text-xs font-medium">File System API</span>
                    </div>
                  </div>
                  
                  {/* Features */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 mb-2">Key Features & APIs</h4>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1 bg-slate-100 text-slate-900 rounded-full text-xs font-medium">Intersection Observer</span>
                      <span className="px-3 py-1 bg-slate-100 text-slate-900 rounded-full text-xs font-medium">Local Storage</span>
                      <span className="px-3 py-1 bg-slate-100 text-slate-900 rounded-full text-xs font-medium">Abort Controller</span>
                      <span className="px-3 py-1 bg-slate-100 text-slate-900 rounded-full text-xs font-medium">Error Boundaries</span>
                      <span className="px-3 py-1 bg-slate-100 text-slate-900 rounded-full text-xs font-medium">Responsive Design</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Footer */}
              <div className="border-t border-slate-200 pt-4 text-center">
                <p className="text-xs text-slate-600">
                  Built with ❤️ by{' '}
                  <a 
                    href="https://www.synapsewave.com/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-purple-600 hover:text-purple-700 font-medium"
                  >
                    SynapseWave
                  </a>
                </p>
                <p className="text-xs text-slate-500 mt-1">© 2025 SynapseGPT. All rights reserved.</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
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
      </main>
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

interface DocTreeNodeProps {
  node: DocNode;
  depth: number;
  expanded: Record<string, boolean>;
  onToggleFolder: (id: string) => void;
  selectedDocId: string | null;
  onSelectDoc: (id: string) => void;
  filterQuery?: string;
  searchResults?: {docId: string, matches: number}[];
}

function DocTreeNode({
  node,
  depth,
  expanded,
  onToggleFolder,
  selectedDocId,
  onSelectDoc,
  filterQuery,
  searchResults,
}: DocTreeNodeProps) {
  const isFolder = node.type === "folder";
  const isExpanded = filterQuery?.trim()
    ? true
    : !!expanded[node.id];
  const isActive = node.id === selectedDocId;
  const lowerQuery = filterQuery?.trim().toLowerCase() ?? "";
  const isMatch = lowerQuery
    ? (node.name.toLowerCase().includes(lowerQuery) ||
        (node.path || "").toLowerCase().includes(lowerQuery))
    : false;
  const searchMatch = searchResults?.find(r => r.docId === node.id);

  const paddingLeft = 4 + depth * 10;

  if (isFolder) {
    return (
      <div>
        <button
          type="button"
          onClick={() => onToggleFolder(node.id)}
          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-all group ${
            isMatch ? "bg-amber-50 border border-amber-300" : ""
          }`}
          style={{ paddingLeft }}
        >
          <svg className="w-3 h-3 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isExpanded ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            )}
          </svg>
          <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
          </svg>
          <span className="truncate font-medium text-slate-900 group-hover:text-slate-950">{node.name}</span>
        </button>
        {isExpanded && node.children && (
          <div className="mt-0.5 space-y-0.5">
            {node.children.map((child) => (
              <DocTreeNode
                key={child.id}
                node={child}
                depth={depth + 1}
                expanded={expanded}
                onToggleFolder={onToggleFolder}
                selectedDocId={selectedDocId}
                onSelectDoc={onSelectDoc}
                filterQuery={filterQuery}
                searchResults={searchResults}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelectDoc(node.id)}
      className={`w-full flex flex-col px-2 py-1.5 rounded-lg transition-all group ${
        isActive
          ? "bg-purple-600 text-white shadow-sm"
          : isMatch || searchMatch
            ? "bg-purple-50 text-purple-900 border border-purple-300"
            : "hover:bg-slate-100 text-slate-700"
      }`}
      style={{ paddingLeft }}
    >
      <div className="flex items-center gap-2">
        <svg className={`w-4 h-4 flex-shrink-0 ${
          isActive ? "text-purple-200" : "text-purple-500"
        }`} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
        </svg>
        <span className="block truncate text-[12px] font-medium">{node.name}</span>
        {searchMatch && (
          <span className="ml-auto text-[9px] bg-amber-500 text-white px-1.5 py-0.5 rounded-full font-medium">
            {searchMatch.matches}
          </span>
        )}
      </div>
      <span className={`block text-[10px] truncate ml-6 ${
        isActive ? "text-purple-200" : "text-slate-500"
      }`}>
        {node.path}
      </span>
    </button>
  );
}
