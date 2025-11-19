import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { prism } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { ChatMessage, DocumentContent } from '@/lib/types';

interface ChatPanelProps {
  chatMessages: ChatMessage[];
  isStreaming: boolean;
  streamingCharCount: number;
  chatInput: string;
  selectedDocId: string | null;
  selectedSectionId: string | null;
  docContent: DocumentContent | null;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  chatContainerRef: React.RefObject<HTMLDivElement | null>;
  setChatInput: (value: string) => void;
  handleSend: (event: React.FormEvent) => void;
  handleStopGeneration: () => void;
  handleClearConversation: () => void;
  handleRegenerateResponse: () => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  handleScroll: () => void;
  setSelectedSectionId: (id: string | null) => void;
  rightPanelWidth: number;
}

export function ChatPanel({
  chatMessages,
  isStreaming,
  streamingCharCount,
  chatInput,
  selectedDocId,
  selectedSectionId,
  docContent,
  chatEndRef,
  chatContainerRef,
  setChatInput,
  handleSend,
  handleStopGeneration,
  handleClearConversation,
  handleRegenerateResponse,
  handleKeyDown,
  handleScroll,
  setSelectedSectionId,
  rightPanelWidth,
}: ChatPanelProps) {
  return (
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
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                  components={{
                    table: (props) => (
                      <div className="overflow-x-auto my-3">
                        <table
                          {...props}
                          className="w-full border border-slate-200 text-left text-[11px]"
                        />
                      </div>
                    ),
                    thead: (props) => <thead {...props} className="bg-slate-100" />,
                    th: (props) => (
                      <th
                        {...props}
                        className="px-2 py-1 border border-slate-200 font-semibold"
                      />
                    ),
                    td: (props) => (
                      <td
                        {...props}
                        className="px-2 py-1 border border-slate-200 align-top"
                      />
                    ),
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
  );
}
