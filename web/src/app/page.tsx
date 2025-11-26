"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DocumentTree } from "@/components/DocumentTree";
import { ChatPanel } from "@/components/ChatPanel";
import { SettingsModal } from "@/components/SettingsModal";
import { CenterPane } from "@/components/CenterPane";
import { AboutModal } from "@/components/AboutModal";
import { useSettings } from "@/hooks/useSettings";
import { HeaderBar } from "@/components/HeaderBar";
import { UploadModal } from "@/components/UploadModal";
type DocEventUI = {
  docId: string;
  type: string;
  message: string;
  timestamp: string;
  meta?: any;
};

export default function HomePage() {
  // Settings
  const { settings, handleSaveSettings } = useSettings();
  
  // Documents
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [docsRefreshTrigger, setDocsRefreshTrigger] = useState(0);
  
  // Layout state
  const [showAbout, setShowAbout] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [rightPanelWidth, setRightPanelWidth] = useState(25);
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [eventLog, setEventLog] = useState<DocEventUI[]>([]);
  const eventLogTimeoutRef = React.useRef<number | null>(null);
  const [isActivityHovered, setIsActivityHovered] = useState(false);

  const scheduleAutoClear = useCallback(() => {
    if (eventLogTimeoutRef.current !== null) {
      window.clearTimeout(eventLogTimeoutRef.current);
    }
    eventLogTimeoutRef.current = window.setTimeout(() => {
      setEventLog([]);
      eventLogTimeoutRef.current = null;
    }, 5000);
  }, []);

  const addEventToLog = useCallback(
    (data: DocEventUI) => {
      setEventLog((prev) => {
        const next = [data, ...prev];
        return next.slice(0, 20);
      });

      // Do not auto-clear while the user is hovering over the panel.
      if (!isActivityHovered) {
        scheduleAutoClear();
      }
    },
    [isActivityHovered, scheduleAutoClear],
  );

  const pushActivity = useCallback(
    (partial: { type: string; message: string; docId?: string; meta?: any }) => {
      const evt: DocEventUI = {
        docId: partial.docId ?? selectedDocId ?? "__ui__",
        type: partial.type,
        message: partial.message,
        timestamp: new Date().toISOString(),
        meta: partial.meta,
      };
      addEventToLog(evt);
    },
    [addEventToLog, selectedDocId],
  );

  const handleNotify = useCallback(
    (message: string, type: "success" | "error" = "success") => {
      pushActivity({
        type: type === "error" ? "ui:error" : "ui:info",
        message,
      });
    },
    [pushActivity],
  );

  // Initialize panel widths from settings
  useEffect(() => {
    setRightPanelWidth(settings.defaultRightWidth);
  }, [settings]);

  // Initialize selected document from URL (?doc=...) if present
  useEffect(() => {
    const docFromUrl = searchParams.get("doc");
    if (docFromUrl && docFromUrl !== selectedDocId) {
      setSelectedDocId(docFromUrl);
    }
  }, [searchParams, selectedDocId]);

  const handleSaveSettingsWithActivity = useCallback(
    (next: typeof settings) => {
      handleSaveSettings(next);
      pushActivity({ type: "ui:settings", message: "Settings updated" });
    },
    [handleSaveSettings, pushActivity],
  );

  const handleSelectDoc = useCallback(
    (id: string) => {
      setSelectedDocId(id);
      if (typeof window === "undefined") return;
      try {
        const url = new URL(window.location.href);
        url.searchParams.set("doc", id);
        router.replace(url.toString(), { scroll: false });
      } catch (error) {
        console.error("Failed to update URL with doc id:", error);
      }
    },
    [router],
  );

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

  useEffect(() => {
    if (!selectedDocId) return;

    const encodedId = encodeURIComponent(selectedDocId);
    const source = new EventSource(`/api/docs/${encodedId}/events`);

    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as DocEventUI;

        if (data.type === "sse:connected") {
          return;
        }

        addEventToLog(data);
      } catch (error) {
        console.error("Failed to handle SSE message:", error, event.data);
      }
    };

    source.onerror = (error) => {
      console.error("SSE connection error:", error);
      source.close();
    };

    return () => {
      if (eventLogTimeoutRef.current !== null) {
        window.clearTimeout(eventLogTimeoutRef.current);
        eventLogTimeoutRef.current = null;
      }
      source.close();
    };
  }, [selectedDocId, addEventToLog]);

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-50 text-slate-900 overflow-hidden">
      {/* Header with branding */}
      <HeaderBar onAboutClick={() => setShowAbout(true)} />
      
      <main className="flex-1 flex overflow-hidden">
        {/* Left: document browser */}
        <DocumentTree
          selectedDocId={selectedDocId}
          onSelectDoc={handleSelectDoc}
          onSettingsClick={() => setShowSettings(true)}
          onUploadClick={() => setShowUpload(true)}
          refreshTrigger={docsRefreshTrigger}
          onNotify={handleNotify}
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
          onNotify={handleNotify}
        />

        {/* Resize handle for right panel */}
        <div
          className="w-1 bg-slate-300 hover:bg-purple-500 cursor-col-resize transition-colors shrink-0"
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
          onSave={handleSaveSettingsWithActivity}
          onClose={() => setShowSettings(false)}
        />
      )}


      {/* About Modal */}
      <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />
      
      {/* Upload Modal */}
      <UploadModal 
        isOpen={showUpload} 
        onClose={() => setShowUpload(false)} 
        onUploadComplete={() => {
          setDocsRefreshTrigger(v => v + 1);
        }}
      />
      {eventLog.length > 0 && (
        <div
          className="fixed top-4 right-4 z-40 w-80 max-h-64 overflow-y-auto bg-white/95 border border-slate-200 rounded-lg shadow-lg text-xs backdrop-blur-sm"
          onMouseEnter={() => {
            setIsActivityHovered(true);
            if (eventLogTimeoutRef.current !== null) {
              window.clearTimeout(eventLogTimeoutRef.current);
              eventLogTimeoutRef.current = null;
            }
          }}
          onMouseLeave={() => {
            setIsActivityHovered(false);
            if (eventLog.length > 0) {
              scheduleAutoClear();
            }
          }}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 bg-purple-50">
            <span className="text-[11px] font-semibold text-slate-800">Document Activity</span>
            <button
              type="button"
              onClick={() => {
                setEventLog([]);
                if (eventLogTimeoutRef.current !== null) {
                  window.clearTimeout(eventLogTimeoutRef.current);
                  eventLogTimeoutRef.current = null;
                }
              }}
              className="text-[10px] text-purple-500 hover:text-purple-700"
            >
              Clear
            </button>
          </div>
          <ul
            className="max-h-52 overflow-y-auto divide-y divide-slate-100"
            onScroll={() => {
              if (eventLogTimeoutRef.current !== null) {
                window.clearTimeout(eventLogTimeoutRef.current);
                eventLogTimeoutRef.current = null;
              }
            }}
          >
            {eventLog.map((evt, idx) => {
              const isError = evt.type.endsWith(":error");
              const isStart = evt.type.endsWith(":start");
              const isComplete = evt.type.endsWith(":complete");
              const badgeColor = isError
                ? "bg-red-50 text-red-700 border-red-200"
                : isComplete
                ? "bg-green-50 text-green-700 border-green-200"
                : isStart
                ? "bg-blue-50 text-blue-700 border-blue-200"
                : "bg-purple-50 text-purple-700 border-purple-200";

              const time = new Date(evt.timestamp).toLocaleTimeString();

              return (
                <li key={`${evt.timestamp}-${idx}`} className="px-3 py-2 flex flex-col gap-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-1.5 py-0.5 rounded-full border text-[10px] font-medium ${badgeColor}`}>
                      {evt.type}
                    </span>
                    <span className="text-[10px] text-slate-400">{time}</span>
                  </div>
                  <div className="text-[11px] text-slate-700 break-words">{evt.message}</div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
