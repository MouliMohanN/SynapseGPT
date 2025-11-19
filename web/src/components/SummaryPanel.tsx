import React from 'react';
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
  setShowSummarySettings: (show: boolean) => void;
  handleGenerateSummary: () => void;
}

export function SummaryPanel({
  selectedDocId,
  summaryContent,
  isSummaryLoading,
  summaryError,
  summaryContentRef,
  setShowSummarySettings,
  handleGenerateSummary,
}: SummaryPanelProps) {
  return (
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
      </div>
    </div>
  );
}

interface SummarySettingsModalProps {
  showSummarySettings: boolean;
  setShowSummarySettings: (show: boolean) => void;
  handleGenerateSummary: () => void;
}

export function SummarySettingsModal({
  showSummarySettings,
  setShowSummarySettings,
  handleGenerateSummary,
}: SummarySettingsModalProps) {
  if (!showSummarySettings) return null;

  return (
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
          <p className="text-sm text-slate-600">
            AI Summary now uses the unified settings from the main Settings panel.
            Configure detail level, tone, and question generation there.
          </p>
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
  );
}
