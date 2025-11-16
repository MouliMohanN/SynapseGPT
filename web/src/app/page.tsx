// web/src/app/page.tsx
import React from "react";

export default function HomePage() {
  return (
    <main className="h-screen w-screen flex bg-slate-950 text-slate-50">
      {/* Left: document browser */}
      <section className="w-1/5 border-r border-slate-800 p-3 flex flex-col">
        <h2 className="text-sm font-semibold mb-2">Documents</h2>
        <div className="flex-1 text-xs text-slate-400">
          {/* TODO: Doc tree will go here */}
          <p>Document tree placeholder</p>
        </div>
      </section>

      {/* Center: summary (top 25%) + raw viewer (bottom 75%) */}
      <section className="flex-1 flex flex-col border-r border-slate-800">
        <div className="h-1/4 border-b border-slate-800 p-3">
          <h2 className="text-sm font-semibold mb-2">AI Summary</h2>
          <p className="text-xs text-slate-400">
            Summary placeholder for the selected document or section.
          </p>
        </div>
        <div className="flex-1 p-3 overflow-auto">
          <h2 className="text-sm font-semibold mb-2">Document Viewer</h2>
          <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono">
            {/* TODO: Raw document text will be rendered here */}
            Raw document text placeholder.
          </pre>
        </div>
      </section>

      {/* Right: chat panel */}
      <section className="w-1/4 p-3 flex flex-col">
        <h2 className="text-sm font-semibold mb-2">Chat</h2>
        <div className="flex-1 border border-slate-800 rounded-md p-2 mb-2 overflow-auto">
          {/* TODO: Conversation history will appear here */}
          <p className="text-xs text-slate-400">
            Conversation history placeholder.
          </p>
        </div>
        <form className="flex gap-2">
          <input
            type="text"
            placeholder="Ask anything about this document…"
            className="flex-1 bg-slate-900 border border-slate-700 rounded-md px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-sky-500"
          />
          <button
            type="button"
            className="px-3 py-1 text-xs rounded-md bg-sky-600 hover:bg-sky-500"
          >
            Send
          </button>
        </form>
      </section>
    </main>
  );
}