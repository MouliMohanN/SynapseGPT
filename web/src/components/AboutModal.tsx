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
        className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto relative"
        onClick={handleContentClick}
      >
        <ConfettiLayer />
        <div className="sticky top-0 bg-white border-b border-slate-300 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size="md" showText={true} />
            <div className="h-8 w-px bg-slate-300" />
            <div>
              <h2 className="text-lg font-bold text-slate-900">About SynapseGPT</h2>
              <p className="text-xs text-slate-600">Local-First RAG Chat Assistant</p>
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
              <li>1. Upload documents via drag-and-drop (supports PDF, Word, Excel, PowerPoint, HTML, images)</li>
              <li>2. Or manually ingest using <code className="text-xs bg-slate-100 px-1 rounded">npx tsx scripts/ingest.ts</code></li>
              <li>3. Browse and select documents from the left panel</li>
              <li>4. Ask questions in the chat - AI retrieves relevant context with citations</li>
              <li>5. Click &quot;Edit&quot; to modify documents with AI autocomplete (Tab to accept)</li>
              <li>6. Use view modes (Edit/Preview/Split/Zen) for optimal writing</li>
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
    title: "Retrieval-Augmented Generation (RAG)",
    description: "Ask questions about your documents using semantic search powered by ChromaDB vector database",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    title: "Multi-Format Document Support",
    description: "Upload PDF, Word, PowerPoint, Excel, HTML, images, and more with automatic conversion to Markdown",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    title: "Drag-and-Drop Upload",
    description: "Easy file and folder uploads with automatic conversion and ingestion into the vector database",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    ),
  },
  {
    title: "Smart Citations",
    description: "Every AI answer includes precise citations pointing back to the source document",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    title: "Intelligent Document Editor",
    description: "Inline editing with AI autocomplete, rich formatting toolbar, and multiple view modes",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },
  {
    title: "100% Local & Private",
    description: "All processing happens on your machine. Your data never leaves your device",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
];

const CONFETTI_COLORS = [
  "#a855f7",
  "#ec4899",
  "#22d3ee",
  "#f97316",
  "#84cc16",
];

const CONFETTI_PRESETS = [
  { id: 1, left: 5, delay: 0, duration: 4.5, size: 12, color: CONFETTI_COLORS[0] },
  { id: 2, left: 15, delay: 0.3, duration: 5, size: 10, color: CONFETTI_COLORS[1] },
  { id: 3, left: 25, delay: 0.8, duration: 6, size: 8, color: CONFETTI_COLORS[2] },
  { id: 4, left: 35, delay: 0.1, duration: 4.2, size: 14, color: CONFETTI_COLORS[3] },
  { id: 5, left: 45, delay: 0.6, duration: 5.2, size: 9, color: CONFETTI_COLORS[4] },
  { id: 6, left: 55, delay: 1.2, duration: 5.7, size: 11, color: CONFETTI_COLORS[0] },
  { id: 7, left: 65, delay: 0.4, duration: 4.8, size: 13, color: CONFETTI_COLORS[1] },
  { id: 8, left: 75, delay: 1.1, duration: 6.1, size: 10, color: CONFETTI_COLORS[2] },
  { id: 9, left: 85, delay: 0.2, duration: 5.5, size: 9, color: CONFETTI_COLORS[3] },
  { id: 10, left: 95, delay: 0.9, duration: 4.7, size: 12, color: CONFETTI_COLORS[4] },
];

function ConfettiLayer() {
  const confettiPieces = CONFETTI_PRESETS;

  return (
    <>
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translate3d(0, -20%, 0) rotate(0deg); opacity: 0.9; }
          100% { transform: translate3d(0, 120%, 0) rotate(360deg); opacity: 0; }
        }
      `}</style>
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-10" aria-hidden="true">
        {confettiPieces.map((piece) => (
          <span
            key={piece.id}
            className="absolute block rounded-full opacity-80"
            style={{
              left: `${piece.left}%`,
              width: piece.size,
              height: piece.size * 0.4,
              backgroundColor: piece.color,
              animation: `confetti-fall ${piece.duration}s linear infinite`,
              animationDelay: `${piece.delay}s`,
            }}
          />
        ))}
      </div>
    </>
  );
}

const techStackSections = [
  {
    title: "Frontend",
    items: [
      "Next.js 15",
      "React 19",
      "TypeScript",
      "Tailwind CSS 4",
      "CodeMirror 6",
      "React Markdown",
    ],
  },
  {
    title: "Backend & AI",
    items: [
      "Ollama (Local LLM)",
      "ChromaDB (Vector DB)",
      "LangChain.js",
      "Nomic Embed Text",
      "Qwen 2.5 Coder",
      "Docling (Document Conversion)",
    ],
  },
  {
    title: "Key Features",
    items: [
      "RAG Pipeline",
      "Semantic Search",
      "Streaming Responses",
      "Local Storage",
      "Error Boundaries",
    ],
  },
];
