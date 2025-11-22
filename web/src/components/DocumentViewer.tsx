import React, { useState } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { DocumentViewerSkeleton } from '@/components/Skeleton';
import type { DocumentContent } from '@/lib/types';
import { DocumentEditor } from './Editor/DocumentEditor';
import { MarkdownRenderer } from './MarkdownRenderer';

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

  // Reset editing state when document changes
  React.useEffect(() => {
    setIsEditing(false);
  }, [docContent?.id]);

  const handleSaveEdit = async (newContent: string) => {
    if (!docContent?.id) return;
    
    try {
      const encodedId = encodeURIComponent(docContent.id);
      const res = await fetch(`/api/docs/${encodedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newContent }),
      });
      
      if (!res.ok) {
        throw new Error("Failed to save document");
      }
      
      onDocumentUpdate?.();
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to save:", err);
      // TODO: Show error toast
      alert("Failed to save document");
    }
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
              onClick={() => setIsEditing(true)}
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
        isEditing ? (
          <DocumentEditor
            initialContent={docContent.rawText}
            onSave={handleSaveEdit}
            onCancel={() => setIsEditing(false)}
            autocompleteSettings={settings.autocompleteSettings}
          />
        ) : (
          <ErrorBoundary>
            <div ref={documentContentRef} className="flex-1 overflow-y-auto">
              <MarkdownRenderer content={docContent.rawText} />
            </div>
          </ErrorBoundary>
        )
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
