"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Logo } from "@/components/Logo";
import { DocumentTree } from "@/components/DocumentTree";
import { ChatPanel } from "@/components/ChatPanel";
import { SettingsModal } from "@/components/SettingsModal";
import { CenterPane } from "@/components/CenterPane";
import { AboutModal } from "@/components/AboutModal";
import { useSettings } from "@/hooks/useSettings";
import { HeaderBar } from "@/components/HeaderBar";

export default function HomePage() {
  // Settings
  const { settings, handleSaveSettings } = useSettings();
  
  // Documents
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  
  // Layout state
  const [showAbout, setShowAbout] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [rightPanelWidth, setRightPanelWidth] = useState(25);
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);
  
  
  // Initialize panel widths from settings
  useEffect(() => {
    setRightPanelWidth(settings.defaultRightWidth);
  }, [settings]);


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
      <HeaderBar onAboutClick={() => setShowAbout(true)} />
      
      <main className="flex-1 flex overflow-hidden">
        {/* Left: document browser */}
        <DocumentTree
          selectedDocId={selectedDocId}
          onSelectDoc={setSelectedDocId}
          onSettingsClick={() => setShowSettings(true)}
        />

        {/* Resize handle for left panel */}
        <div
          className="w-1 bg-slate-300 hover:bg-purple-500 cursor-col-resize transition-colors shrink-0"
          onMouseDown={() => setIsDraggingLeft(true)}
        />

        {/* Center: summary + document viewer */}
        <CenterPane
          selectedDocId={selectedDocId}
          settings={settings}
        />

        {/* Resize handle for right panel */}
        <div
          className="w-1 bg-slate-800 hover:bg-sky-500 cursor-col-resize transition-colors shrink-0"
          onMouseDown={() => setIsDraggingRight(true)}
        />

        {/* Right: chat panel */}
        <ChatPanel
          selectedDocId={selectedDocId}
          selectedSectionId={null}
          settings={settings}
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


      {/* About Modal */}
      <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />
    </div>
  );
}
