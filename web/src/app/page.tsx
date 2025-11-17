"use client";

// web/src/app/page.tsx
import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import type { ChatMessage, DocNode, DocumentContent } from "@/lib/types";

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
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [streamingCharCount, setStreamingCharCount] = useState(0);
  
  const [summaryContent, setSummaryContent] = useState<string>("");
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  
  const [leftPanelWidth, setLeftPanelWidth] = useState(20); // percentage
  const [rightPanelWidth, setRightPanelWidth] = useState(25); // percentage
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const summaryContentRef = useRef<HTMLDivElement>(null);
  const [isSummaryOverflowing, setIsSummaryOverflowing] = useState(false);

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

  // Detect if summary content is overflowing
  useEffect(() => {
    if (summaryContentRef.current && summaryContent && !isSummaryLoading) {
      const element = summaryContentRef.current;
      const isOverflowing = element.scrollHeight > element.clientHeight;
      setIsSummaryOverflowing(isOverflowing);
    } else {
      setIsSummaryOverflowing(false);
    }
  }, [summaryContent, isSummaryLoading, isSummaryExpanded]);

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
          sectionId: null,
          mode: "question",
          message: userMessage.content,
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

    try {
      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: "summary-" + selectedDocId,
          docId: selectedDocId,
          sectionId: null,
          mode: "summary",
          message: "Provide a concise summary of this document.",
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
          const chunk = decoder.decode(value);
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

  const visibleDocs = filterDocs(docs, docFilter);
  const toggleFolder = (id: string) => {
    setExpandedFolders((prev) => ({ ...prev, [id]: !prev[id] }));
  };

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
    <main className="h-screen w-screen flex bg-slate-950 text-slate-50 overflow-hidden">
      {/* Left: document browser */}
      <section className="border-r border-slate-800 flex flex-col bg-slate-950/60 overflow-hidden" style={{ width: `${leftPanelWidth}%` }}>
        <div className="border-b border-slate-900 px-3 py-2 shrink-0">
          <h2 className="text-sm font-semibold mb-2">Documents</h2>
          <input
            type="text"
            value={docFilter}
            onChange={(e) => setDocFilter(e.target.value)}
            placeholder="Filter by name or path…"
            className="w-full rounded bg-slate-900/80 px-2 py-1 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>
        <div className="flex-1 text-xs text-slate-200 overflow-auto p-3">
          {isDocsLoading && <p className="text-slate-500">Loading documents…</p>}
          {docsError && (
            <p className="text-red-400">Failed to load docs: {docsError}</p>
          )}
          {!isDocsLoading && !docsError && visibleDocs.length === 0 && (
            <p className="text-slate-500">No documents found.</p>
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
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Resize handle for left panel */}
      <div
        className="w-1 bg-slate-800 hover:bg-sky-500 cursor-col-resize transition-colors shrink-0"
        onMouseDown={() => setIsDraggingLeft(true)}
      />

      {/* Center: summary (top 25%) + raw viewer (bottom 75%) */}
      <section className="flex-1 flex flex-col border-r border-slate-800 overflow-y-auto">
        <div className={`flex flex-col transition-all duration-300 relative shrink-0 ${
          isSummaryExpanded ? '' : 'h-1/4'
        }`}>
          <div className={`p-3 pb-2 flex flex-col ${
            isSummaryExpanded ? '' : 'h-full overflow-hidden'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold">AI Summary</h2>
              {selectedDocId && (
                <button
                  onClick={handleGenerateSummary}
                  disabled={isSummaryLoading}
                  className="px-2 py-1 text-[10px] bg-sky-600 hover:bg-sky-700 disabled:bg-slate-700 disabled:text-slate-500 rounded transition-colors"
                >
                  {isSummaryLoading ? "Generating..." : "Regenerate"}
                </button>
              )}
            </div>
            
            {!selectedDocId && (
              <p className="text-xs text-slate-400">Select a document to see its summary.</p>
            )}
            
            {selectedDocId && isSummaryLoading && (
              <div className="flex items-center gap-2 text-slate-400 text-xs">
                <div className="flex gap-1">
                  <span className="animate-bounce" style={{ animationDelay: '0ms' }}>●</span>
                  <span className="animate-bounce" style={{ animationDelay: '150ms' }}>●</span>
                  <span className="animate-bounce" style={{ animationDelay: '300ms' }}>●</span>
                </div>
                <span>Generating summary...</span>
              </div>
            )}
            
            {selectedDocId && summaryError && (
              <div className="text-xs text-red-400">
                Error: {summaryError}
              </div>
            )}
            
            {selectedDocId && !isSummaryLoading && summaryContent && (
              <div ref={summaryContentRef} className={isSummaryExpanded ? 'pb-3' : 'flex-1 overflow-auto'}>
                <div className="prose prose-invert prose-xs max-w-none text-xs
                  prose-p:my-3 prose-p:leading-relaxed
                  prose-ul:my-3 prose-ul:pl-5 prose-ul:space-y-1
                  prose-ol:my-3 prose-ol:pl-5 prose-ol:space-y-1
                  prose-li:my-1
                  prose-h1:text-sm prose-h1:font-bold prose-h1:mt-4 prose-h1:mb-2
                  prose-h2:text-xs prose-h2:font-bold prose-h2:mt-3 prose-h2:mb-1.5
                  prose-h3:text-xs prose-h3:font-semibold prose-h3:mt-2 prose-h3:mb-1
                  prose-code:text-[10px] prose-code:bg-slate-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                  prose-pre:my-3 prose-pre:bg-slate-900 prose-pre:p-2"
                >
                  <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                    {summaryContent}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </div>
          
          {/* Divider with expand/collapse button */}
          <div className="relative h-px bg-slate-800">
            {isSummaryOverflowing && (
              <button
                onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1 text-[10px] bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-full transition-colors shadow-lg flex items-center gap-1"
              >
                {isSummaryExpanded ? (
                  <>
                    <span>↑</span>
                    <span>Collapse</span>
                  </>
                ) : (
                  <>
                    <span>↓</span>
                    <span>Expand</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
        <div className="shrink-0 p-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold">Document Viewer</h2>
            {docContent && (
              <span className="text-[10px] text-slate-500">
                {docContent.path} · {docContent.meta.fileType?.toUpperCase()} ·{" "}
                {docContent.meta.size} chars
              </span>
            )}
          </div>
          {isDocLoading && (
            <p className="text-xs text-slate-500">Loading document…</p>
          )}
          {docError && (
            <p className="text-xs text-red-400">Failed to load document: {docError}</p>
          )}
          {!isDocLoading && !docError && !docContent && (
            <p className="text-xs text-slate-500">
              Select a document from the left to view its contents.
            </p>
          )}
          {!isDocLoading && !docError && docContent && (
            <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono">
              {docContent.rawText}
            </pre>
          )}
        </div>
      </section>

      {/* Resize handle for right panel */}
      <div
        className="w-1 bg-slate-800 hover:bg-sky-500 cursor-col-resize transition-colors shrink-0"
        onMouseDown={() => setIsDraggingRight(true)}
      />

      {/* Right: chat panel */}
      <section className="p-3 flex flex-col overflow-hidden" style={{ width: `${rightPanelWidth}%` }}>
        <div className="flex items-center justify-between mb-2 shrink-0">
          <h2 className="text-sm font-semibold">Chat</h2>
          <div className="flex gap-2">
            {chatMessages.length > 0 && (
              <>
                <button
                  onClick={handleRegenerateResponse}
                  disabled={isStreaming || chatMessages.length < 2}
                  className="text-[10px] px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Regenerate last response"
                >
                  ↻ Regenerate
                </button>
                <button
                  onClick={handleClearConversation}
                  disabled={isStreaming}
                  className="text-[10px] px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Clear conversation"
                >
                  Clear
                </button>
              </>
            )}
          </div>
        </div>
        <div 
          ref={chatContainerRef}
          onScroll={handleScroll}
          className="flex-1 border border-slate-800 rounded-md p-3 mb-2 overflow-auto space-y-3"
        >
          {chatMessages.length === 0 && (
            <p className="text-xs text-slate-500">
              Start a conversation about the selected document.
            </p>
          )}
          {chatMessages.map((msg, index) => (
            <div
              key={`${msg.role}-${msg.createdAt}-${index}`}
              className={`px-3 py-2 rounded-md ${msg.role === "user" ? "bg-sky-700/60 ml-8" : "bg-slate-800/80 mr-2"}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                  {msg.role === "user" ? "You" : "Assistant"}
                </span>
                <span className="text-[9px] text-slate-500">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              {msg.role === "assistant" ? (
                <div className="prose prose-invert prose-xs max-w-none text-xs
                  prose-p:my-4 prose-p:leading-relaxed
                  prose-ul:my-4 prose-ul:pl-6 prose-ul:space-y-2
                  prose-ol:my-4 prose-ol:pl-6 prose-ol:space-y-2
                  prose-li:leading-relaxed prose-li:pl-2
                  prose-headings:mt-6 prose-headings:mb-3 prose-headings:font-bold prose-headings:text-xs
                  prose-h1:text-xs prose-h2:text-xs prose-h3:text-xs
                  prose-pre:my-4 prose-pre:bg-slate-950/80 prose-pre:border prose-pre:border-slate-700 prose-pre:text-xs
                  prose-code:text-sky-300 prose-code:bg-slate-900/70 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
                  prose-strong:font-semibold
                  prose-a:text-sky-400 prose-a:underline">
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
                              className="absolute right-2 top-2 px-2 py-1 text-[10px] bg-slate-700 hover:bg-slate-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              Copy
                            </button>
                            <SyntaxHighlighter
                              style={vscDarkPlus as any}
                              language={match[1]}
                              PreTag="div"
                              customStyle={{
                                margin: 0,
                                borderRadius: '0.375rem',
                                fontSize: '0.75rem',
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
            <div className="px-3 py-2 rounded-md bg-slate-800/80 mr-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-400 text-xs">
                  <div className="flex gap-1">
                    <span className="animate-bounce" style={{ animationDelay: '0ms' }}>●</span>
                    <span className="animate-bounce" style={{ animationDelay: '150ms' }}>●</span>
                    <span className="animate-bounce" style={{ animationDelay: '300ms' }}>●</span>
                  </div>
                  <span>Generating response...</span>
                </div>
                {streamingCharCount > 0 && (
                  <span className="text-[10px] font-mono text-sky-400">
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
            className="flex-1 bg-slate-900 border border-slate-700 rounded-md px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-sky-500 resize-none min-h-[60px]"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!selectedDocId || isStreaming}
            rows={2}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 px-3 py-1.5 text-xs rounded-md bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!selectedDocId || isStreaming || !chatInput.trim()}
            >
              {isStreaming ? "Streaming…" : "Send"}
            </button>
            {isStreaming && (
              <button
                type="button"
                onClick={handleStopGeneration}
                className="px-3 py-1.5 text-xs rounded-md bg-red-600 hover:bg-red-500"
              >
                Stop
              </button>
            )}
          </div>
        </form>
      </section>
    </main>
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
}

function DocTreeNode({
  node,
  depth,
  expanded,
  onToggleFolder,
  selectedDocId,
  onSelectDoc,
  filterQuery,
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

  const paddingLeft = 4 + depth * 10;

  if (isFolder) {
    return (
      <div>
        <button
          type="button"
          onClick={() => onToggleFolder(node.id)}
          className={`w-full flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-slate-900/70 ${
            isMatch ? "bg-amber-900/40" : ""
          }`}
          style={{ paddingLeft }}
        >
          <span className="text-[10px] text-slate-400">
            {isExpanded ? "▾" : "▸"}
          </span>
          <span className="text-[11px] text-amber-300">📁</span>
          <span className="truncate font-medium text-slate-100">{node.name}</span>
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
      className={`w-full flex flex-col px-2 py-1 rounded-md transition-colors ${
        isActive
          ? "bg-sky-700/80 text-white"
          : isMatch
            ? "bg-sky-900/60 text-sky-100"
            : "hover:bg-slate-900/70"
      }`}
      style={{ paddingLeft }}
    >
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-sky-300">📄</span>
        <span className="block truncate text-[12px]">{node.name}</span>
      </div>
      <span className="block text-[10px] text-slate-500 truncate ml-4">
        {node.path}
      </span>
    </button>
  );
}
