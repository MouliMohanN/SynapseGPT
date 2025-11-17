"use client";

// web/src/app/page.tsx
import React, { useEffect, useState } from "react";
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
  const toggleFolder = (id: string) => {
    setExpandedFolders((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <main className="h-screen w-screen flex bg-slate-950 text-slate-50">
      {/* Left: document browser */}
      <section className="w-1/5 border-r border-slate-800 p-3 flex flex-col">
        <h2 className="text-sm font-semibold mb-2">Documents</h2>
        <div className="flex-1 text-xs text-slate-200 overflow-auto">
          {isDocsLoading && <p className="text-slate-500">Loading documents…</p>}
          {docsError && (
            <p className="text-red-400">Failed to load docs: {docsError}</p>
          )}
          {!isDocsLoading && !docsError && docs.length === 0 && (
            <p className="text-slate-500">No documents found.</p>
          )}
          {!isDocsLoading && !docsError && docs.length > 0 && (
            <div className="space-y-1">
              {docs.map((node) => (
                <DocTreeNode
                  key={node.id}
                  node={node}
                  depth={0}
                  expanded={expandedFolders}
                  onToggleFolder={toggleFolder}
                  selectedDocId={selectedDocId}
                  onSelectDoc={setSelectedDocId}
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
        <div className="flex-1 border border-slate-800 rounded-md p-2 mb-2 overflow-auto space-y-1">
          {chatMessages.length === 0 && (
            <p className="text-xs text-slate-500">
              Start a conversation about the selected document.
            </p>
          )}
          {chatMessages.map((msg, index) => (
            <div
              key={`${msg.role}-${msg.createdAt}-${index}`}
              className={`text-xs px-2 py-1 rounded-md max-w-full break-words ${msg.role === "user" ? "bg-sky-700/60 self-end ml-6" : "bg-slate-800 mr-6"}`}
            >
              <span className="block text-[10px] uppercase tracking-wide text-slate-400 mb-0.5">
                {msg.role === "user" ? "You" : "Assistant"}
              </span>
              <span>{msg.content}</span>
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
}

function DocTreeNode({
  node,
  depth,
  expanded,
  onToggleFolder,
  selectedDocId,
  onSelectDoc,
}: DocTreeNodeProps) {
  const isFolder = node.type === "folder";
  const isExpanded = !!expanded[node.id];
  const isActive = node.id === selectedDocId;

  const paddingLeft = 4 + depth * 10;

  if (isFolder) {
    return (
      <div>
        <button
          type="button"
          onClick={() => onToggleFolder(node.id)}
          className="w-full flex items-center gap-1 px-2 py-1 rounded-md hover:bg-slate-800"
          style={{ paddingLeft }}
        >
          <span className="text-[10px] text-slate-400">
            {isExpanded ? "▾" : "▸"}
          </span>
          <span className="truncate font-medium">{node.name}</span>
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
      className={`w-full text-left px-2 py-1 rounded-md transition-colors ${isActive ? "bg-sky-700 text-white" : "hover:bg-slate-800"}`}
      style={{ paddingLeft }}
    >
      <span className="block truncate">{node.name}</span>
      <span className="block text-[10px] text-slate-400">{node.path}</span>
    </button>
  );
}
