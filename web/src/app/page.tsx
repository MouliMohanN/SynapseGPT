"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Logo } from "@/components/Logo";
import { DocumentTree } from "@/components/DocumentTree";
import { ChatPanel } from "@/components/ChatPanel";
import { SettingsModal } from "@/components/SettingsModal";
import { SummaryPanel, SummarySettingsModal } from "@/components/SummaryPanel";
import { DocumentViewer, SectionTOC } from "@/components/DocumentViewer";
import { AboutModal } from "@/components/AboutModal";
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
      <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />
    </div>
  );
}
