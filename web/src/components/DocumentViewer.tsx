import React, { useState } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { DocumentViewerSkeleton } from '@/components/Skeleton';
import type { DocumentContent } from '@/lib/types';
import type { HistoryPatchMetadata } from '@/lib/history';
import { DocumentEditor } from './Editor/DocumentEditor';
import { MarkdownRenderer } from './MarkdownRenderer';
import { HistorySidebar } from './History/HistorySidebar';
import { DiffViewer } from './History/DiffViewer';
import { PatchViewer } from './History/PatchViewer';

interface DocumentViewerProps {
  docContent: DocumentContent | null;
  isDocLoading: boolean;
  docError: string | null;
  showSections: boolean;
  documentContentRef: React.RefObject<HTMLDivElement | null>;
  setShowSections: (show: boolean) => void;
  onDocumentUpdate?: () => void;
  settings: any;
  onNotify?: (message: string, type: "success" | "error") => void;
  onAgentStateChange?: (isRunning: boolean, isMinimized: boolean) => void;
  onAgentHeightChange?: (height: number) => void;
  onSelectDoc?: (docId: string) => void;
}

export function DocumentViewer({
  docContent,
  isDocLoading,
  docError,
  showSections,
  documentContentRef,
  setShowSections,
  onDocumentUpdate,
  settings,
  onNotify,
  onAgentStateChange,
  onAgentHeightChange,
  onSelectDoc,
}: DocumentViewerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const shareMenuRef = React.useRef<HTMLDivElement | null>(null);
  const agentPanelRef = React.useRef<HTMLDivElement | null>(null);
  
  // History State
  const [showHistory, setShowHistory] = useState(false);
  const [historyVersions, setHistoryVersions] = useState<any[]>([]);
  const [selectedVersionTimestamp, setSelectedVersionTimestamp] = useState<string | null>(null);
  const [historicalContent, setHistoricalContent] = useState<string | null>(null);
  const [historicalPatch, setHistoricalPatch] = useState<string | null>(null);
  const [historicalMetadata, setHistoricalMetadata] = useState<any | null>(null);
  const [patchFilter, setPatchFilter] = useState<'all' | 'high' | 'low'>('all');
  const [historyViewMode, setHistoryViewMode] = useState<'diff' | 'patch'>('diff');
  const [isHistoryFullScreen, setIsHistoryFullScreen] = useState(false);
  const [showCopyLinkModal, setShowCopyLinkModal] = useState(false);
  const [linkToCopy, setLinkToCopy] = useState('');

  // Agent State
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [agentStatus, setAgentStatus] = useState<string>('');
  const [agentThoughts, setAgentThoughts] = useState<string[]>([]);
  const [agentLLMOutput, setAgentLLMOutput] = useState<string[]>([]);
  const [isAgentMinimized, setIsAgentMinimized] = useState(false);
  const [isAgentMaximized, setIsAgentMaximized] = useState(false);
  const [agentAbortController, setAgentAbortController] = useState<AbortController | null>(null);

  // Notify parent of Agent state changes
  React.useEffect(() => {
    onAgentStateChange?.(isAgentRunning, isAgentMinimized);
  }, [isAgentRunning, isAgentMinimized, onAgentStateChange]);

  // Measure Agent Panel Height
  React.useEffect(() => {
    if (!agentPanelRef.current) {
      onAgentHeightChange?.(0);
      return;
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        onAgentHeightChange?.(entry.contentRect.height);
      }
    });

    observer.observe(agentPanelRef.current);

    return () => observer.disconnect();
  }, [isAgentRunning, isAgentMinimized, isAgentMaximized, onAgentHeightChange]);

  // Prevent body scroll when Agent is maximized
  React.useEffect(() => {
    if (isAgentMaximized) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isAgentMaximized]);

  const fetchHistory = async () => {
    if (!docContent?.id) return;
    try {
      const res = await fetch(`/api/docs/${encodeURIComponent(docContent.id)}/history`);
      if (res.ok) {
        const data = await res.json();
        setHistoryVersions(data);
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
    }
  };

  const handleToggleHistory = () => {
    if (!showHistory) {
      fetchHistory();
    } else {
      setSelectedVersionTimestamp(null);
      setHistoricalContent(null);
      setHistoricalPatch(null);
      setHistoricalMetadata(null);
      setPatchFilter('all');
      setIsHistoryFullScreen(false);
    }
    setShowHistory(!showHistory);
  };

  const handleSelectVersion = async (timestamp: string) => {
    if (!docContent?.id) return;
    if (timestamp === 'current') {
      setSelectedVersionTimestamp(null);
      setHistoricalContent(null);
      setHistoricalPatch(null);
      return;
    }

    setSelectedVersionTimestamp(timestamp);
    try {
      const res = await fetch(`/api/docs/${encodeURIComponent(docContent.id)}/history/${timestamp}`);
      if (res.ok) {
        const data = await res.json();
        setHistoricalContent(data.content ?? null);
        setHistoricalPatch(data.patch ?? null);
        setHistoricalMetadata(data.metadata ?? null);
      }
    } catch (error) {
      console.error("Failed to fetch version:", error);
    }
  };

  const handleGenerateTestPlan = async () => {
    if (!docContent?.id || !docContent?.name) return;

    // Only allow for .md files that are NOT already test plans
    if (!docContent.name.endsWith('.md') || docContent.name.includes('_test_cases')) {
      onNotify?.("Can only generate test plans from PRD markdown files", "error");
      return;
    }

    setIsAgentRunning(true);
    setAgentStatus('Initializing Agent...');
    setAgentThoughts([]);
    setAgentLLMOutput([]);

    const abortController = new AbortController();
    setAgentAbortController(abortController);

    try {
      const response = await fetch('/api/agent/generate-test-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileContent: docContent.rawText,
          fileName: docContent.name,
          docId: docContent.id,
          modelConfig: settings.qaAgentSettings,
        }),
        signal: abortController.signal,
      });

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalMarkdown = '';

      const processLine = (line: string) => {
        if (!line.trim()) return;

        try {
          const event = JSON.parse(line);

          if (event.type === 'thought') {
            setAgentThoughts((prev) => [...prev, event.message]);
          } else if (event.type === 'progress') {
            setAgentLLMOutput((prev) => [...prev, event.message]);
          } else if (event.type === 'requirement') {
            setAgentThoughts((prev) => [...prev, `✓ ${event.message}`]);
          } else if (event.type === 'test') {
            // Incrementally save test cases as they're generated
            if (event.data?.partialMarkdown) {
              // Partial markdown received, but we only save at the end now
            }
          } else if (event.type === 'complete') {
            finalMarkdown = event.data?.markdown || '';
            console.log('Final markdown received:', finalMarkdown.length, 'chars');
            setAgentStatus('Test plan generated!');
          } else if (event.type === 'error') {
            throw new Error(event.message);
          }
        } catch (parseError) {
          console.error('Failed to parse event:', line, parseError);
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        
        if (value) {
          buffer += decoder.decode(value, { stream: !done });
        }

        if (done) {
          // Flush any remaining buffer
          if (buffer.trim()) {
             const lines = buffer.split('\n');
             for (const line of lines) {
               if (line.trim()) processLine(line);
             }
          }
          break;
        }

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          processLine(line);
        }
      }

      // Save the generated test plan
      if (finalMarkdown) {
        const testPlanName = docContent.name.replace('.md', '_test_cases.md');
        const testPlanPath = docContent.path.replace(docContent.name, testPlanName);

        const parentPath = docContent.path.split('/').slice(0, -1).join('/');
        const saveResponse = await fetch('/api/docs/file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: testPlanName,
            parentPath: parentPath,
            content: finalMarkdown,
            overwrite: true,
            relatedDocId: docContent.id,
          }),
        });

        if (saveResponse.ok) {
          onNotify?.(`Test plan saved: ${testPlanName} (${finalMarkdown.length} chars)`, "success");
          onDocumentUpdate?.();
          
          // Auto-navigate to the new file
          if (onSelectDoc) {
             // Construct the docId for the new file
             // docContent.id is like "folder/doc.md"
             // testPlanName is "doc_test_cases.md"
             // parentPath is "folder"
             const newDocId = parentPath ? `${parentPath}/${testPlanName}` : testPlanName;
             onSelectDoc(newDocId);
          }
        } else {
          throw new Error('Failed to save test plan');
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        onNotify?.("Agent execution stopped by user", "success");
        setAgentStatus('Stopped by user');
      } else {
        console.error('Agent error:', error);
        onNotify?.(error instanceof Error ? error.message : 'Agent failed', "error");
        setAgentStatus('Error occurred');
      }
    } finally {
      setAgentAbortController(null);
      setIsAgentRunning(false);
      setTimeout(() => {
        setAgentStatus('');
        setAgentThoughts([]);
        setAgentLLMOutput([]);
      }, 3000);
    }
  };

  const handleStopAgent = () => {
    if (agentAbortController) {
      agentAbortController.abort();
      setAgentStatus('Stopping Agent...');
    }
  };

  // Reset editing and history state when document changes
  React.useEffect(() => {
    setIsEditing(false);
    setShowHistory(false);
    setSelectedVersionTimestamp(null);
    setHistoricalContent(null);
    setHistoricalPatch(null);
    setHistoricalMetadata(null);
    setPatchFilter('all');
    setHistoryViewMode('diff');
    setIsHistoryFullScreen(false);
  }, [docContent?.id]);

  // Prevent background scrolling when history is shown full screen
  React.useEffect(() => {
    if (!isHistoryFullScreen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isHistoryFullScreen]);

  // Close Share menu on outside click
  React.useEffect(() => {
    if (!isShareMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        shareMenuRef.current &&
        !shareMenuRef.current.contains(event.target as Node)
      ) {
        setIsShareMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isShareMenuOpen]);

  const handleSaveEdit = async (newContent: string, historyMetadata?: HistoryPatchMetadata | null) => {
    if (!docContent?.id) return;
    
    try {
      const encodedId = encodeURIComponent(docContent.id);
      const res = await fetch(`/api/docs/${encodedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          content: newContent, 
          historyMetadata: historyMetadata ?? null
        }),
      });
      
      if (!res.ok) {
        throw new Error("Failed to save document");
      }
      
      onDocumentUpdate?.();
      setIsEditing(false);
      onNotify?.("Document saved", "success");
    } catch (err) {
      console.error("Failed to save:", err);
      onNotify?.("Failed to save document", "error");
    }
  };

  const handleShareLink = (format: "external" | "internal") => {
    if (!docContent?.id || typeof window === "undefined") return;
    try {
      const { origin, pathname } = window.location;
      const basePath = pathname.split("#")[0].split("?")[0] || "/";
      const encodedId = encodeURIComponent(docContent.id);
      const internalUrl = `${basePath}?doc=${encodedId}`;
      const externalUrl = `${origin}${internalUrl}`;
      const urlToCopy = format === "external" ? externalUrl : internalUrl;
      const label = format === "external" ? "External" : "Internal";

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(urlToCopy).then(
          () => {
            console.info(`${label} share link: ${urlToCopy}`);
            onNotify?.(urlToCopy, "success");
          },
          (err) => {
            console.error(`Failed to copy ${label.toLowerCase()} link:`, err);
            setLinkToCopy(urlToCopy);
            setShowCopyLinkModal(true);
          },
        );
      } else {
        setLinkToCopy(urlToCopy);
        setShowCopyLinkModal(true);
      }
    } catch (error) {
      console.error("Failed to build share URL:", error);
    }
  };

  const renderHistoryModeToggle = () => (
    <div className="inline-flex items-center rounded-full bg-slate-200 p-0.5 text-[10px]">
      <button
        type="button"
        onClick={() => setHistoryViewMode('diff')}
        className={`px-2 py-0.5 rounded-full ${
          historyViewMode === 'diff'
            ? 'bg-white text-purple-700 shadow-sm'
            : 'text-slate-600 hover:text-slate-800'
        }`}
      >
        Diff
      </button>
      <button
        type="button"
        onClick={() => setHistoryViewMode('patch')}
        disabled={!historicalPatch}
        className={`ml-0.5 px-2 py-0.5 rounded-full ${
          historyViewMode === 'patch'
            ? 'bg-white text-purple-700 shadow-sm'
            : 'text-slate-600 hover:text-slate-800'
        } ${!historicalPatch ? 'opacity-40 cursor-not-allowed' : ''}`}
      >
        Patch
      </button>
    </div>
  );

  const renderHistoryFilterPills = () => {
    if (!historicalPatch) return null;
    return (
      <div className="inline-flex items-center rounded-full bg-slate-200 p-0.5 text-[10px]">
        <button
          type="button"
          onClick={() => setPatchFilter('all')}
          className={`px-2 py-0.5 rounded-full ${
            patchFilter === 'all'
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => setPatchFilter('high')}
          className={`ml-0.5 px-2 py-0.5 rounded-full ${
            patchFilter === 'high'
              ? 'bg-white text-green-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          High
        </button>
        <button
          type="button"
          onClick={() => setPatchFilter('low')}
          className={`ml-0.5 px-2 py-0.5 rounded-full ${
            patchFilter === 'low'
              ? 'bg-white text-red-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          Low
        </button>
      </div>
    );
  };

  const renderHistoryHeader = (variant: 'inline' | 'fullscreen') => {
    const paddingX = variant === 'inline' ? 'px-3' : 'px-4';
    const title =
      historyViewMode === 'diff'
        ? 'Changes vs current version'
        : 'Exact patch for this save';

    return (
      <div
        className={`flex items-center justify-between ${paddingX} py-2 border-b border-slate-200 bg-slate-50`}
      >
        <div className="text-[11px] font-medium text-slate-600">{title}</div>
        <div className="flex items-center gap-2">
          {renderHistoryModeToggle()}
          {renderHistoryFilterPills()}
          {variant === 'inline' ? (
            <button
              type="button"
              onClick={() => setIsHistoryFullScreen(true)}
              className="text-[10px] px-2 py-0.5 rounded-full border border-slate-300 text-slate-600 hover:bg-slate-100"
            >
              Full Screen
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsHistoryFullScreen(false)}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 p-3 bg-white flex flex-col h-full">
      <div className="flex items-center justify-between mb-2 shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-800">📄 Document Viewer</h2>
          {docContent && (
            <span className="text-[10px] text-slate-600">
              {docContent.path} · {(docContent.meta?.fileType ?? '').toUpperCase()} ·{" "}
              {docContent.meta?.size ?? 0} chars
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {docContent && !isEditing && (
            <div className="relative" ref={shareMenuRef}>
              <button
                onClick={() => setIsShareMenuOpen((prev) => !prev)}
                className="text-xs px-2 py-0.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-md shadow-sm transition-colors flex items-center gap-1"
                title="Copy shareable link"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-1.414 1.414a4 4 0 105.656 5.656l1.414-1.414M10.172 13.828a4 4 0 005.656 0l1.414-1.414a4 4 0 10-5.656-5.656l-1.414 1.414" />
                </svg>
                Share
              </button>
              {isShareMenuOpen && (
                <div className="absolute right-0 mt-1 w-40 bg-white border border-slate-200 rounded-md shadow-lg text-xs py-1 z-10">
                  <button
                    type="button"
                    onClick={() => { handleShareLink("external"); setIsShareMenuOpen(false); }}
                    className="w-full text-left px-3 py-1 hover:bg-slate-50"
                  >
                    Copy full browser URL
                  </button>
                  <button
                    type="button"
                    onClick={() => { handleShareLink("internal"); setIsShareMenuOpen(false); }}
                    className="w-full text-left px-3 py-1 hover:bg-slate-50"
                  >
                    Copy in-app URL
                  </button>
                </div>
              )}
            </div>
          )}
          {docContent && !showSections && !isEditing && (
            <button
              onClick={() => setShowSections(true)}
              className="text-xs px-2 py-0.5 bg-purple-600 hover:bg-purple-700 text-white rounded-md shadow-sm transition-colors"
              title="Show sections"
            >
              📑 Sections
            </button>
          )}
          {docContent && !isEditing && (
             <button
               onClick={handleToggleHistory}
               className={`text-xs px-2 py-0.5 rounded-md shadow-sm transition-colors flex items-center gap-1 ${
                 showHistory 
                   ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                   : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
               }`}
               title="View History"
             >
               <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
               </svg>
               History
             </button>
           )}
           {docContent && !isEditing && docContent.name.endsWith('.md') && !docContent.name.includes('_test_cases') && (
             <button
               onClick={handleGenerateTestPlan}
               disabled={isAgentRunning}
               className={`text-xs px-2 py-0.5 rounded-md shadow-sm transition-colors flex items-center gap-1 ${
                 isAgentRunning
                   ? 'bg-purple-100 text-purple-700 border border-purple-200 cursor-wait'
                   : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white'
               }`}
               title="Generate Test Plan using AI Agent"
             >
               <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
               </svg>
               {isAgentRunning ? 'Generating...' : '🤖 Generate Tests'}
             </button>
           )}
           {docContent && !isEditing && (
            <button
              onClick={() => {
                // Exit history view when entering edit mode so the editor takes precedence
                setShowHistory(false);
                setSelectedVersionTimestamp(null);
                setHistoricalContent(null);
                setHistoricalPatch(null);
                setHistoricalMetadata(null);
                setIsHistoryFullScreen(false);
                setIsEditing(true);
              }}
              className="text-xs px-2 py-0.5 bg-purple-600 hover:bg-purple-700 text-white rounded-md shadow-sm transition-colors flex items-center gap-1"
              title="Edit document"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>
          )}
        </div>
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
        showHistory ? (
          <div className="flex-1 flex overflow-hidden border border-slate-200 rounded-lg">
             <div className="flex-1 flex flex-col overflow-hidden">
                {selectedVersionTimestamp && (historicalContent || historicalPatch) ? (
                  <div className="flex-1 flex flex-col overflow-hidden bg-white">
                    {renderHistoryHeader('inline')}

                    {historyViewMode === 'patch' && historicalPatch ? (
                      <PatchViewer
                        patch={historicalPatch}
                        metadata={historicalMetadata ?? undefined}
                        filter={patchFilter}
                      />
                    ) : historyViewMode === 'diff' && historicalContent ? (
                      <DiffViewer
                        oldContent={historicalContent}
                        newContent={docContent.rawText}
                        patch={historicalPatch ?? undefined}
                        metadata={historicalMetadata ?? undefined}
                        filter={patchFilter}
                      />
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-slate-400 bg-slate-50 text-xs">
                        {historyViewMode === 'patch' ? 'No patch available for this version' : 'Unable to load diff for this version'}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-slate-400 bg-slate-50">
                    Select a version to view changes
                  </div>
                )}
             </div>
             <HistorySidebar 
                versions={historyVersions}
                selectedVersion={selectedVersionTimestamp}
                onSelectVersion={handleSelectVersion}
                onClose={() => setShowHistory(false)}
             />
          </div>
        ) : isEditing ? (
          <DocumentEditor
            initialContent={docContent.rawText}
            onSave={handleSaveEdit}
            onCancel={() => setIsEditing(false)}
            autocompleteSettings={settings.autocompleteSettings}
            docId={docContent.id}
          />
        ) : (
          <ErrorBoundary>
            <div ref={documentContentRef} className="flex-1 overflow-y-auto">
              <MarkdownRenderer content={docContent.rawText} />
            </div>
          </ErrorBoundary>
        )
      )}

      {docContent && showHistory && isHistoryFullScreen && selectedVersionTimestamp && (historicalContent || historicalPatch) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setIsHistoryFullScreen(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-6xl w-full h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {renderHistoryHeader('fullscreen')}
            <div className="flex-1 min-h-0 flex">
              {historyViewMode === 'patch' && historicalPatch ? (
                <PatchViewer
                  patch={historicalPatch}
                  metadata={historicalMetadata ?? undefined}
                  filter={patchFilter}
                />
              ) : historyViewMode === 'diff' && historicalContent ? (
                <DiffViewer
                  oldContent={historicalContent}
                  newContent={docContent.rawText}
                  patch={historicalPatch ?? undefined}
                  metadata={historicalMetadata ?? undefined}
                  filter={patchFilter}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center text-slate-400 bg-slate-50 text-xs">
                  {historyViewMode === 'patch' ? 'No patch available for this version' : 'Unable to load diff for this version'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Copy Link Modal */}
      {showCopyLinkModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowCopyLinkModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Copy Link</h3>
            <p className="text-sm text-slate-600 mb-4">Copy this link manually:</p>
            <input
              type="text"
              value={linkToCopy}
              readOnly
              className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-sm text-slate-900 mb-4"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <div className="flex justify-end">
              <button
                onClick={() => setShowCopyLinkModal(false)}
                className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded shadow-sm transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Agent Status Panel */}
      {isAgentRunning && (
        <div 
          ref={agentPanelRef}
          className={`fixed z-50 bg-white border-2 border-purple-300 rounded-lg shadow-2xl transition-all ${
            isAgentMaximized 
              ? 'inset-4 overflow-hidden' 
              : isAgentMinimized 
                ? 'bottom-4 right-4 w-80' 
                : 'bottom-4 right-4 w-96'
          }`}
          onClick={(e) => isAgentMaximized && e.stopPropagation()}
        >
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
              <h3 className="text-sm font-semibold text-white">🤖 QA Agent Working</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleStopAgent}
                className="text-white hover:text-red-200 transition-colors px-2 py-1 bg-red-500 hover:bg-red-600 rounded text-xs font-medium"
                title="Stop Agent"
              >
                ⏹ Stop
              </button>
              {!isAgentMinimized && (
                <button
                  onClick={() => setIsAgentMaximized(!isAgentMaximized)}
                  className="text-white hover:text-purple-200 transition-colors"
                  title={isAgentMaximized ? "Restore" : "Maximize"}
                >
                  {isAgentMaximized ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  )}
                </button>
              )}
              <button
                onClick={() => setIsAgentMinimized(!isAgentMinimized)}
                className="text-white hover:text-purple-200 transition-colors"
                title={isAgentMinimized ? "Expand" : "Minimize"}
              >
                {isAgentMinimized ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          {!isAgentMinimized && (
            <div className={`p-4 flex ${isAgentMaximized ? 'gap-4 h-[calc(100%-3rem)]' : 'flex-col max-h-[400px]'}`}>
              {!isAgentMaximized && (
                <div className="text-sm font-medium text-purple-700 pb-3 border-b border-purple-200 shrink-0 mb-3">
                  {agentStatus}
                </div>
              )}

              {isAgentMaximized ? (
                <>
                 <div className="flex-1 flex flex-col min-w-0">
                    <div className="text-xs font-semibold text-slate-700 mb-2 shrink-0">🤖 LLM Streaming:</div>
                    <div className="flex-1 overflow-y-auto bg-slate-50 rounded p-3 border border-slate-200">
                      <pre className="text-xs text-slate-700 font-mono whitespace-pre-wrap font-medium h-full">
                        {agentLLMOutput.join('') || <span className="text-slate-400 italic font-sans">Waiting for LLM output...</span>}
                      </pre>
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col min-w-0 ">
                    <div className="text-xs font-semibold text-slate-700 mb-2 shrink-0">💭 Agent Thoughts:</div>
                    <div className="flex-1 overflow-y-auto bg-slate-50 rounded p-3 space-y-2 border border-slate-200">
                      {agentThoughts.map((thought, idx) => (
                        <div key={idx} className="text-xs text-slate-700 flex items-start gap-2 py-1 leading-relaxed">
                          <span className="text-purple-500 shrink-0">▸</span>
                          <span>{thought}</span>
                        </div>
                      ))}
                      {agentThoughts.length === 0 && (
                        <div className="text-xs text-slate-400 italic">Agent is thinking...</div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                agentThoughts.length > 0 && (
                  <div className="flex-1 min-h-0 flex flex-col">
                    <div className="text-xs font-semibold text-slate-600 mb-2 shrink-0">💭 Agent Thoughts:</div>
                    <div className="flex-1 overflow-y-auto bg-slate-50 rounded p-2 space-y-1 border border-slate-200">
                      {agentThoughts.slice(-10).map((thought, idx) => (
                        <div key={idx} className="text-xs text-slate-600 flex items-start gap-1 py-0.5">
                          <span className="text-purple-500 shrink-0">▸</span>
                          <span>{thought}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface SectionTOCProps {
  docContent: DocumentContent | null;
  showSections: boolean;
  activeSectionId: string | null;
  selectedSectionId: string | null;
  setShowSections: (show: boolean) => void;
  handleSectionClick: (sectionId: string) => void;
  setSelectedSectionId: (id: string | null) => void;
}

export function SectionTOC({
  docContent,
  showSections,
  activeSectionId,
  selectedSectionId,
  setShowSections,
  handleSectionClick,
  setSelectedSectionId,
}: SectionTOCProps) {
  if (!docContent || !showSections) return null;

  return (
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
  );
}
