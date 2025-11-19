"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { prism } from "react-syntax-highlighter/dist/esm/styles/prism";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { DocumentViewerSkeleton, SummarySkeleton } from "@/components/Skeleton";
import type { DocumentContent } from "@/lib/types";

interface ContentPanelProps {
  documentViewerRef: React.RefObject<HTMLDivElement | null>;
  summaryContentRef: React.RefObject<HTMLDivElement | null>;
  documentContentRef: React.RefObject<HTMLDivElement | null>;
  docContent: DocumentContent | null;
  showSections: boolean;
  onShowSections: () => void;
  onHideSections: () => void;
  selectedSectionId: string | null;
  activeSectionId: string | null;
  onSectionSelect: (id: string | null) => void;
  handleSectionClick: (sectionId: string) => void;
  selectedDocId: string | null;
  summaryError: string | null;
  summaryContent: string;
  isSummaryLoading: boolean;
  onOpenSummarySettings: () => void;
  onGenerateSummary: () => void;
  docError: string | null;
  isDocLoading: boolean;
}

export const ContentPanel = ({
  documentViewerRef,
  summaryContentRef,
  documentContentRef,
  docContent,
  showSections,
  onShowSections,
  onHideSections,
  selectedSectionId,
  activeSectionId,
  onSectionSelect,
  handleSectionClick,
  selectedDocId,
  summaryError,
  summaryContent,
  isSummaryLoading,
  onOpenSummarySettings,
  onGenerateSummary,
  docError,
  isDocLoading,
}: ContentPanelProps) => {
  return (
    <section
      className="flex-1 flex border-r border-slate-300 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-400 scrollbar-track-slate-100 hover:scrollbar-thumb-purple-500"
      ref={documentViewerRef}
    >
      {docContent && showSections && (
        <div className="w-48 border-r border-slate-300 shrink-0 sticky top-0 self-start h-screen flex flex-col overflow-hidden bg-white shadow-sm">
          <div className="px-3 py-2 border-b border-slate-300 flex items-center justify-between bg-slate-50 shrink-0">
            <h3 className="text-xs font-semibold text-slate-800">Sections</h3>
            <button
              onClick={onHideSections}
              className="text-xs text-slate-400 hover:text-slate-700"
              title="Hide sections"
            >
              ✕
            </button>
          </div>
          <div className="overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-slate-400 scrollbar-track-slate-100 hover:scrollbar-thumb-purple-500">
            <div className="border-b border-slate-300">
              <button
                onClick={() => {
                  onSectionSelect(null);
                  const summaryEl = document.querySelector('[data-section="ai-summary"]');
                  summaryEl?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className={`w-full text-left px-3 py-2 text-[11px] transition-colors ${
                  selectedSectionId === null
                    ? "bg-purple-50 text-purple-700 font-semibold border-l-2 border-purple-600"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                ✨ AI Summary
              </button>
            </div>
            {docContent.sections.length > 0 && (
              <div className="p-2 space-y-0.5">
                {docContent.sections.map((section) => (
                  <button
                    key={section.id}
                    data-section-id={section.id}
                    onClick={() => handleSectionClick(section.id)}
                    className={`w-full text-left px-2 py-1 rounded-md text-[11px] transition-all ${
                      activeSectionId === section.id
                        ? "bg-purple-600 text-white shadow-sm"
                        : selectedSectionId === section.id
                          ? "bg-purple-50 text-purple-700 border border-purple-200"
                          : "hover:bg-slate-100 text-slate-700"
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

      <div className="flex-1 flex flex-col">
        <div data-section="ai-summary" className="flex flex-col shrink-0 border-b border-slate-300 bg-purple-50/30">
          <div className="p-3 pb-2 flex flex-col">
            <div className="flex items-center justify-between mb-2 shrink-0">
              <h2 className="text-sm font-semibold text-slate-800">✨ AI Summary</h2>
              {selectedDocId && (
                <div className="flex gap-2">
                  <button
                    onClick={onOpenSummarySettings}
                    className="px-2 py-1 text-[10px] bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md shadow-sm transition-colors"
                    title="Configure summary settings"
                  >
                    ⚙️ Settings
                  </button>
                  <button
                    onClick={onGenerateSummary}
                    disabled={isSummaryLoading}
                    className="px-2 py-1 text-[10px] bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 disabled:text-slate-500 text-white rounded-md shadow-sm transition-colors"
                  >
                    {isSummaryLoading ? "Generating..." : "Regenerate"}
                  </button>
                </div>
              )}
            </div>

            {!selectedDocId && <p className="text-xs text-slate-600">Select a document to see its summary.</p>}

            {selectedDocId && summaryError && <div className="text-xs text-red-600">Error: {summaryError}</div>}

            {selectedDocId && summaryContent && (
              <ErrorBoundary>
                <div ref={summaryContentRef}>
                  <div className="prose prose-slate prose-xs max-w-none text-xs prose-p:my-3 prose-p:leading-relaxed prose-p:text-slate-900 prose-ul:my-3 prose-ul:pl-5 prose-ul:space-y-1 prose-ol:my-3 prose-ol:pl-5 prose-ol:space-y-1 prose-li:my-1 prose-li:text-slate-900 prose-h1:text-sm prose-h1:font-bold prose-h1:mt-4 prose-h1:mb-2 prose-h1:text-slate-900 prose-h2:text-xs prose-h2:font-bold prose-h2:mt-3 prose-h2:mb-1.5 prose-h2:text-slate-900 prose-h3:text-xs prose-h3:font-semibold prose-h3:mt-2 prose-h3:mb-1 prose-h3:text-slate-900 prose-code:text-[11px] prose-code:bg-purple-100 prose-code:text-purple-900 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono prose-code:font-medium prose-pre:my-3 prose-pre:bg-slate-50 prose-pre:p-3 prose-pre:rounded-lg prose-pre:border prose-pre:border-slate-300 prose-strong:text-slate-900 prose-strong:font-semibold prose-a:text-purple-600 prose-a:underline prose-a:hover:text-purple-700">
                    <ReactMarkdown rehypePlugins={[rehypeRaw]}>{summaryContent}</ReactMarkdown>
                  </div>
                </div>
              </ErrorBoundary>
            )}

            {selectedDocId && isSummaryLoading && !summaryContent && <SummarySkeleton />}
          </div>
        </div>

        <div className="flex-1 p-3 bg-white">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-800">📄 Document Viewer</h2>
              {docContent && !showSections && (
                <button
                  onClick={onShowSections}
                  className="text-xs px-2 py-0.5 bg-purple-600 hover:bg-purple-700 text-white rounded-md shadow-sm transition-colors"
                  title="Show sections"
                >
                  📑 Sections
                </button>
              )}
            </div>
            {docContent && (
              <span className="text-[10px] text-slate-600">
                {docContent.path} · {docContent.meta.fileType?.toUpperCase()} · {docContent.meta.size} chars
              </span>
            )}
          </div>
          {isDocLoading && <DocumentViewerSkeleton />}
          {docError && <p className="text-xs text-red-600">Failed to load document: {docError}</p>}
          {!isDocLoading && !docError && !docContent && (
            <p className="text-xs text-slate-600">Select a document from the left to view its contents.</p>
          )}
          {!isDocLoading && !docError && docContent && (
            <ErrorBoundary>
              <div
                ref={documentContentRef}
                className="prose prose-slate prose-sm max-w-none text-slate-900 prose-p:my-3 prose-p:leading-relaxed prose-p:text-slate-900 prose-ul:my-3 prose-ul:pl-5 prose-ul:space-y-1 prose-ol:my-3 prose-ol:pl-5 prose-ol:space-y-1 prose-li:my-1 prose-li:text-slate-900 prose-h1:text-lg prose-h1:font-bold prose-h1:mt-6 prose-h1:mb-3 prose-h1:text-slate-900 prose-h2:text-base prose-h2:font-bold prose-h2:mt-5 prose-h2:mb-2 prose-h2:text-slate-900 prose-h3:text-sm prose-h3:font-semibold prose-h3:mt-4 prose-h3:mb-2 prose-h3:text-slate-900 prose-code:text-xs prose-code:bg-purple-100 prose-code:text-purple-900 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono prose-code:font-medium prose-pre:my-4 prose-pre:bg-slate-50 prose-pre:p-4 prose-pre:rounded-lg prose-pre:border prose-pre:border-slate-300 prose-strong:font-semibold prose-strong:text-slate-900 prose-a:text-purple-600 prose-a:underline prose-a:hover:text-purple-700"
              >
                <ReactMarkdown
                  rehypePlugins={[rehypeRaw]}
                  components={{
                    code({ className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || "");
                      const codeString = String(children).replace(/\n$/, "");
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
                              borderRadius: "0.375rem",
                              fontSize: "0.75rem",
                              backgroundColor: "#f8f9fa",
                              border: "1px solid #e2e8f0",
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
  );
};
