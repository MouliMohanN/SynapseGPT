"use client";

// web/src/app/page.tsx
import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import type { ChatMessage, DocNode, DocumentContent } from "@/lib/types";

const DEFAULT_CONVERSATION_ID = "demo-conversation";

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
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setDocError(message);
      } finally {
        setIsDocLoading(false);
      }
    };

    void loadDoc();
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
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      const errorAssistant: ChatMessage = {
        role: "assistant",
        content: `Error: ${message}`,
        mode: "question",
        createdAt: new Date().toISOString(),
      };
      setChatMessages((prev) => [...prev.slice(0, assistantIndex), errorAssistant]);
    } finally {
      setIsStreaming(false);
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

  return (
    <main className="h-screen w-screen flex bg-slate-950 text-slate-50">
      {/* Left: document browser */}
      <section className="w-1/5 border-r border-slate-800 flex flex-col bg-slate-950/60">
        <div className="border-b border-slate-900 px-3 py-2">
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

      {/* Center: summary (top 25%) + raw viewer (bottom 75%) */}
      <section className="flex-1 flex flex-col border-r border-slate-800">
        <div className="h-1/4 border-b border-slate-800 p-3">
          <h2 className="text-sm font-semibold mb-2">AI Summary</h2>
          <p className="text-xs text-slate-400">
            {/* In a later unit this will call the LLM to summarize the selected document or section. */}
            Select a document to see a summary here.
          </p>
        </div>
        <div className="flex-1 p-3 overflow-auto">
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

      {/* Right: chat panel */}
      <section className="w-1/4 p-3 flex flex-col">
        <h2 className="text-sm font-semibold mb-2">Chat</h2>
        <div className="flex-1 border border-slate-800 rounded-md p-3 mb-2 overflow-auto space-y-3">
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
              <span className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1.5 font-semibold">
                {msg.role === "user" ? "You" : "Assistant"}
              </span>
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
                  <ReactMarkdown rehypePlugins={[rehypeRaw]}>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <span className="text-xs leading-relaxed">{msg.content}</span>
              )}
            </div>
          ))}
        </div>
        <form className="flex gap-2" onSubmit={handleSend}>
          <input
            type="text"
            placeholder="Ask anything about this document…"
            className="flex-1 bg-slate-900 border border-slate-700 rounded-md px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-sky-500"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            disabled={!selectedDocId || isStreaming}
          />
          <button
            type="submit"
            className="px-3 py-1 text-xs rounded-md bg-sky-600 hover:bg-sky-500"
            disabled={!selectedDocId || isStreaming || !chatInput.trim()}
          >
            {isStreaming ? "Streaming…" : "Send"}
          </button>
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
