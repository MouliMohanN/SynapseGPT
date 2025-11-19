import React from "react";
import { Logo } from "@/components/Logo";

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutModal({ isOpen, onClose }: AboutModalProps) {
  if (!isOpen) {
    return null;
  }

  const handleContentClick = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        onClick={handleContentClick}
      >
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
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 text-xl leading-none"
            aria-label="Close about modal"
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
              {capabilityCards.map(({ icon, title, description }) => (
                <div key={title} className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-purple-600 text-white rounded-lg">{icon}</div>
                    <div>
                      <h4 className="font-semibold text-sm text-slate-900">{title}</h4>
                      <p className="text-xs text-slate-600 mt-1">{description}</p>
                    </div>
                  </div>
                </div>
              ))}
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
              {techStackSections.map(({ title, items }) => (
                <div key={title}>
                  <h4 className="text-sm font-semibold text-slate-900 mb-2">{title}</h4>
                  <div className="flex flex-wrap gap-2">
                    {items.map((item) => (
                      <span
                        key={item}
                        className="px-3 py-1 bg-slate-100 text-slate-900 rounded-full text-xs font-medium"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 pt-4 text-center">
            <p className="text-xs text-slate-600">
              Built with ❤️ by{" "}
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
  );
}

const capabilityCards = [
  {
    title: "Smart Document Browser",
    description: "Hierarchical file tree with search, filtering, and alphabetical sorting",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    title: "AI-Generated Summaries",
    description: "Automatic document summarization with streaming responses",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  {
    title: "Contextual Chat Assistant",
    description: "Ask questions about specific documents or sections with persistent history",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    ),
  },
  {
    title: "Section Navigation",
    description: "Interactive table of contents with active section tracking and scroll sync",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    ),
  },
  {
    title: "Full-Text Search",
    description: "Search across all documents with match counting and highlighting",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    title: "Customizable Panels",
    description: "Resizable panels, configurable AI settings, and persistent preferences",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
      </svg>
    ),
  },
];

const techStackSections = [
  {
    title: "Frontend",
    items: [
      "Next.js 15",
      "React 19",
      "TypeScript",
      "Tailwind CSS 4",
      "React Markdown",
      "Syntax Highlighter",
      "Lucide Icons",
    ],
  },
  {
    title: "Backend & AI",
    items: [
      "Next.js API Routes",
      "Ollama",
      "Streaming Responses",
      "File System API",
    ],
  },
  {
    title: "Key Features & APIs",
    items: [
      "Intersection Observer",
      "Local Storage",
      "Abort Controller",
      "Error Boundaries",
      "Responsive Design",
    ],
  },
];
