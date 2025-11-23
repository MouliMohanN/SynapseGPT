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
import { Toast } from './Toast';

interface DocumentViewerProps {
  docContent: DocumentContent | null;
  isDocLoading: boolean;
  docError: string | null;
  showSections: boolean;
  documentContentRef: React.RefObject<HTMLDivElement | null>;
  setShowSections: (show: boolean) => void;
  onDocumentUpdate?: () => void;
  settings: any;
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
}: DocumentViewerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const shareMenuRef = React.useRef<HTMLDivElement | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const toastTimeoutRef = React.useRef<number | null>(null);
  
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

  const showToast = (message: string, type: "success" | "error" = "success") => {
    if (toastTimeoutRef.current !== null) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    setToast({ message, type });
    toastTimeoutRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimeoutRef.current = null;
    }, 3000);
  };

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
          historyMetadata: historyMetadata ?? null,
          historySummaryModel: settings.historySummaryModel 
        }),
      });
      
      if (!res.ok) {
        throw new Error("Failed to save document");
      }
      
      onDocumentUpdate?.();
      setIsEditing(false);
      showToast("Document saved", "success");
    } catch (err) {
      console.error("Failed to save:", err);
      showToast("Failed to save document", "error");
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
            showToast(urlToCopy, "success");
          },
          (err) => {
            console.error(`Failed to copy ${label.toLowerCase()} link:`, err);
            window.prompt(`Copy this ${label.toLowerCase()} link:`, urlToCopy);
          },
        );
      } else {
        window.prompt(`Copy this ${label.toLowerCase()} link:`, urlToCopy);
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

      {toast && <Toast message={toast.message} type={toast.type} />}
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
