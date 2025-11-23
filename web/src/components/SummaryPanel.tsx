import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SummarySkeleton } from '@/components/Skeleton';

interface SummaryPanelProps {
  selectedDocId: string | null;
  summaryContent: string;
  isSummaryLoading: boolean;
  summaryError: string | null;
  summaryContentRef: React.RefObject<HTMLDivElement | null>;
  handleGenerateSummary: () => void;
  stopSummaryGeneration: () => void;
  canSummarize: boolean;
}

export function SummaryPanel({
  selectedDocId,
  summaryContent,
  isSummaryLoading,
  summaryError,
  summaryContentRef,
  handleGenerateSummary,
  stopSummaryGeneration,
  canSummarize,
}: SummaryPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div data-section="ai-summary" className="flex flex-col shrink-0 border-b border-slate-300 bg-purple-50/30">
      <div className="p-3 pb-2 flex flex-col">
        <div className="flex items-center justify-between mb-2 shrink-0">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 text-sm font-semibold text-slate-800 hover:text-purple-700 transition-colors"
          >
            {isExpanded ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
            ✨ AI Summary
          </button>
          
          {selectedDocId && (
            <div className="flex items-center gap-2">
              {isSummaryLoading ? (
                <button
                  onClick={stopSummaryGeneration}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-md shadow-sm transition-colors"
                >
                  <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="4" y="4" width="16" height="16" />
                  </svg>
                  Stop
                </button>
              ) : (
                <button
                  onClick={handleGenerateSummary}
                  disabled={!canSummarize}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] bg-purple-600 hover:bg-purple-700 text-white rounded-md shadow-sm transition-colors"
                >
                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Regenerate
                </button>
              )}
            </div>
          )}
        </div>
        
        {isExpanded && (
          <>
            {!selectedDocId && (
              <p className="text-xs text-slate-600 pl-5">Select a document to see its summary.</p>
            )}
            
            {selectedDocId && summaryError && (
              <div className="text-xs text-red-600 pl-5">
                Error: {summaryError}
              </div>
            )}
            
            {selectedDocId && summaryContent && (
              <ErrorBoundary>
                <div ref={summaryContentRef} className="pl-1">
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
                  }}
                >
                  {summaryContent}
                </ReactMarkdown>
              </div>
            </div>
          </ErrorBoundary>
        )}
        
            {selectedDocId && isSummaryLoading && !summaryContent && <SummarySkeleton />}
          </>
        )}
      </div>
    </div>
  );
}
