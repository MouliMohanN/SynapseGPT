import React, { useCallback, useEffect, useRef, useState } from "react";
import { SectionTOC, DocumentViewer } from "@/components/DocumentViewer";
import { SummaryPanel } from "@/components/SummaryPanel";
import { useSummary } from "@/hooks/useSummary";
import type { DocumentContent } from "@/lib/types";

interface CenterPaneProps {
  selectedDocId: string | null;
  settings: any;
}

export function CenterPane({
  selectedDocId,
  settings,
}: CenterPaneProps) {
  const documentViewerRef = useRef<HTMLDivElement>(null);
  const documentContentRef = useRef<HTMLDivElement>(null);
  const [showSections, setShowSections] = useState(true);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  
  // Document loading state
  const [docContent, setDocContent] = useState<DocumentContent | null>(null);
  const [isDocLoading, setIsDocLoading] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);

  const {
    summaryContent,
    isSummaryLoading,
    summaryError,
    summaryContentRef,
    handleGenerateSummary,
  } = useSummary(selectedDocId, settings);

  // Load document function (extracted for reuse)
  const loadDoc = async () => {
    if (!selectedDocId) {
      setDocContent(null);
      return;
    }

    try {
      setIsDocLoading(true);
      setDocError(null);
      const encodedId = encodeURIComponent(selectedDocId);
      const res = await fetch(`/api/docs/${encodedId}`);
      if (!res.ok) {
        throw new Error(`Failed to load document: ${res.status}`);
      }
      const data = (await res.json()) as DocumentContent;
      setDocContent(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setDocError(message);
    } finally {
      setIsDocLoading(false);
    }
  };

  // Load document content when selection changes
  useEffect(() => {
    if (!selectedDocId) {
      setDocContent(null);
      setSelectedSectionId(null);
      setActiveSectionId(null);
      return;
    }

    setSelectedSectionId(null);
    setActiveSectionId(null);
    void loadDoc();
  }, [selectedDocId]);

  const handleSectionClick = useCallback(
    (sectionId: string) => {
      setSelectedSectionId(sectionId);
      if (!documentViewerRef.current || !docContent) return;

      const section = docContent.sections.find((s) => s.id === sectionId);
      if (!section) return;

      const headings = documentViewerRef.current.querySelectorAll("h1, h2, h3, h4, h5, h6");
      const targetHeading = Array.from(headings).find(
        (heading) => heading.textContent?.trim() === section.title,
      );

      targetHeading?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [docContent],
  );

  // Track active section on scroll
  useEffect(() => {
    if (!documentViewerRef.current || !documentContentRef.current || !docContent || docContent.sections.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const heading = entry.target;
            const title = heading.textContent?.trim();
            const section = docContent.sections.find((s) => s.title === title);
            if (section) {
              setActiveSectionId(section.id);
            }
          }
        });
      },
      {
        root: documentViewerRef.current,
        rootMargin: "-20% 0px -70% 0px",
        threshold: 0,
      },
    );

    const headings = documentContentRef.current.querySelectorAll("h1, h2, h3, h4, h5, h6");
    headings.forEach((heading) => observer.observe(heading));

    return () => observer.disconnect();
  }, [docContent]);

  return (
    <section
        className="flex-1 flex border-r border-slate-300 overflow-hidden min-w-0"
        ref={documentViewerRef}
      >
        <SectionTOC
          docContent={docContent}
          showSections={showSections}
          activeSectionId={activeSectionId}
          selectedSectionId={selectedSectionId}
          setShowSections={setShowSections}
          handleSectionClick={handleSectionClick}
          setSelectedSectionId={setSelectedSectionId}
        />

        <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto scrollbar-thin scrollbar-thumb-slate-400 scrollbar-track-slate-100 hover:scrollbar-thumb-purple-500">
          <SummaryPanel
            selectedDocId={selectedDocId}
            summaryContent={summaryContent}
            isSummaryLoading={isSummaryLoading}
            summaryError={summaryError}
            summaryContentRef={summaryContentRef}
            handleGenerateSummary={handleGenerateSummary}
          />

          <DocumentViewer
            docContent={docContent}
            isDocLoading={isDocLoading}
            docError={docError}
            showSections={showSections}
            documentContentRef={documentContentRef}
            setShowSections={setShowSections}
            onDocumentUpdate={loadDoc}
            settings={settings}
          />
        </div>
      </section>
  );
}
