"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Logo } from "@/components/Logo";
import { DocumentTree } from "@/components/DocumentTree";
import { ChatPanel } from "@/components/ChatPanel";
import { SettingsModal } from "@/components/SettingsModal";
import { SummaryPanel, SummarySettingsModal } from "@/components/SummaryPanel";
import { DocumentViewer, SectionTOC } from "@/components/DocumentViewer";
import { useDocuments } from "@/hooks/useDocuments";
import { useChat } from "@/hooks/useChat";
import { useSummary } from "@/hooks/useSummary";
import { useSettings } from "@/hooks/useSettings";

export default function HomePage() {
  // Settings
  const { settings, handleSaveSettings } = useSettings();
  
  // Documents
  const {
    isDocsLoading,
    docsError,
    selectedDocId,
    docContent,
    isDocLoading,
    docError,
    expandedFolders,
    docFilter,
    contentSearch,
    searchResults,
    isSearching,
    visibleDocs,
    setSelectedDocId,
    setDocFilter,
    setContentSearch,
    toggleFolder,
    handleContentSearch,
  } = useDocuments();
  
  // Layout state
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [showAbout, setShowAbout] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSections, setShowSections] = useState(true);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [rightPanelWidth, setRightPanelWidth] = useState(25);
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);
  
  const documentViewerRef = useRef<HTMLDivElement>(null);
  const documentContentRef = useRef<HTMLDivElement>(null);
  
  // Chat
  const {
    chatInput,
    chatMessages,
    isStreaming,
    streamingCharCount,
    chatEndRef,
    chatContainerRef,
    setChatInput,
    handleSend,
    handleStopGeneration,
    handleClearConversation,
    handleRegenerateResponse,
    handleKeyDown,
    handleScroll,
  } = useChat(selectedDocId, selectedSectionId, settings);
  
  // Summary
  const {
    summaryContent,
    isSummaryLoading,
    summaryError,
    showSummarySettings,
    summaryContentRef,
    setShowSummarySettings,
    handleGenerateSummary,
  } = useSummary(selectedDocId, settings);
  
  // Initialize panel widths from settings
  useEffect(() => {
    setRightPanelWidth(settings.defaultRightWidth);
  }, [settings]);

  // Section navigation handler
  const handleSectionClick = useCallback((sectionId: string) => {
    setSelectedSectionId(sectionId);
    
    if (!documentViewerRef.current || !docContent) return;
    
    const section = docContent.sections.find(s => s.id === sectionId);
    if (!section) return;

    // Find the heading element by searching for the section title in the rendered content
    const headings = documentViewerRef.current.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const targetHeading = Array.from(headings).find(h => 
      h.textContent?.trim() === section.title
    );

    if (targetHeading) {
      targetHeading.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [docContent]);

  // Track active section on scroll and auto-scroll TOC
  useEffect(() => {
    if (!documentViewerRef.current || !documentContentRef.current || !docContent || docContent.sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const heading = entry.target;
            const sectionTitle = heading.textContent?.trim();
            const section = docContent.sections.find(s => s.title === sectionTitle);
            if (section) {
              setActiveSectionId(section.id);
              
              // Auto-scroll the active section into view in the TOC
              const sectionButton = document.querySelector(`[data-section-id="${section.id}"]`);
              if (sectionButton) {
                sectionButton.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              }
            }
          }
        });
      },
      {
        root: documentViewerRef.current,
        rootMargin: '-20% 0px -70% 0px',
        threshold: 0,
      }
    );

    const headings = documentContentRef.current.querySelectorAll('h1, h2, h3, h4, h5, h6');
    headings.forEach(heading => observer.observe(heading));

    return () => observer.disconnect();
  }, [docContent]);

  // Layout drag handlers
  const handleMouseMoveLeft = React.useCallback(() => {
    // Left panel resizing logic removed as it's unused in current implementation
  }, []);

  const handleMouseMoveRight = useCallback((e: MouseEvent) => {
    const newWidth = ((window.innerWidth - e.clientX) / window.innerWidth) * 100;
    if (newWidth >= 15 && newWidth <= 50) {
      setRightPanelWidth(newWidth);
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDraggingLeft(false);
    setIsDraggingRight(false);
  }, []);

  useEffect(() => {
    if (isDraggingLeft) {
      window.addEventListener('mousemove', handleMouseMoveLeft as EventListener);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMoveLeft as EventListener);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingLeft, handleMouseMoveLeft, handleMouseUp]);

  useEffect(() => {
    if (isDraggingRight) {
      window.addEventListener('mousemove', handleMouseMoveRight as EventListener);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMoveRight as EventListener);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingRight, handleMouseMoveRight, handleMouseUp]);

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-50 text-slate-900 overflow-hidden">
      {/* Header with branding */}
      <header className="bg-white border-b border-slate-300 px-6 py-3 flex items-center justify-between shadow-sm">
        <Logo size="md" showText={true} onClick={() => setShowAbout(true)} />
        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-600">
            <span className="font-medium text-slate-900">AI-Powered</span> Documentation Assistant
          </div>
          <div className="h-4 w-px bg-slate-300" />
          <a 
            href="https://www.synapsewave.com/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-purple-600 hover:text-purple-700 font-medium transition-colors"
          >
            Powered by SynapseWave
          </a>
        </div>
      </header>
      
      <main className="flex-1 flex overflow-hidden">
        {/* Left: document browser */}
        <DocumentTree
          isDocsLoading={isDocsLoading}
          docsError={docsError}
          visibleDocs={visibleDocs}
          expandedFolders={expandedFolders}
          docFilter={docFilter}
          contentSearch={contentSearch}
          searchResults={searchResults}
          isSearching={isSearching}
          selectedDocId={selectedDocId}
          onToggleFolder={toggleFolder}
          onSelectDoc={setSelectedDocId}
          setDocFilter={setDocFilter}
          setContentSearch={setContentSearch}
          handleContentSearch={handleContentSearch}
          onSettingsClick={() => setShowSettings(true)}
        />

        {/* Resize handle for left panel */}
        <div
          className="w-1 bg-slate-300 hover:bg-purple-500 cursor-col-resize transition-colors shrink-0"
          onMouseDown={() => setIsDraggingLeft(true)}
        />

        {/* Center: summary + document viewer */}
        <section className="flex-1 flex border-r border-slate-300 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-400 scrollbar-track-slate-100 hover:scrollbar-thumb-purple-500" ref={documentViewerRef}>
          {/* Section TOC - Left side - sticky */}
          <SectionTOC
            docContent={docContent}
            showSections={showSections}
            activeSectionId={activeSectionId}
            selectedSectionId={selectedSectionId}
            setShowSections={setShowSections}
            handleSectionClick={handleSectionClick}
            setSelectedSectionId={setSelectedSectionId}
          />
          
          {/* Content area with summary and document viewer */}
          <div className="flex-1 flex flex-col">
            <SummaryPanel
              selectedDocId={selectedDocId}
              summaryContent={summaryContent}
              isSummaryLoading={isSummaryLoading}
              summaryError={summaryError}
              summaryContentRef={summaryContentRef}
              setShowSummarySettings={setShowSummarySettings}
              handleGenerateSummary={handleGenerateSummary}
            />
            
            <DocumentViewer
              docContent={docContent}
              isDocLoading={isDocLoading}
              docError={docError}
              showSections={showSections}
              documentContentRef={documentContentRef}
              setShowSections={setShowSections}
            />
          </div>
        </section>

        {/* Resize handle for right panel */}
        <div
          className="w-1 bg-slate-800 hover:bg-sky-500 cursor-col-resize transition-colors shrink-0"
          onMouseDown={() => setIsDraggingRight(true)}
        />

        {/* Right: chat panel */}
        <ChatPanel
          chatMessages={chatMessages}
          isStreaming={isStreaming}
          streamingCharCount={streamingCharCount}
          chatInput={chatInput}
          selectedDocId={selectedDocId}
          selectedSectionId={selectedSectionId}
          docContent={docContent}
          chatEndRef={chatEndRef}
          chatContainerRef={chatContainerRef}
          setChatInput={setChatInput}
          handleSend={handleSend}
          handleStopGeneration={handleStopGeneration}
          handleClearConversation={handleClearConversation}
          handleRegenerateResponse={handleRegenerateResponse}
          handleKeyDown={handleKeyDown}
          handleScroll={handleScroll}
          setSelectedSectionId={setSelectedSectionId}
          rightPanelWidth={rightPanelWidth}
        />
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          isOpen={showSettings}
          settings={settings}
          onSave={handleSaveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Summary Settings Modal */}
      <SummarySettingsModal
        showSummarySettings={showSummarySettings}
        setShowSummarySettings={setShowSummarySettings}
        handleGenerateSummary={handleGenerateSummary}
      />

      {/* About Modal */}
      {showAbout && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAbout(false)}>
          <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-300 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Logo size="md" showText={true} />
                <div className="h-8 w-px bg-slate-300" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">About SynapseGPT</h2>
                  <p className="text-xs text-slate-600">AI-Powered Documentation Assistant</p>
                </div>
              </div>
              <button
                onClick={() => setShowAbout(false)}
                className="text-slate-500 hover:text-slate-700 text-xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="px-6 py-6 space-y-6">
              {/* Capabilities Section */}
              <div>
                <h3 className="text-base font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Key Capabilities
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-purple-600 text-white rounded-lg">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-slate-900">Smart Document Browser</h4>
                        <p className="text-xs text-slate-600 mt-1">Hierarchical file tree with search, filtering, and alphabetical sorting</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-purple-600 text-white rounded-lg">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-slate-900">AI-Generated Summaries</h4>
                        <p className="text-xs text-slate-600 mt-1">Automatic document summarization with streaming responses</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-purple-600 text-white rounded-lg">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-slate-900">Contextual Chat Assistant</h4>
                        <p className="text-xs text-slate-600 mt-1">Ask questions about specific documents or sections with persistent history</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-purple-600 text-white rounded-lg">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-slate-900">Section Navigation</h4>
                        <p className="text-xs text-slate-600 mt-1">Interactive table of contents with active section tracking and scroll sync</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-purple-600 text-white rounded-lg">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-slate-900">Full-Text Search</h4>
                        <p className="text-xs text-slate-600 mt-1">Search across all documents with match counting and highlighting</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-purple-600 text-white rounded-lg">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-slate-900">Customizable Panels</h4>
                        <p className="text-xs text-slate-600 mt-1">Resizable panels, configurable AI settings, and persistent preferences</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* How to Use Section */}
              <div>
                <h3 className="text-base font-semibold text-slate-900 mt-4 mb-2">How to Use</h3>
                <ol className="text-sm text-slate-700 space-y-1">
                  <li>1. Browse and select a document from the left panel</li>
                  <li>2. View the AI-generated summary in the center panel</li>
                  <li>3. Read the full document content below the summary</li>
                  <li>4. Ask questions about the document in the chat panel</li>
                  <li>5. Use section navigation for focused discussions</li>
                </ol>
              </div>
                
                {/* Tech Stack Section */}
              <div>
                <h3 className="text-base font-semibold text-slate-900 mt-4 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  Technology Stack
                </h3>
                <div className="space-y-4">
                  {/* Frontend */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 mb-2">Frontend</h4>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1 bg-slate-100 text-slate-900 rounded-full text-xs font-medium">Next.js 15</span>
                      <span className="px-3 py-1 bg-slate-100 text-slate-900 rounded-full text-xs font-medium">React 19</span>
                      <span className="px-3 py-1 bg-slate-100 text-slate-900 rounded-full text-xs font-medium">TypeScript</span>
                      <span className="px-3 py-1 bg-slate-100 text-slate-900 rounded-full text-xs font-medium">Tailwind CSS 4</span>
                      <span className="px-3 py-1 bg-slate-100 text-slate-900 rounded-full text-xs font-medium">React Markdown</span>
                      <span className="px-3 py-1 bg-slate-100 text-slate-900 rounded-full text-xs font-medium">Syntax Highlighter</span>
                      <span className="px-3 py-1 bg-slate-100 text-slate-900 rounded-full text-xs font-medium">Lucide Icons</span>
                    </div>
                  </div>
                  
                  {/* Backend */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 mb-2">Backend & AI</h4>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1 bg-slate-100 text-slate-900 rounded-full text-xs font-medium">Next.js API Routes</span>
                      <span className="px-3 py-1 bg-slate-100 text-slate-900 rounded-full text-xs font-medium">Ollama</span>
                      <span className="px-3 py-1 bg-slate-100 text-slate-900 rounded-full text-xs font-medium">Streaming Responses</span>
                      <span className="px-3 py-1 bg-slate-100 text-slate-900 rounded-full text-xs font-medium">File System API</span>
                    </div>
                  </div>
                  
                  {/* Features */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 mb-2">Key Features & APIs</h4>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1 bg-slate-100 text-slate-900 rounded-full text-xs font-medium">Intersection Observer</span>
                      <span className="px-3 py-1 bg-slate-100 text-slate-900 rounded-full text-xs font-medium">Local Storage</span>
                      <span className="px-3 py-1 bg-slate-100 text-slate-900 rounded-full text-xs font-medium">Abort Controller</span>
                      <span className="px-3 py-1 bg-slate-100 text-slate-900 rounded-full text-xs font-medium">Error Boundaries</span>
                      <span className="px-3 py-1 bg-slate-100 text-slate-900 rounded-full text-xs font-medium">Responsive Design</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Footer */}
              <div className="border-t border-slate-200 pt-4 text-center">
                <p className="text-xs text-slate-600">
                  Built with ❤️ by{' '}
                  <a 
                    href="https://www.synapsewave.com/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-purple-600 hover:text-purple-700 font-medium"
                  >
                    SynapseWave
                  </a>
                </p>
                <p className="text-xs text-slate-500 mt-1">© 2025 SynapseGPT. All rights reserved.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
