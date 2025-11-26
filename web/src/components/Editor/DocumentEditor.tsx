import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import CodeMirror, { ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { EditorView } from "@codemirror/view";
import { createPatch } from "diff";
import { ghostTextExtension } from "./GhostTextExtension";
import { MarkdownRenderer } from "../MarkdownRenderer";
import { HistorySidebar } from "../History/HistorySidebar";
import { DiffViewer } from "../History/DiffViewer";
import { PatchViewer } from "../History/PatchViewer";
import type { HistoryPatchMetadata } from "@/lib/history";

const editorTheme = EditorView.theme({
  ".cm-selectionBackground, .cm-content ::selection": {
    backgroundColor: "rgba(148, 163, 184, 0.20)", // neutral slate-like selection
  },
  ".cm-activeLine": {
    backgroundColor: "transparent", // no block behind the caret line
  },
  ".cm-activeLineGutter": {
    backgroundColor: "transparent",
  },
});

interface DocumentEditorProps {
  initialContent: string;
  onSave: (content: string, historyMetadata?: HistoryPatchMetadata | null) => Promise<void>;
  onCancel: () => void;
  autocompleteSettings: {
    enabled: boolean;
    debounceDelay: number;
    model: string;
    temperature: number;
    topP: number;
    maxTokens: number;
    repeatPenalty: number;
  };
  docId: string; // Added docId prop
}

type ViewMode = 'edit' | 'preview' | 'split';

export const DocumentEditor: React.FC<DocumentEditorProps> = ({
  initialContent,
  onSave,
  onCancel,
  autocompleteSettings,
  docId,
}) => {
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('edit');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [autocompleteEnabled, setAutocompleteEnabled] = useState(autocompleteSettings.enabled);
  const editorRef = useRef<ReactCodeMirrorRef>(null);

  // History State
  const [showHistory, setShowHistory] = useState(false);
  const [historyVersions, setHistoryVersions] = useState<any[]>([]);
  const [selectedVersionTimestamp, setSelectedVersionTimestamp] = useState<string | null>(null);
  const [historicalContent, setHistoricalContent] = useState<string | null>(null);
  const [historicalPatch, setHistoricalPatch] = useState<string | null>(null);
  const [historyViewMode, setHistoryViewMode] = useState<'diff' | 'patch'>('diff');
  const [historicalMetadata, setHistoricalMetadata] = useState<any | null>(null);
  const [patchFilter, setPatchFilter] = useState<'all' | 'high' | 'low'>('all');
  const [isHistoryFullScreen, setIsHistoryFullScreen] = useState(false);

  // Pre-save review state
  const [showPreSaveReview, setShowPreSaveReview] = useState(false);
  const [preSavePatch, setPreSavePatch] = useState<string | null>(null);
  const [preSaveMetadata, setPreSaveMetadata] = useState<HistoryPatchMetadata | null>(null);
  const [preSaveFilter, setPreSaveFilter] = useState<'all' | 'high' | 'low'>('all');

  // Cancel-with-diff state
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelPatch, setCancelPatch] = useState<string | null>(null);

  const ghostExtension = useMemo(
    () =>
      ghostTextExtension({
        ...autocompleteSettings,
        enabled: autocompleteEnabled,
      }),
    [autocompleteSettings, autocompleteEnabled],
  );

  const fetchHistory = async () => {
    try {
      const res = await fetch(`/api/docs/${encodeURIComponent(docId)}/history`);
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
      // Reset history state when closing
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
    if (timestamp === 'current') {
      setSelectedVersionTimestamp(null);
      setHistoricalContent(null);
      setHistoricalPatch(null);
      return;
    }

    setSelectedVersionTimestamp(timestamp);
    try {
      const res = await fetch(`/api/docs/${encodeURIComponent(docId)}/history/${timestamp}`);
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

  const handleSave = useCallback(async () => {
    if (isSaving) return;

    // If nothing changed, save directly without history metadata
    if (content === initialContent) {
      setIsSaving(true);
      try {
        await onSave(content, null);
      } finally {
        setIsSaving(false);
      }
      return;
    }

    // Show pre-save review with patch preview and chunk-level priorities
    const patch = createPatch(docId || "document", content, initialContent);
    setPreSavePatch(patch);
    // Metadata will hold only explicitly low-priority hunks; default is High
    setPreSaveMetadata({ hunks: [] });
    setPreSaveFilter('all');
    setShowPreSaveReview(true);
  }, [content, initialContent, docId, isSaving, onSave]);

  // Prevent background scrolling when history modal is full screen
  useEffect(() => {
    if (!isHistoryFullScreen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isHistoryFullScreen]);

  // Handle Cmd+S / Ctrl+S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if (e.key === 'Escape' && isFullScreen) {
        setIsFullScreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, isFullScreen]);

  const insertText = (before: string, after: string = "") => {
    const view = editorRef.current?.view;
    if (!view) return;

    const selection = view.state.selection.main;
    const selectedText = view.state.sliceDoc(selection.from, selection.to);
    const newText = `${before}${selectedText}${after}`;
    
    view.dispatch({
      changes: {
        from: selection.from,
        to: selection.to,
        insert: newText,
      },
      selection: {
        anchor: selection.from + before.length,
        head: selection.from + before.length + selectedText.length,
      },
    });
    view.focus();
  };

  const ToolbarButton = ({ onClick, title, children, active = false }: any) => (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded hover:bg-slate-100 text-slate-600 transition-colors ${active ? 'bg-purple-100 text-purple-700' : ''}`}
    >
      {children}
    </button>
  );

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
        ? 'Changes vs current editor content'
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
    <div className={`flex flex-col bg-white ${isFullScreen ? 'fixed inset-0 z-50' : 'flex-1 min-h-[500px]'}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-slate-200 bg-slate-50 shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          <ToolbarButton onClick={() => insertText("**", "**")} title="Bold">
            <strong className="font-bold">B</strong>
          </ToolbarButton>
          <ToolbarButton onClick={() => insertText("*", "*")} title="Italic">
            <em className="italic">I</em>
          </ToolbarButton>
          <ToolbarButton onClick={() => insertText("~~", "~~")} title="Strikethrough">
            <span className="line-through">S</span>
          </ToolbarButton>
          <div className="w-px h-4 bg-slate-300 mx-1" />
          <ToolbarButton onClick={() => insertText("# ")} title="Heading 1">H1</ToolbarButton>
          <ToolbarButton onClick={() => insertText("## ")} title="Heading 2">H2</ToolbarButton>
          <ToolbarButton onClick={() => insertText("### ")} title="Heading 3">H3</ToolbarButton>
          <div className="w-px h-4 bg-slate-300 mx-1" />
          <ToolbarButton onClick={() => insertText("- ")} title="Unordered List">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </ToolbarButton>
          <ToolbarButton onClick={() => insertText("1. ")} title="Ordered List">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h12M7 12h12M7 17h12M3 7v.01M3 12v.01M3 17v.01" /></svg>
          </ToolbarButton>
          <ToolbarButton onClick={() => insertText("- [ ] ")} title="Checkbox">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </ToolbarButton>
          <div className="w-px h-4 bg-slate-300 mx-1" />
          <ToolbarButton onClick={() => insertText("> ")} title="Quote">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
          </ToolbarButton>
          <ToolbarButton onClick={() => insertText("```\n", "\n```")} title="Code Block">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
          </ToolbarButton>
          <ToolbarButton onClick={() => insertText("[", "](url)")} title="Link">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
          </ToolbarButton>
          <ToolbarButton onClick={() => insertText("![", "](url)")} title="Image">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </ToolbarButton>
          <ToolbarButton onClick={() => insertText("| Header | Header |\n| --- | --- |\n| Cell | Cell |")} title="Table">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7-8v8m14-8v8M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
          </ToolbarButton>
        </div>

        <div className="flex items-center gap-1 border-l border-slate-300 pl-2 ml-2">
           <div className="flex bg-slate-200 rounded p-0.5">
              <button 
                onClick={() => setViewMode('edit')}
                className={`px-2 py-0.5 text-[10px] rounded ${viewMode === 'edit' ? 'bg-white shadow text-purple-700 font-medium' : 'text-slate-600 hover:text-slate-800'}`}
                title="Edit Only"
              >
                Edit
              </button>
              <button 
                onClick={() => setViewMode('split')}
                className={`px-2 py-0.5 text-[10px] rounded ${viewMode === 'split' ? 'bg-white shadow text-purple-700 font-medium' : 'text-slate-600 hover:text-slate-800'}`}
                title="Split View"
              >
                Split
              </button>
              <button 
                onClick={() => setViewMode('preview')}
                className={`px-2 py-0.5 text-[10px] rounded ${viewMode === 'preview' ? 'bg-white shadow text-purple-700 font-medium' : 'text-slate-600 hover:text-slate-800'}`}
                title="Preview Only"
              >
                Preview
              </button>
           </div>
          
          {/* Autocomplete Toggle */}
          <ToolbarButton
            onClick={() => setAutocompleteEnabled(!autocompleteEnabled)}
            title={autocompleteEnabled ? "Disable Autocomplete (AI suggestions)" : "Enable Autocomplete (AI suggestions)"}
            active={autocompleteEnabled}
          >
            {autocompleteEnabled ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            )}

      {showHistory && isHistoryFullScreen && selectedVersionTimestamp && (historicalContent || historicalPatch) && (
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
                  newContent={content}
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
          </ToolbarButton>
          <ToolbarButton onClick={() => setIsFullScreen(!isFullScreen)} title={isFullScreen ? "Exit Full Screen" : "Full Screen"} active={isFullScreen}>
             {isFullScreen ? (
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
             ) : (
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
             )}
           </ToolbarButton>
        </div>
        
        <div className="flex items-center gap-1 border-l border-slate-300 pl-2 ml-2">
            <ToolbarButton 
              onClick={handleToggleHistory} 
              title="History"
              active={showHistory}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </ToolbarButton>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Editor Pane */}
        {!showHistory && (viewMode === 'edit' || viewMode === 'split') && (
          <div className={`flex-1 flex flex-col min-w-0 border-r border-slate-200 ${viewMode === 'split' ? 'w-1/2' : 'w-full'}`}>
            <div className="flex-1 overflow-hidden bg-white relative">
              <CodeMirror
                ref={editorRef}
                value={content}
                height="100%"
                extensions={[
                  markdown({ base: markdownLanguage, codeLanguages: languages }),
                  EditorView.lineWrapping,
                  editorTheme,
                  ghostExtension,
                ]}
                onChange={(val) => setContent(val)}
                className="h-full text-sm"
                theme="light"
                basicSetup={{
                  lineNumbers: true,
                  highlightActiveLineGutter: true,
                  highlightSpecialChars: true,
                  history: true,
                  foldGutter: true,
                  drawSelection: true,
                  dropCursor: true,
                  allowMultipleSelections: true,
                  indentOnInput: true,
                  syntaxHighlighting: true,
                  bracketMatching: true,
                  closeBrackets: true,
                  autocompletion: true,
                  rectangularSelection: true,
                  crosshairCursor: true,
                  highlightActiveLine: true,
                  highlightSelectionMatches: true,
                  closeBracketsKeymap: true,
                  defaultKeymap: true,
                  searchKeymap: true,
                  historyKeymap: true,
                  foldKeymap: true,
                  completionKeymap: true,
                  lintKeymap: true,
                }}
              />
            </div>
          </div>
        )}

        {/* Preview Pane */}
        {!showHistory && (viewMode === 'preview' || viewMode === 'split') && (
           <div className={`flex-1 flex flex-col min-w-0 bg-white overflow-hidden ${viewMode === 'split' ? 'w-1/2' : 'w-full'}`}>
             <div className="flex-1 overflow-y-auto p-4">
                <MarkdownRenderer content={content} />
             </div>
           </div>
        )}

        {/* History View */}
        {showHistory && (
          <div className="flex-1 flex overflow-hidden">
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
                        newContent={content}
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
                  <div className="flex-1 flex items-center justify-center text-slate-400">
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
        )}
      </div>

      {/* Footer Actions - Sticky */}
      {!isFullScreen && (
        <div className="sticky bottom-0 left-0 right-0 flex items-center justify-end gap-2 px-4 py-2 bg-white border-t border-slate-200 shadow-lg z-10">
          <button
            onClick={() => {
              if (content === initialContent) {
                onCancel();
                return;
              }
              const patch = createPatch(docId || "document", content, initialContent);
              setCancelPatch(patch);
              setShowCancelConfirm(true);
            }}
            className="px-4 py-2 text-sm bg-slate-200 hover:bg-slate-300 text-slate-700 rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              'Save'
            )}
          </button>
        </div>
      )}
      
      {/* Full Screen Floating Save Button */}
      {isFullScreen && (
         <div className="absolute bottom-4 right-4 flex gap-2">
            <button
              onClick={() => setIsFullScreen(false)}
              className="px-3 py-1.5 text-xs font-medium text-white bg-slate-800/80 hover:bg-slate-900 rounded-md shadow-lg backdrop-blur-sm"
            >
              Exit Full Screen
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-3 py-1.5 text-xs font-medium text-white bg-purple-600/90 hover:bg-purple-700 rounded-md shadow-lg backdrop-blur-sm"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
         </div>
      )}

      {/* Cancel-with-diff modal */}
      {showCancelConfirm && cancelPatch && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => {
            setShowCancelConfirm(false);
            setCancelPatch(null);
          }}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-5xl w-full h-[80vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
              <div>
                <div className="text-sm font-semibold text-slate-800">Discard changes?</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  You have unsaved edits. Review the diff before discarding your changes.
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCancelConfirm(false);
                  setCancelPatch(null);
                }}
                className="text-slate-400 hover:text-slate-700 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <PatchViewer
                patch={cancelPatch}
                metadata={undefined}
                filter="all"
              />
            </div>

            <div className="flex justify-end gap-2 px-4 py-3 border-t border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={() => {
                  setShowCancelConfirm(false);
                  setCancelPatch(null);
                }}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
              >
                Back to Editing
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCancelConfirm(false);
                  setCancelPatch(null);
                  onCancel();
                }}
                className="px-4 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md shadow-sm"
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pre-save review modal */}
      {showPreSaveReview && preSavePatch && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => {
            setShowPreSaveReview(false);
            setPreSavePatch(null);
            setPreSaveMetadata(null);
          }}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
              <div>
                <div className="text-sm font-semibold text-slate-800">Review changes before saving</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Mark important hunks as High priority. These priorities will be stored with the history patch.
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center rounded-full bg-slate-200 p-0.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setPreSaveFilter('all')}
                    className={`px-2 py-0.5 rounded-full ${preSaveFilter === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                  >
                    All Hunks
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreSaveFilter('high')}
                    className={`ml-0.5 px-2 py-0.5 rounded-full ${preSaveFilter === 'high' ? 'bg-white text-green-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                  >
                    High Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreSaveFilter('low')}
                    className={`ml-0.5 px-2 py-0.5 rounded-full ${preSaveFilter === 'low' ? 'bg-white text-red-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                  >
                    Low Only
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowPreSaveReview(false);
                    setPreSavePatch(null);
                    setPreSaveMetadata(null);
                  }}
                  className="text-slate-400 hover:text-slate-700 text-sm"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <PatchViewer
                patch={preSavePatch}
                metadata={preSaveMetadata ?? { hunks: [] }}
                filter={preSaveFilter}
                interactive
                onChangeMetadata={(next) => setPreSaveMetadata(next)}
              />
            </div>

            <div className="flex justify-end gap-2 px-4 py-3 border-t border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={() => {
                  setShowPreSaveReview(false);
                  setPreSavePatch(null);
                  setPreSaveMetadata(null);
                }}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
              >
                Back to Editing
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={async () => {
                  if (isSaving) return;
                  setIsSaving(true);
                  try {
                    const metadataToSend: HistoryPatchMetadata | null = preSaveMetadata
                      ? {
                          hunks: preSaveMetadata.hunks.filter((h) => h.priority === 'low'),
                        }
                      : null;
                    await onSave(content, metadataToSend);
                    setShowPreSaveReview(false);
                    setPreSavePatch(null);
                    setPreSaveMetadata(null);
                  } finally {
                    setIsSaving(false);
                  }
                }}
                className="px-4 py-1.5 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving…' : 'Save with Priorities'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
